export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { tableSessions, orders, orderItems } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

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

    const sessionOrders = await db.select().from(orders).where(eq(orders.tableSessionId, session.id)).orderBy(desc(orders.createdAt));

    const enrichedOrders = [];
    for (const order of sessionOrders) {
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      enrichedOrders.push({
        ...order,
        items
      });
    }

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
