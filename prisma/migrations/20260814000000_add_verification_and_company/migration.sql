CREATE TABLE "Company" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Company_userId_key" ON "Company"("userId");
ALTER TABLE "Company" ADD CONSTRAINT "Company_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User"
  ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "verificationCodeHash" TEXT,
  ADD COLUMN "verificationCodeExpiresAt" TIMESTAMP(3),
  ADD COLUMN "verificationCodeSentAt" TIMESTAMP(3),
  ADD COLUMN "verificationAttempts" INTEGER NOT NULL DEFAULT 0;

-- Existing accounts predate verification/company onboarding. Preserve them as
-- completed accounts and retain their accounting ownership during the move.
UPDATE "User" SET "emailVerifiedAt" = CURRENT_TIMESTAMP;
INSERT INTO "Company" ("id", "userId", "name", "createdAt", "updatedAt")
SELECT "id", "id", "name", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "User";

ALTER TABLE "Item" RENAME COLUMN "userId" TO "companyId";
ALTER TABLE "Customer" RENAME COLUMN "userId" TO "companyId";
ALTER TABLE "Vendor" RENAME COLUMN "userId" TO "companyId";
ALTER TABLE "Invoice" RENAME COLUMN "userId" TO "companyId";
ALTER TABLE "Bill" RENAME COLUMN "userId" TO "companyId";

ALTER TABLE "Item" DROP CONSTRAINT "Item_userId_fkey";
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_userId_fkey";
ALTER TABLE "Vendor" DROP CONSTRAINT "Vendor_userId_fkey";
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_userId_fkey";
ALTER TABLE "Bill" DROP CONSTRAINT "Bill_userId_fkey";

ALTER INDEX "Item_userId_idx" RENAME TO "Item_companyId_idx";
ALTER INDEX "Item_userId_sku_key" RENAME TO "Item_companyId_sku_key";
ALTER INDEX "Customer_userId_idx" RENAME TO "Customer_companyId_idx";
ALTER INDEX "Vendor_userId_idx" RENAME TO "Vendor_companyId_idx";
ALTER INDEX "Invoice_userId_idx" RENAME TO "Invoice_companyId_idx";
ALTER INDEX "Invoice_userId_invoiceNumber_key" RENAME TO "Invoice_companyId_invoiceNumber_key";
ALTER INDEX "Bill_userId_idx" RENAME TO "Bill_companyId_idx";
ALTER INDEX "Bill_userId_sequence_key" RENAME TO "Bill_companyId_sequence_key";

ALTER TABLE "Item" ADD CONSTRAINT "Item_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
