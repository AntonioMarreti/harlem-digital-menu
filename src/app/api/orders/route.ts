export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { tableSessions, orders, orderItems, menuItemAvailability } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { verifyRequiredTableSessionOwnership } from '@/lib/table-session-ownership';
import { menuItems } from '@/lib/mock-data';
import { logError, logInfo, logWarn } from '@/lib/server-logging';

const MAX_ITEM_QUANTITY = 99;
const MAX_ITEM_NOTES_LENGTH = 500;
const MIN_IDEMPOTENCY_KEY_LENGTH = 8;
const MAX_IDEMPOTENCY_KEY_LENGTH = 128;
const IDEMPOTENT_ITEMS_RETRY_ATTEMPTS = 5;
const IDEMPOTENT_ITEMS_RETRY_DELAY_MS = 100;

const canonicalMenuItemById = new Map(menuItems.map((item) => [item.id, item]));

type IncomingOrderItem = {
  id?: unknown;
  menuItemId?: unknown;
  quantity?: unknown;
  options?: unknown;
};

function getNormalizedItemOptions(options: unknown) {
  if (options === undefined || options === null) {
    return { ok: true as const, value: null };
  }

  if (typeof options !== 'object' || Array.isArray(options)) {
    return { ok: false as const, error: 'Invalid item options' };
  }

  if (!('notes' in options)) {
    return { ok: true as const, value: null };
  }

  const notes = (options as { notes?: unknown }).notes;
  if (notes === undefined || notes === null) {
    return { ok: true as const, value: null };
  }

  if (typeof notes !== 'string') {
    return { ok: false as const, error: 'Invalid item notes' };
  }

  const trimmedNotes = notes.trim();
  if (!trimmedNotes) {
    return { ok: true as const, value: null };
  }

  if (trimmedNotes.length > MAX_ITEM_NOTES_LENGTH) {
    return { ok: false as const, error: 'Item notes are too long' };
  }

  return { ok: true as const, value: { notes: trimmedNotes } };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getExistingIdempotentOrder(
  db: ReturnType<typeof getDb>,
  tableSessionId: string,
  idempotencyKey: string
) {
  const existingOrder = await db.select().from(orders).where(
    and(
      eq(orders.tableSessionId, tableSessionId),
      eq(orders.idempotencyKey, idempotencyKey)
    )
  ).limit(1).then(res => res[0]);

  if (!existingOrder) {
    return null;
  }

  for (let attempt = 0; attempt < IDEMPOTENT_ITEMS_RETRY_ATTEMPTS; attempt += 1) {
    const existingItems = await db.select().from(orderItems).where(eq(orderItems.orderId, existingOrder.id));
    if (existingItems.length > 0) {
      return { order: existingOrder, items: existingItems };
    }

    if (attempt < IDEMPOTENT_ITEMS_RETRY_ATTEMPTS - 1) {
      await wait(IDEMPOTENT_ITEMS_RETRY_DELAY_MS);
    }
  }

  return { order: existingOrder, items: [] };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableSessionId, tableIdOrSlug, items, guestSessionId, idempotencyKey } = body;
    const safeTableIdOrSlug = typeof tableIdOrSlug === 'string' && tableIdOrSlug.length <= 255
      ? tableIdOrSlug
      : undefined;

    if (!tableSessionId || !items || !Array.isArray(items) || items.length === 0) {
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

    const ownershipError = await verifyRequiredTableSessionOwnership(db, session, tableIdOrSlug);
    if (ownershipError) return ownershipError;

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
        return NextResponse.json({ error: 'Item missing menuItemId or id' }, { status: 400 });
      }

      const canonicalItem = canonicalMenuItemById.get(menuItemId);
      if (!canonicalItem) {
        logWarn('order.rejected', {
          code: 'UNKNOWN_MENU_ITEM',
          tableSessionId,
          tableIdOrSlug: safeTableIdOrSlug,
          itemCount: items.length,
        });
        return NextResponse.json({ error: 'Unknown menu item' }, { status: 400 });
      }

      const isAvailable = availabilityMap.get(menuItemId) ?? canonicalItem.isAvailable ?? true;
      if (!isAvailable) {
        logWarn('order.rejected', {
          code: 'ITEM_UNAVAILABLE',
          tableSessionId,
          tableIdOrSlug: safeTableIdOrSlug,
          itemId: menuItemId,
        });
        return NextResponse.json({
          error: `Товар «${canonicalItem.name}» временно недоступен`,
          code: 'ITEM_UNAVAILABLE'
        }, { status: 400 });
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
        return NextResponse.json({ error: 'Invalid item quantity' }, { status: 400 });
      }

      const normalizedOptions = getNormalizedItemOptions(item.options);
      if (!normalizedOptions.ok) {
        logWarn('order.rejected', {
          code: 'INVALID_ITEM_OPTIONS',
          tableSessionId,
          tableIdOrSlug: safeTableIdOrSlug,
          itemCount: items.length,
        });
        return NextResponse.json({ error: normalizedOptions.error }, { status: 400 });
      }

      let choiceLabel: string | null = null;
      if (normalizedOptions.value?.notes) {
        const notes = normalizedOptions.value.notes;
        if (notes.startsWith('Сорт: ')) {
          choiceLabel = notes.substring('Сорт: '.length).trim();
        } else if (notes.startsWith('Вкус: ')) {
          choiceLabel = notes.substring('Вкус: '.length).trim();
        }
      }

      if (choiceLabel) {
        const variantId = canonicalItem.categoryId === 'cat_tea' ? `tea::${choiceLabel}` : `${menuItemId}::${choiceLabel}`;
        const isVariantAvailable = availabilityMap.get(variantId) ?? true;
        if (!isVariantAvailable) {
          logWarn('order.rejected', {
            code: 'VARIANT_UNAVAILABLE',
            tableSessionId,
            tableIdOrSlug: safeTableIdOrSlug,
            itemId: menuItemId,
            variantId,
          });
          return NextResponse.json({
            error: `Вариант «${choiceLabel}» для товара «${canonicalItem.name}» временно недоступен`,
            code: 'VARIANT_UNAVAILABLE'
          }, { status: 400 });
        }
      }

      serverTotalAmount += canonicalItem.price * item.quantity;

      itemsToInsert.push({
        menuItemId,
        name: canonicalItem.name,
        source: canonicalItem.source || 'harlem',
        quantity: item.quantity,
        price: canonicalItem.price,
        options: normalizedOptions.value ? JSON.stringify(normalizedOptions.value) : null,
      });
    }

    // Insert order
    const [newOrder] = await db.insert(orders).values({
      tableSessionId,
      guestSessionId: finalGuestSessionId,
      idempotencyKey: normalizedIdempotencyKey,
      status: 'new',
      totalAmount: serverTotalAmount,
    }).onConflictDoNothing({
      target: [orders.tableSessionId, orders.idempotencyKey],
    }).returning();

    if (!newOrder) {
      const existingOrderResponse = await getExistingIdempotentOrder(db, tableSessionId, normalizedIdempotencyKey);
      if (!existingOrderResponse || existingOrderResponse.items.length === 0) {
        return NextResponse.json({ error: 'Idempotent order is still being created' }, { status: 503 });
      }

      logInfo('order.idempotent_hit', {
        orderId: existingOrderResponse.order.id,
        tableSessionId,
        tableIdOrSlug: safeTableIdOrSlug,
      });

      return NextResponse.json({
        ...existingOrderResponse,
        idempotent: true,
      }, { status: 200 });
    }

    // Insert order items
    const orderItemsToInsert = itemsToInsert.map((item) => ({
      orderId: newOrder.id,
      ...item,
    }));


    const insertedItems = await db.insert(orderItems).values(orderItemsToInsert).returning();

    logInfo('order.created', {
      orderId: newOrder.id,
      tableSessionId,
      tableIdOrSlug: safeTableIdOrSlug,
      itemCount: insertedItems.length,
      totalAmount: newOrder.totalAmount,
    });

    return NextResponse.json({
      order: newOrder,
      items: insertedItems,
    }, { status: 201 });

  } catch (error: unknown) {
    logError('order.error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
