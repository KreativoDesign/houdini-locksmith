import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { parse as parseCookieHeader } from "cookie";
import { eq } from "drizzle-orm";
import type { User } from "../../drizzle/schema";
import { users } from "../../drizzle/schema";
import { getDb } from "../db";
import { verifySessionToken, AUTH_COOKIE_NAME } from "../authService";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

/**
 * Parse cookies from the request header into a Map.
 */
function parseCookies(cookieHeader: string | undefined): Map<string, string> {
  if (!cookieHeader) return new Map();
  return new Map(Object.entries(parseCookieHeader(cookieHeader)));
}

/**
 * Try to authenticate via the local email/password JWT cookie (app_session_id).
 * Returns the User row if valid, null otherwise.
 */
async function authenticateLocalSession(req: CreateExpressContextOptions["req"]): Promise<User | null> {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const localToken = cookies.get(AUTH_COOKIE_NAME);
    if (!localToken) return null;

    const payload = await verifySessionToken(localToken);
    if (!payload) return null;

    const db = await getDb();
    if (!db) return null;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    return user ?? null;
  } catch {
    return null;
  }
}

/**
 * Try to authenticate via the Manus OAuth cookie.
 * Returns the User row if valid, null otherwise.
 */
async function authenticateOAuthSession(req: CreateExpressContextOptions["req"]): Promise<User | null> {
  try {
    return await sdk.authenticateRequest(req);
  } catch {
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // 1. Try local email/password session first (app_session_id cookie)
  let user: User | null = await authenticateLocalSession(opts.req);

  // 2. Fall back to Manus OAuth session (manus_session cookie)
  if (!user) {
    user = await authenticateOAuthSession(opts.req);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
