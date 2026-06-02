export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { tableSessions, orders, orderItems } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableSessionId, items, totalAmount, guestSessionId } = body;

    if (!tableSessionId || !items || !Array.isArray(items) || items.length === 0 || totalAmount === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getDb();

    // Verify session is active
    const session = await db.select().from(tableSessions).where(eq(tableSessions.id, tableSessionId)).limit(1).then(res => res[0]);
    if (!session || session.status !== 'active') {
      return NextResponse.json({ error: 'Table session is not active' }, { status: 400 });
    }

    // Validate items
    for (const item of items) {
      if (!item.menuItemId && !item.id) {
        return NextResponse.json({ error: 'Item missing menuItemId or id' }, { status: 400 });
      }
      if (!item.name) {
        return NextResponse.json({ error: 'Item missing name' }, { status: 400 });
      }
      if (item.source && !['harlem', 'craft_beery'].includes(item.source)) {
        return NextResponse.json({ error: 'Invalid item source' }, { status: 400 });
      }
      if (item.quantity !== undefined && (typeof item.quantity !== 'number' || item.quantity <= 0)) {
        return NextResponse.json({ error: 'Invalid item quantity' }, { status: 400 });
      }
      if (item.price !== undefined && (typeof item.price !== 'number' || item.price < 0)) {
        return NextResponse.json({ error: 'Invalid item price' }, { status: 400 });
      }
    }

    // Insert order
    const [newOrder] = await db.insert(orders).values({
      tableSessionId,
      guestSessionId: guestSessionId || null,
      status: 'new',
      totalAmount,
    }).returning();

    // Insert order items
    const itemsToInsert = items.map((item: { menuItemId?: string, id?: string, name?: string, source?: string, quantity?: number, price?: number, options?: unknown }) => ({
      orderId: newOrder.id,
      menuItemId: (item.menuItemId || item.id) as string,
      name: item.name as string,
      source: (item.source || 'harlem') as 'harlem' | 'craft_beery',
      quantity: (item.quantity || 1) as number,
      price: (item.price || 0) as number,
      options: item.options ? JSON.stringify(item.options) : null,
    }));


    const insertedItems = await db.insert(orderItems).values(itemsToInsert).returning();

    return NextResponse.json({
      order: newOrder,
      items: insertedItems,
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
