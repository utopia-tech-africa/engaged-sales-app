import { Module } from "@nestjs/common";

import { ActivationCoreModule } from "../activation/activation-core.module";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { StockController } from "./stock.controller";
import { StockRepository } from "./stock.repository";
import { StockService } from "./stock.service";

@Module({
  imports: [AuthModule, PrismaModule, ActivationCoreModule],
  controllers: [StockController],
  providers: [StockService, StockRepository]
})
export class StockModule {}
