import { Module } from "@nestjs/common";

import { AttendanceAdminModule } from "../attendance/attendance-admin.module";
import { AuthModule } from "../auth/auth.module";
import { EmailModule } from "../email/email.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { ReportScheduleService } from "./report-schedule.service";

@Module({
  imports: [AuthModule, PrismaModule, AttendanceAdminModule, EmailModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportScheduleService]
})
export class ReportsModule {}
