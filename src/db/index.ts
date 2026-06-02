import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Required for Vercel Edge functions if you run into connection issues with fetch
// import { neonConfig } from '@neondatabase/serverless';
// neonConfig.fetchConnectionCache = true;

let _db: ReturnType<typeof drizzle> | null = null;

export const getDb = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for database operations.');
  }

  if (!_db) {
    const sql = neon(process.env.DATABASE_URL);
    _db = drizzle(sql, { schema });
  }

  return _db;
};
