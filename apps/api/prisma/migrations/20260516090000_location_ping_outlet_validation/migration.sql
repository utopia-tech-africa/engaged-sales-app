-- AlterTable
ALTER TABLE "LocationPing"
ADD COLUMN "geofenceId" TEXT,
ADD COLUMN "distanceToGeofenceMeters" DOUBLE PRECISION,
ADD COLUMN "dwellSecondsAtGeofence" INTEGER;

-- Index
CREATE INDEX "LocationPing_geofenceId_recordedAt_idx"
ON "LocationPing"("geofenceId", "recordedAt" DESC);
