import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { validateEnvironment } from "./config/environment";
import { AuthModule } from "./modules/auth/auth.module";
import { GeofenceAdminModule } from "./modules/geofence/geofence-admin.module";
import { GeofenceCoreModule } from "./modules/geofence/geofence-core.module";
import { HealthModule } from "./modules/health/health.module";
import { MeModule } from "./modules/me/me.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { RedisModule } from "./modules/redis/redis.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      validate: validateEnvironment
    }),
    PrismaModule,
    RedisModule,
    GeofenceCoreModule,
    AuthModule,
    GeofenceAdminModule,
    HealthModule,
    MeModule
  ]
})
export class AppModule {}
