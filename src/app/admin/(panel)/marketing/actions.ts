"use server";

import { revalidatePath } from "next/cache";
import { audit, requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { str } from "@/lib/form";

/** Customer asked to stop receiving promotions ("הסר"). Their consent is withdrawn, history kept. */
export async function unsubscribeAction(fd: FormData) {
  const me = await requireAdmin("MANAGER");
  const id = str(fd, "id", { max: 40 });
  await db.customer.update({ where: { id }, data: { marketingConsent: false, unsubscribedAt: new Date() } });
  await audit(me.id, "marketing_unsubscribe", "Customer", id);
  revalidatePath("/admin/marketing");
}
