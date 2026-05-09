import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { RegionRepository } from "./region.repository";
import { RegionService } from "./region.service";

@Module({
  imports: [PrismaModule],
  providers: [RegionService, RegionRepository],
  exports: [RegionService]
})
export class RegionCoreModule {}
