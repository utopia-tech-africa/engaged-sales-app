import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { validateEnvironment } from "./config/environment";
import { AuthModule } from "./modules/auth/auth.module";
import { GeofenceAdminModule } from "./modules/geofence/geofence-admin.module";
import { GeofenceCoreModule } from "./modules/geofence/geofence-core.module";
import { RegionAdminModule } from "./modules/region/region-admin.module";
import { RegionCoreModule } from "./modules/region/region-core.module";
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
    RegionCoreModule,
    AuthModule,
    GeofenceAdminModule,
    RegionAdminModule,
    HealthModule,
    MeModule
  ]
})
export class AppModule {}
