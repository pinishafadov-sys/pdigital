"use server";

// Server actions for categories, brands, product types, banners, pages, articles and coupons.
// Every action re-checks the admin session and role, validates input, and writes an audit entry.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit, requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  bool, date, FormError, handle, int, oneOf, optInt, optStr, safeUrl, slugFrom, str, type ActionState,
} from "@/lib/form";
import { saveImage } from "@/lib/upload";

const refresh = () => revalidatePath("/", "layout");
const id = (fd: FormData) => str(fd, "id", { max: 40 });

// ---------------------------------------------------------------- categories
export async function saveCategory(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin("MANAGER");
  return handle(async () => {
    const name = str(fd, "name", { required: "יש להזין שם", max: 80 });
    const parentId = optStr(fd, "parentId", 40);
    if (parentId && parentId === id(fd)) throw new FormError("קטגוריה לא יכולה להיות אב של עצמה");
    const image = await saveImage(fd.get("image"));
    const data = {
      name,
      slug: slugFrom(fd, "slug", name),
      description: optStr(fd, "description", 1000),
      parentId,
      isAccessories: bool(fd, "isAccessories"),
      sortOrder: int(fd, "sortOrder", { min: -999, max: 9999 }),
      isActive: bool(fd, "isActive"),
      showOnHome: bool(fd, "showOnHome"),
      seoTitle: optStr(fd, "seoTitle", 120),
      seoDescription: optStr(fd, "seoDescription", 300),
      ...(image ? { imageUrl: image } : {}),
      ...(bool(fd, "removeImage") ? { imageUrl: null } : {}),
    };
    const row = id(fd) ? await db.category.update({ where: { id: id(fd) }, data }) : await db.category.create({ data });
    await audit(me.id, "category_saved", "Category", row.id);
    refresh();
  });
}

export async function deleteCategory(fd: FormData) {
  const me = await requireAdmin("MANAGER");
  const cid = id(fd);
  const used = await db.product.count({ where: { categoryId: cid } });
  const kids = await db.category.count({ where: { parentId: cid } });
  if (used || kids) redirect(`/admin/categories?error=${encodeURIComponent("לא ניתן למחוק: יש בקטגוריה מוצרים או תת-קטגוריות")}`);
  await db.category.delete({ where: { id: cid } });
  await audit(me.id, "category_deleted", "Category", cid);
  refresh();
  redirect("/admin/categories");
}

// ---------------------------------------------------------------- brands
export async function saveBrand(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin("MANAGER");
  return handle(async () => {
    const name = str(fd, "name", { required: "יש להזין שם", max: 80 });
    const logo = await saveImage(fd.get("logo"));
    const data = {
      name,
      slug: slugFrom(fd, "slug", name),
      showInBrandStrip: bool(fd, "showInBrandStrip"),
      sortOrder: int(fd, "sortOrder", { min: -999, max: 9999 }),
      leadTimeDays: optInt(fd, "leadTimeDays", { min: 1, max: 365 }),
      ...(logo ? { logoUrl: logo } : {}),
    };
    const row = id(fd) ? await db.brand.update({ where: { id: id(fd) }, data }) : await db.brand.create({ data });
    await audit(me.id, "brand_saved", "Brand", row.id);
    refresh();
  });
}

export async function deleteBrand(fd: FormData) {
  const me = await requireAdmin("MANAGER");
  await db.product.updateMany({ where: { brandId: id(fd) }, data: { brandId: null } });
  await db.brand.delete({ where: { id: id(fd) } });
  await audit(me.id, "brand_deleted", "Brand", id(fd));
  refresh();
  redirect("/admin/brands");
}

// ---------------------------------------------------------------- product types + spec fields
export async function saveType(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin("MANAGER");
  return handle(async () => {
    const name = str(fd, "name", { required: "יש להזין שם", max: 80 });
    const tid = id(fd);
    const ids = fd.getAll("f_id").map(String);
    const labels = fd.getAll("f_label").map((x) => String(x).trim());
    const units = fd.getAll("f_unit").map((x) => String(x).trim());
    const groups = fd.getAll("f_group").map((x) => String(x).trim());
    const filterable = new Set(fd.getAll("f_filter").map(String));
    const onCard = new Set(fd.getAll("f_card").map(String));
    const fields = labels
      .map((label, i) => ({ id: ids[i] || "", label: label.slice(0, 80), unit: units[i]?.slice(0, 20) || null, group: groups[i]?.slice(0, 60) || null, idx: String(i) }))
      .filter((f) => f.label);

    await db.$transaction(async (tx) => {
      const type = tid
        ? await tx.productType.update({ where: { id: tid }, data: { name, slug: slugFrom(fd, "slug", name) } })
        : await tx.productType.create({ data: { name, slug: slugFrom(fd, "slug", name) } });
      await tx.specField.deleteMany({ where: { productTypeId: type.id, id: { notIn: fields.filter((f) => f.id).map((f) => f.id) } } });
      for (const [i, f] of fields.entries()) {
        const data = {
          label: f.label, unit: f.unit, group: f.group, sortOrder: i,
          isFilterable: filterable.has(f.idx), showOnCard: onCard.has(f.idx),
        };
        if (f.id) await tx.specField.update({ where: { id: f.id, productTypeId: type.id }, data });
        else await tx.specField.create({ data: { ...data, productTypeId: type.id, key: `f${Date.now().toString(36)}${i}` } });
      }
      await audit(me.id, "type_saved", "ProductType", type.id);
    });
    refresh();
  });
}

// ---------------------------------------------------------------- banners
export async function saveBanner(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin("EDITOR");
  return handle(async () => {
    const image = await saveImage(fd.get("image"));
    const mobile = await saveImage(fd.get("mobileImage"));
    const bid = id(fd);
    if (!image && !bid) throw new FormError("יש להעלות תמונה לבאנר");
    const data = {
      placement: oneOf(fd, "placement", ["HOME_HERO", "HOME_SIDE", "HOME_CLUB", "CATEGORY_TOP"] as const, "HOME_HERO"),
      title: optStr(fd, "title", 120),
      subtitle: optStr(fd, "subtitle", 200),
      buttonText: optStr(fd, "buttonText", 40),
      linkUrl: safeUrl(fd, "linkUrl"),
      alt: str(fd, "alt", { required: "יש להזין תיאור תמונה (נגישות)", max: 200 }),
      sortOrder: int(fd, "sortOrder", { min: -999, max: 9999 }),
      isActive: bool(fd, "isActive"),
      startsAt: date(fd, "startsAt"),
      endsAt: date(fd, "endsAt"),
      ...(image ? { imageUrl: image } : {}),
      ...(mobile ? { mobileImageUrl: mobile } : {}),
    };
    const row = bid
      ? await db.banner.update({ where: { id: bid }, data })
      : await db.banner.create({ data: { ...data, imageUrl: image! } });
    await audit(me.id, "banner_saved", "Banner", row.id);
    refresh();
  });
}

export async function deleteBanner(fd: FormData) {
  const me = await requireAdmin("EDITOR");
  await db.banner.delete({ where: { id: id(fd) } });
  await audit(me.id, "banner_deleted", "Banner", id(fd));
  refresh();
  redirect("/admin/banners");
}

// ---------------------------------------------------------------- content pages
export async function savePage(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin("EDITOR");
  let newId = "";
  const r = await handle(async () => {
    const title = str(fd, "title", { required: "יש להזין כותרת", max: 160 });
    const data = {
      title,
      slug: slugFrom(fd, "slug", title),
      body: str(fd, "body", { max: 60000 }),
      isPublished: bool(fd, "isPublished"),
      seoTitle: optStr(fd, "seoTitle", 120),
      seoDescription: optStr(fd, "seoDescription", 300),
    };
    const row = id(fd) ? await db.page.update({ where: { id: id(fd) }, data }) : await db.page.create({ data });
    newId = row.id;
    await audit(me.id, "page_saved", "Page", row.id);
    refresh();
  });
  if (r?.ok && !id(fd)) redirect(`/admin/pages/${newId}`);
  return r;
}

export async function deletePage(fd: FormData) {
  const me = await requireAdmin("MANAGER");
  await db.page.delete({ where: { id: id(fd) } });
  await audit(me.id, "page_deleted", "Page", id(fd));
  refresh();
  redirect("/admin/pages");
}

// ---------------------------------------------------------------- articles
export async function saveArticle(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin("EDITOR");
  let newId = "";
  const r = await handle(async () => {
    const title = str(fd, "title", { required: "יש להזין כותרת", max: 160 });
    const cover = await saveImage(fd.get("cover"));
    const isPublished = bool(fd, "isPublished");
    const existing = id(fd) ? await db.article.findUnique({ where: { id: id(fd) } }) : null;
    const data = {
      title,
      slug: slugFrom(fd, "slug", title),
      excerpt: optStr(fd, "excerpt", 400),
      body: str(fd, "body", { required: "יש לכתוב את תוכן המאמר", max: 100000 }),
      isPublished,
      publishedAt: date(fd, "publishedAt") ?? (isPublished ? existing?.publishedAt ?? new Date() : existing?.publishedAt ?? null),
      coverImageAlt: optStr(fd, "coverImageAlt", 200),
      seoTitle: optStr(fd, "seoTitle", 120),
      seoDescription: optStr(fd, "seoDescription", 300),
      ...(cover ? { coverImageUrl: cover } : {}),
    };
    const row = existing ? await db.article.update({ where: { id: existing.id }, data }) : await db.article.create({ data });
    newId = row.id;
    await audit(me.id, "article_saved", "Article", row.id);
    refresh();
  });
  if (r?.ok && !id(fd)) redirect(`/admin/articles/${newId}`);
  return r;
}

export async function deleteArticle(fd: FormData) {
  const me = await requireAdmin("MANAGER");
  await db.article.delete({ where: { id: id(fd) } });
  await audit(me.id, "article_deleted", "Article", id(fd));
  refresh();
  redirect("/admin/articles");
}

// ---------------------------------------------------------------- coupons
export async function saveCoupon(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin("MANAGER");
  return handle(async () => {
    const code = str(fd, "code", { required: "יש להזין קוד", max: 40 }).toUpperCase();
    if (!/^[A-Z0-9_-]+$/.test(code)) throw new FormError("קוד קופון: אותיות באנגלית, ספרות, - ו-_ בלבד");
    const type = oneOf(fd, "type", ["PERCENT", "FIXED_AMOUNT", "FREE_SHIPPING"] as const, "PERCENT");
    const raw = Number(str(fd, "value", { max: 10 }) || 0);
    if (!Number.isFinite(raw) || raw < 0) throw new FormError("ערך הנחה לא תקין");
    if (type === "PERCENT" && raw > 100) throw new FormError("אחוז הנחה לא יכול לעלות על 100");
    const minRaw = str(fd, "minOrderTotal", { max: 10 });
    const data = {
      code,
      type,
      value: type === "PERCENT" ? Math.round(raw) : Math.round(raw * 100),
      minOrderTotal: minRaw ? Math.round(Number(minRaw) * 100) : null,
      maxUses: str(fd, "maxUses", { max: 10 }) ? int(fd, "maxUses", { min: 1, max: 1_000_000 }) : null,
      startsAt: date(fd, "startsAt"),
      endsAt: date(fd, "endsAt"),
      isActive: bool(fd, "isActive"),
    };
    const row = id(fd) ? await db.coupon.update({ where: { id: id(fd) }, data }) : await db.coupon.create({ data });
    await audit(me.id, "coupon_saved", "Coupon", row.id);
  });
}

// ---------------------------------------------------------------- orders
export async function updateOrder(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin("MANAGER");
  return handle(async () => {
    const status = oneOf(fd, "status", ["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"] as const, "PAID");
    await db.order.update({
      where: { id: id(fd) },
      data: { status, trackingNumber: optStr(fd, "trackingNumber", 80), internalNotes: optStr(fd, "internalNotes", 2000) },
    });
    await audit(me.id, `order_${status.toLowerCase()}`, "Order", id(fd));
    revalidatePath("/admin/orders");
  });
}
