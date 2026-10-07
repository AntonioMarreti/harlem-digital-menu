export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { orders, staffCalls, tableSessions } from '@/db/schema';
import { and, eq, notExists } from 'drizzle-orm';
import { requireStaffAccess } from '@/lib/staff-auth';
import {
  getEmptySessionReleaseConflict,
  lockTableSessionQuery,
} from '@/lib/table-session-lifecycle';
import { logError, logInfo, logWarn } from '@/lib/server-logging';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest, { params }: { params: { sessionId: string } }) {
  const unauthorized = requireStaffAccess(request);
  if (unauthorized) return unauthorized;

  if (!uuidPattern.test(params.sessionId)) {
    return NextResponse.json({ error: 'Table session not found' }, {
      status: 404,
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
    });
  }

  try {
    const db = getDb();
    const anyOrders = db.select({ id: orders.id }).from(orders)
      .where(eq(orders.tableSessionId, params.sessionId));
    const newCalls = db.select({ id: staffCalls.id }).from(staffCalls).where(and(
      eq(staffCalls.tableSessionId, params.sessionId),
      eq(staffCalls.status, 'new')
    ));

    const [, releasedSessions, sessions, sessionOrders, activeCalls] = await db.batch([
      lockTableSessionQuery(db, params.sessionId),
      db.update(tableSessions)
        .set({ status: 'closed', closedAt: new Date() })
        .where(and(
          eq(tableSessions.id, params.sessionId),
          eq(tableSessions.status, 'active'),
          notExists(anyOrders),
          notExists(newCalls)
        ))
        .returning(),
      db.select().from(tableSessions).where(eq(tableSessions.id, params.sessionId)).limit(1),
      db.select({ id: orders.id }).from(orders).where(eq(orders.tableSessionId, params.sessionId)),
      db.select({ status: staffCalls.status }).from(staffCalls).where(and(
        eq(staffCalls.tableSessionId, params.sessionId),
        eq(staffCalls.status, 'new')
      )),
    ]);

    const releasedSession = releasedSessions[0];
    if (releasedSession) {
      logInfo('table_session.release_empty', {
        tableSessionId: releasedSession.id,
        tableId: releasedSession.tableId,
      });
      return NextResponse.json({ ok: true, session: releasedSession }, {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
      });
    }

    const conflict = getEmptySessionReleaseConflict(
      sessions[0] ?? null,
      params.sessionId,
      sessionOrders.length,
      activeCalls.map((call) => call.status)
    );
    if (conflict) {
      if (conflict.code !== 'TABLE_SESSION_STALE') {
        logWarn('table_session.release_empty_blocked', {
          tableSessionId: params.sessionId,
          ordersCount: sessionOrders.length,
          activeCallsCount: activeCalls.length,
          code: conflict.code,
        });
      }
      return NextResponse.json(conflict, {
        status: 409,
        headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
      });
    }

    return NextResponse.json({
      error: 'Не удалось освободить сессию. Обновите список столов.',
      code: 'TABLE_SESSION_RELEASE_CONFLICT',
    }, {
      status: 409,
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
    });
  } catch (error: unknown) {
    logError('table_session.release_empty_error', error);
    return NextResponse.json({ error: 'Internal server error' }, {
      status: 500,
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
    });
  }
}
