import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { GeofenceCoreModule } from "../geofence/geofence-core.module";
import { AuthController } from "./auth.controller";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [
    ConfigModule,
    GeofenceCoreModule,
    PassportModule.register({
      defaultStrategy: "jwt"
    }),
    JwtModule.register({})
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, JwtStrategy],
  exports: [AuthService, PassportModule, JwtModule]
})
export class AuthModule {}
