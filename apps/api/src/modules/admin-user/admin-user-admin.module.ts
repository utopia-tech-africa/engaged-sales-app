import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { AdminUserController } from "./admin-user.controller";
import { AdminUserCoreModule } from "./admin-user-core.module";

@Module({
  imports: [AdminUserCoreModule, AuthModule],
  controllers: [AdminUserController]
})
export class AdminUserAdminModule {}
