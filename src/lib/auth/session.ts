import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import type { AdminRole } from "@/generated/prisma/client";

const isProd = process.env.NODE_ENV === "production";
// "__Host-" prefix: browser only accepts it over HTTPS, without Domain, Path=/.
export const SESSION_COOKIE = isProd ? "__Host-pd_admin" : "pd_admin";
const SHORT_SESSION_MS = 8 * 60 * 60 * 1000; // 8 hours
const LONG_SESSION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days ("remember me")

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export async function clientInfo() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
  return { ip, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
}

export async function createSession(userId: string, remember: boolean) {
  const token = randomBytes(32).toString("base64url");
  const ttl = remember ? LONG_SESSION_MS : SHORT_SESSION_MS;
  const { ip, userAgent } = await clientInfo();
  await db.adminSession.create({
    data: { tokenHash: sha256(token), userId, expiresAt: new Date(Date.now() + ttl), ip, userAgent },
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/",
    maxAge: remember ? ttl / 1000 : undefined, // session cookie unless "remember me"
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.adminSession.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

export async function destroyAllSessions(userId: string) {
  await db.adminSession.deleteMany({ where: { userId } });
}

/** The logged-in admin for this request, or null. Cached per request. */
export const getCurrentAdmin = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const session = await db.adminSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;
  if (Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
    await db.adminSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
  }
  const { passwordHash: _omit, twoFactorSecret: _omit2, ...user } = session.user;
  return user;
});

export type CurrentAdmin = NonNullable<Awaited<ReturnType<typeof getCurrentAdmin>>>;

const ROLE_RANK: Record<AdminRole, number> = { EDITOR: 1, MANAGER: 2, OWNER: 3 };

/**
 * Use at the top of every admin page and server action.
 * Redirects to login when not signed in, and to the password page when a change is required.
 */
export async function requireAdmin(minRole: AdminRole = "EDITOR", opts?: { allowPasswordChange?: boolean }) {
  const user = await getCurrentAdmin();
  if (!user) redirect("/admin/login");
  if (user.mustChangePassword && !opts?.allowPasswordChange) redirect("/admin/account?force=1");
  if (ROLE_RANK[user.role] < ROLE_RANK[minRole]) redirect("/admin?denied=1");
  return user;
}

export async function audit(userId: string | null, action: string, entity?: string, entityId?: string) {
  const { ip } = await clientInfo();
  await db.auditLog.create({ data: { userId, action, entity, entityId, ip } });
}
