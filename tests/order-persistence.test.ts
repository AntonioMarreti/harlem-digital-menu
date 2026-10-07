import assert from 'node:assert/strict';
import test from 'node:test';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/db/schema';
import {
  createIdempotentOrder,
  createNeonOrderWritePort,
  type OrderWritePort,
} from '../src/lib/order-persistence';
import { getCanonicalMenuItemPrice } from '../src/lib/menu-pricing';

type TestOrder = {
  id: string;
  tableSessionId: string;
  idempotencyKey: string;
  totalAmount: number;
};

type TestItemInput = {
  menuItemId: string;
  quantity: number;
  price: number;
};

type TestItem = TestItemInput & { orderId: string };
type TestOrderInput = Omit<TestOrder, 'id'>;

class InMemoryOrderWritePort implements OrderWritePort<
  TestOrder,
  TestItem,
  TestOrderInput,
  TestItemInput
> {
  readonly orders = new Map<string, TestOrder>();
  readonly items = new Map<string, TestItem[]>();
  insertCalls = 0;
  failItemWrite = false;

  async findCompleteOrder(tableSessionId: string, idempotencyKey: string) {
    const order = Array.from(this.orders.values()).find((candidate) =>
      candidate.tableSessionId === tableSessionId && candidate.idempotencyKey === idempotencyKey
    );
    if (!order) return null;
    const items = this.items.get(order.id) ?? [];
    return items.length > 0 ? { order, items } : null;
  }

  async insertOrderAndItems(orderInput: TestOrderInput, itemInputs: TestItemInput[]) {
    this.insertCalls += 1;
    const duplicate = Array.from(this.orders.values()).some((candidate) =>
      candidate.tableSessionId === orderInput.tableSessionId &&
      candidate.idempotencyKey === orderInput.idempotencyKey
    );
    if (duplicate) return null;

    // Stage the order and every item before committing, like one DB transaction.
    const order = { ...orderInput, id: `order-${this.insertCalls}` };
    const items = itemInputs.map((item) => ({ ...item, orderId: order.id }));
    if (this.failItemWrite) throw new Error('simulated order_items insert failure');

    this.orders.set(order.id, order);
    this.items.set(order.id, items);
    return { order, items };
  }
}

const tableSessionId = 'session-1';
const idempotencyKey = 'retry-key-0001';
const promoAt = new Date('2026-10-07T10:00:00.000Z');
const itemInputs: TestItemInput[] = [
  { menuItemId: 'item_1', quantity: 1, price: getCanonicalMenuItemPrice('item_1', promoAt)! },
  { menuItemId: 'item_2', quantity: 1, price: getCanonicalMenuItemPrice('item_2', promoAt)! },
];
const orderInput: TestOrderInput = {
  tableSessionId,
  idempotencyKey,
  totalAmount: itemInputs.reduce((total, item) => total + item.price * item.quantity, 0),
};

test('successful write persists one order, every item, and the server canonical total', async () => {
  const port = new InMemoryOrderWritePort();
  const result = await createIdempotentOrder(port, {
    tableSessionId,
    idempotencyKey,
    order: orderInput,
    items: itemInputs,
  });

  assert.equal(port.orders.size, 1);
  assert.equal(result.items.length, 2);
  assert.deepEqual(result.items.map(({ menuItemId }) => menuItemId), ['item_1', 'item_2']);
  assert.equal(result.order.totalAmount, 1699);
  assert.equal(result.idempotent, false);
});

test('Neon adapter submits order and item inserts together through Drizzle batch', async () => {
  const db = drizzle.mock({ schema });
  let batchCount = 0;
  let statementSql: string[] = [];
  const insertedOrder = {
    id: 'order-db-test',
    tableSessionId,
    idempotencyKey,
    totalAmount: orderInput.totalAmount,
  };
  const dbItems = itemInputs.map((item) => ({
    ...item,
    name: item.menuItemId,
    source: 'harlem' as const,
    options: null,
  }));
  const insertedItems = dbItems.map((item) => ({ ...item, orderId: insertedOrder.id }));

  Object.defineProperty(db, 'batch', {
    value: async (queries: Array<{ _prepare(): { getQuery(): { sql: string } } }>) => {
      batchCount += 1;
      statementSql = queries.map((query) => query._prepare().getQuery().sql);
      return [[], [], [insertedOrder], insertedItems];
    },
  });

  const port = createNeonOrderWritePort(db as unknown as Parameters<typeof createNeonOrderWritePort>[0]);
  const persisted = await port.insertOrderAndItems(orderInput, dbItems);

  assert.equal(batchCount, 1);
  assert.equal(statementSql.length, 4);
  assert.match(statementSql[0], /pg_advisory_xact_lock/i);
  assert.match(statementSql[1], /1 \/ COUNT\(\*\)/i);
  assert.match(statementSql[2], /insert into "orders"/i);
  assert.match(statementSql[3], /insert into "order_items"/i);
  assert.equal(persisted?.items.length, 2);
});

test('item insertion failure leaves neither an order nor order items', async () => {
  const port = new InMemoryOrderWritePort();
  port.failItemWrite = true;

  await assert.rejects(createIdempotentOrder(port, {
    tableSessionId,
    idempotencyKey,
    order: orderInput,
    items: itemInputs,
  }), /simulated order_items insert failure/);

  assert.equal(port.orders.size, 0);
  assert.equal(port.items.size, 0);
});

test('retry with the same idempotency key returns the same complete order without a duplicate', async () => {
  const port = new InMemoryOrderWritePort();
  const first = await createIdempotentOrder(port, {
    tableSessionId,
    idempotencyKey,
    order: orderInput,
    items: itemInputs,
  });
  const retry = await createIdempotentOrder(port, {
    tableSessionId,
    idempotencyKey,
    order: { ...orderInput, totalAmount: 999999 },
    items: [{ menuItemId: 'forged', quantity: 1, price: 1 }],
  });

  assert.equal(port.orders.size, 1);
  assert.equal(port.insertCalls, 1);
  assert.equal(retry.idempotent, true);
  assert.deepEqual(retry, { ...first, idempotent: true });
  assert.equal(retry.order.totalAmount, 1699);
  assert.equal(retry.items.length, 2);
});

test('concurrent requests with the same idempotency key converge on one complete order', async () => {
  const port = new InMemoryOrderWritePort();
  const request = () => createIdempotentOrder(port, {
    tableSessionId,
    idempotencyKey,
    order: orderInput,
    items: itemInputs,
  });

  const [first, second] = await Promise.all([request(), request()]);

  assert.equal(port.orders.size, 1);
  assert.equal(port.items.size, 1);
  assert.equal(first.order.id, second.order.id);
  assert.equal(first.items.length, 2);
  assert.equal(second.items.length, 2);
  assert.equal([first, second].filter((result) => !result.idempotent).length, 1);
});
