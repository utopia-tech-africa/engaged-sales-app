import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";

import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { TrackingController } from "./tracking.controller";
import { TrackingGateway } from "./tracking.gateway";
import { TrackingRepository } from "./tracking.repository";
import { TrackingService } from "./tracking.service";
import { TrackingStreamService } from "./tracking-stream.service";

@Module({
  imports: [ConfigModule, JwtModule.register({}), PrismaModule, AuthModule],
  controllers: [TrackingController],
  providers: [TrackingGateway, TrackingRepository, TrackingService, TrackingStreamService],
  exports: [TrackingStreamService]
})
export class TrackingModule {}
