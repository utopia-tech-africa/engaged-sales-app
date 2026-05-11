-- AlterTable
ALTER TABLE "LocationPing" ADD COLUMN "selfieMimeType" TEXT;
ALTER TABLE "LocationPing" ADD COLUMN "selfieImage" BYTEA;
ALTER TABLE "LocationPing" ADD COLUMN "hasSelfieVerification" BOOLEAN NOT NULL DEFAULT false;
