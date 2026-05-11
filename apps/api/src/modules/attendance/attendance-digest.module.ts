import { Module } from "@nestjs/common";

import { EmailModule } from "../email/email.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AttendanceAdminModule } from "./attendance-admin.module";
import { AttendanceDigestService } from "./attendance-digest.service";

@Module({
  imports: [PrismaModule, EmailModule, AttendanceAdminModule],
  providers: [AttendanceDigestService]
})
export class AttendanceDigestModule {}
