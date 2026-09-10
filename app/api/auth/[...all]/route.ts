import { getAuth } from "@/lib/auth";
import { getDb } from "@/db";
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextRequest } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";



export async function GET(req: NextRequest) {
  const ctx = getCloudflareContext();
  const env = ctx?.env as any;
  const db = env?.DB ? getDb(env.DB) : null;
  const auth = db ? getAuth(db, env) : null;
  const { GET: handler } = toNextJsHandler(auth?.handler || (async () => new Response('DB binding missing', { status: 500 })));
  return handler(req);
}

export async function POST(req: NextRequest) {
  const ctx = getCloudflareContext();
  const env = ctx?.env as any;
  const db = env?.DB ? getDb(env.DB) : null;
  const auth = db ? getAuth(db, env) : null;
  const { POST: handler } = toNextJsHandler(auth?.handler || (async () => new Response('DB binding missing', { status: 500 })));
  return handler(req);
}