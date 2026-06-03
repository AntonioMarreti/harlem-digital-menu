export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { orders, tableSessions, tables, orderItems } from '@/db/schema';
import { desc, inArray, eq } from 'drizzle-orm';

export async function GET() {
  try {
    const db = getDb();

    // Fetch the latest 20 orders
    const latestOrders = await db.select({
      order: orders,
      tableSession: tableSessions,
      table: tables,
    })
    .from(orders)
    .leftJoin(tableSessions, eq(orders.tableSessionId, tableSessions.id))
    .leftJoin(tables, eq(tableSessions.tableId, tables.id))
    .orderBy(desc(orders.createdAt))
    .limit(20);

    if (latestOrders.length === 0) {
      return NextResponse.json({ orders: [] }, {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0' }
      });
    }

    const orderIds = latestOrders.map(o => o.order.id);

    const items = await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));

    // Format the response
    const formattedOrders = latestOrders.map(row => {
      return {
        id: row.order.id,
        status: row.order.status,
        totalAmount: row.order.totalAmount,
        createdAt: row.order.createdAt,
        updatedAt: row.order.updatedAt,
        guestSessionId: row.order.guestSessionId,
        tableSessionId: row.order.tableSessionId,
        tableSession: row.tableSession ? {
          id: row.tableSession.id,
          status: row.tableSession.status,
          createdAt: row.tableSession.createdAt,
          closedAt: row.tableSession.closedAt,
        } : null,
        table: row.table ? {
          id: row.table.id,
          name: row.table.name,
          qrSlug: row.table.qrSlug,
        } : null,
        items: items.filter(i => i.orderId === row.order.id).map(i => ({
          id: i.id,
          menuItemId: i.menuItemId,
          name: i.name,
          source: i.source,
          quantity: i.quantity,
          price: i.price,
          options: i.options ? JSON.parse(i.options) : null,
        }))
      };
    });

    return NextResponse.json({ orders: formattedOrders }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });

  } catch (error: unknown) {
    console.error('Error fetching debug orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, {
      status: 500,
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  }
}
