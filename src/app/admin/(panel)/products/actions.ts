"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit, requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { bool, FormError, handle, oneOf, optInt, optStr, safeUrl, shekels, slugFrom, str, type ActionState } from "@/lib/form";
import { changeStock, setStock } from "@/lib/stock";
import { saveImage } from "@/lib/upload";
import type { ProductTag } from "@/generated/prisma/client";

const TAGS = ["NEW", "SALE", "HOT"] as const;
const all = (fd: FormData, key: string) => fd.getAll(key).map((v) => (typeof v === "string" ? v.trim() : ""));

export async function saveProduct(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin("MANAGER");
  let savedId = "";
  const result = await handle(async () => {
    const id = str(fd, "id", { max: 40 });
    const name = str(fd, "name", { required: "יש להזין שם מוצר", max: 200 });
    const categoryId = str(fd, "categoryId", { required: "יש לבחור קטגוריה", max: 40 });
    const productTypeId = optStr(fd, "productTypeId", 40);
    const tags = fd.getAll("tags").filter((t): t is ProductTag => (TAGS as readonly string[]).includes(String(t)));

    // ---- variants (at least one)
    const vIds = all(fd, "v_id");
    const vNames = all(fd, "v_name");
    const vSkus = all(fd, "v_sku");
    const vPrices = all(fd, "v_price");
    const vCompare = all(fd, "v_compare");
    const vStock = all(fd, "v_stock");
    const vCost = all(fd, "v_cost");
    const variants = vSkus
      .map((sku, i) => {
        if (!sku && !vPrices[i]) return null;
        if (!sku) throw new FormError(`חסר מק"ט בשורת וריאנט ${i + 1}`);
        const one = new FormData();
        one.set("p", vPrices[i] ?? "");
        one.set("c", vCompare[i] ?? "");
        one.set("k", vCost[i] ?? "");
        const price = shekels(one, "p", true)!;
        const compareAtPrice = shekels(one, "c");
        const costPrice = shekels(one, "k");
        const stock = Number(vStock[i] || 0);
        if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000) throw new FormError(`מלאי לא תקין בשורה ${i + 1}`);
        return { id: vIds[i] || null, name: vNames[i]?.slice(0, 120) || null, sku: sku.slice(0, 60), price, compareAtPrice, costPrice, stock, sortOrder: i };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);
    if (!variants.length) throw new FormError("יש להזין לפחות מחיר ומק\"ט אחד");

    // ---- images: existing (kept, in order) + uploads + URL
    const imgUrls = all(fd, "img_url");
    const imgAlts = all(fd, "img_alt");
    const images: { url: string; alt: string }[] = imgUrls
      .map((url, i) => ({ url, alt: (imgAlts[i] || name).slice(0, 200) }))
      .filter((x) => x.url.startsWith("/uploads/") || x.url.startsWith("https://"));
    for (const file of fd.getAll("newImages")) {
      const url = await saveImage(file);
      if (url) images.push({ url, alt: name });
    }
    const extUrl = safeUrl(fd, "newImageUrl");
    if (extUrl) images.push({ url: extUrl, alt: name });

    // ---- specs
    const specs = productTypeId
      ? (await db.specField.findMany({ where: { productTypeId } }))
          .map((f) => ({ specFieldId: f.id, value: str(fd, `spec_${f.id}`, { max: 200 }) }))
          .filter((s) => s.value)
      : [];

    const accessoryIds = fd.getAll("accessories").map(String).filter((x) => x && x !== id).slice(0, 30);

    const data = {
      name,
      slug: slugFrom(fd, "slug", name),
      shortDescription: optStr(fd, "shortDescription", 400),
      description: optStr(fd, "description", 20000),
      status: oneOf(fd, "status", ["DRAFT", "ACTIVE", "ARCHIVED"] as const, "DRAFT"),
      tags,
      categoryId,
      brandId: optStr(fd, "brandId", 40),
      productTypeId,
      warrantyMonths: optInt(fd, "warrantyMonths", { min: 0, max: 240 }),
      isWeeklyDeal: bool(fd, "isWeeklyDeal"),
      seoTitle: optStr(fd, "seoTitle", 120),
      seoDescription: optStr(fd, "seoDescription", 300),
    };

    savedId = await db.$transaction(async (tx) => {
      const product = id
        ? await tx.product.update({ where: { id }, data })
        : await tx.product.create({ data });
      const pid = product.id;

      const keep = variants.filter((v) => v.id).map((v) => v.id!);
      await tx.productVariant.deleteMany({ where: { productId: pid, id: { notIn: keep } } });
      for (const v of variants) {
        const { id: vid, stock, ...vd } = v;
        if (vid) {
          await tx.productVariant.update({ where: { id: vid, productId: pid }, data: vd });
          // Stock changes go through setStock so they are recorded in the stock history.
          await setStock(vid, stock, { userId: me.id, note: "עדכון בעריכת מוצר" }, tx);
        } else {
          const created = await tx.productVariant.create({ data: { ...vd, stock, productId: pid } });
          if (stock > 0)
            await tx.stockMovement.create({
              data: { variantId: created.id, change: stock, stockAfter: stock, reason: "RESTOCK", note: "מלאי התחלתי", userId: me.id },
            });
        }
      }

      await tx.productImage.deleteMany({ where: { productId: pid } });
      if (images.length) await tx.productImage.createMany({ data: images.slice(0, 12).map((img, i) => ({ ...img, productId: pid, sortOrder: i })) });

      await tx.productSpecValue.deleteMany({ where: { productId: pid } });
      if (specs.length) await tx.productSpecValue.createMany({ data: specs.map((s) => ({ ...s, productId: pid })) });

      await tx.productAccessory.deleteMany({ where: { productId: pid } });
      if (accessoryIds.length)
        await tx.productAccessory.createMany({ data: accessoryIds.map((a, i) => ({ productId: pid, accessoryId: a, sortOrder: i })), skipDuplicates: true });

      return pid;
    });
    await audit(me.id, id ? "product_updated" : "product_created", "Product", savedId);
    revalidatePath("/", "layout");
  });
  if (result?.ok && !str(fd, "id", { max: 40 })) redirect(`/admin/products/${savedId}?created=1`);
  return result;
}

export async function deleteProduct(fd: FormData) {
  const me = await requireAdmin("MANAGER");
  const id = str(fd, "id", { max: 40 });
  // Products with orders are archived (keeps order history intact); others are deleted.
  const hasOrders = await db.orderItem.count({ where: { variant: { productId: id } } });
  if (hasOrders) await db.product.update({ where: { id }, data: { status: "ARCHIVED" } });
  else await db.product.delete({ where: { id } });
  await audit(me.id, hasOrders ? "product_archived" : "product_deleted", "Product", id);
  revalidatePath("/", "layout");
  redirect("/admin/products");
}

export async function quickStock(fd: FormData) {
  const me = await requireAdmin("MANAGER");
  const id = str(fd, "variantId", { max: 40 });
  const stock = Number(str(fd, "stock", { max: 10 }));
  if (!Number.isInteger(stock) || stock < 0) return;
  await setStock(id, stock, { userId: me.id, note: "עדכון מהיר מרשימת המוצרים" });
  await audit(me.id, "stock_updated", "ProductVariant", id);
  revalidatePath("/", "layout");
}

/** In-store sale / restock / return / manual count from the stock screen. */
export async function stockAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin("EDITOR");
  return handle(async () => {
    const variantId = str(fd, "variantId", { required: "חסר מוצר", max: 40 });
    const kind = oneOf(fd, "kind", ["STORE_SALE", "RESTOCK", "RETURN", "COUNT"] as const, "STORE_SALE");
    const qty = Number(str(fd, "qty", { max: 6 }) || "1");
    const note = optStr(fd, "note", 200);
    if (!Number.isInteger(qty) || qty < 0 || qty > 100000) throw new FormError("כמות לא תקינה");
    let after: number;
    if (kind === "COUNT") after = await setStock(variantId, qty, { userId: me.id, note: note ?? "ספירת מלאי" });
    else {
      if (qty === 0) throw new FormError("יש להזין כמות");
      after = await changeStock(variantId, kind === "STORE_SALE" ? -qty : qty, kind, { userId: me.id, note });
    }
    await audit(me.id, `stock_${kind.toLowerCase()}`, "ProductVariant", variantId);
    revalidatePath("/", "layout");
    return { ok: true, message: `עודכן. במלאי עכשיו: ${after}` };
  });
}
