// Temporary (deleted after): products to test the Google Shopping feed.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }) });
if (process.argv[2] === "create") {
  const cat = await db.category.findFirstOrThrow({ where: { slug: "gadgets" } });
  const brand = await db.brand.create({ data: { name: "QA-GS Brand", slug: "qa-gs-brand" } });
  await db.product.create({
    data: {
      name: "QA-GS אוזניות", slug: "qa-gs-full", categoryId: cat.id, status: "ACTIVE", brandId: brand.id,
      description: "אוזניות בדיקה עם <תווים> & סימנים מיוחדים",
      images: { create: [{ url: "https://example.com/a.jpg", alt: "a" }, { url: "/uploads/test/b.jpg", alt: "b", sortOrder: 1 }] },
      variants: { create: [
        { sku: "QA-GS-1", name: "שחור", price: 9990, compareAtPrice: 12990, stock: 3, barcode: "7290000000017" },
        { sku: "QA-GS-2", name: "לבן", price: 9990, stock: 0 },
      ] },
    },
  });
  await db.product.create({ data: { name: "QA-GS בלי תמונה", slug: "qa-gs-noimg", categoryId: cat.id, status: "ACTIVE", variants: { create: { sku: "QA-GS-3", price: 5000, stock: 2 } } } });
  await db.product.create({ data: { name: "QA-GS כבוי", slug: "qa-gs-off", categoryId: cat.id, status: "ACTIVE", inGoogleShopping: false, images: { create: { url: "https://example.com/c.jpg", alt: "c" } }, variants: { create: { sku: "QA-GS-4", price: 5000, stock: 2 } } } });
  console.log("created");
} else {
  await db.product.deleteMany({ where: { slug: { startsWith: "qa-gs-" } } });
  await db.brand.deleteMany({ where: { slug: "qa-gs-brand" } });
  console.log("cleaned");
}
await db.$disconnect();
