import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { priceInput } from "@/lib/format";
import { AdminTop } from "../../AdminTop";
import { ConfirmButton } from "../../ui";
import { deleteProduct } from "../actions";
import { ProductForm } from "./ProductForm";

export const metadata = { title: "עריכת מוצר" };

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  await requireAdmin("MANAGER");
  const { id } = await params;
  const { created } = await searchParams;
  const isNew = id === "new";

  const [product, categories, brands, types, accessoryOptions] = await Promise.all([
    isNew
      ? null
      : db.product.findUnique({
          where: { id },
          include: {
            variants: { orderBy: { sortOrder: "asc" } },
            images: { orderBy: { sortOrder: "asc" } },
            specValues: true,
            accessories: { orderBy: { sortOrder: "asc" } },
          },
        }),
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }], include: { parent: true } }),
    db.brand.findMany({ orderBy: { name: "asc" } }),
    db.productType.findMany({ include: { specFields: { orderBy: { sortOrder: "asc" } } }, orderBy: { name: "asc" } }),
    db.product.findMany({ where: { category: { isAccessories: true }, ...(isNew ? {} : { id: { not: id } }) }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 300 }),
  ]);
  if (!isNew && !product) notFound();

  return (
    <>
      <AdminTop
        title={isNew ? "מוצר חדש" : product!.name}
        actions={
          <>
            {!isNew && product!.status === "ACTIVE" && (
              <Link href={`/product/${product!.slug}`} target="_blank" className="btn btn-ghost" style={{ minHeight: 40 }}>
                צפייה בדף המוצר
              </Link>
            )}
            <Link href="/admin/products" className="btn btn-ghost" style={{ minHeight: 40 }}>חזרה לרשימה</Link>
          </>
        }
      />
      <main className="admin-content">
        {created && <p className="form-ok">המוצר נוצר בהצלחה.</p>}
        <ProductForm
          product={
            product && {
              id: product.id,
              name: product.name,
              slug: product.slug,
              shortDescription: product.shortDescription,
              description: product.description,
              status: product.status,
              tags: product.tags,
              categoryId: product.categoryId,
              brandId: product.brandId,
              productTypeId: product.productTypeId,
              warrantyMonths: product.warrantyMonths,
              isWeeklyDeal: product.isWeeklyDeal,
              seoTitle: product.seoTitle,
              seoDescription: product.seoDescription,
              variants: product.variants.map((v) => ({
                id: v.id, name: v.name ?? "", sku: v.sku, price: priceInput(v.price), compare: priceInput(v.compareAtPrice), stock: String(v.stock),
              })),
              images: product.images.map((i) => ({ url: i.url, alt: i.alt })),
              specs: Object.fromEntries(product.specValues.map((s) => [s.specFieldId, s.value])),
              accessories: product.accessories.map((a) => a.accessoryId),
            }
          }
          categories={categories.map((c) => ({ value: c.id, label: c.parent ? `${c.parent.name} › ${c.name}` : c.name }))}
          brands={brands.map((b) => ({ value: b.id, label: b.name }))}
          types={types.map((t) => ({ id: t.id, name: t.name, fields: t.specFields.map((f) => ({ id: f.id, label: f.label, unit: f.unit })) }))}
          accessoryOptions={accessoryOptions}
        />
        {!isNew && (
          <div className="card">
            <h2>מחיקת מוצר</h2>
            <p className="muted">מוצר שכבר הוזמן יועבר לארכיון כדי לשמור על היסטוריית ההזמנות.</p>
            <ConfirmButton action={deleteProduct} hidden={{ id }} label="מחיקת המוצר" confirmText="למחוק את המוצר? פעולה זו אינה הפיכה." />
          </div>
        )}
      </main>
    </>
  );
}
