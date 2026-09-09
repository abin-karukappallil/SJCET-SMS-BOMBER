import { NextRequest } from 'next/server';
import { getAuth } from '@/lib/auth';
import { getDb } from '@/db';
import { rateLimit } from '@/db/schema';
import { getOptionalRequestContext } from '@cloudflare/next-on-pages';
import { eq, and, gte, count } from 'drizzle-orm';
import { runBombSequence } from '@/lib/bomb';

export const runtime = "edge";

const MAX_REQUESTS = 5;
const WINDOW_SECONDS = 60;

export async function POST(req: NextRequest) {
  const ctx = getOptionalRequestContext();
  const env = ctx?.env as any;
  const db = env?.DB ? getDb(env.DB) : null;
  const auth = db ? getAuth(db) : null;

  if (!db || !auth) {
    return new Response('Internal Server Error', { status: 500 });
  }

  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const origin = req.headers.get('origin');
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  if (origin && !origin.startsWith(allowedOrigin) && process.env.NODE_ENV === 'production') {
    return new Response('Forbidden', { status: 403 });
  }

  const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown';
  const nowUnix = Math.floor(Date.now() / 1000);
  const windowStart = nowUnix - WINDOW_SECONDS;

  const result = await db
    .select({ count: count() })
    .from(rateLimit)
    .where(and(eq(rateLimit.ip, ip), gte(rateLimit.timestamp, windowStart)));

  const currentCount = result[0]?.count || 0;

  if (currentCount >= MAX_REQUESTS) {
    return new Response('Rate limit exceeded.', { status: 429 });
  }

  await db.insert(rateLimit).values({ ip, timestamp: nowUnix });

  let requestData;
  try {
    requestData = await req.json();
  } catch (e) {
    return new Response('Invalid JSON', { status: 400 });
  }

  const numbers = requestData.numbers;
  const repeat = requestData.repeat;

  if (!Array.isArray(numbers) || numbers.length === 0 || typeof repeat !== 'number' || repeat < 1 || repeat > 500) {
    return new Response('Invalid payload', { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const generator = runBombSequence(numbers, repeat);
      try {
        for await (const chunk of generator) {
          controller.enqueue(`data: ${JSON.stringify(chunk)}\n\n`);
        }
      } catch (err: any) {
        controller.enqueue(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
