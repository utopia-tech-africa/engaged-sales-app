import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import type { AuthenticatedUser, UserRole } from "../../common/types/authenticated-user.type";
import { ActivationRepository } from "../activation/activation.repository";
import { CreateStockPickupDto } from "./dto/create-stock-pickup.dto";
import { CreateStockSaleDto } from "./dto/create-stock-sale.dto";
import { StockRepository } from "./stock.repository";

const FIELD_ROLES = new Set<UserRole>(["promoter", "merchandizer"]);
const OPS_ROLES = new Set<UserRole>(["admin", "supervisor"]);
const DAILY_TARGET_CASES = 10;

type StockCounter = {
  openingStock: number;
  stockReceived: number;
  stockSold: number;
  closingBalance: number;
  dailySalesValue: number;
  dailyCaseAchievement: number | null;
};

type TargetUserRow = {
  userId: string;
  fullName: string;
  phone: string;
  role: UserRole;
  dailyCasesSold: number;
  dailyTargetCases: number;
  dailyAchievementPercent: number;
  monthlyCasesSold: number;
  monthlyTargetCases: number;
  monthlyAchievementPercent: number;
  monthlyTargetContributionPercent: number;
};

@Injectable()
export class StockService {
  public constructor(
    @Inject(StockRepository) private readonly stockRepository: StockRepository,
    @Inject(ActivationRepository) private readonly activationRepository: ActivationRepository
  ) {}

  private assertFieldRole(currentUser: AuthenticatedUser): void {
    if (!FIELD_ROLES.has(currentUser.role)) {
      throw new ForbiddenException("Only promoters and merchandizers can use stock tracking");
    }
  }

  private assertOpsRole(currentUser: AuthenticatedUser): void {
    if (!OPS_ROLES.has(currentUser.role)) {
      throw new ForbiddenException("Only supervisors and admins can view stock overview");
    }
  }

  private async assertRosterAccess(activationId: string, userId: string): Promise<void> {
    const activation = await this.activationRepository.findById(activationId);
    if (activation === null) {
      throw new NotFoundException("Activation not found");
    }
    const roster = await this.activationRepository.findRosterMembership(activationId, userId);
    if (roster === null) {
      throw new ForbiddenException("You are not assigned to this activation");
    }
  }

  private static parseOptionalDate(raw: string | undefined, fieldName: string): Date | undefined {
    if (raw === undefined || raw.trim().length === 0) {
      return undefined;
    }
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${fieldName}`);
    }
    return date;
  }

  private async loadBalances(args: {
    userId: string;
    activationId: string;
    from?: Date;
    to?: Date;
  }) {
    const [picked, sold] = await Promise.all([
      this.stockRepository.listPickedItems(args),
      this.stockRepository.listSoldItems(args)
    ]);

    const pickedByProduct = new Map<string, number>();
    const soldByProduct = new Map<string, number>();
    const dailySalesValueByProduct = new Map<string, number>();

    for (const row of picked) {
      pickedByProduct.set(row.productId, (pickedByProduct.get(row.productId) ?? 0) + row.quantity);
    }
    for (const row of sold) {
      soldByProduct.set(row.productId, (soldByProduct.get(row.productId) ?? 0) + row.quantity);
      const lineValue = row.quantity * (row.unitPrice ?? 0);
      dailySalesValueByProduct.set(
        row.productId,
        (dailySalesValueByProduct.get(row.productId) ?? 0) + lineValue
      );
    }

    return { pickedByProduct, soldByProduct, dailySalesValueByProduct };
  }

  public async recordPickup(currentUser: AuthenticatedUser, dto: CreateStockPickupDto) {
    this.assertFieldRole(currentUser);
    await this.assertRosterAccess(dto.activationId, currentUser.id);

    const products = await this.stockRepository.findActivationProductRows(dto.activationId);
    const validProductIds = new Set(products.map((row) => row.id));
    if (!dto.items.every((item) => validProductIds.has(item.productId))) {
      throw new BadRequestException("One or more pickup SKUs are invalid for this activation");
    }

    const pickedAt = StockService.parseOptionalDate(dto.pickedAt, "pickedAt") ?? new Date();
    return this.stockRepository.createPickup({
      userId: currentUser.id,
      activationId: dto.activationId,
      distributorName: dto.distributorName.trim(),
      pickedAt,
      items: dto.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        costPrice: item.costPrice
      }))
    });
  }

  public async recordSale(currentUser: AuthenticatedUser, dto: CreateStockSaleDto) {
    this.assertFieldRole(currentUser);
    await this.assertRosterAccess(dto.activationId, currentUser.id);

    const products = await this.stockRepository.findActivationProductRows(dto.activationId);
    const validProductIds = new Set(products.map((row) => row.id));
    if (!dto.items.every((item) => validProductIds.has(item.productId))) {
      throw new BadRequestException("One or more sold SKUs are invalid for this activation");
    }

    const balances = await this.loadBalances({
      userId: currentUser.id,
      activationId: dto.activationId
    });

    for (const item of dto.items) {
      const received = balances.pickedByProduct.get(item.productId) ?? 0;
      const sold = balances.soldByProduct.get(item.productId) ?? 0;
      const remaining = received - sold;
      if (item.quantity > remaining) {
        throw new BadRequestException(
          `Insufficient stock for product ${item.productId}. Remaining: ${String(remaining)}`
        );
      }
    }

    const soldAt = StockService.parseOptionalDate(dto.soldAt, "soldAt") ?? new Date();
    const saved = await this.stockRepository.createSale({
      userId: currentUser.id,
      activationId: dto.activationId,
      soldAt,
      items: dto.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice
      }))
    });

    const postBalances = await this.loadBalances({
      userId: currentUser.id,
      activationId: dto.activationId
    });

    return {
      sale: saved,
      itemBalances: dto.items.map((item) => {
        const received = postBalances.pickedByProduct.get(item.productId) ?? 0;
        const sold = postBalances.soldByProduct.get(item.productId) ?? 0;
        return {
          productId: item.productId,
          remainingStockBalance: received - sold
        };
      })
    };
  }

  public async getDailySummary(
    currentUser: AuthenticatedUser,
    activationId: string,
    dateRaw: string
  ) {
    this.assertFieldRole(currentUser);
    await this.assertRosterAccess(activationId, currentUser.id);

    const selectedDate = new Date(`${dateRaw}T00:00:00.000Z`);
    if (Number.isNaN(selectedDate.getTime())) {
      throw new BadRequestException("date must be YYYY-MM-DD");
    }
    const dayStart = selectedDate;
    const dayEnd = new Date(`${dateRaw}T23:59:59.999Z`);

    const products = await this.stockRepository.findActivationProductRows(activationId);

    const [before, during] = await Promise.all([
      this.loadBalances({
        userId: currentUser.id,
        activationId,
        to: new Date(dayStart.getTime() - 1)
      }),
      this.loadBalances({
        userId: currentUser.id,
        activationId,
        from: dayStart,
        to: dayEnd
      })
    ]);

    const rows = products.map((product) => {
      const openingStock =
        (before.pickedByProduct.get(product.id) ?? 0) - (before.soldByProduct.get(product.id) ?? 0);
      const stockReceived = during.pickedByProduct.get(product.id) ?? 0;
      const stockSold = during.soldByProduct.get(product.id) ?? 0;
      const closingBalance = openingStock + stockReceived - stockSold;
      const dailySalesValue = Number(
        (during.dailySalesValueByProduct.get(product.id) ?? 0).toFixed(2)
      );
      const dailyCaseAchievement =
        stockReceived > 0 ? Number(((stockSold / stockReceived) * 100).toFixed(2)) : null;

      const counters: StockCounter = {
        openingStock,
        stockReceived,
        stockSold,
        closingBalance,
        dailySalesValue,
        dailyCaseAchievement
      };

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        ...counters
      };
    });

    return {
      date: dateRaw,
      activationId,
      userId: currentUser.id,
      rows
    };
  }

  public async getAdminOverview(
    currentUser: AuthenticatedUser,
    activationId: string,
    dateRaw: string
  ) {
    this.assertOpsRole(currentUser);
    const activation = await this.activationRepository.findById(activationId);
    if (activation === null) {
      throw new NotFoundException("Activation not found");
    }

    const selectedDate = new Date(`${dateRaw}T00:00:00.000Z`);
    if (Number.isNaN(selectedDate.getTime())) {
      throw new BadRequestException("date must be YYYY-MM-DD");
    }
    const dayStart = selectedDate;
    const dayEnd = new Date(`${dateRaw}T23:59:59.999Z`);

    const products = await this.stockRepository.findActivationProductRows(activationId);

    const [pickedBefore, soldBefore, pickedDaily, soldDaily] = await Promise.all([
      this.stockRepository.listPickedItemsForActivation({
        activationId,
        to: new Date(dayStart.getTime() - 1)
      }),
      this.stockRepository.listSoldItemsForActivation({
        activationId,
        to: new Date(dayStart.getTime() - 1)
      }),
      this.stockRepository.listPickedItemsForActivation({
        activationId,
        from: dayStart,
        to: dayEnd
      }),
      this.stockRepository.listSoldItemsForActivation({
        activationId,
        from: dayStart,
        to: dayEnd
      })
    ]);

    const openingByProduct = new Map<string, number>();
    const receivedByProduct = new Map<string, number>();
    const soldByProduct = new Map<string, number>();
    const salesValueByProduct = new Map<string, number>();

    const userRollup = new Map<
      string,
      {
        userId: string;
        fullName: string;
        phone: string;
        role: string;
        stockReceived: number;
        stockSold: number;
        dailySalesValue: number;
      }
    >();

    const distributorAnalytics = new Map<
      string,
      {
        distributorName: string;
        totalQuantityPicked: number;
        totalPickupCostValue: number;
        skuIds: Set<string>;
      }
    >();

    for (const row of pickedBefore) {
      openingByProduct.set(
        row.productId,
        (openingByProduct.get(row.productId) ?? 0) + row.quantity
      );
    }
    for (const row of soldBefore) {
      openingByProduct.set(
        row.productId,
        (openingByProduct.get(row.productId) ?? 0) - row.quantity
      );
    }

    for (const row of pickedDaily) {
      receivedByProduct.set(
        row.productId,
        (receivedByProduct.get(row.productId) ?? 0) + row.quantity
      );

      const user = row.pickup.user;
      const existing = userRollup.get(user.id) ?? {
        userId: user.id,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        stockReceived: 0,
        stockSold: 0,
        dailySalesValue: 0
      };
      existing.stockReceived += row.quantity;
      userRollup.set(user.id, existing);

      const distributor = row.pickup.distributorName;
      const dist = distributorAnalytics.get(distributor) ?? {
        distributorName: distributor,
        totalQuantityPicked: 0,
        totalPickupCostValue: 0,
        skuIds: new Set<string>()
      };
      dist.totalQuantityPicked += row.quantity;
      dist.totalPickupCostValue = Number(
        (dist.totalPickupCostValue + row.quantity * row.costPrice).toFixed(2)
      );
      dist.skuIds.add(row.productId);
      distributorAnalytics.set(distributor, dist);
    }

    for (const row of soldDaily) {
      soldByProduct.set(row.productId, (soldByProduct.get(row.productId) ?? 0) + row.quantity);
      salesValueByProduct.set(
        row.productId,
        Number(
          (
            (salesValueByProduct.get(row.productId) ?? 0) +
            row.quantity * (row.unitPrice ?? 0)
          ).toFixed(2)
        )
      );

      const user = row.sale.user;
      const existing = userRollup.get(user.id) ?? {
        userId: user.id,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        stockReceived: 0,
        stockSold: 0,
        dailySalesValue: 0
      };
      existing.stockSold += row.quantity;
      existing.dailySalesValue = Number(
        (existing.dailySalesValue + row.quantity * (row.unitPrice ?? 0)).toFixed(2)
      );
      userRollup.set(user.id, existing);
    }

    const bySku = products.map((product) => {
      const openingStock = openingByProduct.get(product.id) ?? 0;
      const stockReceived = receivedByProduct.get(product.id) ?? 0;
      const stockSold = soldByProduct.get(product.id) ?? 0;
      const closingBalance = openingStock + stockReceived - stockSold;
      const dailySalesValue = salesValueByProduct.get(product.id) ?? 0;
      const dailyCaseAchievement =
        stockReceived > 0 ? Number(((stockSold / stockReceived) * 100).toFixed(2)) : null;
      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        openingStock,
        stockReceived,
        stockSold,
        closingBalance,
        dailySalesValue,
        dailyCaseAchievement
      };
    });

    const byUser = [...userRollup.values()]
      .map((row) => {
        const openingStock = 0;
        const closingBalance = openingStock + row.stockReceived - row.stockSold;
        return { ...row, openingStock, closingBalance };
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName));

    const distributorRows = [...distributorAnalytics.values()]
      .map((row) => ({
        distributorName: row.distributorName,
        totalQuantityPicked: row.totalQuantityPicked,
        totalPickupCostValue: row.totalPickupCostValue,
        distinctSkus: row.skuIds.size
      }))
      .sort((a, b) => b.totalQuantityPicked - a.totalQuantityPicked);

    const summary = bySku.reduce(
      (acc, row) => ({
        openingStock: acc.openingStock + row.openingStock,
        stockReceived: acc.stockReceived + row.stockReceived,
        stockSold: acc.stockSold + row.stockSold,
        closingBalance: acc.closingBalance + row.closingBalance,
        dailySalesValue: Number((acc.dailySalesValue + row.dailySalesValue).toFixed(2))
      }),
      { openingStock: 0, stockReceived: 0, stockSold: 0, closingBalance: 0, dailySalesValue: 0 }
    );

    return {
      date: dateRaw,
      activationId,
      activationName: activation.name,
      summary,
      bySku,
      byUser,
      distributorAnalytics: distributorRows
    };
  }

  public async getTargetMonitoring(
    currentUser: AuthenticatedUser,
    activationId: string,
    dateRaw: string
  ) {
    this.assertOpsRole(currentUser);
    const activation = await this.activationRepository.findById(activationId);
    if (activation === null) {
      throw new NotFoundException("Activation not found");
    }

    const selectedDate = new Date(`${dateRaw}T00:00:00.000Z`);
    if (Number.isNaN(selectedDate.getTime())) {
      throw new BadRequestException("date must be YYYY-MM-DD");
    }

    const dayStart = selectedDate;
    const dayEnd = new Date(`${dateRaw}T23:59:59.999Z`);
    const monthStart = new Date(
      Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), 1)
    );
    const monthEnd = new Date(
      Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth() + 1, 0, 23, 59, 59, 999)
    );
    const daysInMonth = monthEnd.getUTCDate();

    const fieldRoster = activation.roster
      .filter((entry) => FIELD_ROLES.has(entry.user.role))
      .map((entry) => ({
        userId: entry.user.id,
        fullName: entry.user.fullName,
        phone: entry.user.phone,
        role: entry.user.role
      }));
    const rosterById = new Map(fieldRoster.map((member) => [member.userId, member]));

    const [soldDaily, soldMonthly] = await Promise.all([
      this.stockRepository.listSoldItemsForActivation({
        activationId,
        from: dayStart,
        to: dayEnd
      }),
      this.stockRepository.listSoldItemsForActivation({
        activationId,
        from: monthStart,
        to: monthEnd
      })
    ]);

    const dailySoldByUser = new Map<string, number>();
    const monthlySoldByUser = new Map<string, number>();

    for (const row of soldDaily) {
      if (!rosterById.has(row.sale.userId)) {
        continue;
      }
      dailySoldByUser.set(
        row.sale.userId,
        (dailySoldByUser.get(row.sale.userId) ?? 0) + row.quantity
      );
    }
    for (const row of soldMonthly) {
      if (!rosterById.has(row.sale.userId)) {
        continue;
      }
      monthlySoldByUser.set(
        row.sale.userId,
        (monthlySoldByUser.get(row.sale.userId) ?? 0) + row.quantity
      );
    }

    const teamDailySold = [...dailySoldByUser.values()].reduce((sum, value) => sum + value, 0);
    const teamMonthlySold = [...monthlySoldByUser.values()].reduce((sum, value) => sum + value, 0);
    const teamSize = fieldRoster.length;
    const teamDailyTarget = teamSize * DAILY_TARGET_CASES;

    const teamAchievementPercent =
      teamDailyTarget > 0 ? Number(((teamDailySold / teamDailyTarget) * 100).toFixed(2)) : 0;

    const leaderboard: TargetUserRow[] = fieldRoster
      .map((member) => {
        const dailyCasesSold = dailySoldByUser.get(member.userId) ?? 0;
        const monthlyCasesSold = monthlySoldByUser.get(member.userId) ?? 0;
        const dailyTargetCases = DAILY_TARGET_CASES;
        const monthlyTargetCases = DAILY_TARGET_CASES * daysInMonth;
        const dailyAchievementPercent = Number(
          ((dailyCasesSold / dailyTargetCases) * 100).toFixed(2)
        );
        const monthlyAchievementPercent = Number(
          ((monthlyCasesSold / monthlyTargetCases) * 100).toFixed(2)
        );
        const monthlyTargetContributionPercent =
          teamMonthlySold > 0 ? Number(((monthlyCasesSold / teamMonthlySold) * 100).toFixed(2)) : 0;

        return {
          userId: member.userId,
          fullName: member.fullName,
          phone: member.phone,
          role: member.role,
          dailyCasesSold,
          dailyTargetCases,
          dailyAchievementPercent,
          monthlyCasesSold,
          monthlyTargetCases,
          monthlyAchievementPercent,
          monthlyTargetContributionPercent
        };
      })
      .sort((a, b) => {
        if (b.dailyAchievementPercent !== a.dailyAchievementPercent) {
          return b.dailyAchievementPercent - a.dailyAchievementPercent;
        }
        if (b.monthlyAchievementPercent !== a.monthlyAchievementPercent) {
          return b.monthlyAchievementPercent - a.monthlyAchievementPercent;
        }
        return a.fullName.localeCompare(b.fullName);
      });

    const underperformerAlerts = leaderboard
      .filter((row) => row.dailyCasesSold < row.dailyTargetCases)
      .map((row) => {
        const shortfall = row.dailyTargetCases - row.dailyCasesSold;
        const severity = shortfall >= 5 ? "high" : shortfall >= 2 ? "medium" : "low";
        return {
          userId: row.userId,
          fullName: row.fullName,
          role: row.role,
          shortfallCases: shortfall,
          dailyAchievementPercent: row.dailyAchievementPercent,
          severity
        };
      });

    const averageDailyAchievementPercent =
      leaderboard.length > 0
        ? Number(
            (
              leaderboard.reduce((sum, row) => sum + row.dailyAchievementPercent, 0) /
              leaderboard.length
            ).toFixed(2)
          )
        : 0;
    const onTargetCount = leaderboard.filter(
      (row) => row.dailyCasesSold >= row.dailyTargetCases
    ).length;
    const topPerformer = leaderboard[0] ?? null;

    return {
      date: dateRaw,
      activationId,
      activationName: activation.name,
      dailyTargetCases: DAILY_TARGET_CASES,
      monthlyTargetCasesPerUser: DAILY_TARGET_CASES * daysInMonth,
      teamAchievementPercent,
      leaderboard,
      underperformerAlerts,
      summary: {
        teamSize,
        teamDailyTargetCases: teamDailyTarget,
        teamDailyCasesSold: teamDailySold,
        teamMonthlyCasesSold: teamMonthlySold,
        averageDailyAchievementPercent,
        onTargetCount
      },
      supervisorSummary: {
        generatedByRole: currentUser.role,
        topPerformer:
          topPerformer === null
            ? null
            : {
                userId: topPerformer.userId,
                fullName: topPerformer.fullName,
                dailyAchievementPercent: topPerformer.dailyAchievementPercent
              },
        underperformerCount: underperformerAlerts.length,
        needsAttentionCount: underperformerAlerts.filter((row) => row.severity === "high").length
      }
    };
  }
}
