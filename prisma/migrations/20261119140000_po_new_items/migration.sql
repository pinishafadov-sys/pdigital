-- AlterTable
ALTER TABLE "PurchaseOrderItem" ADD COLUMN     "isNew" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pricedAt" TIMESTAMP(3);
