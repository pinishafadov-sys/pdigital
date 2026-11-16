import "server-only";
import { readSheet } from "read-excel-file/node";
import { db } from "@/lib/db";
import { slugify } from "@/lib/form";
import { getVatRate } from "@/lib/settings";
import { setStock } from "@/lib/stock";
import type { ProductStatus, ProductTag } from "@/generated/prisma/client";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 3000;

// Column titles we recognise (Hebrew and English), normalised: lowercase, no quotes/spaces.
const COLUMNS: Record<string, string[]> = {
  sku: ["מקט", "sku", "קודמוצר"],
  name: ["שםמוצר", "שם", "name", "מוצר"],
  category: ["קטגוריה", "מחלקה", "category"],
  sub: ["תתקטגוריה", "subcategory"],
  brand: ["מותג", "brand"],
  price: ["מחירמכירה", "מחיר", "מחירכוללמעמ", "מחירמכירהכוללמעמ", "price"],
  priceEx: ["מחירלפנימעמ", "מחירמכירהלפנימעמ"],
  compare: ["מחירלפניהנחה", "מחירקודם", "compareat"],
  cost: ["מחירעלות", "עלות", "מחירעלותלפנימעמ", "cost"],
  stock: ["מלאי", "כמות", "stock", "qty"],
  variant: ["וריאנט", "דגם", "צבע", "variant"],
  short: ["תיאורקצר", "short"],
  desc: ["תיאור", "תיאורמלא", "description"],
  barcode: ["ברקוד", "barcode", "ean"],
  status: ["סטטוס", "status"],
  tags: ["תגיות", "tags"],
  images: ["תמונה", "תמונות", "קישורלתמונה", "image", "images"],
  warranty: ["אחריות", "אחריותחודשים", "warranty"],
};
type Key = keyof typeof COLUMNS;
const norm = (s: string) => s.toLowerCase().replace(/["'״׳()\s\-_.]/g, "");

export type ImportRow = {
  line: number; // row number in the file (as Excel shows it)
  sku: string;
  name: string;
  action: "create" | "update" | "error";
  messages: string[];
  data: Partial<Record<Key, string>>;
};

export type ImportPlan = {
  rows: ImportRow[];
  creates: number;
  updates: number;
  errors: number;
  newProducts: number;
  newBrands: string[];
  unknownColumns: string[];
};

// ------------------------------------------------------------------ reading the file

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const t = text.replace(/^﻿/, "");
  // Excel in some locales saves CSV with ";" - detect by the first line.
  const firstLine = t.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (quoted) {
      if (c === '"' && t[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell === "") quoted = true; // quotes only open a field at its start (מק"ט stays as is)
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export async function readImportFile(file: File): Promise<string[][]> {
  if (file.size === 0) throw new Error("הקובץ ריק");
  if (file.size > MAX_BYTES) throw new Error("הקובץ גדול מ-5MB");
  const buf = Buffer.from(await file.arrayBuffer());
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b; // .xlsx files are zip archives
  if (isZip) {
    const sheet = await readSheet(buf);
    return sheet.map((r) => r.map((c) => (c == null ? "" : c instanceof Date ? c.toISOString().slice(0, 10) : String(c))));
  }
  if (/\.(csv|txt)$/i.test(file.name)) return parseCsv(buf.toString("utf8"));
  throw new Error("סוג קובץ לא נתמך. יש להעלות קובץ אקסל (.xlsx) או CSV");
}

// ------------------------------------------------------------------ checking rows

const num = (v: string | undefined) => {
  if (v == null || v.trim() === "") return null;
  const n = Number(v.replace(/[₪,\s]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};
const TAGS: Record<string, ProductTag> = { חדש: "NEW", מבצע: "SALE", להיט: "HOT", new: "NEW", sale: "SALE", hot: "HOT" };

export async function planImport(table: string[][]): Promise<ImportPlan> {
  const nonEmpty = table.filter((r) => r.some((c) => String(c).trim()));
  if (nonEmpty.length < 2) throw new Error("לא נמצאו שורות מוצרים בקובץ (שורה ראשונה = כותרות, ומתחתיה מוצרים)");
  const headerIdx = table.indexOf(nonEmpty[0]);
  const header = nonEmpty[0].map((h) => norm(String(h)));
  const colOf: Partial<Record<Key, number>> = {};
  const unknownColumns: string[] = [];
  header.forEach((h, i) => {
    if (!h) return;
    const key = (Object.keys(COLUMNS) as Key[]).find((k) => COLUMNS[k].includes(h));
    if (key && colOf[key] === undefined) colOf[key] = i;
    else if (!key) unknownColumns.push(String(nonEmpty[0][i]));
  });
  if (colOf.sku === undefined) throw new Error('חסרה עמודת מק"ט. השורה הראשונה צריכה להכיל כותרות, למשל: מק"ט, שם מוצר, קטגוריה, מחיר, מלאי');
  if (table.length - headerIdx - 1 > MAX_ROWS) throw new Error(`יותר מ-${MAX_ROWS} שורות. פצלו לכמה קבצים`);

  const [cats, brands, variants, vat] = await Promise.all([
    db.category.findMany({ include: { parent: true } }),
    db.brand.findMany(),
    db.productVariant.findMany({ select: { sku: true } }),
    getVatRate(),
  ]);
  const existingSkus = new Set(variants.map((v) => v.sku.toLowerCase()));
  const brandNames = new Set(brands.map((b) => norm(b.name)));
  const topByName = new Map(cats.filter((c) => !c.parentId).map((c) => [norm(c.name), c]));
  const seen = new Set<string>();
  const newBrands = new Set<string>();
  const newProductNames = new Set<string>();

  const rows: ImportRow[] = [];
  for (let i = headerIdx + 1; i < table.length; i++) {
    const r = table[i];
    if (!r.some((c) => String(c).trim())) continue;
    const get = (k: Key) => (colOf[k] !== undefined ? String(r[colOf[k]!] ?? "").trim() : "");
    const data: Partial<Record<Key, string>> = {};
    for (const k of Object.keys(colOf) as Key[]) data[k] = get(k);
    const sku = get("sku").slice(0, 60);
    const name = get("name").slice(0, 200);
    const messages: string[] = [];
    const row: ImportRow = { line: i + 1, sku, name, action: "create", messages, data };
    rows.push(row);

    if (!sku) messages.push('חסר מק"ט');
    else if (seen.has(sku.toLowerCase())) messages.push('מק"ט כפול בקובץ');
    seen.add(sku.toLowerCase());
    const isUpdate = !!sku && existingSkus.has(sku.toLowerCase());
    row.action = isUpdate ? "update" : "create";

    // prices: "price" is with VAT; "priceEx" is before VAT and converted.
    const price = num(data.price);
    const priceEx = num(data.priceEx);
    if (Number.isNaN(price) || Number.isNaN(priceEx)) messages.push("מחיר לא תקין");
    else if (price == null && priceEx != null) data.price = String(Math.round(priceEx * (1 + vat / 100) * 100) / 100);
    for (const [k, label] of [["compare", "מחיר לפני הנחה"], ["cost", "מחיר עלות"], ["warranty", "אחריות"]] as const)
      if (Number.isNaN(num(data[k]))) messages.push(`${label} לא תקין`);
    const stock = num(data.stock);
    if (Number.isNaN(stock) || (stock != null && (stock < 0 || !Number.isInteger(stock)))) messages.push("מלאי צריך להיות מספר שלם, 0 ומעלה");
    if (data.status && !["פעיל", "טיוטה", "active", "draft"].includes(data.status.trim().toLowerCase())) messages.push('סטטוס צריך להיות "פעיל" או "טיוטה"');
    const badTags = (data.tags ?? "").split(/[,،;/]+/).map((t) => t.trim().toLowerCase()).filter((t) => t && !TAGS[t]);
    if (badTags.length) messages.push(`תגית לא מוכרת: ${badTags.join(", ")} (מותר: חדש, מבצע, להיט)`);
    const badImg = (data.images ?? "").split(/[\s,]+/).filter((u) => u && !/^https:\/\//.test(u));
    if (badImg.length) messages.push("קישור לתמונה חייב להתחיל ב-https://");

    if (!isUpdate) {
      if (!name) messages.push("חסר שם מוצר (חובה במוצר חדש)");
      if (!data.price) messages.push("חסר מחיר (חובה במוצר חדש)");
      const top = topByName.get(norm(data.category ?? ""));
      if (!data.category) messages.push("חסרה קטגוריה (חובה במוצר חדש)");
      else if (!top) messages.push(`הקטגוריה "${data.category}" לא קיימת באתר`);
      else if (data.sub && !cats.some((c) => c.parentId === top.id && norm(c.name) === norm(data.sub!)))
        messages.push(`תת-הקטגוריה "${data.sub}" לא קיימת תחת "${top.name}"`);
      if (name && !messages.length) newProductNames.add(`${norm(data.category ?? "")}|${norm(name)}`);
    }
    if (data.brand && !brandNames.has(norm(data.brand))) newBrands.add(data.brand.trim());
    if (messages.length) row.action = "error";
  }

  return {
    rows,
    creates: rows.filter((r) => r.action === "create").length,
    updates: rows.filter((r) => r.action === "update").length,
    errors: rows.filter((r) => r.action === "error").length,
    newProducts: newProductNames.size,
    newBrands: [...newBrands],
    unknownColumns,
  };
}

// ------------------------------------------------------------------ saving

const agorot = (v?: string) => {
  const n = num(v);
  return n == null || Number.isNaN(n) ? null : Math.round(n * 100);
};
const statusOf = (v?: string): ProductStatus | undefined =>
  !v ? undefined : ["פעיל", "active"].includes(v.trim().toLowerCase()) ? "ACTIVE" : "DRAFT";
const tagsOf = (v?: string) =>
  v ? [...new Set(v.split(/[,،;/]+/).map((t) => TAGS[t.trim().toLowerCase()]).filter(Boolean))] : undefined;
const imagesOf = (v?: string) => (v ? v.split(/[\s,]+/).filter((u) => /^https:\/\//.test(u)).slice(0, 8) : []);

/** Applies a plan. Rows with errors are skipped. Returns counts. */
export async function commitImport(plan: ImportPlan, userId: string) {
  const cats = await db.category.findMany();
  const brandCache = new Map((await db.brand.findMany()).map((b) => [norm(b.name), b.id]));
  const brandId = async (name?: string) => {
    if (!name) return undefined;
    const key = norm(name);
    if (!brandCache.has(key)) {
      let slug = slugify(name) || `brand-${Date.now()}`;
      if (await db.brand.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
      const b = await db.brand.create({ data: { name: name.trim(), slug } });
      brandCache.set(key, b.id);
    }
    return brandCache.get(key);
  };
  let created = 0;
  let updated = 0;
  const note = "ייבוא מאקסל";

  // Updates: by SKU, only the fields that were filled in.
  for (const r of plan.rows.filter((x) => x.action === "update")) {
    const d = r.data;
    const v = await db.productVariant.findUnique({ where: { sku: r.sku }, include: { product: true } });
    if (!v) continue;
    await db.$transaction(async (tx) => {
      await tx.productVariant.update({
        where: { id: v.id },
        data: {
          ...(d.price ? { price: agorot(d.price)! } : {}),
          ...(d.compare !== undefined && d.compare !== "" ? { compareAtPrice: agorot(d.compare) } : {}),
          ...(d.cost ? { costPrice: agorot(d.cost) } : {}),
          ...(d.barcode ? { barcode: d.barcode.slice(0, 40) } : {}),
          ...(d.variant ? { name: d.variant.slice(0, 120) } : {}),
        },
      });
      if (d.stock) await setStock(v.id, Number(d.stock), { userId, note }, tx);
      const productData = {
        ...(d.name ? { name: d.name.slice(0, 200) } : {}),
        ...(d.short ? { shortDescription: d.short.slice(0, 400) } : {}),
        ...(d.desc ? { description: d.desc.slice(0, 20000) } : {}),
        ...(statusOf(d.status) ? { status: statusOf(d.status) } : {}),
        ...(tagsOf(d.tags) ? { tags: tagsOf(d.tags) } : {}),
        ...(d.warranty ? { warrantyMonths: Math.round(Number(d.warranty)) } : {}),
      };
      if (Object.keys(productData).length) await tx.product.update({ where: { id: v.productId }, data: productData });
    });
    if (d.brand) await db.product.update({ where: { id: v.productId }, data: { brandId: await brandId(d.brand) } });
    updated++;
  }

  // New products: rows with the same name + category become one product with several variants.
  const groups = new Map<string, ImportRow[]>();
  for (const r of plan.rows.filter((x) => x.action === "create")) {
    const k = `${norm(r.data.category ?? "")}|${norm(r.name)}`;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  for (const rows of groups.values()) {
    const first = rows[0].data;
    const top = cats.find((c) => !c.parentId && norm(c.name) === norm(first.category ?? ""));
    if (!top) continue;
    const sub = first.sub ? cats.find((c) => c.parentId === top.id && norm(c.name) === norm(first.sub!)) : undefined;
    let slug = slugify(rows[0].name) || `product-${Date.now()}`;
    if (await db.product.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
    const images = imagesOf(rows.map((r) => r.data.images ?? "").join(" "));
    const bId = await brandId(first.brand);
    await db.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          name: rows[0].name,
          slug,
          categoryId: (sub ?? top).id,
          brandId: bId,
          status: statusOf(first.status) ?? "DRAFT",
          tags: tagsOf(first.tags) ?? [],
          shortDescription: first.short || null,
          description: first.desc || null,
          warrantyMonths: first.warranty ? Math.round(Number(first.warranty)) : null,
          images: { create: images.map((url, i) => ({ url, alt: rows[0].name, sortOrder: i })) },
        },
      });
      for (const [i, r] of rows.entries()) {
        const stock = r.data.stock ? Number(r.data.stock) : 0;
        const v = await tx.productVariant.create({
          data: {
            productId: p.id,
            sku: r.sku,
            name: r.data.variant || null,
            barcode: r.data.barcode || null,
            price: agorot(r.data.price)!,
            compareAtPrice: agorot(r.data.compare),
            costPrice: agorot(r.data.cost),
            stock,
            sortOrder: i,
          },
        });
        if (stock > 0)
          await tx.stockMovement.create({ data: { variantId: v.id, change: stock, stockAfter: stock, reason: "RESTOCK", note, userId } });
      }
    });
    created += rows.length;
  }
  return { created, updated, skipped: plan.errors };
}
