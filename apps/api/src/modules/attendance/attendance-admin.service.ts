import { BadRequestException, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DateTime } from "luxon";

import type { AuthenticatedUser, UserRole } from "../../common/types/authenticated-user.type";
import { PrismaService } from "../prisma/prisma.service";

const OPS_ROLES = new Set<UserRole>(["admin", "supervisor"]);
const FIELD_ROLES = ["promoter"] as const;

@Injectable()
export class AttendanceAdminService {
  public constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService
  ) {}

  private requireSupervisorOrAdmin(currentUser: AuthenticatedUser): void {
    if (!OPS_ROLES.has(currentUser.role)) {
      throw new ForbiddenException("Only supervisor or admin users can view attendance");
    }
  }

  private parseCalendarDate(raw: string): string {
    const trimmed = raw.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      throw new BadRequestException("date must be YYYY-MM-DD");
    }
    const utcProbe = DateTime.fromISO(`${trimmed}T00:00:00Z`, { zone: "utc" });
    if (!utcProbe.isValid) {
      throw new BadRequestException("Invalid calendar date");
    }
    return trimmed;
  }

  /**
   * Same payload as {@link getDailySummary} without HTTP auth. Used by scheduled jobs only.
   */
  public async buildDailyRollupForJob(dateRaw: string, regionId?: string) {
    const date = this.parseCalendarDate(dateRaw);
    const trimmedRegion =
      regionId !== undefined && regionId.trim().length > 0 ? regionId.trim() : undefined;
    return this.computeDailyRollup(date, trimmedRegion);
  }

  public async getDailySummary(currentUser: AuthenticatedUser, dateRaw: string, regionId?: string) {
    this.requireSupervisorOrAdmin(currentUser);
    const date = this.parseCalendarDate(dateRaw);
    const trimmedRegion =
      regionId !== undefined && regionId.trim().length > 0 ? regionId.trim() : undefined;
    return this.computeDailyRollup(date, trimmedRegion);
  }

  private async computeDailyRollup(date: string, trimmedRegion: string | undefined) {
    const tz = this.config.get<string>("ATTENDANCE_TIMEZONE") ?? "UTC";
    if (!DateTime.now().setZone(tz).isValid) {
      throw new BadRequestException(`Invalid ATTENDANCE_TIMEZONE: ${tz}`);
    }

    const dayStart = DateTime.fromISO(`${date}T00:00:00`, { zone: tz });
    if (!dayStart.isValid) {
      throw new BadRequestException("Invalid date for timezone");
    }
    const dayEnd = dayStart.plus({ days: 1 });
    const rangeStart = dayStart.toUTC().toJSDate();
    const rangeEnd = dayEnd.toUTC().toJSDate();

    const expectedHm = this.config.get<string>("ATTENDANCE_EXPECTED_CHECK_IN_HHMM") ?? "09:00";
    const hmParts = expectedHm.split(":");
    if (hmParts.length !== 2) {
      throw new BadRequestException("Invalid ATTENDANCE_EXPECTED_CHECK_IN_HHMM");
    }
    const eh = Number(hmParts[0]);
    const em = Number(hmParts[1]);
    if (!Number.isFinite(eh) || !Number.isFinite(em) || eh < 0 || eh > 23 || em < 0 || em > 59) {
      throw new BadRequestException("Invalid ATTENDANCE_EXPECTED_CHECK_IN_HHMM");
    }
    const expectedLocal = dayStart.set({ hour: eh, minute: em, second: 0, millisecond: 0 });

    const users = await this.prisma.user.findMany({
      where: {
        role: { in: [...FIELD_ROLES] },
        isActive: true,
        ...(trimmedRegion !== undefined ? { regionId: trimmedRegion } : {})
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        role: true,
        regionId: true,
        region: { select: { id: true, name: true } }
      },
      orderBy: { fullName: "asc" }
    });

    const userIds = users.map((u) => u.id);
    if (userIds.length === 0) {
      return {
        date,
        timezone: tz,
        expectedCheckInLocal: expectedHm,
        rows: [],
        summary: { total: 0, present: 0, missed: 0, late: 0, missingClockOut: 0 }
      };
    }

    const pings = await this.prisma.locationPing.findMany({
      where: {
        userId: { in: userIds },
        recordedAt: { gte: rangeStart, lt: rangeEnd }
      },
      select: {
        userId: true,
        attendanceKind: true,
        recordedAt: true
      }
    });

    const byUser = new Map<string, typeof pings>();
    for (const p of pings) {
      const list = byUser.get(p.userId) ?? [];
      list.push(p);
      byUser.set(p.userId, list);
    }

    let present = 0;
    let missed = 0;
    let late = 0;
    let missingClockOut = 0;

    const rows = users.map((u) => {
      const list = byUser.get(u.id) ?? [];
      const clockIns = list.filter((x) => x.attendanceKind === "clock_in");
      const clockOuts = list.filter((x) => x.attendanceKind === "clock_out");
      const firstIn =
        clockIns.length > 0
          ? clockIns.reduce((a, b) => (a.recordedAt < b.recordedAt ? a : b))
          : null;
      const lastOut =
        clockOuts.length > 0
          ? clockOuts.reduce((a, b) => (a.recordedAt > b.recordedAt ? a : b))
          : null;

      const missedDay = firstIn === null;
      if (missedDay) {
        missed += 1;
      } else {
        present += 1;
      }

      let isLate = false;
      if (firstIn !== null) {
        const firstInLocal = DateTime.fromJSDate(firstIn.recordedAt, { zone: "utc" }).setZone(tz);
        if (firstInLocal > expectedLocal) {
          isLate = true;
          late += 1;
        }
      }

      const missingOut = firstIn !== null && lastOut === null;
      if (missingOut) {
        missingClockOut += 1;
      }

      return {
        userId: u.id,
        fullName: u.fullName,
        phone: u.phone,
        role: u.role,
        regionId: u.regionId,
        regionName: u.region?.name ?? null,
        firstClockInAt: firstIn !== null ? firstIn.recordedAt.toISOString() : null,
        lastClockOutAt: lastOut !== null ? lastOut.recordedAt.toISOString() : null,
        missed: missedDay,
        late: !missedDay && isLate,
        missingClockOut: missingOut
      };
    });

    return {
      date,
      timezone: tz,
      expectedCheckInLocal: expectedHm,
      rows,
      summary: {
        total: users.length,
        present,
        missed,
        late,
        missingClockOut
      }
    };
  }
}
