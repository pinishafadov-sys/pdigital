"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export async function unsubscribeByTokenAction(fd: FormData) {
  const token = String(fd.get("token") ?? "");
  if (!/^[a-z0-9]{20,40}$/.test(token)) return;
  await db.customer.updateMany({
    where: { unsubToken: token },
    data: { marketingConsent: false, unsubscribedAt: new Date() },
  });
  redirect(`/unsubscribe/${token}?done=1`);
}
