import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous } from "better-auth/plugins";
import * as schema from "@/db/schema";

export const getAuth = (db: any, env?: any) => {
  const appUrl = env?.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://sjcet-sms-bomber.abinthomasggllc.workers.dev";
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    secret: env?.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET || "sjcet-sms-bomber-secret-key-123456789",
    baseURL: appUrl,
    trustedOrigins: [
      "http://localhost:3000",
      "https://sjcet-sms-bomber.abinthomasggllc.workers.dev",
      ...(appUrl ? [appUrl] : [])
    ],
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      anonymous()
    ]
  });
};