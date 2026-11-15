"use server";

import { revalidatePath } from "next/cache";
import { hashPassword, passwordPolicyError } from "@/lib/auth/password";
import { audit, destroyAllSessions, requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { FormError, handle, oneOf, str, type ActionState } from "@/lib/form";

export async function createUser(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin("OWNER");
  return handle(async () => {
    const username = str(fd, "username", { required: "יש להזין שם משתמש", max: 40 }).toLowerCase();
    if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw new FormError("שם משתמש: 3-40 תווים באנגלית, ספרות, נקודה או מקף");
    const password = String(fd.get("password") ?? "");
    const policy = passwordPolicyError(password, username);
    if (policy) throw new FormError(policy);
    const email = str(fd, "email", { max: 120 }).toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new FormError("כתובת מייל לא תקינה");
    const user = await db.adminUser.create({
      data: {
        username,
        email: email || null,
        displayName: str(fd, "displayName", { required: "יש להזין שם לתצוגה", max: 60 }),
        role: oneOf(fd, "role", ["OWNER", "MANAGER", "EDITOR"] as const, "EDITOR"),
        passwordHash: await hashPassword(password),
        mustChangePassword: true,
      },
    });
    await audit(me.id, "user_created", "AdminUser", user.id);
    revalidatePath("/admin/users");
    return { ok: true, message: `המשתמש ${username} נוצר. בכניסה הראשונה הוא יתבקש להחליף סיסמה.` };
  });
}

export async function toggleUser(fd: FormData) {
  const me = await requireAdmin("OWNER");
  const id = str(fd, "id", { max: 40 });
  if (id === me.id) return;
  const u = await db.adminUser.findUniqueOrThrow({ where: { id } });
  await db.adminUser.update({ where: { id }, data: { isActive: !u.isActive } });
  if (u.isActive) await destroyAllSessions(id);
  await audit(me.id, u.isActive ? "user_disabled" : "user_enabled", "AdminUser", id);
  revalidatePath("/admin/users");
}

export async function signOutEverywhere() {
  const me = await requireAdmin();
  await destroyAllSessions(me.id);
  await audit(me.id, "signed_out_everywhere");
  revalidatePath("/admin");
}
