import { Module } from "@nestjs/common";

import { EmailModule } from "../email/email.module";
import { RegionCoreModule } from "../region/region-core.module";
import { AdminUserRepository } from "./admin-user.repository";
import { AdminUserService } from "./admin-user.service";

@Module({
  imports: [RegionCoreModule, EmailModule],
  providers: [AdminUserService, AdminUserRepository],
  exports: [AdminUserService]
})
export class AdminUserCoreModule {}
