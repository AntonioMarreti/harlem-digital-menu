import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { menuItemAvailability } from '@/db/schema';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const db = getDb();
    const records = await db.select().from(menuItemAvailability);
    
    const availabilityMap: Record<string, boolean> = {};
    for (const record of records) {
      availabilityMap[record.itemId] = record.isAvailable;
    }

    return NextResponse.json(availabilityMap, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error fetching menu availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
