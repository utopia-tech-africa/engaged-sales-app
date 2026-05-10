import { Module } from "@nestjs/common";

import { RegionCoreModule } from "../region/region-core.module";
import { ActivationRepository } from "./activation.repository";
import { ActivationService } from "./activation.service";

@Module({
  imports: [RegionCoreModule],
  providers: [ActivationService, ActivationRepository],
  exports: [ActivationService]
})
export class ActivationCoreModule {}
