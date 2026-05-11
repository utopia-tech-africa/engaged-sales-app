-- CreateTable
CREATE TABLE "Subwholesale" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subwholesale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Subwholesale_regionId_idx" ON "Subwholesale"("regionId");

-- CreateIndex
CREATE UNIQUE INDEX "Subwholesale_regionId_slug_key" ON "Subwholesale"("regionId", "slug");

-- AddForeignKey
ALTER TABLE "Subwholesale" ADD CONSTRAINT "Subwholesale_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;
