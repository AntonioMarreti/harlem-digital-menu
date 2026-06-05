export const dynamic = 'force-dynamic';
import { NextResponse, NextRequest } from 'next/server';
import { getDb } from '@/db';
import { staffCalls, tableSessions, tables } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireStaffAccess } from '@/lib/staff-auth';
import { verifyRequiredTableSessionOwnership } from '@/lib/table-session-ownership';
import { logError, logInfo, logWarn } from '@/lib/server-logging';

const validStaffCallReasons = new Set(['waiter', 'coals', 'bill', 'help']);

export async function GET(request: NextRequest) {
  const unauthorized = requireStaffAccess(request);
  if (unauthorized) return unauthorized;

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
    .where(
      and(
        eq(staffCalls.status, 'new'),
        eq(tableSessions.status, 'active')
      )
    );

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
    const { tableSessionId, tableIdOrSlug, reason, guestSessionId } = body;
    const safeTableIdOrSlug = typeof tableIdOrSlug === 'string' && tableIdOrSlug.length <= 255
      ? tableIdOrSlug
      : undefined;

    if (!tableSessionId || !reason) {
      logWarn('staff_call.rejected', {
        code: 'MISSING_REQUIRED_FIELDS',
        tableSessionId: typeof tableSessionId === 'string' ? tableSessionId : undefined,
        tableIdOrSlug: safeTableIdOrSlug,
      });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (typeof reason !== 'string' || !validStaffCallReasons.has(reason)) {
      logWarn('staff_call.rejected', {
        code: 'INVALID_STAFF_CALL_REASON',
        tableSessionId,
        tableIdOrSlug: safeTableIdOrSlug,
      });
      return NextResponse.json({ error: 'Invalid staff call reason' }, { status: 400 });
    }

    let finalGuestSessionId = null;
    if (guestSessionId !== undefined && guestSessionId !== null) {
      if (typeof guestSessionId !== 'string') {
        logWarn('staff_call.rejected', {
          code: 'INVALID_GUEST_SESSION_ID',
          tableSessionId,
          tableIdOrSlug: safeTableIdOrSlug,
          reason,
        });
        return NextResponse.json({
          error: 'Invalid guestSessionId',
          code: 'INVALID_GUEST_SESSION_ID'
        }, { status: 400 });
      }
      const trimmedGuestSessionId = guestSessionId.trim();
      if (trimmedGuestSessionId.length > 128) {
        logWarn('staff_call.rejected', {
          code: 'INVALID_GUEST_SESSION_ID',
          tableSessionId,
          tableIdOrSlug: safeTableIdOrSlug,
          reason,
        });
        return NextResponse.json({
          error: 'Invalid guestSessionId',
          code: 'INVALID_GUEST_SESSION_ID'
        }, { status: 400 });
      }
      finalGuestSessionId = trimmedGuestSessionId || null;
    }

    const db = getDb();

    // Verify session is active
    const session = await db.select().from(tableSessions).where(eq(tableSessions.id, tableSessionId)).limit(1).then(res => res[0]);
    if (!session || session.status !== 'active') {
      logWarn('staff_call.rejected', {
        code: 'TABLE_SESSION_NOT_ACTIVE',
        tableSessionId,
        tableIdOrSlug: safeTableIdOrSlug,
        reason,
      });
      return NextResponse.json({ error: 'Table session is not active' }, { status: 400 });
    }

    const ownershipError = await verifyRequiredTableSessionOwnership(db, session, tableIdOrSlug);
    if (ownershipError) {
      logWarn('staff_call.rejected', {
        code: 'OWNERSHIP_GUARD_REJECTED',
        tableSessionId,
        tableIdOrSlug: safeTableIdOrSlug,
        reason,
      });
      return ownershipError;
    }

    if (reason === 'bill') {
      const existingBillCall = await db.select().from(staffCalls).where(
        and(
          eq(staffCalls.tableSessionId, tableSessionId),
          eq(staffCalls.reason, 'bill'),
          eq(staffCalls.status, 'new')
        )
      ).limit(1).then(res => res[0]);

      if (existingBillCall) {
        logInfo('staff_call.reused', {
          callId: existingBillCall.id,
          tableSessionId,
          tableIdOrSlug: safeTableIdOrSlug,
          reason,
        });
        return NextResponse.json({ call: existingBillCall }, { status: 200 });
      }
    }

    // Insert staff call
    const [newCall] = await db.insert(staffCalls).values({
      tableSessionId,
      guestSessionId: finalGuestSessionId,
      reason,
      status: 'new',
    }).returning();

    logInfo('staff_call.created', {
      callId: newCall.id,
      tableSessionId,
      tableIdOrSlug: safeTableIdOrSlug,
      reason,
    });

    return NextResponse.json({ call: newCall }, { status: 201 });

  } catch (error: unknown) {
    logError('staff_call.error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
