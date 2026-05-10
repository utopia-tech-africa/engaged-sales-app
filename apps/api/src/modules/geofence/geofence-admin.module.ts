import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { GeofenceController } from "./geofence.controller";
import { GeofenceCoreModule } from "./geofence-core.module";

@Module({
  imports: [GeofenceCoreModule, AuthModule],
  controllers: [GeofenceController]
})
export class GeofenceAdminModule {}
