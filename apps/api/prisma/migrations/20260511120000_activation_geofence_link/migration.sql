-- CreateTable
CREATE TABLE "ActivationGeofence" (
    "activationId" TEXT NOT NULL,
    "geofenceId" TEXT NOT NULL,

    CONSTRAINT "ActivationGeofence_pkey" PRIMARY KEY ("activationId","geofenceId")
);

-- CreateIndex
CREATE INDEX "ActivationGeofence_geofenceId_idx" ON "ActivationGeofence"("geofenceId");

-- AddForeignKey
ALTER TABLE "ActivationGeofence" ADD CONSTRAINT "ActivationGeofence_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "Activation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationGeofence" ADD CONSTRAINT "ActivationGeofence_geofenceId_fkey" FOREIGN KEY ("geofenceId") REFERENCES "Geofence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
