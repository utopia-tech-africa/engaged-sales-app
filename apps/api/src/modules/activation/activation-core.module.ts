import { Module } from "@nestjs/common";

import { RegionCoreModule } from "../region/region-core.module";
import { GeofenceCoreModule } from "../geofence/geofence-core.module";
import { ActivationRepository } from "./activation.repository";
import { ActivationService } from "./activation.service";

@Module({
  imports: [RegionCoreModule, GeofenceCoreModule],
  providers: [ActivationService, ActivationRepository],
  exports: [ActivationService, ActivationRepository]
})
export class ActivationCoreModule {}
