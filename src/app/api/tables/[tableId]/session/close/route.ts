export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { orders, staffCalls, tables, tableSessions } from '@/db/schema';
import { and, eq, inArray, notExists } from 'drizzle-orm';
import { requireStaffAccess } from '@/lib/staff-auth';
import {
  CLOSE_BLOCKING_ORDER_STATUSES,
  getSessionCloseConflict,
  lockTableSessionQuery,
} from '@/lib/table-session-lifecycle';
import { logError, logInfo } from '@/lib/server-logging';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest, { params }: { params: { tableId: string } }) {
  const unauthorized = requireStaffAccess(request);
  if (unauthorized) return unauthorized;

  try {
    const payload = await request.json().catch(() => null);
    const tableSessionId = payload && typeof payload === 'object' ? payload.tableSessionId : null;
    if (typeof tableSessionId !== 'string' || !uuidPattern.test(tableSessionId)) {
      return NextResponse.json({
        error: 'tableSessionId is required',
        code: 'TABLE_SESSION_ID_REQUIRED',
      }, { status: 400 });
    }

    const db = getDb();
    let table = null;

    if (uuidPattern.test(params.tableId)) {
      table = await db.select().from(tables).where(eq(tables.id, params.tableId)).limit(1).then((rows) => rows[0]);
    }
    if (!table) {
      table = await db.select().from(tables).where(eq(tables.qrSlug, params.tableId)).limit(1).then((rows) => rows[0]);
    }
    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    const activeOrders = db.select({ id: orders.id }).from(orders).where(and(
      eq(orders.tableSessionId, tableSessionId),
      inArray(orders.status, [...CLOSE_BLOCKING_ORDER_STATUSES])
    ));
    const newCalls = db.select({ id: staffCalls.id }).from(staffCalls).where(and(
      eq(staffCalls.tableSessionId, tableSessionId),
      eq(staffCalls.status, 'new')
    ));

    const [, closedSessions, sessions, blockingOrders, activeCalls] = await db.batch([
      lockTableSessionQuery(db, tableSessionId),
      db.update(tableSessions)
        .set({ status: 'closed', closedAt: new Date() })
        .where(and(
          eq(tableSessions.id, tableSessionId),
          eq(tableSessions.tableId, table.id),
          eq(tableSessions.status, 'active'),
          notExists(activeOrders),
          notExists(newCalls)
        ))
        .returning(),
      db.select().from(tableSessions).where(eq(tableSessions.id, tableSessionId)).limit(1),
      db.select({ status: orders.status }).from(orders).where(and(
        eq(orders.tableSessionId, tableSessionId),
        inArray(orders.status, [...CLOSE_BLOCKING_ORDER_STATUSES])
      )),
      db.select({ status: staffCalls.status }).from(staffCalls).where(and(
        eq(staffCalls.tableSessionId, tableSessionId),
        eq(staffCalls.status, 'new')
      )),
    ]);

    const closedSession = closedSessions[0];
    if (closedSession) {
      logInfo('table_session.closed', {
        tableId: table.id,
        tableIdOrSlug: params.tableId,
        tableSessionId,
      });
      return NextResponse.json({ success: true, message: 'Table session closed successfully' }, { status: 200 });
    }

    const conflict = getSessionCloseConflict(
      sessions[0] ?? null,
      tableSessionId,
      table.id,
      blockingOrders.map((order) => order.status),
      activeCalls.map((call) => call.status)
    );
    if (conflict) {
      return NextResponse.json(conflict, { status: 409 });
    }

    return NextResponse.json({
      error: 'Не удалось закрыть сессию. Обновите список столов.',
      code: 'TABLE_SESSION_CLOSE_CONFLICT',
    }, { status: 409 });
  } catch (error: unknown) {
    logError('table_session.close_error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
