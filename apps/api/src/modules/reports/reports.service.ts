import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { ReportFrequency } from "../../generated/prisma/client";
import type { AuthenticatedUser, UserRole } from "../../common/types/authenticated-user.type";
import { AttendanceAdminService } from "../attendance/attendance-admin.service";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateReportSettingsDto } from "./dto/update-report-settings.dto";

const OPS_ROLES = new Set<UserRole>(["admin", "supervisor"]);
const FIELD_ROLES: UserRole[] = ["promoter", "merchandizer"];
const DEFAULT_REPORT_KEY = "ops_reporting";
const DAILY_TARGET_CASES = 10;

type DateRange = { from: Date; to: Date };

@Injectable()
export class ReportsService {
  public constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AttendanceAdminService) private readonly attendanceAdminService: AttendanceAdminService
  ) {}

  private assertOpsRole(currentUser: AuthenticatedUser): void {
    if (!OPS_ROLES.has(currentUser.role)) {
      throw new ForbiddenException("Only supervisors and admins can access reporting");
    }
  }

  private parseDateRange(fromRaw?: string, toRaw?: string): DateRange {
    const fromValue = fromRaw?.trim() ?? "";
    const toValue = toRaw?.trim() ?? "";
    if (fromValue.length === 0 || toValue.length === 0) {
      const now = new Date();
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
      );
      const end = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
      );
      return { from: start, to: end };
    }
    const from = new Date(`${fromValue}T00:00:00.000Z`);
    const to = new Date(`${toValue}T23:59:59.999Z`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      throw new BadRequestException("Invalid from/to date range. Use YYYY-MM-DD.");
    }
    return { from, to };
  }

  private dateToYyyyMmDd(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  public async getDashboard(args: {
    currentUser: AuthenticatedUser;
    from?: string;
    to?: string;
    activationId?: string;
    regionId?: string;
  }) {
    this.assertOpsRole(args.currentUser);
    const range = this.parseDateRange(args.from, args.to);
    const activationId = args.activationId?.trim();
    const regionId = args.regionId?.trim();

    const [salesRows, outletMetrics, routeCoverage, attendance, staffStatus] = await Promise.all([
      this.prisma.saleItem.findMany({
        where: {
          sale: {
            createdAt: { gte: range.from, lte: range.to },
            ...(activationId !== undefined && activationId.length > 0 ? { activationId } : {}),
            ...(regionId !== undefined && regionId.length > 0 ? { user: { regionId } } : {})
          }
        },
        select: {
          quantity: true,
          unitPrice: true,
          sale: {
            select: {
              userId: true,
              user: {
                select: {
                  fullName: true,
                  phone: true,
                  role: true,
                  region: { select: { id: true, name: true } }
                }
              }
            }
          },
          product: { select: { id: true, name: true, sku: true } }
        }
      }),
      this.getOutletCoverage(range, regionId, activationId),
      this.getRouteCoverage(range, regionId),
      this.attendanceAdminService.buildDailyRollupForJob(
        this.dateToYyyyMmDd(range.to),
        regionId !== undefined && regionId.length > 0 ? regionId : undefined
      ),
      this.getStaffStatus(regionId)
    ]);

    const salesByCityMap = new Map<
      string,
      { city: string; casesSold: number; salesValue: number }
    >();
    const salesByPromoterMap = new Map<
      string,
      {
        userId: string;
        fullName: string;
        phone: string;
        role: string;
        casesSold: number;
        salesValue: number;
      }
    >();
    const salesBySkuMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        sku: string | null;
        casesSold: number;
        salesValue: number;
      }
    >();

    for (const row of salesRows) {
      const lineValue = row.quantity * (row.unitPrice ?? 0);
      const cityName = row.sale.user.region?.name ?? "Unassigned";
      const city = salesByCityMap.get(cityName) ?? { city: cityName, casesSold: 0, salesValue: 0 };
      city.casesSold += row.quantity;
      city.salesValue = Number((city.salesValue + lineValue).toFixed(2));
      salesByCityMap.set(cityName, city);

      const seller = salesByPromoterMap.get(row.sale.userId) ?? {
        userId: row.sale.userId,
        fullName: row.sale.user.fullName,
        phone: row.sale.user.phone,
        role: row.sale.user.role,
        casesSold: 0,
        salesValue: 0
      };
      seller.casesSold += row.quantity;
      seller.salesValue = Number((seller.salesValue + lineValue).toFixed(2));
      salesByPromoterMap.set(row.sale.userId, seller);

      const skuKey = row.product.id;
      const sku = salesBySkuMap.get(skuKey) ?? {
        productId: row.product.id,
        productName: row.product.name,
        sku: row.product.sku,
        casesSold: 0,
        salesValue: 0
      };
      sku.casesSold += row.quantity;
      sku.salesValue = Number((sku.salesValue + lineValue).toFixed(2));
      salesBySkuMap.set(skuKey, sku);
    }

    const salesByPromoter = [...salesByPromoterMap.values()].sort(
      (a, b) => b.casesSold - a.casesSold
    );
    const daysInRange = Math.max(
      1,
      Math.ceil((range.to.getTime() - range.from.getTime() + 1) / (24 * 60 * 60 * 1000))
    );
    const productivityRows = salesByPromoter.map((row) => {
      const dailyTarget = DAILY_TARGET_CASES * daysInRange;
      return {
        ...row,
        targetCases: dailyTarget,
        achievementPercent: Number(((row.casesSold / dailyTarget) * 100).toFixed(2))
      };
    });

    const teamTarget = staffStatus.activeFieldStaff * DAILY_TARGET_CASES * daysInRange;
    const teamCases = salesByPromoter.reduce((sum, row) => sum + row.casesSold, 0);
    const teamAchievementPercent =
      teamTarget > 0 ? Number(((teamCases / teamTarget) * 100).toFixed(2)) : 0;

    return {
      range: { from: this.dateToYyyyMmDd(range.from), to: this.dateToYyyyMmDd(range.to) },
      activationId: activationId ?? null,
      regionId: regionId ?? null,
      kpis: {
        totalCasesSold: teamCases,
        totalSalesValue: Number(
          salesByPromoter.reduce((sum, row) => sum + row.salesValue, 0).toFixed(2)
        ),
        teamAchievementPercent,
        outletCoveragePercent: outletMetrics.coveragePercent,
        routeCoveragePercent: routeCoverage.routeCoveragePercent
      },
      salesByCity: [...salesByCityMap.values()].sort((a, b) => b.casesSold - a.casesSold),
      salesByPromoter,
      salesBySku: [...salesBySkuMap.values()].sort((a, b) => b.casesSold - a.casesSold),
      outletCoverage: outletMetrics,
      routeCoverage,
      attendanceReport: attendance,
      productivityReport: {
        dailyTargetCasesPerStaff: DAILY_TARGET_CASES,
        daysInRange,
        rows: productivityRows
      },
      activeVsInactiveStaff: staffStatus
    };
  }

  private async getStaffStatus(regionId?: string) {
    const regionFilter = regionId !== undefined && regionId.length > 0 ? { regionId } : {};
    const [activeFieldStaff, inactiveFieldStaff, activeSupervisors, inactiveSupervisors] =
      await Promise.all([
        this.prisma.user.count({
          where: { role: { in: FIELD_ROLES }, isActive: true, ...regionFilter }
        }),
        this.prisma.user.count({
          where: { role: { in: FIELD_ROLES }, isActive: false, ...regionFilter }
        }),
        this.prisma.user.count({
          where: { role: "supervisor", isActive: true, ...regionFilter }
        }),
        this.prisma.user.count({
          where: { role: "supervisor", isActive: false, ...regionFilter }
        })
      ]);
    return {
      activeFieldStaff,
      inactiveFieldStaff,
      activeSupervisors,
      inactiveSupervisors
    };
  }

  private async getOutletCoverage(range: DateRange, regionId?: string, activationId?: string) {
    const [totalOutlets, visitedRows] = await Promise.all([
      this.prisma.outlet.count({ where: { isActive: true } }),
      this.prisma.outletVisit.findMany({
        where: {
          checkedInAt: { gte: range.from, lte: range.to },
          ...(activationId !== undefined && activationId.length > 0
            ? { user: { activationRosters: { some: { activationId } } } }
            : {}),
          ...(regionId !== undefined && regionId.length > 0 ? { user: { regionId } } : {})
        },
        select: {
          outletId: true,
          outlet: { select: { locationArea: true } }
        }
      })
    ]);

    const visitedOutletIds = new Set(visitedRows.map((row) => row.outletId));
    const byAreaMap = new Map<string, { area: string; visited: number }>();
    for (const row of visitedRows) {
      const area = row.outlet.locationArea;
      const current = byAreaMap.get(area) ?? { area, visited: 0 };
      current.visited += 1;
      byAreaMap.set(area, current);
    }
    const coveragePercent =
      totalOutlets > 0 ? Number(((visitedOutletIds.size / totalOutlets) * 100).toFixed(2)) : 0;

    return {
      totalOutlets,
      visitedOutlets: visitedOutletIds.size,
      coveragePercent,
      byArea: [...byAreaMap.values()].sort((a, b) => b.visited - a.visited)
    };
  }

  private async getRouteCoverage(range: DateRange, regionId?: string) {
    const regionFilter = regionId !== undefined && regionId.length > 0 ? { regionId } : {};

    const [pings, totalActiveFieldStaff, totalActiveGeofences] = await Promise.all([
      this.prisma.locationPing.findMany({
        where: {
          recordedAt: { gte: range.from, lte: range.to },
          user: { role: { in: FIELD_ROLES }, ...regionFilter }
        },
        select: {
          userId: true,
          geofenceId: true
        }
      }),
      this.prisma.user.count({
        where: { role: { in: FIELD_ROLES }, isActive: true, ...regionFilter }
      }),
      this.prisma.geofence.count({ where: { isActive: true } })
    ]);
    const userIds = new Set(pings.map((row) => row.userId));
    const geofenceIds = new Set(pings.map((row) => row.geofenceId).filter((v) => v !== null));
    const routeCoveragePercent =
      totalActiveFieldStaff > 0
        ? Number(((userIds.size / totalActiveFieldStaff) * 100).toFixed(2))
        : 0;

    return {
      activeRouteUsers: userIds.size,
      totalActiveFieldStaff,
      routeCoveragePercent,
      coveredGeofences: geofenceIds.size,
      totalActiveGeofences
    };
  }

  public async getSettings(currentUser: AuthenticatedUser) {
    this.assertOpsRole(currentUser);
    const config = await this.prisma.reportConfig.findUnique({
      where: { key: DEFAULT_REPORT_KEY },
      include: {
        recipients: { where: { isActive: true }, orderBy: [{ frequency: "asc" }, { email: "asc" }] }
      }
    });
    if (config === null) {
      return {
        timezone: "UTC",
        dailyEnabled: false,
        dailyCron: "0 0 19 * * *",
        weeklyEnabled: false,
        weeklyCron: "0 0 19 * * 1",
        recipients: [] as { email: string; frequency: ReportFrequency }[]
      };
    }
    return {
      timezone: config.timezone,
      dailyEnabled: config.dailyEnabled,
      dailyCron: config.dailyCron,
      weeklyEnabled: config.weeklyEnabled,
      weeklyCron: config.weeklyCron,
      recipients: config.recipients.map((recipient) => ({
        email: recipient.email,
        frequency: recipient.frequency
      }))
    };
  }

  public async updateSettings(currentUser: AuthenticatedUser, dto: UpdateReportSettingsDto) {
    this.assertOpsRole(currentUser);
    const normalizedRecipients = [
      ...new Set(dto.recipients.map((email) => email.trim().toLowerCase()))
    ];
    if (normalizedRecipients.length === 0) {
      throw new BadRequestException("At least one recipient is required");
    }

    const config = await this.prisma.reportConfig.upsert({
      where: { key: DEFAULT_REPORT_KEY },
      create: {
        key: DEFAULT_REPORT_KEY,
        timezone: dto.timezone?.trim().length ? dto.timezone.trim() : "UTC",
        dailyEnabled: dto.dailyEnabled,
        dailyCron: dto.dailyCron.trim(),
        weeklyEnabled: dto.weeklyEnabled,
        weeklyCron: dto.weeklyCron.trim(),
        createdByUserId: currentUser.id
      },
      update: {
        timezone: dto.timezone?.trim().length ? dto.timezone.trim() : "UTC",
        dailyEnabled: dto.dailyEnabled,
        dailyCron: dto.dailyCron.trim(),
        weeklyEnabled: dto.weeklyEnabled,
        weeklyCron: dto.weeklyCron.trim()
      },
      select: { id: true }
    });

    await this.prisma.reportRecipient.updateMany({
      where: { reportConfigId: config.id },
      data: { isActive: false }
    });
    await this.prisma.reportRecipient.createMany({
      data: normalizedRecipients.flatMap((email) => [
        { reportConfigId: config.id, email, frequency: "daily" as const, isActive: true },
        { reportConfigId: config.id, email, frequency: "weekly" as const, isActive: true }
      ]),
      skipDuplicates: true
    });
    await this.prisma.reportRecipient.updateMany({
      where: { reportConfigId: config.id, email: { in: normalizedRecipients } },
      data: { isActive: true }
    });

    return this.getSettings(currentUser);
  }

  public async getReportConfigForFrequency(frequency: ReportFrequency) {
    const config = await this.prisma.reportConfig.findUnique({
      where: { key: DEFAULT_REPORT_KEY },
      include: {
        recipients: {
          where: { frequency, isActive: true },
          select: { email: true }
        }
      }
    });
    if (config === null) {
      throw new NotFoundException("Report settings are not configured");
    }
    return {
      ...config,
      recipientEmails: config.recipients.map((row) => row.email)
    };
  }

  public async setLastSentAt(frequency: ReportFrequency, sentAt: Date) {
    const field =
      frequency === "daily" ? { dailyLastSentAt: sentAt } : { weeklyLastSentAt: sentAt };
    await this.prisma.reportConfig.update({
      where: { key: DEFAULT_REPORT_KEY },
      data: field
    });
  }
}
