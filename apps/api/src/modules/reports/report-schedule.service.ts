import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { CronJob } from "cron";

import { ResendEmailService } from "../email/resend-email.service";
import {
  buildDashboardEmailMarkup,
  buildDashboardExcel,
  buildDashboardPdf
} from "./report-export.util";
import { ReportsService } from "./reports.service";

const DAILY_JOB_NAME = "reportingDailyDigest";
const WEEKLY_JOB_NAME = "reportingWeeklySummary";

@Injectable()
export class ReportScheduleService implements OnModuleInit {
  private readonly logger = new Logger(ReportScheduleService.name);

  public constructor(
    @Inject(SchedulerRegistry) private readonly schedulerRegistry: SchedulerRegistry,
    @Inject(ReportsService) private readonly reportsService: ReportsService,
    @Inject(ResendEmailService) private readonly resendEmailService: ResendEmailService
  ) {}

  public async onModuleInit(): Promise<void> {
    await this.reloadFromDatabase();
  }

  public async reloadFromDatabase(): Promise<void> {
    this.unregister(DAILY_JOB_NAME);
    this.unregister(WEEKLY_JOB_NAME);

    try {
      const config = await this.reportsService.getReportConfigForFrequency("daily");
      if (config.dailyEnabled) {
        const job = new CronJob(
          config.dailyCron,
          () => {
            void this.sendDailyDigest();
          },
          undefined,
          false,
          config.timezone
        );
        this.schedulerRegistry.addCronJob(DAILY_JOB_NAME, job);
        job.start();
      }
    } catch (error: unknown) {
      this.logger.warn(`Daily reporting schedule not loaded: ${String(error)}`);
    }

    try {
      const config = await this.reportsService.getReportConfigForFrequency("weekly");
      if (config.weeklyEnabled) {
        const job = new CronJob(
          config.weeklyCron,
          () => {
            void this.sendWeeklySummary();
          },
          undefined,
          false,
          config.timezone
        );
        this.schedulerRegistry.addCronJob(WEEKLY_JOB_NAME, job);
        job.start();
      }
    } catch (error: unknown) {
      this.logger.warn(`Weekly reporting schedule not loaded: ${String(error)}`);
    }
  }

  public async sendDailyDigest(): Promise<void> {
    const today = new Date();
    const date = today.toISOString().slice(0, 10);
    const config = await this.reportsService.getReportConfigForFrequency("daily");
    if (config.recipientEmails.length === 0) {
      return;
    }
    const payload = await this.reportsService.getDashboard({
      currentUser: { id: "system", role: "admin", phone: "", sessionId: "system" },
      from: date,
      to: date
    });

    const excelBuffer = buildDashboardExcel(payload);
    const pdfBuffer = await buildDashboardPdf(payload);
    const message = buildDashboardEmailMarkup(payload);
    await this.resendEmailService.sendOperationalEmail({
      to: config.recipientEmails,
      subject: `Daily reporting dashboard · ${date}`,
      html: message.html,
      text: message.text,
      attachments: [
        {
          filename: `daily-report-${date}.xlsx`,
          content: excelBuffer.toString("base64"),
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        },
        {
          filename: `daily-report-${date}.pdf`,
          content: pdfBuffer.toString("base64"),
          type: "application/pdf"
        }
      ]
    });
    await this.reportsService.setLastSentAt("daily", new Date());
  }

  public async sendWeeklySummary(): Promise<void> {
    const today = new Date();
    const end = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
    const from = start.toISOString().slice(0, 10);
    const to = end.toISOString().slice(0, 10);

    const config = await this.reportsService.getReportConfigForFrequency("weekly");
    if (config.recipientEmails.length === 0) {
      return;
    }
    const payload = await this.reportsService.getDashboard({
      currentUser: { id: "system", role: "admin", phone: "", sessionId: "system" },
      from,
      to
    });

    const excelBuffer = buildDashboardExcel(payload);
    const pdfBuffer = await buildDashboardPdf(payload);
    const message = buildDashboardEmailMarkup(payload);
    await this.resendEmailService.sendOperationalEmail({
      to: config.recipientEmails,
      subject: `Weekly reporting summary · ${from} to ${to}`,
      html: message.html,
      text: message.text,
      attachments: [
        {
          filename: `weekly-summary-${from}-to-${to}.xlsx`,
          content: excelBuffer.toString("base64"),
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        },
        {
          filename: `weekly-summary-${from}-to-${to}.pdf`,
          content: pdfBuffer.toString("base64"),
          type: "application/pdf"
        }
      ]
    });
    await this.reportsService.setLastSentAt("weekly", new Date());
  }

  private unregister(jobName: string): void {
    try {
      const job = this.schedulerRegistry.getCronJob(jobName);
      void job.stop();
      this.schedulerRegistry.deleteCronJob(jobName);
    } catch {
      // Job is not registered yet.
    }
  }
}
