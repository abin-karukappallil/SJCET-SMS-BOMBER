import { initTRPC, TRPCError } from '@trpc/server';
import { getAuth } from '@/lib/auth';
import { getDb } from '@/db';
import { rateLimit } from '@/db/schema';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import superjson from 'superjson';
import { headers } from 'next/headers';
import { eq, and, gte, count } from 'drizzle-orm';

export const createContext = async () => {
  const reqHeaders = await headers();
  const cf = getCloudflareContext();
  const env = cf?.env as any;
  
  const db = env?.DB ? getDb(env.DB) : null;
  const auth = db ? getAuth(db) : null;

  let session = null;
  if (auth) {
    session = await auth.api.getSession({
      headers: reqHeaders,
    });
  }

  const ip = reqHeaders.get('cf-connecting-ip') || reqHeaders.get('x-forwarded-for') || 'unknown';
  const origin = reqHeaders.get('origin');

  return {
    db,
    session,
    ip,
    origin,
  };
};

const t = initTRPC.context<typeof createContext>().create({
  transformer: superjson,
});

export const router = t.router;

const loggerMiddleware = t.middleware(async ({ path, type, next, ctx }) => {
  const start = Date.now();
  const result = await next();
  const durationMs = Date.now() - start;
  const status = result.ok ? 'OK' : 'ERROR';
  // Observability log that Cloudflare Logpush will pick up
  console.log(`[tRPC] ${status} ${type} ${path} - ${durationMs}ms - IP: ${ctx.ip}`);
  return result;
});

export const publicProcedure = t.procedure.use(loggerMiddleware);

const MAX_REQUESTS = 5; // Max 5 bomb requests per minute
const WINDOW_SECONDS = 60; // 1 minute

export const protectedProcedure = t.procedure.use(loggerMiddleware).use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  // Origin Validation
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  if (ctx.origin && !ctx.origin.startsWith(allowedOrigin) && process.env.NODE_ENV === 'production') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Invalid origin' });
  }

  // Rate Limiting based on IP via Cloudflare D1
  if (!ctx.db) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  }

  const identifier = ctx.ip;
  const nowUnix = Math.floor(Date.now() / 1000);
  const windowStart = nowUnix - WINDOW_SECONDS;

  const result = await ctx.db
    .select({ count: count() })
    .from(rateLimit)
    .where(and(eq(rateLimit.ip, identifier), gte(rateLimit.timestamp, windowStart)));

  const currentCount = result[0]?.count || 0;

  if (currentCount >= MAX_REQUESTS) {
    throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded.' });
  }

  // Log this request
  await ctx.db.insert(rateLimit).values({ ip: identifier, timestamp: nowUnix });

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});