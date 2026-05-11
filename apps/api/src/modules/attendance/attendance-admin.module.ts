import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { AttendanceAdminController } from "./attendance-admin.controller";
import { AttendanceAdminService } from "./attendance-admin.service";

@Module({
  imports: [AuthModule],
  controllers: [AttendanceAdminController],
  providers: [AttendanceAdminService],
  exports: [AttendanceAdminService]
})
export class AttendanceAdminModule {}
