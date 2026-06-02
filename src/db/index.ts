import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Required for Vercel Edge functions if you run into connection issues with fetch
// import { neonConfig } from '@neondatabase/serverless';
// neonConfig.fetchConnectionCache = true;

// Define a placeholder or empty client for build time if DATABASE_URL is missing
const createDb = () => {
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL is not set. A dummy database client is being used.');
    // Return a dummy object that throws if methods are called,
    // but allows import and build to succeed.
    return new Proxy({}, {
      get(target, prop) {
        if (prop === 'select' || prop === 'insert' || prop === 'update' || prop === 'delete' || prop === 'transaction') {
            return () => {
                throw new Error('Database operation attempted without a DATABASE_URL');
            }
        }
        return undefined;
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
  }
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
};

export const db = createDb();
