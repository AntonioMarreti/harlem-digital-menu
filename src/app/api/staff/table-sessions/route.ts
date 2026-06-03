export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { tableSessions, tables, orders } from '@/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';

export async function GET() {
  try {
    const db = getDb();

    const activeSessionsQuery = await db.select({
      session: tableSessions,
      table: tables,
    })
    .from(tableSessions)
    .innerJoin(tables, eq(tableSessions.tableId, tables.id))
    .where(eq(tableSessions.status, 'active'))
    .orderBy(desc(tableSessions.createdAt));

    const sessionIds = activeSessionsQuery.map(r => r.session.id);
    let allOrders: (typeof orders.$inferSelect)[] = [];

    if (sessionIds.length > 0) {
      allOrders = await db.select()
        .from(orders)
        .where(inArray(orders.tableSessionId, sessionIds));
    }

    const formattedSessions = activeSessionsQuery.map(row => {
      const sessionOrders = allOrders.filter(o => o.tableSessionId === row.session.id);

      const ordersCount = sessionOrders.length;

      const activeOrdersCount = sessionOrders.filter(
        o => o.status !== 'closed' && o.status !== 'cancelled'
      ).length;

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
        createdAt: row.session.createdAt,
        ordersCount,
        activeOrdersCount,
        totalAmount,
      };
    }).filter(session => session.ordersCount > 0);

    return NextResponse.json({ tableSessions: formattedSessions }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' }
    });

  } catch (error: unknown) {
    console.error('Error fetching staff table sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, {
      status: 500,
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' }
    });
  }
}
