import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { RegionCoreModule } from "../region/region-core.module";
import { PrismaModule } from "../prisma/prisma.module";
import { SubwholesaleController } from "./subwholesale.controller";
import { SubwholesaleRepository } from "./subwholesale.repository";
import { SubwholesaleService } from "./subwholesale.service";

@Module({
  imports: [PrismaModule, AuthModule, RegionCoreModule],
  controllers: [SubwholesaleController],
  providers: [SubwholesaleService, SubwholesaleRepository]
})
export class SubwholesaleAdminModule {}
