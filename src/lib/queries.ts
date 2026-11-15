import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import type { Prisma, ProductTag } from "@/generated/prisma/client";

const now = () => new Date();

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
      where: { status: "ACTIVE", OR: [{ isWeeklyDeal: true }, { tags: { has: "SALE" } }] },
      include: productInclude,
      orderBy: { updatedAt: "desc" },
      take: 24,
    }),
    db.product.findMany({
      where: { status: "ACTIVE" },
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
    where: { status: "ACTIVE", categoryId: { in: scopeIds } },
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
  return rows.filter((r) => r.accessory.status === "ACTIVE").map((r) => toCard(r.accessory));
}

export async function getRelatedAccessories(categoryId: string, excludeId: string) {
  const acc = await db.category.findFirst({ where: { parentId: categoryId, isAccessories: true } });
  if (!acc) return [];
  const rows = await db.product.findMany({
    where: { status: "ACTIVE", categoryId: acc.id, id: { not: excludeId } },
    include: productInclude,
    take: 4,
  });
  return rows.map(toCard);
}

// ---------------------------------------------------------------- search

export async function searchProducts(q: string, limit = 48) {
  const term = q.trim().slice(0, 80);
  if (term.length < 2) return [];
  const rows = await db.product.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { shortDescription: { contains: term, mode: "insensitive" } },
        { brand: { name: { contains: term, mode: "insensitive" } } },
        { variants: { some: { sku: { contains: term, mode: "insensitive" } } } },
        { category: { name: { contains: term, mode: "insensitive" } } },
      ],
    },
    include: productInclude,
    take: limit,
  });
  return rows.map(toCard);
}

export async function productsByTag(tag: ProductTag, limit = 96) {
  const rows = await db.product.findMany({
    where: { status: "ACTIVE", OR: [{ tags: { has: tag } }, ...(tag === "SALE" ? [{ isWeeklyDeal: true }] : [])] },
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
