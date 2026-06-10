export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { tableSessions, tables, orders } from '@/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { requireStaffAccess } from '@/lib/staff-auth';

export async function GET(request: NextRequest) {
  const unauthorized = requireStaffAccess(request);
  if (unauthorized) return unauthorized;

  try {
    const db = getDb();

    // 1. Fetch 5 recently closed sessions
    const closedSessionsQuery = await db.select({
      session: tableSessions,
      table: tables,
    })
    .from(tableSessions)
    .innerJoin(tables, eq(tableSessions.tableId, tables.id))
    .where(eq(tableSessions.status, 'closed'))
    .orderBy(desc(tableSessions.closedAt))
    .limit(5);

    if (closedSessionsQuery.length === 0) {
      return NextResponse.json({ recentlyClosed: [] }, {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' }
      });
    }

    const sessionIds = closedSessionsQuery.map(r => r.session.id);
    let allOrders: (typeof orders.$inferSelect)[] = [];

    // 2. Fetch orders for these sessions
    allOrders = await db.select()
      .from(orders)
      .where(inArray(orders.tableSessionId, sessionIds));

    // 3. Calculate total amount per session, ignoring cancelled orders
    const formattedSessions = closedSessionsQuery.map(row => {
      const sessionOrders = allOrders.filter(o => o.tableSessionId === row.session.id);

      const totalAmount = sessionOrders.reduce((sum, order) => {
        if (order.status !== 'cancelled') {
          return sum + order.totalAmount;
        }
        return sum;
      }, 0);

      return {
        id: row.session.id,
        tableId: row.table.id,
        tableName: row.table.name,
        tableQrSlug: row.table.qrSlug,
        closedAt: row.session.closedAt?.toISOString() ?? null,
        totalAmount,
      };
    });

    return NextResponse.json({ recentlyClosed: formattedSessions }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' }
    });

  } catch (error: unknown) {
    console.error('Error fetching recently closed sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, {
      status: 500,
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' }
    });
  }
}
