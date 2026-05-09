import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { RegionController } from "./region.controller";
import { RegionCoreModule } from "./region-core.module";

@Module({
  imports: [RegionCoreModule, AuthModule],
  controllers: [RegionController]
})
export class RegionAdminModule {}
