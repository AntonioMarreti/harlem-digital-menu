export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { tableSessions, tables } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyTableSessionOwnership } from '@/lib/table-session-ownership';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest, { params }: { params: { tableSessionId: string } }) {
  try {
    const sourceTableIdOrSlug = request.nextUrl.searchParams.get('sourceTableIdOrSlug')?.trim();
    if (!sourceTableIdOrSlug || sourceTableIdOrSlug.length > 255) {
      return NextResponse.json({ error: 'Valid sourceTableIdOrSlug is required' }, { status: 400 });
    }
    if (!UUID_PATTERN.test(params.tableSessionId)) {
      return NextResponse.json({ error: 'Invalid table session ID', code: 'INVALID_TABLE_SESSION_ID' }, { status: 400 });
    }

    const db = getDb();
    const [session] = await db.select().from(tableSessions)
      .where(eq(tableSessions.id, params.tableSessionId)).limit(1);
    if (!session) {
      return NextResponse.json({ error: 'Table session no longer exists', code: 'TABLE_SESSION_NOT_FOUND' }, { status: 404 });
    }
    if (session.status !== 'active') {
      return NextResponse.json({ error: 'Table session is no longer active', code: 'TABLE_SESSION_INACTIVE' }, { status: 404 });
    }

    const ownershipError = await verifyTableSessionOwnership(db, session, sourceTableIdOrSlug);
    if (ownershipError) return ownershipError;

    const [table] = await db.select().from(tables).where(eq(tables.id, session.tableId)).limit(1);
    if (!table) {
      return NextResponse.json({ error: 'Table not found', code: 'TABLE_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ session, table, serverNow: new Date().toISOString() }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
    });
  } catch {
    return NextResponse.json({ error: 'Unable to recover table session', code: 'TABLE_SESSION_RECOVERY_UNAVAILABLE' }, {
      status: 500,
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
    });
  }
}
