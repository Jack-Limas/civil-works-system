-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'CARD', 'CHECK', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProjectType" ADD VALUE 'RESIDENTIAL_BUILDING';
ALTER TYPE "ProjectType" ADD VALUE 'COMMERCIAL_BUILDING';
ALTER TYPE "ProjectType" ADD VALUE 'ROAD';
ALTER TYPE "ProjectType" ADD VALUE 'BRIDGE';
ALTER TYPE "ProjectType" ADD VALUE 'SCHOOL';
ALTER TYPE "ProjectType" ADD VALUE 'HEALTH_CENTER';
ALTER TYPE "ProjectType" ADD VALUE 'WAREHOUSE';
ALTER TYPE "ProjectType" ADD VALUE 'REMODELING';

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "registeredById" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "status" "ExpenseStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "supplierId" TEXT,
ADD COLUMN     "supportUrl" TEXT;

-- AlterTable
ALTER TABLE "alerts" ADD COLUMN     "params" JSONB;

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nit" TEXT,
    "category" "ExpenseCategory",
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_transfers" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "projectId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "PaymentMethod",
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fund_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_nit_key" ON "suppliers"("nit");

-- CreateIndex
CREATE INDEX "suppliers_name_idx" ON "suppliers"("name");

-- CreateIndex
CREATE INDEX "fund_transfers_residentId_idx" ON "fund_transfers"("residentId");

-- CreateIndex
CREATE INDEX "fund_transfers_projectId_date_idx" ON "fund_transfers"("projectId", "date");

-- CreateIndex
CREATE INDEX "fund_transfers_date_idx" ON "fund_transfers"("date");

-- CreateIndex
CREATE INDEX "expenses_projectId_date_idx" ON "expenses"("projectId", "date");

-- CreateIndex
CREATE INDEX "expenses_registeredById_idx" ON "expenses"("registeredById");

-- CreateIndex
CREATE INDEX "expenses_status_idx" ON "expenses"("status");

-- CreateIndex
CREATE INDEX "expenses_supplierId_idx" ON "expenses"("supplierId");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_transfers" ADD CONSTRAINT "fund_transfers_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_transfers" ADD CONSTRAINT "fund_transfers_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_transfers" ADD CONSTRAINT "fund_transfers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

