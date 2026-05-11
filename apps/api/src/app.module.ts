import { DynamicModule, ForwardReference, Module, type Type } from "@nestjs/common";
import type { ConfigModuleOptions } from "@nestjs/config";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";

import { validateEnvironment } from "./config/environment";
import { ActivationAdminModule } from "./modules/activation/activation-admin.module";
import { ActivationFieldModule } from "./modules/activation/activation-field.module";
import { AdminUserAdminModule } from "./modules/admin-user/admin-user-admin.module";
import { AttendanceAdminModule } from "./modules/attendance/attendance-admin.module";
import { AttendanceDigestModule } from "./modules/attendance/attendance-digest.module";
import { AuthModule } from "./modules/auth/auth.module";
import { GeofenceAdminModule } from "./modules/geofence/geofence-admin.module";
import { GeofenceCoreModule } from "./modules/geofence/geofence-core.module";
import { HealthModule } from "./modules/health/health.module";
import { MeModule } from "./modules/me/me.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { SaleModule } from "./modules/sale/sale.module";
import { RegionAdminModule } from "./modules/region/region-admin.module";
import { RegionCoreModule } from "./modules/region/region-core.module";
import { RedisModule } from "./modules/redis/redis.module";

/** Mirrors `ModuleMetadata["imports"]` using only `@nestjs/common` entry types (avoids deep imports). */
type NestModuleImport = Type | DynamicModule | Promise<DynamicModule> | ForwardReference;

const validateProcessEnv: NonNullable<ConfigModuleOptions["validate"]> = (
  config
): ReturnType<typeof validateEnvironment> => validateEnvironment(config);

const asNestImports = (...modules: NestModuleImport[]): NestModuleImport[] => modules;

const APP_IMPORTS = asNestImports(
  ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: ".env",
    validate: validateProcessEnv
  }),
  ScheduleModule.forRoot(),
  PrismaModule,
  RedisModule,
  GeofenceCoreModule,
  RegionCoreModule,
  AuthModule,
  GeofenceAdminModule,
  RegionAdminModule,
  ActivationAdminModule,
  ActivationFieldModule,
  AttendanceAdminModule,
  AttendanceDigestModule,
  AdminUserAdminModule,
  HealthModule,
  MeModule,
  SaleModule
);

@Module({
  imports: APP_IMPORTS
})
export class AppModule {}
