"use server";

import { refreshSite } from "@/lib/cache";
import { audit, requireAdmin } from "@/lib/auth/session";
import { commitImport, planImport, readImportFile, type ImportPlan } from "@/lib/product-import";

export type ImportState =
  | { stage: "preview"; plan: ImportPlan; fileName: string }
  | { stage: "done"; created: number; updated: number; skipped: number }
  | { stage: "error"; error: string }
  | undefined;

/** Step 1 (mode=preview): read and check the file, change nothing. Step 2 (mode=commit): save. */
export async function importAction(_prev: ImportState, fd: FormData): Promise<ImportState> {
  const me = await requireAdmin("MANAGER");
  const file = fd.get("file");
  if (!file || typeof file === "string") return { stage: "error", error: "יש לבחור קובץ" };
  try {
    const plan = await planImport(await readImportFile(file));
    if (fd.get("mode") !== "commit") return { stage: "preview", plan, fileName: file.name };
    if (plan.creates + plan.updates === 0) return { stage: "error", error: "אין שורות תקינות לייבוא" };
    const res = await commitImport(plan, me.id);
    await audit(me.id, "products_imported", "Product", `${res.created}+${res.updated}`);
    refreshSite();
    return { stage: "done", ...res };
  } catch (e) {
    console.error(e);
    return { stage: "error", error: e instanceof Error ? e.message : "שגיאה בקריאת הקובץ" };
  }
}
