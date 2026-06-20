import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { menuItemAvailability } from '@/db/schema';
import { requireStaffAccess } from '@/lib/staff-auth';
import { menuItems } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const unauthorized = requireStaffAccess(request);
  if (unauthorized) return unauthorized;

  try {
    const db = getDb();
    const records = await db.select().from(menuItemAvailability);

    const availabilityMap: Record<string, boolean> = {};
    for (const record of records) {
      availabilityMap[record.itemId] = record.isAvailable;
    }

    return NextResponse.json(availabilityMap, { status: 200 });
  } catch (error) {
    console.error('Error fetching staff menu availability:', error);
    const isMissingTable = error instanceof Error && error.message.includes('relation "menu_item_availability" does not exist');
    if (isMissingTable) {
      return NextResponse.json({}, { status: 200 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const unauthorized = requireStaffAccess(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { itemId, isAvailable } = body;

    if (!itemId || typeof isAvailable !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const baseItemId = itemId.split('::')[0];
    const itemExists = menuItems.some(m => m.id === baseItemId);
    if (!itemExists) {
      return NextResponse.json({ error: 'Item not found in menu' }, { status: 404 });
    }

    const db = getDb();

    await db.insert(menuItemAvailability)
      .values({
        itemId,
        isAvailable,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: menuItemAvailability.itemId,
        set: {
          isAvailable,
          updatedAt: new Date(),
        }
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating staff menu availability:', error);
    const isMissingTable = error instanceof Error && error.message.includes('relation "menu_item_availability" does not exist');
    if (isMissingTable) {
      return NextResponse.json({ error: 'Стоп-лист пока недоступен (ожидается обновление БД)' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
