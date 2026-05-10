import { Module } from "@nestjs/common";

import { MeController } from "./me.controller";
import { MeRepository } from "./me.repository";
import { MeService } from "./me.service";
import { ReverseGeocodeService } from "./reverse-geocode.service";

@Module({
  controllers: [MeController],
  providers: [MeService, MeRepository, ReverseGeocodeService]
})
export class MeModule {}
