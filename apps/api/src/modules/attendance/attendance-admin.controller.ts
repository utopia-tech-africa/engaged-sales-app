import { BadRequestException, Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AttendanceAdminService } from "./attendance-admin.service";

@Controller("admin/attendance")
@ApiTags("Admin attendance (supervisor / admin)")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("bearer")
export class AttendanceAdminController {
  public constructor(
    @Inject(AttendanceAdminService) private readonly attendanceAdminService: AttendanceAdminService
  ) {}

  @Get("daily")
  @ApiOperation({
    operationId: "AdminAttendance_getDailySummary",
    summary: "Daily attendance summary",
    description:
      "Per-field-staff roll-up for a calendar day in ATTENDANCE_TIMEZONE: first clock-in, last clock-out, missed, late (vs ATTENDANCE_EXPECTED_CHECK_IN_HHMM), and missing clock-out."
  })
  @ApiQuery({
    name: "date",
    required: true,
    description: "Calendar date YYYY-MM-DD (interpreted in ATTENDANCE_TIMEZONE)",
    example: "2026-05-08"
  })
  @ApiQuery({
    name: "regionId",
    required: false,
    description: "Optional region id (cuid) to restrict to one city/territory"
  })
  @ApiOkResponse({ description: "Daily attendance rows and summary counts" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid JWT" })
  @ApiForbiddenResponse({ description: "Requires supervisor or admin role" })
  public getDailySummary(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query("date") date: string | undefined,
    @Query("regionId") regionId?: string
  ) {
    if (date === undefined || date.trim().length === 0) {
      throw new BadRequestException("date query parameter is required");
    }
    return this.attendanceAdminService.getDailySummary(currentUser, date, regionId);
  }
}
