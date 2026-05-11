import { Module } from "@nestjs/common";

import { ActivationCoreModule } from "../activation/activation-core.module";
import { AuthModule } from "../auth/auth.module";
import { SaleController } from "./sale.controller";
import { SaleRepository } from "./sale.repository";
import { SaleService } from "./sale.service";

@Module({
  imports: [ActivationCoreModule, AuthModule],
  controllers: [SaleController],
  providers: [SaleService, SaleRepository],
  exports: [SaleService]
})
export class SaleModule {}
