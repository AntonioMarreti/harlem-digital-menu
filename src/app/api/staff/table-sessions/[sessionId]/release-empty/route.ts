export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { orders, tableSessions } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { requireStaffAccess } from '@/lib/staff-auth';

export async function POST(request: NextRequest, { params }: { params: { sessionId: string } }) {
  const unauthorized = requireStaffAccess(request);
  if (unauthorized) return unauthorized;

  try {
    const db = getDb();

    const session = await db.select()
      .from(tableSessions)
      .where(eq(tableSessions.id, params.sessionId))
      .limit(1)
      .then(res => res[0]);

    if (!session) {
      return NextResponse.json({ error: 'Table session not found' }, { status: 404 });
    }

    if (session.status !== 'active') {
      return NextResponse.json({ error: 'Table session is not active' }, { status: 409 });
    }

    const sessionOrders = await db.select()
      .from(orders)
      .where(eq(orders.tableSessionId, session.id));

    if (sessionOrders.length > 0) {
      return NextResponse.json({
        error: 'Table session already has orders',
        code: 'TABLE_SESSION_HAS_ORDERS',
      }, { status: 409 });
    }

    const [updatedSession] = await db.update(tableSessions)
      .set({ status: 'closed', closedAt: new Date() })
      .where(and(
        eq(tableSessions.id, session.id),
        eq(tableSessions.status, 'active')
      ))
      .returning();

    if (!updatedSession) {
      return NextResponse.json({ error: 'Table session is not active' }, { status: 409 });
    }

    return NextResponse.json({ ok: true, session: updatedSession }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
    });
  } catch (error: unknown) {
    console.error('Error releasing empty table session:', error);
    return NextResponse.json({ error: 'Internal server error' }, {
      status: 500,
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
    });
  }
}
