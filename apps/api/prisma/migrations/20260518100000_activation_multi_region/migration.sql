-- CreateTable
CREATE TABLE "ActivationRegion" (
    "activationId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,

    CONSTRAINT "ActivationRegion_pkey" PRIMARY KEY ("activationId","regionId")
);

-- CreateIndex
CREATE INDEX "ActivationRegion_regionId_idx" ON "ActivationRegion"("regionId");

-- AddForeignKey
ALTER TABLE "ActivationRegion" ADD CONSTRAINT "ActivationRegion_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "Activation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivationRegion" ADD CONSTRAINT "ActivationRegion_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing single-region column into join rows
INSERT INTO "ActivationRegion" ("activationId", "regionId")
SELECT "id", "regionId" FROM "Activation" WHERE "regionId" IS NOT NULL;

-- Drop FK and column on Activation
ALTER TABLE "Activation" DROP CONSTRAINT IF EXISTS "Activation_regionId_fkey";

DROP INDEX IF EXISTS "Activation_regionId_idx";

ALTER TABLE "Activation" DROP COLUMN IF EXISTS "regionId";
