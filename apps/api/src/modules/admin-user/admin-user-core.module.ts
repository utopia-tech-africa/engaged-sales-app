import { Module } from "@nestjs/common";

import { SmsModule } from "../sms/sms.module";
import { RegionCoreModule } from "../region/region-core.module";
import { AdminUserRepository } from "./admin-user.repository";
import { AdminUserService } from "./admin-user.service";

@Module({
  imports: [RegionCoreModule, SmsModule],
  providers: [AdminUserService, AdminUserRepository],
  exports: [AdminUserService]
})
export class AdminUserCoreModule {}
