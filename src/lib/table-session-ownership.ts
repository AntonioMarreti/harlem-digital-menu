import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { tableSessions, tables } from '@/db/schema';
import { eq } from 'drizzle-orm';

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

export async function findTableByIdOrSlug(db: ReturnType<typeof getDb>, tableIdOrSlug: string) {
  if (uuidRegex.test(tableIdOrSlug)) {
    const tableById = await db.select().from(tables).where(eq(tables.id, tableIdOrSlug)).limit(1).then(res => res[0]);
    if (tableById) {
      return tableById;
    }
  }

  return db.select().from(tables).where(eq(tables.qrSlug, tableIdOrSlug)).limit(1).then(res => res[0]);
}

export async function createMovedTableSessionResponse(db: ReturnType<typeof getDb>, targetTableId: string) {
  const targetTable = await db.select().from(tables).where(eq(tables.id, targetTableId)).limit(1).then(res => res[0]);

  return NextResponse.json({
    error: 'Table session moved to another table',
    code: 'TABLE_SESSION_MOVED',
    targetTableQrSlug: targetTable?.qrSlug,
    targetTableName: targetTable?.name,
  }, { status: 409 });
}

export async function verifyTableSessionOwnership(
  db: ReturnType<typeof getDb>,
  session: typeof tableSessions.$inferSelect,
  tableIdOrSlug: unknown
) {
  if (typeof tableIdOrSlug !== 'string' || !tableIdOrSlug.trim()) {
    return null;
  }

  const requestTable = await findTableByIdOrSlug(db, tableIdOrSlug.trim());

  if (!requestTable) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  }

  if (session.tableId !== requestTable.id) {
    return createMovedTableSessionResponse(db, session.tableId);
  }

  return null;
}

export async function verifyRequiredTableSessionOwnership(
  db: ReturnType<typeof getDb>,
  session: typeof tableSessions.$inferSelect,
  tableIdOrSlug: unknown
) {
  if (typeof tableIdOrSlug !== 'string' || !tableIdOrSlug.trim()) {
    return NextResponse.json({
      error: 'tableIdOrSlug is required',
      code: 'TABLE_CONTEXT_REQUIRED',
    }, { status: 400 });
  }

  return verifyTableSessionOwnership(db, session, tableIdOrSlug);
}
