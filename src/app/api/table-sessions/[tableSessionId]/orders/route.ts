export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { tableSessions, orders, tables, orderItems } from '@/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: { tableSessionId: string } }) {
  try {
    const db = getDb();
    const { tableSessionId } = params;

    const session = await db.select().from(tableSessions).where(eq(tableSessions.id, tableSessionId)).limit(1).then(res => res[0]);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'active') {
       return NextResponse.json({ error: 'Session is closed', isClosed: true }, { status: 404 });
    }

    // Fetch the latest active orders using a reliable read approach with joins
    const allOrders = await db.select({
      order: orders,
      tableSession: tableSessions,
      table: tables,
    })
    .from(orders)
    .leftJoin(tableSessions, eq(orders.tableSessionId, tableSessions.id))
    .leftJoin(tables, eq(tableSessions.tableId, tables.id))
    .orderBy(desc(orders.createdAt));

    // Filter by the specific tableSessionId in memory
    const sessionOrders = allOrders.filter(row => row.tableSession?.id === tableSessionId);

    if (sessionOrders.length === 0) {
      return NextResponse.json({ orders: [] }, {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' }
      });
    }

    const orderIds = sessionOrders.map(o => o.order.id);
    const items = await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));

    const enrichedOrders = sessionOrders.map(row => {
      return {
        ...row.order,
        items: items.filter(i => i.orderId === row.order.id)
      };
    });

    return NextResponse.json({ orders: enrichedOrders }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate'
      }
    });

  } catch (error: unknown) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
