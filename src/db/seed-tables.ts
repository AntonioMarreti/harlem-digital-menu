import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { tables } from './schema';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pilotTables = Array.from({ length: 10 }, (_, index) => {
  const number = index + 1;
  return {
    name: `Стол ${number}`,
    qrSlug: `h${String(number).padStart(2, '0')}`,
  };
});

async function runSeedTables() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required for seeding pilot tables');
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  await db.insert(tables)
    .values(pilotTables)
    .onConflictDoNothing({ target: tables.qrSlug });

  console.log('Seeded pilot tables h01-h10');
  process.exit(0);
}

runSeedTables().catch((error) => {
  console.error('Pilot tables seed failed:', error);
  process.exit(1);
});
