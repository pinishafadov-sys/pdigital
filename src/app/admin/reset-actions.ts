"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, passwordPolicyError } from "@/lib/auth/password";
import { audit, clientInfo, destroyAllSessions } from "@/lib/auth/session";
import { passwordResetMail, sendMail } from "@/lib/email";
import { str, type ActionState } from "@/lib/form";
import { siteUrl } from "@/lib/settings";

const TOKEN_MINUTES = 30;
const MAX_PER_USER_PER_HOUR = 3;
const MAX_PER_IP_PER_HOUR = 10;
const GENERIC = "אם הפרטים נכונים ושמורה בחשבון כתובת מייל, נשלח אליה קישור לאיפוס הסיסמה. הקישור בתוקף 30 דקות.";
const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export async function requestResetAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ident = str(fd, "ident", { max: 120 }).toLowerCase();
  if (!ident) return { error: "יש להזין שם משתמש או מייל" };
  const { ip } = await clientInfo();
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Rate limit per IP regardless of whether the account exists.
  const ipCount = await db.passwordResetToken.count({ where: { ip, createdAt: { gt: hourAgo } } });
  const ipFails = await db.loginAttempt.count({ where: { ip, username: "reset:unknown", createdAt: { gt: hourAgo } } });
  if (ipCount + ipFails >= MAX_PER_IP_PER_HOUR) return { ok: true, message: GENERIC };

  const user = await db.adminUser.findFirst({
    where: { isActive: true, OR: [{ username: ident }, { email: ident }] },
  });
  if (!user?.email) {
    await db.loginAttempt.create({ data: { ip, username: "reset:unknown", success: false } });
    return { ok: true, message: GENERIC };
  }

  const recent = await db.passwordResetToken.count({ where: { userId: user.id, createdAt: { gt: hourAgo } } });
  if (recent >= MAX_PER_USER_PER_HOUR) return { ok: true, message: GENERIC };

  const token = randomBytes(32).toString("base64url");
  await db.passwordResetToken.create({
    data: { tokenHash: sha256(token), userId: user.id, ip, expiresAt: new Date(Date.now() + TOKEN_MINUTES * 60 * 1000) },
  });
  const link = `${siteUrl()}/admin/reset?token=${token}`;
  await sendMail(passwordResetMail(user.email, user.displayName, link, TOKEN_MINUTES));
  await audit(user.id, "password_reset_requested");
  return { ok: true, message: GENERIC };
}

async function findValidToken(token: string) {
  if (!token || token.length > 100) return null;
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!row || row.usedAt || row.expiresAt < new Date() || !row.user.isActive) return null;
  return row;
}

export async function isResetTokenValid(token: string) {
  return (await findValidToken(token)) !== null;
}

export async function resetPasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const token = String(fd.get("token") ?? "");
  const next = String(fd.get("next") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  const row = await findValidToken(token);
  if (!row) return { error: "הקישור לא תקף או שפג תוקפו. בקשו קישור חדש." };
  if (next !== confirm) return { error: "הסיסמאות אינן זהות" };
  const policy = passwordPolicyError(next, row.user.username);
  if (policy) return { error: policy };

  await db.$transaction([
    db.adminUser.update({
      where: { id: row.userId },
      data: { passwordHash: await hashPassword(next), mustChangePassword: false, failedLogins: 0, lockedUntil: null },
    }),
    // Use this link and cancel any other open reset links for the account.
    db.passwordResetToken.updateMany({ where: { userId: row.userId, usedAt: null }, data: { usedAt: new Date() } }),
  ]);
  await destroyAllSessions(row.userId);
  await audit(row.userId, "password_reset_completed");
  redirect("/admin/login?reset=1");
}
