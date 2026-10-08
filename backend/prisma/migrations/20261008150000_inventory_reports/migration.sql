-- CreateEnum
CREATE TYPE "MaterialCategory" AS ENUM ('CEMENT_CONCRETE', 'STEEL', 'AGGREGATES', 'MASONRY', 'WOOD', 'ELECTRICAL', 'PLUMBING', 'FINISHES', 'TOOLS_EQUIPMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "Weather" AS ENUM ('SUNNY', 'CLOUDY', 'RAINY', 'STORMY');

-- CreateEnum
CREATE TYPE "FieldReportStatus" AS ENUM ('SUBMITTED', 'REVIEWED');

-- AlterTable
ALTER TABLE "materials" ADD COLUMN     "category" "MaterialCategory";

-- AlterTable
ALTER TABLE "inventory_movements" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expenseId" TEXT,
ADD COLUMN     "registeredById" TEXT,
ADD COLUMN     "supplierId" TEXT,
ADD COLUMN     "unitCost" DECIMAL(14,2);

-- CreateTable
CREATE TABLE "field_reports" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "weather" "Weather",
    "workersOnSite" INTEGER,
    "summary" TEXT NOT NULL,
    "issues" TEXT,
    "status" "FieldReportStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "field_reports_authorId_idx" ON "field_reports"("authorId");

-- CreateIndex
CREATE INDEX "field_reports_date_idx" ON "field_reports"("date");

-- CreateIndex
CREATE UNIQUE INDEX "field_reports_projectId_date_key" ON "field_reports"("projectId", "date");

-- CreateIndex
CREATE INDEX "inventory_movements_materialId_date_idx" ON "inventory_movements"("materialId", "date");

-- CreateIndex
CREATE INDEX "inventory_movements_projectId_date_idx" ON "inventory_movements"("projectId", "date");

-- CreateIndex
CREATE INDEX "inventory_movements_expenseId_idx" ON "inventory_movements"("expenseId");

-- CreateIndex
CREATE INDEX "inventory_movements_registeredById_idx" ON "inventory_movements"("registeredById");

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_reports" ADD CONSTRAINT "field_reports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_reports" ADD CONSTRAINT "field_reports_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_reports" ADD CONSTRAINT "field_reports_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

