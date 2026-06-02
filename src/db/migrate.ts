import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required for migrations');
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  console.log('Running migrations...');

  const start = Date.now();
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), 'drizzle') });
  const end = Date.now();

  console.log(`Migrations completed successfully in ${end - start}ms`);
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
