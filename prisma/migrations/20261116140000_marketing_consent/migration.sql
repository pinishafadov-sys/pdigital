-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "consentAt" TIMESTAMP(3),
ADD COLUMN     "consentSource" TEXT,
ADD COLUMN     "unsubscribedAt" TIMESTAMP(3);

