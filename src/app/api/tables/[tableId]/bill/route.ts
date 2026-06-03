export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { tables, tableSessions, orders } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: { tableId: string } }) {
  try {

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      tableSessionId: "mock-session-123",
      tableId: params.tableId,
      tableName: "Mock Table",
      tableQrSlug: params.tableId,
      ordersCount: 3,
      activeOrdersCount: 1,
      totalAmount: 1500,
      createdAt: new Date().toISOString()
    }, { status: 200 });
  }
  const db = getDb();


    // Find table by id or qrSlug
    let table = null;

    // Check if tableId is a valid UUID
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (uuidRegex.test(params.tableId)) {
      table = await db.select().from(tables).where(eq(tables.id, params.tableId)).limit(1).then(res => res[0]);
    }

    if (!table) {
      table = await db.select().from(tables).where(eq(tables.qrSlug, params.tableId)).limit(1).then(res => res[0]);
    }

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Find active session
    const session = await db.select().from(tableSessions).where(
      and(
        eq(tableSessions.tableId, table.id),
        eq(tableSessions.status, 'active')
      )
    ).limit(1).then(res => res[0]);

    if (!session) {
      return NextResponse.json({ error: 'No active session' }, { status: 404 });
    }

    // Fetch orders for this session
    const sessionOrders = await db.select().from(orders).where(
      eq(orders.tableSessionId, session.id)
    );

    let totalAmount = 0;
    let ordersCount = 0;
    let activeOrdersCount = 0;

    for (const order of sessionOrders) {
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
      tableId: table.id,
      tableName: table.name,
      tableQrSlug: table.qrSlug,
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
