"use server";

// Suppliers and purchase orders. Every action re-checks the admin session and
// role, validates input, and writes an audit entry. Receiving goods adds stock
// through changeStock, so it shows in the stock history like any other restock.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit, requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { bool, date, FormError, handle, int, optInt, optStr, shekels, str, type ActionState } from "@/lib/form";
import { reorderReport } from "@/lib/reorder";
import { changeStock } from "@/lib/stock";

const id = (fd: FormData, key = "id") => str(fd, key, { max: 40 });
const refresh = () => revalidatePath("/", "layout");

// ---------------------------------------------------------------- suppliers

export async function saveSupplier(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin("MANAGER");
  return handle(async () => {
    const email = optStr(fd, "email", 120);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new FormError("כתובת מייל לא תקינה");
    const data = {
      name: str(fd, "name", { required: "יש להזין שם ספק", max: 120 }),
      contactName: optStr(fd, "contactName", 80),
      phone: optStr(fd, "phone", 30),
      whatsapp: optStr(fd, "whatsapp", 30),
      email,
      address: optStr(fd, "address", 200),
      taxId: optStr(fd, "taxId", 20),
      notes: optStr(fd, "notes", 2000),
      leadTimeDays: optInt(fd, "leadTimeDays", { min: 1, max: 365 }),
      isActive: !bool(fd, "inactive"),
    };
    const row = id(fd) ? await db.supplier.update({ where: { id: id(fd) }, data }) : await db.supplier.create({ data });
    await audit(me.id, "supplier_saved", "Supplier", row.id);
    revalidatePath("/admin/suppliers");
  });
}

/** Deletes a supplier with no purchase orders; one with history is only deactivated. */
export async function deleteSupplier(fd: FormData) {
  const me = await requireAdmin("MANAGER");
  const sid = id(fd);
  const orders = await db.purchaseOrder.count({ where: { supplierId: sid } });
  if (orders) await db.supplier.update({ where: { id: sid }, data: { isActive: false } });
  else await db.supplier.delete({ where: { id: sid } });
  await audit(me.id, orders ? "supplier_deactivated" : "supplier_deleted", "Supplier", sid);
  revalidatePath("/admin/suppliers");
  redirect("/admin/suppliers");
}

// ---------------------------------------------------------------- create

export async function createPurchaseOrder(fd: FormData) {
  const me = await requireAdmin("MANAGER");
  const supplierId = id(fd, "supplierId");
  if (!supplierId) redirect("/admin/purchase-orders?error=supplier");
  const supplier = await db.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) redirect("/admin/purchase-orders?error=supplier");
  const po = await db.purchaseOrder.create({ data: { supplierId, createdById: me.id } });
  await audit(me.id, "po_created", "PurchaseOrder", po.id);
  redirect(`/admin/purchase-orders/${po.id}`);
}

/** New draft for a supplier, filled with that supplier's products from the reorder recommendations. */
export async function createFromReorder(fd: FormData) {
  const me = await requireAdmin("MANAGER");
  const supplierId = id(fd, "supplierId");
  const { toOrder } = await reorderReport();
  const rows = toOrder.filter((r) => r.supplierId === supplierId);
  const costs = await db.productVariant.findMany({
    where: { id: { in: rows.map((r) => r.variantId) } },
    select: { id: true, costPrice: true },
  });
  const cost = new Map(costs.map((c) => [c.id, c.costPrice ?? 0]));
  const po = await db.purchaseOrder.create({
    data: {
      supplierId,
      createdById: me.id,
      items: {
        create: rows.map((r, i) => ({
          variantId: r.variantId,
          name: r.title,
          sku: r.sku,
          qty: r.suggestQty,
          unitCost: cost.get(r.variantId) ?? 0,
          sortOrder: i,
        })),
      },
    },
  });
  await audit(me.id, "po_created_from_reorder", "PurchaseOrder", po.id);
  redirect(`/admin/purchase-orders/${po.id}`);
}

// ---------------------------------------------------------------- edit

async function editableOrder(poId: string) {
  const po = await db.purchaseOrder.findUnique({ where: { id: poId }, include: { items: true } });
  if (!po) throw new FormError("ההזמנה לא נמצאה");
  const received = po.items.some((i) => i.receivedQty > 0);
  if (!(po.status === "DRAFT" || (po.status === "SENT" && !received)))
    throw new FormError("אי אפשר לשנות הזמנה שכבר התקבלה או בוטלה");
  return po;
}

/** Adds a product by SKU / barcode (or a unique name); adding it again raises the quantity. */
export async function addPoItem(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin("MANAGER");
  return handle(async () => {
    const po = await editableOrder(id(fd, "poId"));
    const term = str(fd, "product", { required: "יש לבחור מוצר", max: 200 });
    const qty = int(fd, "qty", { min: 1, max: 100000, fallback: 1 });
    const sku = term.split(" | ")[0].trim();
    let variant = await db.productVariant.findFirst({
      where: { OR: [{ sku }, { barcode: sku }] },
      include: { product: { select: { name: true } } },
    });
    if (!variant) {
      const matches = await db.productVariant.findMany({
        where: { OR: [{ product: { name: { contains: term, mode: "insensitive" } } }, { name: { contains: term, mode: "insensitive" } }] },
        include: { product: { select: { name: true } } },
        take: 2,
      });
      if (matches.length !== 1) throw new FormError(matches.length ? "נמצא יותר ממוצר אחד - בחרו מהרשימה" : "המוצר לא נמצא - בחרו מהרשימה");
      variant = matches[0];
    }
    const unitCost = shekels(fd, "cost") ?? variant.costPrice ?? 0;
    const existing = po.items.find((i) => i.variantId === variant.id);
    if (existing) {
      await db.purchaseOrderItem.update({ where: { id: existing.id }, data: { qty: { increment: qty } } });
    } else {
      await db.purchaseOrderItem.create({
        data: {
          purchaseOrderId: po.id,
          variantId: variant.id,
          name: variant.name ? `${variant.product.name} - ${variant.name}` : variant.product.name,
          sku: variant.sku,
          qty,
          unitCost,
          sortOrder: po.items.length,
        },
      });
    }
    await audit(me.id, "po_item_added", "PurchaseOrder", po.id);
    revalidatePath(`/admin/purchase-orders/${po.id}`);
    return { ok: true, message: existing ? "הכמות עודכנה" : "המוצר נוסף" };
  });
}

/** Saves quantities, prices, removals, notes and expected date. */
export async function savePurchaseOrder(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin("MANAGER");
  return handle(async () => {
    const po = await editableOrder(id(fd, "poId"));
    await db.$transaction(async (tx) => {
      for (const item of po.items) {
        if (bool(fd, `remove_${item.id}`)) {
          await tx.purchaseOrderItem.delete({ where: { id: item.id } });
          continue;
        }
        const qty = int(fd, `qty_${item.id}`, { min: 0, max: 100000, fallback: item.qty });
        if (qty === 0) {
          await tx.purchaseOrderItem.delete({ where: { id: item.id } });
          continue;
        }
        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { qty, unitCost: shekels(fd, `cost_${item.id}`) ?? 0 },
        });
      }
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { notes: optStr(fd, "notes", 2000), expectedAt: date(fd, "expectedAt") },
      });
    });
    await audit(me.id, "po_saved", "PurchaseOrder", po.id);
    revalidatePath(`/admin/purchase-orders/${po.id}`);
  });
}

// ---------------------------------------------------------------- status

export async function setPoStatus(fd: FormData) {
  const me = await requireAdmin("MANAGER");
  const poId = id(fd, "poId");
  const to = str(fd, "to", { max: 20 });
  const po = await db.purchaseOrder.findUnique({ where: { id: poId }, include: { items: true } });
  if (!po) redirect("/admin/purchase-orders");
  const received = po.items.some((i) => i.receivedQty > 0);

  if (to === "SENT" && po.status === "DRAFT" && po.items.length) {
    await db.purchaseOrder.update({ where: { id: poId }, data: { status: "SENT", sentAt: new Date() } });
  } else if (to === "DRAFT" && po.status === "SENT" && !received) {
    await db.purchaseOrder.update({ where: { id: poId }, data: { status: "DRAFT", sentAt: null } });
  } else if (to === "CANCELLED" && (po.status === "DRAFT" || po.status === "SENT") && !received) {
    await db.purchaseOrder.update({ where: { id: poId }, data: { status: "CANCELLED" } });
  } else if (to === "CLOSE" && po.status === "PARTIAL") {
    // Supplier will not send the rest: close the order as received.
    await db.purchaseOrder.update({ where: { id: poId }, data: { status: "RECEIVED", receivedAt: new Date() } });
  } else if (to === "DELETE" && po.status === "DRAFT") {
    await db.purchaseOrder.delete({ where: { id: poId } });
    await audit(me.id, "po_deleted", "PurchaseOrder", poId);
    redirect("/admin/purchase-orders");
  }
  await audit(me.id, `po_status_${to.toLowerCase()}`, "PurchaseOrder", poId);
  revalidatePath(`/admin/purchase-orders/${poId}`);
  revalidatePath("/admin/purchase-orders");
}

// ---------------------------------------------------------------- receive goods

/**
 * Goods arrived: adds the received quantities to stock (history reason
 * "הגיעה סחורה", note with the order number) and optionally updates each
 * product's cost price to the price on the order. All or nothing.
 */
export async function receivePurchaseOrder(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin("MANAGER");
  return handle(async () => {
    const poId = id(fd, "poId");
    const updateCost = bool(fd, "updateCost");
    let units = 0;
    await db.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({ where: { id: poId }, include: { items: true } });
      if (!po) throw new FormError("ההזמנה לא נמצאה");
      if (po.status !== "SENT" && po.status !== "PARTIAL") throw new FormError("אפשר לקבל סחורה רק בהזמנה שנשלחה לספק");
      for (const item of po.items) {
        const n = int(fd, `recv_${item.id}`, { min: 0, max: 100000, fallback: 0 });
        if (!n) continue;
        if (!item.variantId) throw new FormError(`המוצר "${item.name}" נמחק מהמערכת - אי אפשר להוסיף אותו למלאי`);
        // Lock the row against a double click receiving the same goods twice.
        const res = await tx.purchaseOrderItem.updateMany({
          where: { id: item.id, receivedQty: item.receivedQty },
          data: { receivedQty: { increment: n } },
        });
        if (!res.count) throw new FormError("ההזמנה עודכנה בינתיים - רעננו את הדף");
        await changeStock(item.variantId, n, "RESTOCK", { userId: me.id, note: `הזמנת רכש #${po.number}` }, tx);
        if (updateCost && item.unitCost > 0) {
          await tx.productVariant.update({ where: { id: item.variantId }, data: { costPrice: item.unitCost } });
        }
        units += n;
      }
      if (!units) throw new FormError("לא הוזנה כמות שהתקבלה");
      const after = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: poId } });
      const done = after.every((i) => i.receivedQty >= i.qty);
      await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: done ? "RECEIVED" : "PARTIAL", receivedAt: new Date() },
      });
    });
    await audit(me.id, "po_received", "PurchaseOrder", poId);
    refresh();
    return { ok: true, message: `נוספו ${units} יחידות למלאי` };
  });
}
