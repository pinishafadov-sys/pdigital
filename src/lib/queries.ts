import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import type { Prisma, ProductTag } from "@/generated/prisma/client";

const now = () => new Date();

/**
 * Products shown in listings (home, categories, search, accessories, sitemap):
 * active, and with at least one variant in stock. A sold-out product disappears
 * from the site automatically and comes back by itself when it is restocked.
 */
export const LISTED = {
  status: "ACTIVE",
  variants: { some: { isActive: true, stock: { gt: 0 } } },
} satisfies Prisma.ProductWhereInput;

const productInclude = {
  category: { select: { name: true, slug: true, parent: { select: { name: true, slug: true } } } },
  brand: { select: { name: true, slug: true } },
  images: { orderBy: { sortOrder: "asc" }, take: 1 },
  variants: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { price: "asc" }] },
  specValues: { include: { specField: true } },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  categoryName: string;
  topCategorySlug: string;
  brandName: string | null;
  brandSlug: string | null;
  tags: ProductTag[];
  imageUrl: string | null;
  imageAlt: string;
  price: number;
  compareAt: number | null;
  inStock: boolean;
  variantId: string | null;
  variantCount: number;
  cardSpecs: { label: string; value: string }[];
  specMap: Record<string, string>;
  productTypeId: string | null;
  createdAt: Date;
};

function toCard(p: ProductRow): ProductCardData {
  const v = p.variants[0];
  const top = p.category.parent ?? p.category;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    categoryName: top.name,
    topCategorySlug: top.slug,
    brandName: p.brand?.name ?? null,
    brandSlug: p.brand?.slug ?? null,
    tags: p.tags,
    imageUrl: p.images[0]?.url ?? null,
    imageAlt: p.images[0]?.alt ?? p.name,
    price: v?.price ?? 0,
    compareAt: v?.compareAtPrice ?? null,
    inStock: p.variants.some((x) => x.stock > 0),
    variantId: v?.id ?? null,
    variantCount: p.variants.length,
    cardSpecs: p.specValues
      .filter((s) => s.specField.showOnCard)
      .sort((a, b) => a.specField.sortOrder - b.specField.sortOrder)
      .slice(0, 3)
      .map((s) => ({ label: s.specField.label, value: s.specField.unit ? `${s.value} ${s.specField.unit}` : s.value })),
    specMap: Object.fromEntries(p.specValues.map((s) => [s.specFieldId, s.value])),
    productTypeId: p.productTypeId,
    createdAt: p.createdAt,
  };
}

// ---------------------------------------------------------------- navigation

export const getNavCategories = cache(async () =>
  db.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, imageUrl: true, showOnHome: true },
  }),
);

// ---------------------------------------------------------------- home

function activeBanner(placement: "HOME_HERO" | "HOME_SIDE" | "HOME_CLUB" | "CATEGORY_TOP") {
  return {
    placement,
    isActive: true,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now() } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now() } }] },
    ],
  } satisfies Prisma.BannerWhereInput;
}

export async function getHomeData() {
  const [hero, side, deals, fresh, brands] = await Promise.all([
    db.banner.findFirst({ where: activeBanner("HOME_HERO"), orderBy: { sortOrder: "asc" } }),
    db.banner.findMany({ where: activeBanner("HOME_SIDE"), orderBy: { sortOrder: "asc" }, take: 2 }),
    db.product.findMany({
      where: { ...LISTED, OR: [{ isWeeklyDeal: true }, { tags: { has: "SALE" } }] },
      include: productInclude,
      orderBy: { updatedAt: "desc" },
      take: 24,
    }),
    db.product.findMany({
      where: LISTED,
      include: productInclude,
      orderBy: [{ createdAt: "desc" }],
      take: 10,
    }),
    db.brand.findMany({ where: { showInBrandStrip: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  return { hero, side, deals: deals.map(toCard), fresh: fresh.map(toCard), brands };
}

// ---------------------------------------------------------------- category

export type CategoryFilters = {
  min?: number; // agorot
  max?: number;
  brands: string[];
  types: string[];
  specs: Record<string, string[]>; // specFieldId -> values
  inStock: boolean;
  sort: "recommended" | "price-asc" | "price-desc" | "newest";
  sub?: string;
  limit: number;
};

export const getCategoryBySlug = cache(async (slug: string) =>
  db.category.findFirst({
    where: { slug, isActive: true },
    include: {
      parent: true,
      children: { where: { isActive: true }, orderBy: [{ isAccessories: "asc" }, { sortOrder: "asc" }] },
    },
  }),
);

export async function getCategoryProducts(categoryId: string, childIds: string[], f: CategoryFilters) {
  const scopeIds = f.sub ? [f.sub] : [categoryId, ...childIds];
  const rows = await db.product.findMany({
    where: { ...LISTED, categoryId: { in: scopeIds } },
    include: { ...productInclude, productType: { include: { specFields: { where: { isFilterable: true }, orderBy: { sortOrder: "asc" } } } } },
  });
  // Accessories stay out of the main listing unless their sub-category is chosen.
  const accessoryIds = new Set(
    (await db.category.findMany({ where: { id: { in: childIds }, isAccessories: true }, select: { id: true } })).map((c) => c.id),
  );
  const scoped = f.sub ? rows : rows.filter((r) => !accessoryIds.has(r.categoryId));
  const all = scoped.map((r) => ({ card: toCard(r), row: r }));

  const passes = (x: (typeof all)[number], skip?: "brand" | "type" | string) => {
    const c = x.card;
    if (f.min !== undefined && c.price < f.min) return false;
    if (f.max !== undefined && c.price > f.max) return false;
    if (f.inStock && !c.inStock) return false;
    if (skip !== "brand" && f.brands.length && !(c.brandSlug && f.brands.includes(c.brandSlug))) return false;
    if (skip !== "type" && f.types.length && !(x.row.productType && f.types.includes(x.row.productType.slug))) return false;
    for (const [fieldId, values] of Object.entries(f.specs)) {
      if (skip === fieldId || !values.length) continue;
      if (!values.includes(c.specMap[fieldId] ?? "")) return false;
    }
    return true;
  };

  // Facet counts: each facet is counted with all *other* filters applied.
  const count = <K extends string>(items: typeof all, key: (x: (typeof all)[number]) => K | null) => {
    const m = new Map<K, number>();
    for (const x of items) {
      const k = key(x);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  };
  const brandCounts = count(all.filter((x) => passes(x, "brand")), (x) => x.card.brandSlug);
  const typeCounts = count(all.filter((x) => passes(x, "type")), (x) => x.row.productType?.slug ?? null);

  const brandsMap = new Map(all.filter((x) => x.row.brand).map((x) => [x.row.brand!.slug, x.row.brand!.name]));
  const typesMap = new Map(all.filter((x) => x.row.productType).map((x) => [x.row.productType!.slug, x.row.productType!.name]));
  const specFields = new Map<string, { id: string; label: string; unit: string | null }>();
  for (const x of all) for (const sf of x.row.productType?.specFields ?? []) specFields.set(sf.id, sf);
  const specFacets = [...specFields.values()].map((sf) => {
    const counts = count(all.filter((x) => passes(x, sf.id)), (x) => x.card.specMap[sf.id] ?? null);
    return {
      id: sf.id,
      label: sf.label,
      unit: sf.unit,
      options: [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], "he", { numeric: true })),
    };
  }).filter((s) => s.options.length > 0);

  let filtered = all.filter((x) => passes(x)).map((x) => x.card);
  if (f.sort === "price-asc") filtered.sort((a, b) => a.price - b.price);
  else if (f.sort === "price-desc") filtered.sort((a, b) => b.price - a.price);
  else if (f.sort === "newest") filtered.sort((a, b) => +b.createdAt - +a.createdAt);
  else filtered.sort((a, b) => Number(b.inStock) - Number(a.inStock) || b.tags.length - a.tags.length);

  const total = filtered.length;
  filtered = filtered.slice(0, f.limit);

  return {
    products: filtered,
    total,
    facets: {
      brands: [...brandsMap.entries()].map(([slug, name]) => ({ slug, name, count: brandCounts.get(slug) ?? 0 })),
      types: [...typesMap.entries()].map(([slug, name]) => ({ slug, name, count: typeCounts.get(slug) ?? 0 })),
      specs: specFacets,
    },
  };
}

// ---------------------------------------------------------------- product

export const getProduct = cache(async (slug: string) =>
  db.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      category: { include: { parent: true } },
      brand: true,
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { price: "asc" }] },
      specValues: { include: { specField: true } },
      accessories: {
        orderBy: { sortOrder: "asc" },
        include: { accessory: { include: productInclude } },
      },
    },
  }),
);

export function cardsFromAccessories(rows: { accessory: ProductRow }[]) {
  return rows
    .filter((r) => r.accessory.status === "ACTIVE")
    .map((r) => toCard(r.accessory))
    .filter((c) => c.inStock);
}

export async function getRelatedAccessories(categoryId: string, excludeId: string) {
  const acc = await db.category.findFirst({ where: { parentId: categoryId, isAccessories: true } });
  if (!acc) return [];
  const rows = await db.product.findMany({
    where: { ...LISTED, categoryId: acc.id, id: { not: excludeId } },
    include: productInclude,
    take: 4,
  });
  return rows.map(toCard);
}

// ---------------------------------------------------------------- search

/** Spellings of a word as people type it: מק"ט / מק״ט, גאדג'ט / גאדג׳ט. */
function spellings(w: string) {
  return [
    ...new Set([
      w,
      w.replace(/"/g, "״").replace(/'/g, "׳"),
      w.replace(/״/g, '"').replace(/׳/g, "'"),
      w.replace(/["'״׳]/g, ""),
    ]),
  ].filter((s) => s.length > 0);
}

/** Where one search word may appear for a product to match. */
function wordMatch(w: string): Prisma.ProductWhereInput {
  return {
    OR: spellings(w).flatMap((s) => [
      { name: { contains: s, mode: "insensitive" as const } },
      { shortDescription: { contains: s, mode: "insensitive" as const } },
      { brand: { name: { contains: s, mode: "insensitive" as const } } },
      { category: { name: { contains: s, mode: "insensitive" as const } } },
      { category: { parent: { name: { contains: s, mode: "insensitive" as const } } } },
      { variants: { some: { isActive: true, OR: [{ sku: { contains: s, mode: "insensitive" as const } }, { name: { contains: s, mode: "insensitive" as const } }, { barcode: s }] } } },
    ]),
  };
}

/**
 * Site search. Every word typed must appear somewhere in the product (name,
 * brand, category, model, SKU or barcode), so "מטען סמסונג" finds Samsung
 * chargers. Best matches first: the whole phrase in the name, then the name
 * starting with the first word, then products whose name holds more of the words.
 */
export async function searchProducts(q: string, limit = 48) {
  const term = q.replace(/\s+/g, " ").trim().slice(0, 80);
  if (term.length < 2) return [];
  const words = [...new Set(term.split(" "))].slice(0, 6);
  const rows = await db.product.findMany({
    where: { AND: [LISTED, ...words.map(wordMatch)] },
    include: productInclude,
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  const lower = term.toLowerCase();
  const score = (name: string) => {
    const n = name.toLowerCase();
    let s = 0;
    if (n.includes(lower)) s += 100;
    if (n.startsWith(words[0].toLowerCase())) s += 50;
    for (const w of words) if (n.includes(w.toLowerCase())) s += 10;
    return s;
  };
  return rows
    .map((r) => ({ r, s: score(r.name) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ r }) => toCard(r));
}

/** Fixed site pages people may look for, with the words they might type. */
const SITE_LINKS = [
  { label: "צור קשר", href: "/contact", keywords: "קשר טלפון וואטסאפ ווצאפ מייל פנייה שאלה שירות לקוחות" },
  { label: "עגלת הקניות", href: "/cart", keywords: "עגלה סל קניות תשלום קופה" },
  { label: "החשבון שלי", href: "/account", keywords: "חשבון התחברות הרשמה פרופיל הזמנות שלי" },
  { label: "מבצעים", href: "/search?tag=SALE", keywords: "מבצע הנחה הנחות סייל זול" },
  { label: "חדש באתר", href: "/search?tag=NEW", keywords: "חדש חדשים חדשות" },
  { label: "להיטים", href: "/search?tag=HOT", keywords: "להיט להיטים פופולרי נמכרים" },
  { label: "מאמרים", href: "/articles", keywords: "מאמר בלוג מדריך מדריכים טיפים" },
  { label: "מפת האתר", href: "/site-map", keywords: "מפה מפת אתר כל העמודים" },
];

const norm = (s: string) => s.toLowerCase().replace(/["'״׳]/g, "").trim();

/** Categories, content pages, articles and site pages matching every word. */
export async function searchLinks(q: string, limit = 5) {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const has = (text: string) => {
    const t = norm(text);
    return words.every((w) => t.includes(w));
  };
  const [cats, pages, articles] = await Promise.all([
    db.category.findMany({
      where: { isActive: true },
      select: { name: true, slug: true, description: true, parent: { select: { name: true } } },
    }),
    getPublishedPages(),
    db.article.findMany({
      where: { isPublished: true, publishedAt: { lte: now() } },
      select: { title: true, slug: true, excerpt: true },
      orderBy: { publishedAt: "desc" },
      take: 200,
    }),
  ]);
  const links: { label: string; href: string; kind: string }[] = [
    ...cats
      .filter((c) => has(`${c.parent?.name ?? ""} ${c.name} ${c.description ?? ""}`))
      .map((c) => ({ label: c.parent ? `${c.parent.name} › ${c.name}` : c.name, href: `/category/${c.slug}`, kind: "מחלקה" })),
    ...SITE_LINKS.filter((l) => has(`${l.label} ${l.keywords}`)).map((l) => ({ label: l.label, href: l.href, kind: "עמוד" })),
    ...pages.filter((p) => has(p.title)).map((p) => ({ label: p.title, href: `/pages/${p.slug}`, kind: "מידע" })),
    ...articles
      .filter((a) => has(`${a.title} ${a.excerpt ?? ""}`))
      .map((a) => ({ label: a.title, href: `/articles/${a.slug}`, kind: "מאמר" })),
  ];
  return links.slice(0, limit);
}

/** Short lists for the live suggestions under the search box. */
export async function searchSuggestions(q: string) {
  const [items, links] = await Promise.all([searchProducts(q, 6), searchLinks(q)]);
  return {
    links,
    products: items.map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.categoryName,
      imageUrl: p.imageUrl,
      price: p.price,
      compareAt: p.compareAt,
    })),
  };
}
export type SearchSuggestions = Awaited<ReturnType<typeof searchSuggestions>>;

export async function productsByTag(tag: ProductTag, limit = 96) {
  const rows = await db.product.findMany({
    where: { ...LISTED, OR: [{ tags: { has: tag } }, ...(tag === "SALE" ? [{ isWeeklyDeal: true }] : [])] },
    include: productInclude,
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
  return rows.map(toCard);
}

// ---------------------------------------------------------------- content

export const getPage = cache(async (slug: string) => db.page.findFirst({ where: { slug, isPublished: true } }));

export const getPublishedPages = cache(async () =>
  db.page.findMany({ where: { isPublished: true }, select: { slug: true, title: true, updatedAt: true }, orderBy: { title: "asc" } }),
);

export const getArticles = cache(async (take = 30) =>
  db.article.findMany({
    where: { isPublished: true, publishedAt: { lte: now() } },
    orderBy: { publishedAt: "desc" },
    take,
  }),
);

export const getArticle = cache(async (slug: string) =>
  db.article.findFirst({ where: { slug, isPublished: true, publishedAt: { lte: now() } } }),
);
