import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, varchar, integer, pgEnum, uuid, uniqueIndex } from 'drizzle-orm/pg-core';

// Enums
export const itemSourceEnum = pgEnum('item_source', ['harlem', 'craft_beery']);
export const orderStatusEnum = pgEnum('order_status', ['new', 'accepted', 'preparing', 'delivered', 'closed', 'cancelled']);
export const staffCallStatusEnum = pgEnum('staff_call_status', ['new', 'handled', 'cancelled']);
export const tableSessionStatusEnum = pgEnum('table_session_status', ['active', 'closed', 'cancelled', 'expired']);

// Tables
export const tables = pgTable('tables', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(), // e.g., 'Table 1'
  qrSlug: varchar('qr_slug', { length: 255 }).notNull().unique(), // e.g., 'table-1'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tableSessions = pgTable('table_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  tableId: uuid('table_id').references(() => tables.id).notNull(),
  status: tableSessionStatusEnum('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  closedAt: timestamp('closed_at'),
}, (table) => {
  return {
    oneActivePerTable: uniqueIndex('table_sessions_one_active_per_table_unique')
      .on(table.tableId)
      .where(sql`${table.status} = 'active'`),
  };
});

export const guestSessions = pgTable('guest_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  tableSessionId: uuid('table_session_id').references(() => tableSessions.id), // Nullable if created before joining a table
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // Add other fields as needed (e.g. device ID, name)
});

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  tableSessionId: uuid('table_session_id').references(() => tableSessions.id).notNull(),
  guestSessionId: uuid('guest_session_id').references(() => guestSessions.id), // Optional: associate order with specific guest
  idempotencyKey: varchar('idempotency_key', { length: 128 }),
  status: orderStatusEnum('status').default('new').notNull(),
  totalAmount: integer('total_amount').notNull().default(0), // Using integer for cents
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    orderIdempotencyKeyUnique: uniqueIndex('orders_table_session_id_idempotency_key_unique')
      .on(table.tableSessionId, table.idempotencyKey),
  };
});

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  menuItemId: varchar('menu_item_id', { length: 255 }).notNull(), // Assuming string IDs for now, can be changed later
  name: varchar('name', { length: 255 }).notNull(),
  source: itemSourceEnum('source').default('harlem').notNull(),
  quantity: integer('quantity').notNull().default(1),
  price: integer('price').notNull().default(0), // Using integer for cents
  options: text('options'), // JSON string or text for things like hookah strength/flavor
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const staffCalls = pgTable('staff_calls', {
  id: uuid('id').defaultRandom().primaryKey(),
  tableSessionId: uuid('table_session_id').references(() => tableSessions.id).notNull(),
  guestSessionId: uuid('guest_session_id').references(() => guestSessions.id),
  reason: varchar('reason', { length: 255 }).notNull(), // e.g. "waiter", "coals", "bill"
  status: staffCallStatusEnum('status').default('new').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  handledAt: timestamp('handled_at'),
});
