export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { orders } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(request: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const validStatuses = ['new', 'accepted', 'preparing', 'delivered', 'closed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const db = getDb();

    const [updatedOrder] = await db.update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, params.orderId))
      .returning();

    if (!updatedOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order: updatedOrder }, { status: 200 });

  } catch (error: unknown) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
