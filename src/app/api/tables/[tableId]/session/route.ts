export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { tables, tableSessions } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: { tableId: string } }) {
  try {
    const db = getDb();

    // Find table by id or qrSlug
    let table = null;

    // Check if tableId is a valid UUID
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (uuidRegex.test(params.tableId)) {
      table = await db.select().from(tables).where(eq(tables.id, params.tableId)).limit(1).then(res => res[0]);
    }

    if (!table) {
      table = await db.select().from(tables).where(eq(tables.qrSlug, params.tableId)).limit(1).then(res => res[0]);
    }

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Find active session
    let session = await db.select().from(tableSessions).where(
      and(
        eq(tableSessions.tableId, table.id),
        eq(tableSessions.status, 'active')
      )
    ).orderBy(desc(tableSessions.createdAt)).limit(1).then(res => res[0]);

    // Create a new active session if none exists
    if (!session) {
      const [newSession] = await db.insert(tableSessions).values({
        tableId: table.id,
        status: 'active'
      }).returning();
      session = newSession;
    }

    return NextResponse.json({ session, table }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' }
    });

  } catch (error: unknown) {
    console.error('Error fetching/creating table session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    {
      status: 405,
      headers: { Allow: 'GET' },
    }
  );
}
