-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "unsubToken" TEXT;
-- give existing customers a random token before making the column required
UPDATE "Customer" SET "unsubToken" = md5(random()::text || clock_timestamp()::text || "id") WHERE "unsubToken" IS NULL;
ALTER TABLE "Customer" ALTER COLUMN "unsubToken" SET NOT NULL;

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "recipients" INTEGER NOT NULL DEFAULT 0,
    "sent" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_unsubToken_key" ON "Customer"("unsubToken");

