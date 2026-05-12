import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { GeofenceRepository } from "./geofence.repository";
import { GeofenceService } from "./geofence.service";

@Module({
  imports: [PrismaModule],
  providers: [GeofenceService, GeofenceRepository],
  exports: [GeofenceService, GeofenceRepository]
})
export class GeofenceCoreModule {}
