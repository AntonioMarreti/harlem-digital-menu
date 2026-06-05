export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { orders } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireStaffAccess } from '@/lib/staff-auth';

export async function PATCH(request: NextRequest, { params }: { params: { orderId: string } }) {
  const unauthorized = requireStaffAccess(request);
  if (unauthorized) return unauthorized;

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

    const existingOrder = await db.select().from(orders).where(eq(orders.id, params.orderId)).limit(1).then(res => res[0]);

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const allowedTransitions = {
      new: ['accepted', 'cancelled'],
      accepted: ['preparing', 'cancelled'],
      preparing: ['delivered'],
      delivered: ['closed'],
      closed: [],
      cancelled: [],
    } as const;

    const currentStatus = existingOrder.status as keyof typeof allowedTransitions;
    if (!(allowedTransitions[currentStatus] as readonly string[])?.includes(status)) {
      return NextResponse.json({
        error: 'Invalid status transition',
        code: 'INVALID_ORDER_STATUS_TRANSITION'
      }, { status: 409 });
    }

    const [updatedOrder] = await db.update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, params.orderId))
      .returning();

    return NextResponse.json({ order: updatedOrder }, { status: 200 });

  } catch (error: unknown) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
