import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../db';
import { orderItems, orders, tableSessions } from '../db/schema';
import {
  lockTableSessionQuery,
  requireActiveTableSessionQuery,
  TableSessionNotActiveError,
} from './table-session-lifecycle';

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

export type PreparedIdempotentOrder<TOrderInput, TItemInput, TRejection> =
  | { kind: 'ready'; order: TOrderInput; items: TItemInput[] }
  | { kind: 'rejected'; response: TRejection };

export async function findExistingCompleteOrder<TOrder, TItem, TOrderInput, TItemInput>(
  port: OrderWritePort<TOrder, TItem, TOrderInput, TItemInput>,
  tableSessionId: string,
  idempotencyKey: string
): Promise<(CompleteOrder<TOrder, TItem> & { idempotent: true }) | null> {
  const existing = await port.findCompleteOrder(tableSessionId, idempotencyKey);
  return existing ? { ...existing, idempotent: true } : null;
}

/**
 * Reuse a complete persisted order before running mutable menu validation.
 * Call only after the route has checked session ownership and table context.
 * The regular createIdempotentOrder path remains responsible for concurrent
 * requests that both miss this fast-path lookup.
 */
export async function prepareOrReuseIdempotentOrder<
  TOrder,
  TItem,
  TOrderInput,
  TItemInput,
  TRejection
>(
  port: OrderWritePort<TOrder, TItem, TOrderInput, TItemInput>,
  identity: { tableSessionId: string; idempotencyKey: string },
  prepare: () => Promise<PreparedIdempotentOrder<TOrderInput, TItemInput, TRejection>>
): Promise<
  | { kind: 'ready'; result: CompleteOrder<TOrder, TItem> & { idempotent: boolean } }
  | { kind: 'rejected'; response: TRejection }
> {
  const existing = await findExistingCompleteOrder(
    port,
    identity.tableSessionId,
    identity.idempotencyKey
  );
  if (existing) return { kind: 'ready', result: existing };

  const prepared = await prepare();
  if (prepared.kind === 'rejected') return prepared;

  const result = await createIdempotentOrder(port, {
    ...identity,
    order: prepared.order,
    items: prepared.items,
  });
  return { kind: 'ready', result };
}

/** Keeps a known idempotency key behind the route's session/table ownership guard. */
export async function verifyOwnershipThenPrepareOrReuseIdempotentOrder<
  TOrder,
  TItem,
  TOrderInput,
  TItemInput,
  TOwnershipRejection,
  TPreparationRejection
>(
  port: OrderWritePort<TOrder, TItem, TOrderInput, TItemInput>,
  identity: { tableSessionId: string; idempotencyKey: string },
  verifyOwnership: () => Promise<TOwnershipRejection | null>,
  prepare: () => Promise<PreparedIdempotentOrder<TOrderInput, TItemInput, TPreparationRejection>>
): Promise<
  | { kind: 'ready'; result: CompleteOrder<TOrder, TItem> & { idempotent: boolean } }
  | { kind: 'rejected'; response: TOwnershipRejection | TPreparationRejection }
> {
  const ownershipRejection = await verifyOwnership();
  if (ownershipRejection) return { kind: 'rejected', response: ownershipRejection };
  return prepareOrReuseIdempotentOrder(port, identity, prepare);
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
  const existing = await findExistingCompleteOrder(port, input.tableSessionId, input.idempotencyKey);
  if (existing) return existing;

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
      let insertedOrders: DbOrder[];
      let insertedItems: DbOrderItem[];
      try {
        [, , insertedOrders, insertedItems] = await db.batch([
          lockTableSessionQuery(db, order.tableSessionId),
          requireActiveTableSessionQuery(db, order.tableSessionId),
          db.insert(orders).values({ ...order, id: orderId }).onConflictDoNothing({
            target: [orders.tableSessionId, orders.idempotencyKey],
          }).returning(),
          db.insert(orderItems).values(items.map((item) => ({ ...item, orderId }))).returning(),
        ]);
      } catch (error) {
        // The session may have closed after validation but before this transaction
        // acquired its lock. Preserve the original write error if this check fails.
        try {
          const session = await db.select({ status: tableSessions.status })
            .from(tableSessions)
            .where(eq(tableSessions.id, order.tableSessionId))
            .limit(1)
            .then((rows) => rows[0]);
          if (!session || session.status !== 'active') throw new TableSessionNotActiveError();
        } catch (sessionError) {
          if (sessionError instanceof TableSessionNotActiveError) throw sessionError;
        }
        throw error;
      }

      const insertedOrder = insertedOrders[0];
      if (!insertedOrder) return null;
      return { order: insertedOrder, items: insertedItems };
    },
  };
}
