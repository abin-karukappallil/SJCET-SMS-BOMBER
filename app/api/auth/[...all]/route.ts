import { getAuth } from "@/lib/auth";
import { getDb } from "@/db";
import { getOptionalRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const ctx = getOptionalRequestContext();
  const env = ctx?.env as any;
  const db = env?.DB ? getDb(env.DB) : null;
  const auth = db ? getAuth(db) : null;
  const { GET: handler } = toNextJsHandler(auth?.handler || (async () => new Response('DB binding missing', {status: 500})));
  return handler(req);
}

export async function POST(req: NextRequest) {
  const ctx = getOptionalRequestContext();
  const env = ctx?.env as any;
  const db = env?.DB ? getDb(env.DB) : null;
  const auth = db ? getAuth(db) : null;
  const { POST: handler } = toNextJsHandler(auth?.handler || (async () => new Response('DB binding missing', {status: 500})));
  return handler(req);
}