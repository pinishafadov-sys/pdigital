"use server";

import { revalidatePath } from "next/cache";
import { audit, requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { handle, oneOf, optStr, str, type ActionState } from "@/lib/form";

export async function updateMessage(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin("EDITOR");
  return handle(async () => {
    const id = str(fd, "id", { required: "חסרה הודעה", max: 40 });
    const status = oneOf(fd, "status", ["NEW", "IN_PROGRESS", "HANDLED"] as const, "NEW");
    await db.contactMessage.update({
      where: { id },
      data: { status, adminNote: optStr(fd, "adminNote", 2000), handledAt: status === "HANDLED" ? new Date() : null },
    });
    await audit(me.id, `contact_${status.toLowerCase()}`, "ContactMessage", id);
    revalidatePath("/admin", "layout");
    return { ok: true, message: "נשמר" };
  });
}
