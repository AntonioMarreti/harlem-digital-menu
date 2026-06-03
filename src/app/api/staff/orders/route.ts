export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { orders, tableSessions, tables, orderItems } from '@/db/schema';
import { eq, inArray, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const db = getDb();

    // Fetch the latest active orders, using similar read approach to debug/orders
    const allOrders = await db.select({
      order: orders,
      tableSession: tableSessions,
      table: tables,
    })
    .from(orders)
    .leftJoin(tableSessions, eq(orders.tableSessionId, tableSessions.id))
    .leftJoin(tables, eq(tableSessions.tableId, tables.id))
    .orderBy(desc(orders.createdAt));

    const activeOrders = allOrders.filter(row =>
      row.order.status !== 'closed' &&
      row.order.status !== 'cancelled' &&
      row.tableSession?.status === 'active'
    );

    if (activeOrders.length === 0) {
      return NextResponse.json({ orders: [] }, {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' }
      });
    }

    const orderIds = activeOrders.map(o => o.order.id);

    const items = await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));

    // Group items by order
    const formattedOrders = activeOrders.map(row => {
      return {
        id: row.order.id,
        status: row.order.status,
        totalAmount: row.order.totalAmount,
        createdAt: row.order.createdAt,
        updatedAt: row.order.updatedAt,
        tableSessionId: row.tableSession?.id,
        tableId: row.table?.id,
        tableName: row.table?.name,
        tableQrSlug: row.table?.qrSlug,
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
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' }
    });

  } catch (error: unknown) {
    console.error('Error fetching staff orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, {
      status: 500,
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' }
    });
  }
}
