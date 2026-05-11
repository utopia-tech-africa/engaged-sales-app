import { Module } from "@nestjs/common";

import { SaleModule } from "../sale/sale.module";
import { MeController } from "./me.controller";
import { MeRepository } from "./me.repository";
import { MeService } from "./me.service";
import { ReverseGeocodeService } from "./reverse-geocode.service";

@Module({
  imports: [SaleModule],
  controllers: [MeController],
  providers: [MeService, MeRepository, ReverseGeocodeService]
})
export class MeModule {}
