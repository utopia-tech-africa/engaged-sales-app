import { Module } from "@nestjs/common";

import { GeofenceCoreModule } from "../geofence/geofence-core.module";
import { OutletCoreModule } from "../outlet/outlet-core.module";
import { SaleModule } from "../sale/sale.module";
import { TrackingModule } from "../tracking/tracking.module";
import { MeController } from "./me.controller";
import { MeRepository } from "./me.repository";
import { MeService } from "./me.service";
import { ReverseGeocodeService } from "./reverse-geocode.service";

@Module({
  imports: [SaleModule, GeofenceCoreModule, OutletCoreModule, TrackingModule],
  controllers: [MeController],
  providers: [MeService, MeRepository, ReverseGeocodeService]
})
export class MeModule {}
