-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "companyTaxId" TEXT,
ADD COLUMN     "publicToken" TEXT NOT NULL,
ADD COLUMN     "stockDeducted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Order_publicToken_key" ON "Order"("publicToken");

