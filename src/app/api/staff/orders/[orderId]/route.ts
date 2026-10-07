export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { orders } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { requireStaffAccess } from '@/lib/staff-auth';
import { logError, logInfo, logWarn } from '@/lib/server-logging';
import { transitionOrderStatus, type OrderStatus } from '@/lib/order-status-transition';

export async function PATCH(request: NextRequest, { params }: { params: { orderId: string } }) {
  const unauthorized = requireStaffAccess(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { status, expectedStatus: clientExpectedStatus } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const validStatuses = ['new', 'accepted', 'preparing', 'delivered', 'closed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    if (clientExpectedStatus !== undefined && !validStatuses.includes(clientExpectedStatus)) {
      return NextResponse.json({ error: 'Invalid expected status' }, { status: 400 });
    }

    const db = getDb();

    const existingOrder = await db.select().from(orders).where(eq(orders.id, params.orderId)).limit(1).then(res => res[0]);

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const transition = await transitionOrderStatus(
      existingOrder.status as OrderStatus,
      status,
      async (expectedStatus, requestedStatus) => {
        const [updatedOrder] = await db.update(orders)
          .set({ status: requestedStatus, updatedAt: new Date() })
          .where(and(
            eq(orders.id, params.orderId),
            eq(orders.status, expectedStatus)
          ))
          .returning();
        return updatedOrder ?? null;
      },
      typeof clientExpectedStatus === 'string' ? clientExpectedStatus : existingOrder.status
    );

    if (transition.kind === 'invalid_transition') {
      logWarn('order_status.invalid_transition', {
        orderId: existingOrder.id,
        fromStatus: existingOrder.status,
        toStatus: status,
      });
      return NextResponse.json({
        error: 'Invalid status transition',
        code: 'INVALID_ORDER_STATUS_TRANSITION'
      }, { status: 409 });
    }

    if (transition.kind === 'conflict') {
      logWarn('order_status.conflict', {
        orderId: existingOrder.id,
        expectedStatus: existingOrder.status,
        requestedStatus: status,
        code: 'ORDER_STATUS_CONFLICT',
      });
      return NextResponse.json({
        error: 'Order status was already changed by another action',
        code: 'ORDER_STATUS_CONFLICT',
      }, { status: 409 });
    }

    const updatedOrder = transition.value;

    logInfo('order_status.updated', {
      orderId: updatedOrder.id,
      fromStatus: existingOrder.status,
      toStatus: updatedOrder.status,
    });

    return NextResponse.json({ order: updatedOrder }, { status: 200 });

  } catch (error: unknown) {
    logError('order_status.error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
