-- CreateTable
CREATE TABLE "Activation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "regionId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Activation_slug_key" ON "Activation"("slug");
CREATE INDEX "Activation_regionId_idx" ON "Activation"("regionId");
CREATE INDEX "Activation_startsAt_idx" ON "Activation"("startsAt");

ALTER TABLE "Activation" ADD CONSTRAINT "Activation_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ActivationProduct" (
    "id" TEXT NOT NULL,
    "activationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivationProduct_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ActivationProduct_activationId_idx" ON "ActivationProduct"("activationId");

ALTER TABLE "ActivationProduct" ADD CONSTRAINT "ActivationProduct_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "Activation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ActivationRoster" (
    "id" TEXT NOT NULL,
    "activationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivationRoster_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActivationRoster_activationId_userId_key" ON "ActivationRoster"("activationId", "userId");
CREATE INDEX "ActivationRoster_userId_idx" ON "ActivationRoster"("userId");

ALTER TABLE "ActivationRoster" ADD CONSTRAINT "ActivationRoster_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "Activation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivationRoster" ADD CONSTRAINT "ActivationRoster_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
