export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { tableSessions, orders, orderItems } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyTableSessionOwnership } from '@/lib/table-session-ownership';
import { menuItems } from '@/lib/mock-data';

const MAX_ITEM_QUANTITY = 99;
const MAX_ITEM_NOTES_LENGTH = 500;

const canonicalMenuItemById = new Map(menuItems.map((item) => [item.id, item]));

type IncomingOrderItem = {
  id?: unknown;
  menuItemId?: unknown;
  quantity?: unknown;
  options?: unknown;
};

function getNormalizedItemOptions(options: unknown) {
  if (options === undefined || options === null) {
    return { ok: true as const, value: null };
  }

  if (typeof options !== 'object' || Array.isArray(options)) {
    return { ok: false as const, error: 'Invalid item options' };
  }

  if (!('notes' in options)) {
    return { ok: true as const, value: null };
  }

  const notes = (options as { notes?: unknown }).notes;
  if (notes === undefined || notes === null) {
    return { ok: true as const, value: null };
  }

  if (typeof notes !== 'string') {
    return { ok: false as const, error: 'Invalid item notes' };
  }

  const trimmedNotes = notes.trim();
  if (!trimmedNotes) {
    return { ok: true as const, value: null };
  }

  if (trimmedNotes.length > MAX_ITEM_NOTES_LENGTH) {
    return { ok: false as const, error: 'Item notes are too long' };
  }

  return { ok: true as const, value: { notes: trimmedNotes } };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableSessionId, tableIdOrSlug, items, guestSessionId } = body;

    if (!tableSessionId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getDb();

    // Verify session is active
    const session = await db.select().from(tableSessions).where(eq(tableSessions.id, tableSessionId)).limit(1).then(res => res[0]);
    if (!session || session.status !== 'active') {
      return NextResponse.json({ error: 'Table session is not active' }, { status: 400 });
    }

    const ownershipError = await verifyTableSessionOwnership(db, session, tableIdOrSlug);
    if (ownershipError) return ownershipError;

    const itemsToInsert = [];
    let serverTotalAmount = 0;

    for (const item of items as IncomingOrderItem[]) {
      const menuItemId = typeof item.menuItemId === 'string'
        ? item.menuItemId
        : typeof item.id === 'string'
          ? item.id
          : null;

      if (!menuItemId) {
        return NextResponse.json({ error: 'Item missing menuItemId or id' }, { status: 400 });
      }

      const canonicalItem = canonicalMenuItemById.get(menuItemId);
      if (!canonicalItem) {
        return NextResponse.json({ error: 'Unknown menu item' }, { status: 400 });
      }

      if (
        typeof item.quantity !== 'number' ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0 ||
        item.quantity > MAX_ITEM_QUANTITY
      ) {
        return NextResponse.json({ error: 'Invalid item quantity' }, { status: 400 });
      }

      const normalizedOptions = getNormalizedItemOptions(item.options);
      if (!normalizedOptions.ok) {
        return NextResponse.json({ error: normalizedOptions.error }, { status: 400 });
      }

      serverTotalAmount += canonicalItem.price * item.quantity;

      itemsToInsert.push({
        menuItemId,
        name: canonicalItem.name,
        source: canonicalItem.source || 'harlem',
        quantity: item.quantity,
        price: canonicalItem.price,
        options: normalizedOptions.value ? JSON.stringify(normalizedOptions.value) : null,
      });
    }

    // Insert order
    const [newOrder] = await db.insert(orders).values({
      tableSessionId,
      guestSessionId: guestSessionId || null,
      status: 'new',
      totalAmount: serverTotalAmount,
    }).returning();

    // Insert order items
    const orderItemsToInsert = itemsToInsert.map((item) => ({
      orderId: newOrder.id,
      ...item,
    }));


    const insertedItems = await db.insert(orderItems).values(orderItemsToInsert).returning();

    return NextResponse.json({
      order: newOrder,
      items: insertedItems,
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
