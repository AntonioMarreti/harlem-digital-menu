export const dynamic = 'force-dynamic';
import { NextResponse, NextRequest } from 'next/server';
import { getDb } from '@/db';
import { staffCalls, tableSessions, tables } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const db = getDb();

    // Fetch active staff calls (status = 'new')
    const activeCalls = await db.select({
      call: staffCalls,
      tableSession: tableSessions,
      table: tables,
    })
    .from(staffCalls)
    .innerJoin(tableSessions, eq(staffCalls.tableSessionId, tableSessions.id))
    .innerJoin(tables, eq(tableSessions.tableId, tables.id))
    .where(eq(staffCalls.status, 'new'));

    const formattedCalls = activeCalls.map(row => ({
      id: row.call.id,
      reason: row.call.reason,
      status: row.call.status,
      createdAt: row.call.createdAt,
      tableSessionId: row.tableSession.id,
      tableId: row.table.id,
      tableName: row.table.name,
      tableQrSlug: row.table.qrSlug,
    }));

    return NextResponse.json({ calls: formattedCalls }, { status: 200 });

  } catch (error: unknown) {
    console.error('Error fetching staff calls:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableSessionId, reason, guestSessionId } = body;

    if (!tableSessionId || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getDb();

    // Verify session is active
    const session = await db.select().from(tableSessions).where(eq(tableSessions.id, tableSessionId)).limit(1).then(res => res[0]);
    if (!session || session.status !== 'active') {
      return NextResponse.json({ error: 'Table session is not active' }, { status: 400 });
    }

    // Insert staff call
    const [newCall] = await db.insert(staffCalls).values({
      tableSessionId,
      guestSessionId: guestSessionId || null,
      reason,
      status: 'new',
    }).returning();

    return NextResponse.json({ call: newCall }, { status: 201 });

  } catch (error: unknown) {
    console.error('Error creating staff call:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
