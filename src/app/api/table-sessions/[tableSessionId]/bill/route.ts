export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { tableSessions, orders, tables } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyTableSessionOwnership } from '@/lib/table-session-ownership';

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

    const ownershipError = await verifyTableSessionOwnership(
      db,
      session,
      request.nextUrl.searchParams.get('tableIdOrSlug')
    );
    if (ownershipError) return ownershipError;

    // Fetch the orders using a reliable read approach with joins
    const allOrders = await db.select({
      order: orders,
      tableSession: tableSessions,
      table: tables,
    })
    .from(orders)
    .leftJoin(tableSessions, eq(orders.tableSessionId, tableSessions.id))
    .leftJoin(tables, eq(tableSessions.tableId, tables.id));

    // Filter by the specific tableSessionId in memory
    const sessionOrders = allOrders.filter(row => row.tableSession?.id === tableSessionId);

    let totalAmount = 0;
    let ordersCount = 0;
    let activeOrdersCount = 0;

    for (const row of sessionOrders) {
      const order = row.order;
      if (order.status !== 'cancelled') {
        totalAmount += order.totalAmount;
        ordersCount += 1;

        if (order.status !== 'closed') {
          activeOrdersCount += 1;
        }
      }
    }

    return NextResponse.json({
      tableSessionId: session.id,
      tableId: session.tableId,
      ordersCount,
      activeOrdersCount,
      totalAmount,
      createdAt: session.createdAt
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate'
      }
    });

  } catch (error: unknown) {
    console.error('Error fetching bill:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
