import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { tables, tableSessions, orders, orderItems } from './schema';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runSeed() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required for seeding');
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  console.log('Seeding database...');

  try {
    // 1. Create a demo table compatible with /t/demo
    console.log('Seeding tables...');
    const createdTables = await db.insert(tables).values([
      { name: 'Demo Table', qrSlug: 'demo' },
      { name: 'Table 2', qrSlug: 't2' },
      { name: 'VIP Lounge', qrSlug: 't3' },
    ]).onConflictDoNothing({ target: tables.qrSlug }).returning();

    let demoTable = createdTables.find(t => t.qrSlug === 'demo');
    if (!demoTable) {
      const existingTables = await db.select().from(tables);
      demoTable = existingTables.find(t => t.qrSlug === 'demo');
    }
    if (!demoTable) throw new Error('Demo table not created or found');

    // 2. Create one active demo table session for testing
    console.log('Seeding table sessions...');
    const sessions = await db.insert(tableSessions).values([
      { tableId: demoTable.id, status: 'active' },
    ]).returning();
    const demoSession = sessions[0];

    // 3. Seed some mock orders to ensure harlem and craft_beery sources are present
    console.log('Seeding orders...');
    const order1 = await db.insert(orders).values({
      tableSessionId: demoSession.id,
      status: 'new',
      totalAmount: 1570, // 1290 + 280
    }).returning();

    await db.insert(orderItems).values([
      { orderId: order1[0].id, menuItemId: 'item_2', name: 'Кальян премиум', source: 'harlem', quantity: 1, price: 1290 },
      { orderId: order1[0].id, menuItemId: 'tea_2', name: 'Чай 900 мл', source: 'harlem', quantity: 1, price: 280 },
    ]);

    const order2 = await db.insert(orders).values({
      tableSessionId: demoSession.id,
      status: 'preparing',
      totalAmount: 1110, // 590 + 420 + 100
    }).returning();

    await db.insert(orderItems).values([
      { orderId: order2[0].id, menuItemId: 'cb_20', name: 'Дядя Сэм', source: 'craft_beery', quantity: 1, price: 590 },
      { orderId: order2[0].id, menuItemId: 'cb_27', name: 'Греческий', source: 'craft_beery', quantity: 1, price: 420 },
      { orderId: order2[0].id, menuItemId: 'cb_40', name: 'Соус ручной работы', source: 'craft_beery', quantity: 1, price: 100 },
    ]);

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

runSeed();
