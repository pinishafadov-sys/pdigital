-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "leadTimeDays" INTEGER;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "noReorder" BOOLEAN NOT NULL DEFAULT false;

