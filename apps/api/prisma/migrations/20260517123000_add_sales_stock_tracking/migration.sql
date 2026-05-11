-- CreateTable
CREATE TABLE "StockPickup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activationId" TEXT NOT NULL,
    "distributorName" TEXT NOT NULL,
    "pickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockPickup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockPickupItem" (
    "id" TEXT NOT NULL,
    "pickupId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "costPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockPickupItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockPickup_userId_pickedAt_idx" ON "StockPickup"("userId", "pickedAt" DESC);

-- CreateIndex
CREATE INDEX "StockPickup_activationId_pickedAt_idx" ON "StockPickup"("activationId", "pickedAt" DESC);

-- CreateIndex
CREATE INDEX "StockPickupItem_pickupId_idx" ON "StockPickupItem"("pickupId");

-- CreateIndex
CREATE INDEX "StockPickupItem_productId_idx" ON "StockPickupItem"("productId");

-- AddForeignKey
ALTER TABLE "StockPickup" ADD CONSTRAINT "StockPickup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockPickup" ADD CONSTRAINT "StockPickup_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "Activation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockPickupItem" ADD CONSTRAINT "StockPickupItem_pickupId_fkey" FOREIGN KEY ("pickupId") REFERENCES "StockPickup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockPickupItem" ADD CONSTRAINT "StockPickupItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ActivationProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
