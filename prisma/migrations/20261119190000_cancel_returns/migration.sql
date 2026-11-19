-- CreateEnum
CREATE TYPE "CancelRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "returnedQty" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CancelRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "reason" TEXT,
    "status" "CancelRequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "ip" TEXT,
    "handledAt" TIMESTAMP(3),
    "handledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CancelRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderRefund" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "restockedCost" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderRefund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CancelRequest_status_createdAt_idx" ON "CancelRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CancelRequest_orderId_idx" ON "CancelRequest"("orderId");

-- CreateIndex
CREATE INDEX "OrderRefund_orderId_idx" ON "OrderRefund"("orderId");

-- CreateIndex
CREATE INDEX "OrderRefund_createdAt_idx" ON "OrderRefund"("createdAt");

-- AddForeignKey
ALTER TABLE "CancelRequest" ADD CONSTRAINT "CancelRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancelRequest" ADD CONSTRAINT "CancelRequest_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderRefund" ADD CONSTRAINT "OrderRefund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderRefund" ADD CONSTRAINT "OrderRefund_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
