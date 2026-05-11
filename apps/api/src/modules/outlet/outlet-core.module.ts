import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { OutletRepository } from "./outlet.repository";
import { OutletService } from "./outlet.service";

@Module({
  imports: [PrismaModule],
  providers: [OutletService, OutletRepository],
  exports: [OutletService, OutletRepository]
})
export class OutletCoreModule {}
