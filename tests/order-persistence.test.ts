import assert from 'node:assert/strict';
import test from 'node:test';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/db/schema';
import {
  createIdempotentOrder,
  createNeonOrderWritePort,
  prepareOrReuseIdempotentOrder,
  verifyOwnershipThenPrepareOrReuseIdempotentOrder,
  type OrderWritePort,
} from '../src/lib/order-persistence';
import { getCanonicalMenuItemPrice } from '../src/lib/menu-pricing';
import { menuItems } from '../src/lib/mock-data';
import { validateCanonicalItemOptions } from '../src/lib/menu-choices';

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
  findCalls = 0;
  failItemWrite = false;

  async findCompleteOrder(tableSessionId: string, idempotencyKey: string) {
    this.findCalls += 1;
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

test('lost-response retry reuses the persisted order before a newly stopped item is validated', async () => {
  const port = new InMemoryOrderWritePort();
  let validationRuns = 0;
  const createRequest = (available: boolean) => verifyOwnershipThenPrepareOrReuseIdempotentOrder(
    port,
    { tableSessionId, idempotencyKey },
    async () => null,
    async () => {
      validationRuns += 1;
      if (!available) {
        return { kind: 'rejected' as const, response: { status: 400, code: 'ITEM_UNAVAILABLE' } };
      }
      const price = getCanonicalMenuItemPrice('item_1', promoAt)!;
      const item = { menuItemId: 'item_1', quantity: 1, price };
      return {
        kind: 'ready' as const,
        order: { tableSessionId, idempotencyKey, totalAmount: price },
        items: [item],
      };
    }
  );

  // First request commits; the caller then loses the HTTP response.
  const first = await createRequest(true);
  assert.equal(first.kind, 'ready');
  if (first.kind !== 'ready') return;
  const persistedOrder = first.result.order;
  const persistedItems = first.result.items;

  // Staff changes the stop-list before the guest retries the exact key.
  const retry = await createRequest(false);
  assert.equal(retry.kind, 'ready');
  if (retry.kind !== 'ready') return;
  assert.equal(retry.result.idempotent, true);
  assert.equal(retry.result.order.id, persistedOrder.id);
  assert.deepEqual(retry.result.items, persistedItems);
  assert.equal(retry.result.order.totalAmount, 700);
  assert.equal(port.orders.size, 1);
  assert.equal(port.insertCalls, 1);
  assert.equal(validationRuns, 1);
});

test('ownership rejection with a known key happens before idempotency lookup or mutable validation', async () => {
  const port = new InMemoryOrderWritePort();
  await createIdempotentOrder(port, {
    tableSessionId,
    idempotencyKey,
    order: orderInput,
    items: itemInputs,
  });
  const lookupsBefore = port.findCalls;
  let validationRuns = 0;

  const resolution = await verifyOwnershipThenPrepareOrReuseIdempotentOrder(
    port,
    { tableSessionId, idempotencyKey },
    async () => 'TABLE_CONTEXT_MISMATCH',
    async () => {
      validationRuns += 1;
      return { kind: 'ready' as const, order: orderInput, items: itemInputs };
    }
  );

  assert.deepEqual(resolution, { kind: 'rejected', response: 'TABLE_CONTEXT_MISMATCH' });
  assert.equal(port.findCalls, lookupsBefore);
  assert.equal(validationRuns, 0);
  assert.equal(port.orders.size, 1);
});

test('new keys still validate unavailable items, unavailable variants, and forged choices', async () => {
  const port = new InMemoryOrderWritePort();
  const hookah = menuItems.find((item) => item.id === 'item_1')!;
  const unavailableItem = await prepareOrReuseIdempotentOrder(
    port,
    { tableSessionId, idempotencyKey: 'new-key-item' },
    async () => {
      const availability = new Map([[hookah.id, false]]);
      const isAvailable = availability.get(hookah.id) ?? hookah.isAvailable ?? true;
      return isAvailable
        ? { kind: 'ready' as const, order: orderInput, items: itemInputs }
        : { kind: 'rejected' as const, response: { status: 400, code: 'ITEM_UNAVAILABLE' } };
    }
  );
  assert.deepEqual(unavailableItem, {
    kind: 'rejected',
    response: { status: 400, code: 'ITEM_UNAVAILABLE' },
  });

  const tea = menuItems.find((item) => item.id === 'tea_1')!;
  const unavailableChoice = tea.choices![0].label;
  const stoppedVariant = await prepareOrReuseIdempotentOrder(
    port,
    { tableSessionId, idempotencyKey: 'new-key-variant' },
    async () => {
      const result = validateCanonicalItemOptions(
        tea,
        { choice: unavailableChoice },
        new Map([[`tea::${unavailableChoice}`, false]])
      );
      return result.ok
        ? { kind: 'ready' as const, order: orderInput, items: itemInputs }
        : { kind: 'rejected' as const, response: { status: 400, code: result.code } };
    }
  );
  assert.deepEqual(stoppedVariant, {
    kind: 'rejected',
    response: { status: 400, code: 'CHOICE_UNAVAILABLE' },
  });

  const forgedChoice = await prepareOrReuseIdempotentOrder(
    port,
    { tableSessionId, idempotencyKey: 'new-key-forged-choice' },
    async () => {
      const result = validateCanonicalItemOptions(
        tea,
        { choice: 'not-a-canonical-choice' },
        new Map()
      );
      return result.ok
        ? { kind: 'ready' as const, order: orderInput, items: itemInputs }
        : { kind: 'rejected' as const, response: { status: 400, code: result.code } };
    }
  );
  assert.deepEqual(forgedChoice, {
    kind: 'rejected',
    response: { status: 400, code: 'INVALID_CHOICE' },
  });
  assert.equal(port.orders.size, 0);
});

test('concurrent requests with the same idempotency key converge on one complete order', async () => {
  const port = new InMemoryOrderWritePort();
  const request = () => verifyOwnershipThenPrepareOrReuseIdempotentOrder(
    port,
    { tableSessionId, idempotencyKey },
    async () => null,
    async () => ({ kind: 'ready' as const, order: orderInput, items: itemInputs })
  );

  const [first, second] = await Promise.all([request(), request()]);

  assert.equal(port.orders.size, 1);
  assert.equal(port.items.size, 1);
  assert.equal(first.kind, 'ready');
  assert.equal(second.kind, 'ready');
  if (first.kind !== 'ready' || second.kind !== 'ready') return;
  assert.equal(first.result.order.id, second.result.order.id);
  assert.equal(first.result.items.length, 2);
  assert.equal(second.result.items.length, 2);
  assert.equal([first.result, second.result].filter((result) => !result.idempotent).length, 1);
});
