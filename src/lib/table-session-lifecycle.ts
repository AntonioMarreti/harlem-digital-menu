import { sql } from 'drizzle-orm';
import { getDb } from '../db';

export const CLOSE_BLOCKING_ORDER_STATUSES = ['new', 'accepted', 'preparing'] as const;

export type SessionLifecycleSnapshot = {
  id: string;
  tableId: string;
  status: string;
};

export type SessionCloseConflict =
  | { code: 'TABLE_SESSION_STALE'; error: string }
  | {
      code: 'TABLE_SESSION_HAS_ACTIVE_WORK';
      error: string;
      blockers: { orders: number; staffCalls: number };
    };

export type EmptySessionReleaseConflict =
  | { code: 'TABLE_SESSION_STALE'; error: string }
  | { code: 'TABLE_SESSION_HAS_ORDERS'; error: string }
  | { code: 'TABLE_SESSION_HAS_ACTIVE_CALLS'; error: string };

/**
 * Must be the first statement in every batch that creates an order/call or
 * closes/releases a session. Neon HTTP executes db.batch as one transaction,
 * so this PostgreSQL transaction-scoped lock serializes those lifecycle writes.
 */
export function lockTableSessionQuery(
  db: ReturnType<typeof getDb>,
  tableSessionId: string
) {
  return db.execute(sql`
    SELECT pg_advisory_xact_lock(hashtextextended(${tableSessionId}::text, 0))
  `);
}

/** Fails the current batch when the session is not active (after its lock is held). */
export function requireActiveTableSessionQuery(
  db: ReturnType<typeof getDb>,
  tableSessionId: string
) {
  return db.execute(sql`
    SELECT 1 / COUNT(*) AS active
    FROM table_sessions
    WHERE id = ${tableSessionId}::uuid AND status = 'active'
  `);
}

export function getSessionCloseConflict(
  session: SessionLifecycleSnapshot | null,
  expectedSessionId: string,
  expectedTableId: string,
  orderStatuses: readonly string[],
  callStatuses: readonly string[]
): SessionCloseConflict | null {
  if (
    !session ||
    session.id !== expectedSessionId ||
    session.status !== 'active' ||
    session.tableId !== expectedTableId
  ) {
    return {
      code: 'TABLE_SESSION_STALE',
      error: 'Сессия уже закрыта или изменилась. Обновите список столов.',
    };
  }

  const blockingOrders = orderStatuses.filter((status) =>
    CLOSE_BLOCKING_ORDER_STATUSES.includes(status as (typeof CLOSE_BLOCKING_ORDER_STATUSES)[number])
  ).length;
  const activeCalls = callStatuses.filter((status) => status === 'new').length;

  if (blockingOrders === 0 && activeCalls === 0) return null;

  return {
    code: 'TABLE_SESSION_HAS_ACTIVE_WORK',
    error: 'Сначала завершите активные заказы и обработайте вызовы персонала.',
    blockers: { orders: blockingOrders, staffCalls: activeCalls },
  };
}

export function getEmptySessionReleaseConflict(
  session: SessionLifecycleSnapshot | null,
  expectedSessionId: string,
  orderCount: number,
  callStatuses: readonly string[]
): EmptySessionReleaseConflict | null {
  if (!session || session.id !== expectedSessionId || session.status !== 'active') {
    return {
      code: 'TABLE_SESSION_STALE',
      error: 'Сессия уже закрыта или изменилась. Обновите список столов.',
    };
  }
  if (orderCount > 0) {
    return {
      code: 'TABLE_SESSION_HAS_ORDERS',
      error: 'В этой сессии уже появился заказ. Обновите список.',
    };
  }
  if (callStatuses.some((status) => status === 'new')) {
    return {
      code: 'TABLE_SESSION_HAS_ACTIVE_CALLS',
      error: 'В этой сессии есть необработанный вызов. Обновите список.',
    };
  }
  return null;
}

export class TableSessionNotActiveError extends Error {
  constructor() {
    super('Table session is not active');
    this.name = 'TableSessionNotActiveError';
  }
}
