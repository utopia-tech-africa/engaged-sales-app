import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SchedulerRegistry } from "@nestjs/schedule";
import { CronJob } from "cron";
import { DateTime } from "luxon";

import type { EnvironmentVariables } from "../../config/environment";
import { ResendEmailService } from "../email/resend-email.service";
import { PrismaService } from "../prisma/prisma.service";
import { AttendanceAdminService } from "./attendance-admin.service";

const JOB_NAME = "attendanceDigest";

type DailyRollup = Awaited<ReturnType<AttendanceAdminService["buildDailyRollupForJob"]>>;
type RollupRow = DailyRollup["rows"][number];

@Injectable()
export class AttendanceDigestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AttendanceDigestService.name);

  public constructor(
    @Inject(ConfigService) private readonly config: ConfigService<EnvironmentVariables, true>,
    @Inject(SchedulerRegistry) private readonly schedulerRegistry: SchedulerRegistry,
    @Inject(AttendanceAdminService) private readonly attendanceAdmin: AttendanceAdminService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ResendEmailService) private readonly resend: ResendEmailService
  ) {}

  public onModuleInit(): void {
    const enabled = this.config.get("ATTENDANCE_DIGEST_ENABLED", { infer: true });
    if (!enabled) {
      this.logger.log("Attendance digest is disabled (ATTENDANCE_DIGEST_ENABLED).");
      return;
    }

    const pattern = this.config.get("ATTENDANCE_DIGEST_CRON", { infer: true }).trim();
    const tz = this.config.get("ATTENDANCE_DIGEST_TIMEZONE", { infer: true }).trim();

    try {
      const job = new CronJob(
        pattern,
        () => {
          void this.runDigest();
        },
        null,
        false,
        tz.length > 0 ? tz : "UTC"
      );
      this.schedulerRegistry.addCronJob(JOB_NAME, job);
      job.start();
      this.logger.log(`Attendance digest scheduled (${tz}): ${pattern}`);
    } catch (err: unknown) {
      this.logger.error(
        `Could not schedule attendance digest (check ATTENDANCE_DIGEST_CRON / ATTENDANCE_DIGEST_TIMEZONE): ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  public onModuleDestroy(): void {
    try {
      this.schedulerRegistry.deleteCronJob(JOB_NAME);
    } catch {
      /* job was not registered */
    }
  }

  public async runDigest(): Promise<void> {
    const apiKey = this.config.get("RESEND_API_KEY", { infer: true }).trim();
    if (apiKey.length === 0) {
      this.logger.warn("Attendance digest skipped: RESEND_API_KEY is empty.");
      return;
    }

    const orgTz = this.config.get("ATTENDANCE_TIMEZONE", { infer: true });
    const mode = this.config.get("ATTENDANCE_DIGEST_DATE_MODE", { infer: true });
    const nowZoned = DateTime.now().setZone(orgTz);
    if (!nowZoned.isValid) {
      this.logger.error(`Attendance digest skipped: invalid ATTENDANCE_TIMEZONE (${orgTz}).`);
      return;
    }

    const targetDay = mode === "today" ? nowZoned : nowZoned.minus({ days: 1 });
    const dateStr = targetDay.toFormat("yyyy-MM-dd");

    let rollup: DailyRollup;
    try {
      rollup = await this.attendanceAdmin.buildDailyRollupForJob(dateStr);
    } catch (err: unknown) {
      this.logger.error(
        `Attendance digest failed while building rollup: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      return;
    }

    const issues = rollup.rows.filter((r) => r.missed || r.late || r.missingClockOut);
    const alwaysSend = this.config.get("ATTENDANCE_DIGEST_ALWAYS_SEND", { infer: true });
    if (issues.length === 0 && !alwaysSend) {
      this.logger.log(`Attendance digest: no issues for ${dateStr}; email not sent.`);
      return;
    }

    const recipients = await this.prisma.user.findMany({
      where: {
        role: { in: ["supervisor", "admin"] },
        isActive: true,
        email: { not: null }
      },
      select: { email: true }
    });

    const emails = [
      ...new Set(
        recipients
          .map((r) => r.email?.trim())
          .filter((e): e is string => e !== undefined && e.length > 0 && e.includes("@"))
      )
    ];

    if (emails.length === 0) {
      this.logger.warn(
        "Attendance digest: no active supervisor/admin users with an email on file; not sending."
      );
      return;
    }

    const appUrl = this.config.get("APP_PUBLIC_URL", { infer: true }).trim().replace(/\/$/, "");
    const opsAttendanceUrl = `${appUrl}/ops/attendance`;

    const subject =
      issues.length > 0
        ? `[Engaged Sales] Attendance alerts — ${dateStr}`
        : `[Engaged Sales] Attendance — ${dateStr} (no issues)`;

    const { html, text } = AttendanceDigestService.buildDigestBodies({
      rollup,
      issues,
      opsAttendanceUrl,
      dateStr
    });

    await this.resend.sendOperationalEmail({ to: emails, subject, html, text });
    this.logger.log(
      `Attendance digest emailed to ${String(emails.length)} recipient(s) for ${dateStr}.`
    );
  }

  private static buildDigestBodies(params: {
    rollup: DailyRollup;
    issues: RollupRow[];
    opsAttendanceUrl: string;
    dateStr: string;
  }): { html: string; text: string } {
    const { rollup, issues, opsAttendanceUrl, dateStr } = params;
    const summary = rollup.summary;
    const tz = rollup.timezone;
    const expected = rollup.expectedCheckInLocal;

    const summaryLine = `Field staff: ${String(summary.total)} · Present: ${String(summary.present)} · Missed clock-in: ${String(summary.missed)} · Late clock-in: ${String(summary.late)} · Missing clock-out: ${String(summary.missingClockOut)} · Time zone: ${tz} · Expected clock-in (local): ${expected}`;

    const issueLines = issues.map((r) => {
      const flags = AttendanceDigestService.issueFlags(r);
      const region = r.regionName ?? "—";
      const inAt = r.firstClockInAt ?? "—";
      const outAt = r.lastClockOutAt ?? "—";
      return `• ${r.fullName} (${r.role}) · ${region} · ${flags} · in: ${inAt} · out: ${outAt}`;
    });

    const text = [
      `Daily attendance (${dateStr})`,
      "",
      summaryLine,
      "",
      issues.length > 0 ? "Issues:" : "No missed, late, or missing clock-out rows for this day.",
      ...issueLines,
      "",
      `Open the attendance dashboard: ${opsAttendanceUrl}`,
      "",
      "You receive this because you are an active supervisor or admin with an email on file."
    ].join("\n");

    const issueRows =
      issues.length > 0
        ? issues
            .map((r) => {
              const flags = escapeHtml(AttendanceDigestService.issueFlags(r));
              return `<tr>
                <td>${escapeHtml(r.fullName)}</td>
                <td>${escapeHtml(r.role)}</td>
                <td>${escapeHtml(r.regionName ?? "—")}</td>
                <td>${flags}</td>
                <td style="white-space:nowrap">${escapeHtml(r.firstClockInAt ?? "—")}</td>
                <td style="white-space:nowrap">${escapeHtml(r.lastClockOutAt ?? "—")}</td>
              </tr>`;
            })
            .join("")
        : `<tr><td colspan="6">No missed, late, or missing clock-out rows.</td></tr>`;

    const html = `
      <p><strong>Daily attendance (${escapeHtml(dateStr)})</strong></p>
      <p>${escapeHtml(summaryLine)}</p>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
        <thead>
          <tr>
            <th align="left">Name</th>
            <th align="left">Role</th>
            <th align="left">Region</th>
            <th align="left">Flags</th>
            <th align="left">Clock in (UTC ISO)</th>
            <th align="left">Clock out (UTC ISO)</th>
          </tr>
        </thead>
        <tbody>${issueRows}</tbody>
      </table>
      <p><a href="${escapeHtml(opsAttendanceUrl)}">Open attendance dashboard</a></p>
      <p style="color:#666;font-size:12px">You receive this because you are an active supervisor or admin with an email on file.</p>
    `.trim();

    return { html, text };
  }

  private static issueFlags(r: RollupRow): string {
    const parts: string[] = [];
    if (r.missed) {
      parts.push("Missed clock-in");
    }
    if (r.late) {
      parts.push("Late clock-in");
    }
    if (r.missingClockOut) {
      parts.push("No clock-out");
    }
    return parts.join("; ");
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
