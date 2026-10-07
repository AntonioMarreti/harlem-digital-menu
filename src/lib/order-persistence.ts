import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../db';
import { orderItems, orders } from '../db/schema';

export type CompleteOrder<TOrder, TItem> = {
  order: TOrder;
  items: TItem[];
};

export interface OrderWritePort<TOrder, TItem, TOrderInput, TItemInput> {
  findCompleteOrder(
    tableSessionId: string,
    idempotencyKey: string
  ): Promise<CompleteOrder<TOrder, TItem> | null>;
  insertOrderAndItems(
    order: TOrderInput,
    items: TItemInput[]
  ): Promise<CompleteOrder<TOrder, TItem> | null>;
}

export async function createIdempotentOrder<TOrder, TItem, TOrderInput, TItemInput>(
  port: OrderWritePort<TOrder, TItem, TOrderInput, TItemInput>,
  input: {
    tableSessionId: string;
    idempotencyKey: string;
    order: TOrderInput;
    items: TItemInput[];
  }
): Promise<CompleteOrder<TOrder, TItem> & { idempotent: boolean }> {
  const existing = await port.findCompleteOrder(input.tableSessionId, input.idempotencyKey);
  if (existing) return { ...existing, idempotent: true };

  try {
    const created = await port.insertOrderAndItems(input.order, input.items);
    if (created) return { ...created, idempotent: false };
  } catch (error) {
    // A concurrent request can win the unique idempotency constraint. Its committed
    // order and items are safe to return; a failed item write leaves no order to find.
    const raced = await port.findCompleteOrder(input.tableSessionId, input.idempotencyKey);
    if (raced) return { ...raced, idempotent: true };
    throw error;
  }

  const raced = await port.findCompleteOrder(input.tableSessionId, input.idempotencyKey);
  if (raced) return { ...raced, idempotent: true };
  throw new Error('Idempotent order was not created');
}

type DbOrder = typeof orders.$inferSelect;
type DbOrderItem = typeof orderItems.$inferSelect;
type NewOrder = Omit<typeof orders.$inferInsert, 'id'>;
type NewOrderItem = Omit<typeof orderItems.$inferInsert, 'id' | 'orderId'>;

export function createNeonOrderWritePort(
  db: ReturnType<typeof getDb>
): OrderWritePort<DbOrder, DbOrderItem, NewOrder, NewOrderItem> {
  return {
    async findCompleteOrder(tableSessionId, idempotencyKey) {
      const order = await db.select().from(orders).where(and(
        eq(orders.tableSessionId, tableSessionId),
        eq(orders.idempotencyKey, idempotencyKey)
      )).limit(1).then((rows) => rows[0]);

      if (!order) return null;

      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      return items.length > 0 ? { order, items } : null;
    },

    async insertOrderAndItems(order, items) {
      const orderId = randomUUID();
      const [insertedOrders, insertedItems] = await db.batch([
        db.insert(orders).values({ ...order, id: orderId }).onConflictDoNothing({
          target: [orders.tableSessionId, orders.idempotencyKey],
        }).returning(),
        db.insert(orderItems).values(items.map((item) => ({ ...item, orderId }))).returning(),
      ]);

      const insertedOrder = insertedOrders[0];
      if (!insertedOrder) return null;
      return { order: insertedOrder, items: insertedItems };
    },
  };
}
