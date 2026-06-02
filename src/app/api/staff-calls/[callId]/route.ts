import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { staffCalls } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(request: NextRequest, { params }: { params: { callId: string } }) {
  try {
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const validStatuses = ['handled', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const db = getDb();

    const updateData: Record<string, unknown> = { status };
    if (status === 'handled') {
      updateData.handledAt = new Date();
    }

    const [updatedCall] = await db.update(staffCalls)
      .set(updateData)
      .where(eq(staffCalls.id, params.callId))
      .returning();

    if (!updatedCall) {
      return NextResponse.json({ error: 'Staff call not found' }, { status: 404 });
    }

    return NextResponse.json({ call: updatedCall }, { status: 200 });

  } catch (error: unknown) {
    console.error('Error updating staff call:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
