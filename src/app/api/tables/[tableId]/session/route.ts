export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { tables, tableSessions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: { tableId: string } }) {
  try {

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      session: { id: "mock-session-123", tableId: params.tableId, status: "active", createdAt: new Date().toISOString() },
      table: { id: params.tableId, name: "Mock Table", qrSlug: params.tableId }
    }, { status: 200 });
  }
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
    ).limit(1).then(res => res[0]);

    // Create a new active session if none exists
    if (!session) {
      const [newSession] = await db.insert(tableSessions).values({
        tableId: table.id,
        status: 'active'
      }).returning();
      session = newSession;
    }

    return NextResponse.json({ session, table }, { status: 200 });

  } catch (error: unknown) {
    console.error('Error fetching/creating table session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { tableId: string } }) {
  try {
    const db = getDb();

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

    // Close any existing active sessions for this table
    await db.update(tableSessions)
      .set({ status: 'closed', closedAt: new Date() })
      .where(and(eq(tableSessions.tableId, table.id), eq(tableSessions.status, 'active')));

    // Create a new active session
    const [newSession] = await db.insert(tableSessions).values({
      tableId: table.id,
      status: 'active'
    }).returning();

    return NextResponse.json({ session: newSession, table }, { status: 201 });

  } catch (error: unknown) {
    console.error('Error creating table session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
