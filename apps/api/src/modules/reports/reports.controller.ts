import { Body, Controller, Get, Inject, Put, Query, Res, UseGuards } from "@nestjs/common";

import { sendBinaryFile, type BinaryFileResponse } from "../../common/http/send-binary-file";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags
} from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { buildDashboardExcel, buildDashboardPdf } from "./report-export.util";
import { ReportScheduleService } from "./report-schedule.service";
import { UpdateReportSettingsDto } from "./dto/update-report-settings.dto";
import { ReportsService } from "./reports.service";

@ApiTags("Reporting")
@Controller("reports")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("bearer")
export class ReportsController {
  public constructor(
    @Inject(ReportsService) private readonly reportsService: ReportsService,
    @Inject(ReportScheduleService) private readonly reportScheduleService: ReportScheduleService
  ) {}

  @Get("dashboard")
  @ApiOperation({ operationId: "Reports_getDashboard", summary: "Get unified reporting dashboard" })
  @ApiQuery({ name: "from", required: false, description: "YYYY-MM-DD" })
  @ApiQuery({ name: "to", required: false, description: "YYYY-MM-DD" })
  @ApiQuery({ name: "activationId", required: false })
  @ApiQuery({ name: "regionId", required: false })
  public getDashboard(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("activationId") activationId?: string,
    @Query("regionId") regionId?: string
  ) {
    return this.reportsService.getDashboard({
      currentUser,
      ...(from !== undefined ? { from } : {}),
      ...(to !== undefined ? { to } : {}),
      ...(activationId !== undefined ? { activationId } : {}),
      ...(regionId !== undefined ? { regionId } : {})
    });
  }

  @Get("dashboard/export.xlsx")
  @ApiOperation({
    operationId: "Reports_exportDashboardExcel",
    summary: "Export reporting dashboard as Excel"
  })
  public async exportDashboardExcel(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Query("activationId") activationId: string | undefined,
    @Query("regionId") regionId: string | undefined,
    @Res() response: BinaryFileResponse
  ): Promise<void> {
    const payload = await this.reportsService.getDashboard({
      currentUser,
      ...(from !== undefined ? { from } : {}),
      ...(to !== undefined ? { to } : {}),
      ...(activationId !== undefined ? { activationId } : {}),
      ...(regionId !== undefined ? { regionId } : {})
    });
    const buffer = buildDashboardExcel(payload);
    sendBinaryFile(
      response,
      buffer,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      `reporting-dashboard-${payload.range.from}-to-${payload.range.to}.xlsx`
    );
  }

  @Get("dashboard/export.pdf")
  @ApiOperation({
    operationId: "Reports_exportDashboardPdf",
    summary: "Export reporting dashboard as PDF"
  })
  public async exportDashboardPdf(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Query("activationId") activationId: string | undefined,
    @Query("regionId") regionId: string | undefined,
    @Res() response: BinaryFileResponse
  ): Promise<void> {
    const payload = await this.reportsService.getDashboard({
      currentUser,
      ...(from !== undefined ? { from } : {}),
      ...(to !== undefined ? { to } : {}),
      ...(activationId !== undefined ? { activationId } : {}),
      ...(regionId !== undefined ? { regionId } : {})
    });
    const buffer = await buildDashboardPdf(payload);
    sendBinaryFile(
      response,
      buffer,
      "application/pdf",
      `reporting-dashboard-${payload.range.from}-to-${payload.range.to}.pdf`
    );
  }

  @Get("settings")
  @ApiOperation({
    operationId: "Reports_getSettings",
    summary: "Get automated report settings and recipients"
  })
  @ApiOkResponse({ description: "Report settings with recipients" })
  public getSettings(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.reportsService.getSettings(currentUser);
  }

  @Put("settings")
  @ApiOperation({
    operationId: "Reports_updateSettings",
    summary: "Update automated reporting schedules and recipient list"
  })
  @ApiBody({ type: UpdateReportSettingsDto })
  public async updateSettings(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: UpdateReportSettingsDto
  ) {
    const updated = await this.reportsService.updateSettings(currentUser, body);
    await this.reportScheduleService.reloadFromDatabase();
    return updated;
  }
}
