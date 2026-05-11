-- CreateTable
CREATE TABLE "Outlet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "distributorName" TEXT NOT NULL,
    "locationArea" TEXT NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Outlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutletVisit" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "outletPhotoMimeType" TEXT,
    "outletPhotoImage" BYTEA,
    "hasOutletPhoto" BOOLEAN NOT NULL DEFAULT false,
    "stockAvailabilityNotes" TEXT,
    "salesMadeNotes" TEXT,
    "consumerEngagementNotes" TEXT,
    "visibilityExecutionNotes" TEXT,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutletVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutletVisit_outletId_checkedInAt_idx" ON "OutletVisit"("outletId", "checkedInAt" DESC);

-- CreateIndex
CREATE INDEX "OutletVisit_userId_checkedInAt_idx" ON "OutletVisit"("userId", "checkedInAt" DESC);

-- AddForeignKey
ALTER TABLE "OutletVisit" ADD CONSTRAINT "OutletVisit_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletVisit" ADD CONSTRAINT "OutletVisit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
