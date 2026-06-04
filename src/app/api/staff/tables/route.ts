export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { tableSessions, tables } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireStaffAccess } from '@/lib/staff-auth';

function getTableSortNumber(name: string, qrSlug: string) {
  const nameMatch = name.match(/(\d+)/);
  if (nameMatch) {
    return Number(nameMatch[1]);
  }

  const slugMatch = qrSlug.match(/^h0?([1-9]\d*)$/i);
  if (slugMatch) {
    return Number(slugMatch[1]);
  }

  return Number.MAX_SAFE_INTEGER;
}

export async function GET(request: NextRequest) {
  const unauthorized = requireStaffAccess(request);
  if (unauthorized) return unauthorized;

  try {
    const db = getDb();

    const allTables = await db.select().from(tables);
    const activeSessions = await db.select().from(tableSessions).where(eq(tableSessions.status, 'active'));

    const activeSessionByTableId = new Map(
      activeSessions.map((session) => [session.tableId, session.id])
    );

    const formattedTables = allTables
      .map((table) => {
        const activeSessionId = activeSessionByTableId.get(table.id) ?? null;

        return {
          id: table.id,
          name: table.name,
          qrSlug: table.qrSlug,
          activeSessionId,
          isOccupied: Boolean(activeSessionId),
        };
      })
      .sort((left, right) => {
        const leftNumber = getTableSortNumber(left.name, left.qrSlug);
        const rightNumber = getTableSortNumber(right.name, right.qrSlug);

        if (leftNumber !== rightNumber) {
          return leftNumber - rightNumber;
        }

        return left.name.localeCompare(right.name, 'ru');
      });

    return NextResponse.json({ tables: formattedTables }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
    });
  } catch (error: unknown) {
    console.error('Error fetching staff tables:', error);
    return NextResponse.json({ error: 'Internal server error' }, {
      status: 500,
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
    });
  }
}
