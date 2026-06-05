export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { tableSessions, tables } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { requireStaffAccess } from '@/lib/staff-auth';

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
const ACTIVE_SESSION_UNIQUE_INDEX = 'table_sessions_one_active_per_table_unique';

function isActiveSessionUniqueViolation(error: unknown) {
  const candidates = [error];

  if (error && typeof error === 'object' && 'cause' in error) {
    candidates.push((error as { cause?: unknown }).cause);
  }

  return candidates.some((candidate) => {
    if (!candidate || typeof candidate !== 'object') {
      return false;
    }

    const pgError = candidate as { code?: unknown; constraint?: unknown; message?: unknown };
    return pgError.code === '23505' && (
      pgError.constraint === ACTIVE_SESSION_UNIQUE_INDEX ||
      (typeof pgError.message === 'string' && pgError.message.includes(ACTIVE_SESSION_UNIQUE_INDEX))
    );
  });
}

async function findTableByIdOrSlug(db: ReturnType<typeof getDb>, tableIdOrSlug: string) {
  if (uuidRegex.test(tableIdOrSlug)) {
    const tableById = await db.select().from(tables).where(eq(tables.id, tableIdOrSlug)).limit(1).then(res => res[0]);
    if (tableById) {
      return tableById;
    }
  }

  return db.select().from(tables).where(eq(tables.qrSlug, tableIdOrSlug)).limit(1).then(res => res[0]);
}

export async function PATCH(request: NextRequest, { params }: { params: { sessionId: string } }) {
  const unauthorized = requireStaffAccess(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const targetTableIdOrSlug = typeof body.targetTableIdOrSlug === 'string'
      ? body.targetTableIdOrSlug.trim()
      : '';

    if (!targetTableIdOrSlug) {
      return NextResponse.json({ error: 'Target table is required' }, { status: 400 });
    }

    const db = getDb();

    const sourceSession = await db.select()
      .from(tableSessions)
      .where(eq(tableSessions.id, params.sessionId))
      .limit(1)
      .then(res => res[0]);

    if (!sourceSession) {
      return NextResponse.json({ error: 'Table session not found' }, { status: 404 });
    }

    if (sourceSession.status !== 'active') {
      return NextResponse.json({ error: 'Table session is not active' }, { status: 409 });
    }

    const targetTable = await findTableByIdOrSlug(db, targetTableIdOrSlug);

    if (!targetTable) {
      return NextResponse.json({ error: 'Target table not found' }, { status: 404 });
    }

    if (targetTable.id === sourceSession.tableId) {
      return NextResponse.json({ error: 'Target table is the current table' }, { status: 400 });
    }

    const targetActiveSession = await db.select()
      .from(tableSessions)
      .where(and(
        eq(tableSessions.tableId, targetTable.id),
        eq(tableSessions.status, 'active')
      ))
      .limit(1)
      .then(res => res[0]);

    if (targetActiveSession && targetActiveSession.id !== sourceSession.id) {
      return NextResponse.json({ error: 'Target table is occupied' }, { status: 409 });
    }

    let updatedSession: typeof tableSessions.$inferSelect | undefined;
    try {
      [updatedSession] = await db.update(tableSessions)
        .set({ tableId: targetTable.id })
        .where(and(
          eq(tableSessions.id, sourceSession.id),
          eq(tableSessions.status, 'active')
        ))
        .returning();
    } catch (error: unknown) {
      if (isActiveSessionUniqueViolation(error)) {
        return NextResponse.json({ error: 'Target table is occupied' }, { status: 409 });
      }

      throw error;
    }

    if (!updatedSession) {
      return NextResponse.json({ error: 'Table session is not active' }, { status: 409 });
    }

    return NextResponse.json({ session: updatedSession, table: targetTable }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
    });
  } catch (error: unknown) {
    console.error('Error moving table session:', error);
    return NextResponse.json({ error: 'Internal server error' }, {
      status: 500,
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
    });
  }
}
