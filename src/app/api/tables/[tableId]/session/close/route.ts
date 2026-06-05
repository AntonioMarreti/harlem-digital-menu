export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { tables, tableSessions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireStaffAccess } from '@/lib/staff-auth';
import { logError, logInfo } from '@/lib/server-logging';

export async function POST(request: NextRequest, { params }: { params: { tableId: string } }) {
  const unauthorized = requireStaffAccess(request);
  if (unauthorized) return unauthorized;

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
    const closedSessions = await db.update(tableSessions)
      .set({ status: 'closed', closedAt: new Date() })
      .where(and(eq(tableSessions.tableId, table.id), eq(tableSessions.status, 'active')))
      .returning({ id: tableSessions.id });

    logInfo('table_session.closed', {
      tableId: table.id,
      tableIdOrSlug: params.tableId,
      closedCount: closedSessions.length,
    });

    return NextResponse.json({ success: true, message: 'Table session closed successfully' }, { status: 200 });

  } catch (error: unknown) {
    logError('table_session.close_error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
