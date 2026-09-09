import { drizzle } from 'drizzle-orm/d1';
import type { D1Database } from '@cloudflare/workers-types';
import * as schema from './schema';

// In Cloudflare Edge environments, D1 bindings are provided per request.
// Use getDb(env.DB) to retrieve the initialized drizzle instance.
export function getDb(d1: D1Database) {
  return drizzle(d1, { schema });
}