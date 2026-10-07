export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { tableSessions, menuItemAvailability } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyRequiredTableSessionOwnership } from '@/lib/table-session-ownership';
import { menuItems } from '@/lib/mock-data';
import { getCanonicalOrderItemPrice } from '@/lib/menu-pricing';
import { validateCanonicalItemOptions } from '@/lib/menu-choices';
import { createNeonOrderWritePort, verifyOwnershipThenPrepareOrReuseIdempotentOrder } from '@/lib/order-persistence';
import { TableSessionNotActiveError } from '@/lib/table-session-lifecycle';
import { logError, logInfo, logWarn } from '@/lib/server-logging';

const MAX_ITEM_QUANTITY = 99;
const MIN_IDEMPOTENCY_KEY_LENGTH = 8;
const MAX_IDEMPOTENCY_KEY_LENGTH = 128;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const canonicalMenuItemById = new Map(menuItems.map((item) => [item.id, item]));

type IncomingOrderItem = {
  id?: unknown;
  menuItemId?: unknown;
  quantity?: unknown;
  options?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableSessionId, tableIdOrSlug, items, guestSessionId, idempotencyKey } = body;
    const safeTableIdOrSlug = typeof tableIdOrSlug === 'string' && tableIdOrSlug.length <= 255
      ? tableIdOrSlug
      : undefined;

    if (
      typeof tableSessionId !== 'string' ||
      !UUID_PATTERN.test(tableSessionId) ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      logWarn('order.rejected', {
        code: 'MISSING_REQUIRED_FIELDS',
        tableSessionId: typeof tableSessionId === 'string' ? tableSessionId : undefined,
        tableIdOrSlug: safeTableIdOrSlug,
      });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (typeof idempotencyKey !== 'string' || !idempotencyKey.trim()) {
      logWarn('order.rejected', {
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        tableSessionId,
        tableIdOrSlug: safeTableIdOrSlug,
      });
      return NextResponse.json({
        error: 'idempotencyKey is required',
        code: 'IDEMPOTENCY_KEY_REQUIRED',
      }, { status: 400 });
    }

    const normalizedIdempotencyKey = idempotencyKey.trim();
    if (
      normalizedIdempotencyKey.length < MIN_IDEMPOTENCY_KEY_LENGTH ||
      normalizedIdempotencyKey.length > MAX_IDEMPOTENCY_KEY_LENGTH
    ) {
      logWarn('order.rejected', {
        code: 'INVALID_IDEMPOTENCY_KEY',
        tableSessionId,
        tableIdOrSlug: safeTableIdOrSlug,
      });
      return NextResponse.json({
        error: 'Invalid idempotencyKey',
        code: 'INVALID_IDEMPOTENCY_KEY',
      }, { status: 400 });
    }

    let finalGuestSessionId = null;
    if (guestSessionId !== undefined && guestSessionId !== null) {
      if (typeof guestSessionId !== 'string') {
        logWarn('order.rejected', {
          code: 'INVALID_GUEST_SESSION_ID',
          tableSessionId,
          tableIdOrSlug: safeTableIdOrSlug,
        });
        return NextResponse.json({
          error: 'Invalid guestSessionId',
          code: 'INVALID_GUEST_SESSION_ID'
        }, { status: 400 });
      }
      const trimmedGuestSessionId = guestSessionId.trim();
      if (trimmedGuestSessionId.length > 128) {
        logWarn('order.rejected', {
          code: 'INVALID_GUEST_SESSION_ID',
          tableSessionId,
          tableIdOrSlug: safeTableIdOrSlug,
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
      logWarn('order.rejected', {
        code: 'TABLE_SESSION_NOT_ACTIVE',
        tableSessionId,
        tableIdOrSlug: safeTableIdOrSlug,
      });
      return NextResponse.json({ error: 'Table session is not active' }, { status: 400 });
    }

    const writePort = createNeonOrderWritePort(db);
    const resolution = await verifyOwnershipThenPrepareOrReuseIdempotentOrder(
      writePort,
      { tableSessionId, idempotencyKey: normalizedIdempotencyKey },
      () => verifyRequiredTableSessionOwnership(db, session, tableIdOrSlug),
      async () => {
        let availabilityRecords: { itemId: string, isAvailable: boolean }[] = [];
        try {
          availabilityRecords = await db.select().from(menuItemAvailability);
        } catch (err) {
          // Graceful fallback if table doesn't exist yet
          const isMissingTable = err instanceof Error && err.message.includes('relation "menu_item_availability" does not exist');
          if (!isMissingTable) {
            throw err;
          }
        }
        const availabilityMap = new Map(availabilityRecords.map(r => [r.itemId, r.isAvailable]));

        const itemsToInsert = [];
        let serverTotalAmount = 0;
        const pricedAt = new Date();

        for (const item of items as IncomingOrderItem[]) {
          const menuItemId = typeof item.menuItemId === 'string'
            ? item.menuItemId
            : typeof item.id === 'string'
              ? item.id
              : null;

          if (!menuItemId) {
            logWarn('order.rejected', {
              code: 'ITEM_ID_REQUIRED',
              tableSessionId,
              tableIdOrSlug: safeTableIdOrSlug,
              itemCount: items.length,
            });
            return { kind: 'rejected' as const, response: NextResponse.json({ error: 'Item missing menuItemId or id' }, { status: 400 }) };
          }

          const canonicalItem = canonicalMenuItemById.get(menuItemId);
          if (!canonicalItem) {
            logWarn('order.rejected', {
              code: 'UNKNOWN_MENU_ITEM',
              tableSessionId,
              tableIdOrSlug: safeTableIdOrSlug,
              itemCount: items.length,
            });
            return { kind: 'rejected' as const, response: NextResponse.json({ error: 'Unknown menu item' }, { status: 400 }) };
          }

          const isAvailable = availabilityMap.get(menuItemId) ?? canonicalItem.isAvailable ?? true;
          if (!isAvailable) {
            logWarn('order.rejected', {
              code: 'ITEM_UNAVAILABLE',
              tableSessionId,
              tableIdOrSlug: safeTableIdOrSlug,
              itemId: menuItemId,
            });
            return {
              kind: 'rejected' as const,
              response: NextResponse.json({
                error: `Товар «${canonicalItem.name}» временно недоступен`,
                code: 'ITEM_UNAVAILABLE'
              }, { status: 400 }),
            };
          }

          if (
            typeof item.quantity !== 'number' ||
            !Number.isInteger(item.quantity) ||
            item.quantity <= 0 ||
            item.quantity > MAX_ITEM_QUANTITY
          ) {
            logWarn('order.rejected', {
              code: 'INVALID_ITEM_QUANTITY',
              tableSessionId,
              tableIdOrSlug: safeTableIdOrSlug,
              itemCount: items.length,
            });
            return { kind: 'rejected' as const, response: NextResponse.json({ error: 'Invalid item quantity' }, { status: 400 }) };
          }

          const normalizedOptions = validateCanonicalItemOptions(canonicalItem, item.options, availabilityMap);
          if (!normalizedOptions.ok) {
            logWarn('order.rejected', {
              code: normalizedOptions.code,
              tableSessionId,
              tableIdOrSlug: safeTableIdOrSlug,
              itemId: menuItemId,
            });
            return {
              kind: 'rejected' as const,
              response: NextResponse.json({ error: normalizedOptions.error, code: normalizedOptions.code }, { status: 400 }),
            };
          }

          const canonicalPrice = getCanonicalOrderItemPrice(item, pricedAt)!;
          serverTotalAmount += canonicalPrice * item.quantity;

          itemsToInsert.push({
            menuItemId,
            name: canonicalItem.name,
            source: canonicalItem.source || 'harlem',
            quantity: item.quantity,
            price: canonicalPrice,
            options: normalizedOptions.value ? JSON.stringify(normalizedOptions.value) : null,
          });
        }

        return {
          kind: 'ready' as const,
          order: {
            tableSessionId,
            guestSessionId: finalGuestSessionId,
            idempotencyKey: normalizedIdempotencyKey,
            status: 'new' as const,
            totalAmount: serverTotalAmount,
          },
          items: itemsToInsert,
        };
      }
    );

    if (resolution.kind === 'rejected') return resolution.response;
    const persistedOrder = resolution.result;

    if (persistedOrder.idempotent) {
      logInfo('order.idempotent_hit', {
        orderId: persistedOrder.order.id,
        tableSessionId,
        tableIdOrSlug: safeTableIdOrSlug,
      });

      return NextResponse.json({
        order: persistedOrder.order,
        items: persistedOrder.items,
        idempotent: true,
      }, { status: 200 });
    }

    logInfo('order.created', {
      orderId: persistedOrder.order.id,
      tableSessionId,
      tableIdOrSlug: safeTableIdOrSlug,
      itemCount: persistedOrder.items.length,
      totalAmount: persistedOrder.order.totalAmount,
    });

    return NextResponse.json({
      order: persistedOrder.order,
      items: persistedOrder.items,
    }, { status: 201 });

  } catch (error: unknown) {
    if (error instanceof TableSessionNotActiveError) {
      return NextResponse.json({
        error: 'Table session is not active',
        code: 'TABLE_SESSION_NOT_ACTIVE',
      }, { status: 409 });
    }
    logError('order.error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
