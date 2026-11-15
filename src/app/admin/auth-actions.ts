"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  burnPasswordCheck,
  hashPassword,
  passwordPolicyError,
  verifyPassword,
} from "@/lib/auth/password";
import {
  audit,
  clientInfo,
  createSession,
  destroyAllSessions,
  destroySession,
  requireAdmin,
} from "@/lib/auth/session";
import { bool, str, type ActionState } from "@/lib/form";

const IP_WINDOW_MS = 15 * 60 * 1000;
const IP_MAX_FAILS = 10; // per IP per 15 minutes
const USER_MAX_FAILS = 5; // then lock the account
const USER_LOCK_MS = 15 * 60 * 1000;
const GENERIC_ERROR = "שם משתמש או סיסמה שגויים";

export async function loginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const username = str(fd, "username", { max: 60 }).toLowerCase();
  const password = typeof fd.get("password") === "string" ? (fd.get("password") as string) : "";
  const remember = bool(fd, "remember");
  if (!username || !password || password.length > 200) return { error: GENERIC_ERROR };

  const { ip } = await clientInfo();
  const recentFails = await db.loginAttempt.count({
    where: { ip, success: false, createdAt: { gt: new Date(Date.now() - IP_WINDOW_MS) } },
  });
  if (recentFails >= IP_MAX_FAILS) {
    return { error: "יותר מדי ניסיונות כניסה. נסו שוב בעוד 15 דקות." };
  }

  const user = await db.adminUser.findUnique({ where: { username } });
  if (!user || !user.isActive) {
    await burnPasswordCheck(password);
    await db.loginAttempt.create({ data: { ip, username, success: false } });
    return { error: GENERIC_ERROR };
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await db.loginAttempt.create({ data: { ip, username, success: false } });
    return { error: "החשבון ננעל זמנית בגלל ניסיונות כושלים. נסו שוב בעוד 15 דקות." };
  }

  const ok = await verifyPassword(password, user.passwordHash);
  await db.loginAttempt.create({ data: { ip, username, success: ok } });
  if (!ok) {
    const fails = user.failedLogins + 1;
    await db.adminUser.update({
      where: { id: user.id },
      data: {
        failedLogins: fails >= USER_MAX_FAILS ? 0 : fails,
        lockedUntil: fails >= USER_MAX_FAILS ? new Date(Date.now() + USER_LOCK_MS) : null,
      },
    });
    await audit(user.id, "login_failed");
    return { error: GENERIC_ERROR };
  }

  await db.adminUser.update({
    where: { id: user.id },
    data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  await createSession(user.id, remember);
  await audit(user.id, "login");
  redirect(user.mustChangePassword ? "/admin/account?force=1" : "/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

export async function changePasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin("EDITOR", { allowPasswordChange: true });
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  const confirm = String(fd.get("confirm") ?? "");

  const user = await db.adminUser.findUniqueOrThrow({ where: { id: me.id } });
  if (!(await verifyPassword(current, user.passwordHash))) return { error: "הסיסמה הנוכחית שגויה" };
  if (next !== confirm) return { error: "הסיסמאות החדשות אינן זהות" };
  if (next === current) return { error: "הסיסמה החדשה חייבת להיות שונה מהנוכחית" };
  const policy = passwordPolicyError(next, user.username);
  if (policy) return { error: policy };

  await db.adminUser.update({
    where: { id: me.id },
    data: { passwordHash: await hashPassword(next), mustChangePassword: false },
  });
  // Sign out every other device, then start a fresh session here.
  await destroyAllSessions(me.id);
  await createSession(me.id, false);
  await audit(me.id, "password_changed");
  redirect("/admin?pw=1");
}
