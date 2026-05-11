import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";

import { PrismaModule } from "../prisma/prisma.module";
import { TrackingGateway } from "./tracking.gateway";
import { TrackingRepository } from "./tracking.repository";
import { TrackingStreamService } from "./tracking-stream.service";

@Module({
  imports: [ConfigModule, JwtModule.register({}), PrismaModule],
  providers: [TrackingGateway, TrackingRepository, TrackingStreamService],
  exports: [TrackingStreamService]
})
export class TrackingModule {}
