import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import * as XLSX from "xlsx";

import type { AuthenticatedUser, UserRole } from "../../common/types/authenticated-user.type";
import type { Prisma } from "../../generated/prisma/client";
import { GeofenceRepository } from "../geofence/geofence.repository";
import { RegionRepository } from "../region/region.repository";
import { slugifyRegionName } from "../region/slug.util";
import { ActivationRepository } from "./activation.repository";
import type { AddActivationRosterBatchDto } from "./dto/add-activation-roster-batch.dto";
import type { AddActivationRosterDto } from "./dto/add-activation-roster.dto";
import type { CreateActivationDto } from "./dto/create-activation.dto";
import type { CreateActivationProductDto } from "./dto/create-activation-product.dto";
import type { UpdateActivationDto } from "./dto/update-activation.dto";

const OPS_ROLES = new Set<UserRole>(["admin", "supervisor"]);
/** Users that may appear on an activation roster (field sellers + read-only client viewers). */
const ROSTER_FIELD_ROLES = new Set<UserRole>(["promoter", "client"]);

@Injectable()
export class ActivationService {
  public constructor(
    @Inject(ActivationRepository) private readonly repository: ActivationRepository,
    @Inject(RegionRepository) private readonly regionRepository: RegionRepository,
    @Inject(GeofenceRepository) private readonly geofenceRepository: GeofenceRepository
  ) {}

  public requireSupervisorOrAdmin(currentUser: AuthenticatedUser): void {
    if (!OPS_ROLES.has(currentUser.role)) {
      throw new ForbiddenException("Only supervisor or admin users can manage activations");
    }
  }

  private parseOptionalIsoDate(raw: string | undefined, field: string): Date | undefined {
    if (raw === undefined) {
      return undefined;
    }
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      return undefined;
    }
    const d = new Date(trimmed);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException(`Invalid ${field}: use an ISO 8601 date-time`);
    }
    return d;
  }

  /**
   * Intersect optional filters with the activation window. Returns null if the range is empty.
   */
  private mergeActivationTimeRange(args: {
    activationStartsAt: Date;
    activationEndsAt: Date | null;
    filterFrom?: Date;
    filterTo?: Date;
  }): { gte: Date; lte?: Date } | null {
    let gte = args.activationStartsAt;
    let lte: Date | undefined = args.activationEndsAt ?? undefined;

    if (args.filterFrom !== undefined && args.filterFrom > gte) {
      gte = args.filterFrom;
    }
    if (args.filterTo !== undefined) {
      if (lte === undefined || args.filterTo < lte) {
        lte = args.filterTo;
      }
    }

    if (lte !== undefined && gte > lte) {
      return null;
    }
    return { gte, ...(lte !== undefined ? { lte } : {}) };
  }

  private assertRosterUserOrThrow(rosterIds: readonly string[], userId: string): void {
    if (!rosterIds.includes(userId)) {
      throw new BadRequestException("userId is not on this activation roster");
    }
  }

  private static isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    );
  }

  public listForAdmin(currentUser: AuthenticatedUser) {
    this.requireSupervisorOrAdmin(currentUser);
    return this.repository.findAllForList();
  }

  private async allocateUniqueSlug(base: string): Promise<string> {
    const normalized = base.slice(0, 64);
    let candidate = normalized;
    for (let n = 2; (await this.repository.findBySlug(candidate)) !== null; n += 1) {
      const suffix = `-${String(n)}`;
      const maxStem = Math.max(1, 64 - suffix.length);
      candidate = `${normalized.slice(0, maxStem)}${suffix}`;
      if (n > 500) {
        throw new BadRequestException("Could not allocate a unique slug; try a different name.");
      }
    }
    return candidate;
  }

  private async assertRegionIdsExist(ids: readonly string[]): Promise<void> {
    const unique = [...new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0))];
    if (unique.length === 0) {
      return;
    }
    const count = await this.regionRepository.countByIds(unique);
    if (count !== unique.length) {
      throw new BadRequestException("One or more regions were not found");
    }
  }

  private async assertGeofenceIdsExist(ids: readonly string[]): Promise<void> {
    const unique = [...new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0))];
    if (unique.length === 0) {
      return;
    }
    const count = await this.geofenceRepository.countByIds(unique);
    if (count !== unique.length) {
      throw new BadRequestException("One or more work areas (geofences) were not found");
    }
  }

  public async createForAdmin(currentUser: AuthenticatedUser, dto: CreateActivationDto) {
    this.requireSupervisorOrAdmin(currentUser);
    const name = dto.name.trim();
    const explicit =
      dto.slug !== undefined && dto.slug.trim().length > 0
        ? dto.slug.trim().toLowerCase()
        : undefined;
    const base = explicit ?? slugifyRegionName(name);
    if (base.length < 2) {
      throw new BadRequestException(
        "Display name must yield a slug of at least 2 characters (letters or numbers)."
      );
    }
    const slug = await this.allocateUniqueSlug(base.slice(0, 64));
    const regionIds = [
      ...new Set((dto.regionIds ?? []).map((id) => id.trim()).filter((id) => id.length > 0))
    ];
    await this.assertRegionIdsExist(regionIds);
    const geofenceIds = [
      ...new Set((dto.geofenceIds ?? []).map((id) => id.trim()).filter((id) => id.length > 0))
    ];
    await this.assertGeofenceIdsExist(geofenceIds);

    try {
      return await this.repository.create({
        name,
        slug,
        description: dto.description?.trim() ?? null,
        startsAt: dto.startsAt,
        endsAt: dto.endsAt ?? null,
        isActive: dto.isActive ?? true,
        ...(regionIds.length > 0 ? { regionIds } : {}),
        ...(geofenceIds.length > 0 ? { geofenceIds } : {})
      });
    } catch (error: unknown) {
      if (ActivationService.isUniqueViolation(error)) {
        throw new ConflictException("An activation with this slug already exists");
      }
      throw error;
    }
  }

  public async getByIdForAdmin(currentUser: AuthenticatedUser, id: string) {
    this.requireSupervisorOrAdmin(currentUser);
    const row = await this.repository.findById(id);
    if (row === null) {
      throw new NotFoundException("Activation not found");
    }
    return row;
  }

  public async updateForAdmin(
    currentUser: AuthenticatedUser,
    id: string,
    dto: UpdateActivationDto
  ) {
    this.requireSupervisorOrAdmin(currentUser);
    const existing = await this.repository.findById(id);
    if (existing === null) {
      throw new NotFoundException("Activation not found");
    }

    let nextSlug: string | undefined;
    if (dto.slug !== undefined) {
      const trimmed = dto.slug.trim().toLowerCase();
      if (trimmed.length < 2) {
        throw new BadRequestException("Slug must be at least 2 characters.");
      }
      const conflict = await this.repository.findFirstBySlugExcludingId(trimmed.slice(0, 64), id);
      if (conflict !== null) {
        throw new ConflictException("An activation with this slug already exists");
      }
      nextSlug = trimmed.slice(0, 64);
    }

    const data: Prisma.ActivationUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }
    if (nextSlug !== undefined) {
      data.slug = nextSlug;
    }
    if (dto.description !== undefined) {
      data.description = dto.description.trim();
    }
    if (dto.startsAt !== undefined) {
      data.startsAt = dto.startsAt;
    }
    if (dto.endsAt !== undefined) {
      data.endsAt = dto.endsAt;
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    let replaceGeofenceIds: string[] | undefined;
    if (dto.geofenceIds !== undefined) {
      replaceGeofenceIds = [
        ...new Set(dto.geofenceIds.map((id) => id.trim()).filter((id) => id.length > 0))
      ];
      await this.assertGeofenceIdsExist(replaceGeofenceIds);
    }

    let replaceRegionIds: string[] | undefined;
    if (dto.regionIds !== undefined) {
      replaceRegionIds = [
        ...new Set(dto.regionIds.map((id) => id.trim()).filter((id) => id.length > 0))
      ];
      await this.assertRegionIdsExist(replaceRegionIds);
    }

    try {
      return await this.repository.update(id, data, {
        ...(replaceRegionIds !== undefined ? { replaceRegionIds } : {}),
        ...(replaceGeofenceIds !== undefined ? { replaceGeofenceIds } : {})
      });
    } catch (error: unknown) {
      if (ActivationService.isUniqueViolation(error)) {
        throw new ConflictException("An activation with this slug already exists");
      }
      throw error;
    }
  }

  public async addProductForAdmin(
    currentUser: AuthenticatedUser,
    activationId: string,
    dto: CreateActivationProductDto
  ) {
    this.requireSupervisorOrAdmin(currentUser);
    const activation = await this.repository.findById(activationId);
    if (activation === null) {
      throw new NotFoundException("Activation not found");
    }
    const name = dto.name.trim();
    const sku = dto.sku !== undefined && dto.sku.trim().length > 0 ? dto.sku.trim() : null;
    const quantity = dto.quantity ?? 1;
    const sortOrder = dto.sortOrder ?? (await this.repository.nextProductSortOrder(activationId));
    const monthlyTargetCases = dto.monthlyTargetCases ?? null;

    return this.repository.createProduct(activationId, {
      name,
      sku,
      quantity,
      sortOrder,
      monthlyTargetCases
    });
  }

  public async removeProductForAdmin(
    currentUser: AuthenticatedUser,
    activationId: string,
    productId: string
  ) {
    this.requireSupervisorOrAdmin(currentUser);
    const activation = await this.repository.findById(activationId);
    if (activation === null) {
      throw new NotFoundException("Activation not found");
    }
    const result = await this.repository.deleteProduct(activationId, productId);
    if (result.count === 0) {
      throw new NotFoundException("Product not found on this activation");
    }
  }

  public async addToRosterForAdmin(
    currentUser: AuthenticatedUser,
    activationId: string,
    dto: AddActivationRosterDto
  ) {
    this.requireSupervisorOrAdmin(currentUser);
    const activation = await this.repository.findById(activationId);
    if (activation === null) {
      throw new NotFoundException("Activation not found");
    }

    const user = await this.repository.findUserForRoster(dto.userId);
    if (user === null) {
      throw new NotFoundException("User not found");
    }
    if (!user.isActive) {
      throw new BadRequestException("User is inactive and cannot be added to a roster");
    }
    if (!ROSTER_FIELD_ROLES.has(user.role)) {
      throw new BadRequestException(
        "Only promoters and clients can be added to an activation roster"
      );
    }

    try {
      return await this.repository.createRosterEntry(activationId, dto.userId);
    } catch (error: unknown) {
      if (ActivationService.isUniqueViolation(error)) {
        throw new ConflictException("User is already on this activation roster");
      }
      throw error;
    }
  }

  public async addToRosterBatchForAdmin(
    currentUser: AuthenticatedUser,
    activationId: string,
    dto: AddActivationRosterBatchDto
  ) {
    this.requireSupervisorOrAdmin(currentUser);
    const uniqueUserIds = [
      ...new Set(dto.userIds.map((id) => id.trim()).filter((id) => id.length > 0))
    ];
    if (uniqueUserIds.length === 0) {
      throw new BadRequestException("At least one user id is required");
    }

    const activation = await this.repository.findById(activationId);
    if (activation === null) {
      throw new NotFoundException("Activation not found");
    }

    const alreadyOnRoster = await this.repository.findRosterEntriesForUsers(
      activationId,
      uniqueUserIds
    );
    if (alreadyOnRoster.length > 0) {
      throw new ConflictException(
        `${String(alreadyOnRoster.length)} user(s) are already on this activation roster`
      );
    }

    const users = await this.repository.findUsersForRosterByIds(uniqueUserIds);
    if (users.length !== uniqueUserIds.length) {
      throw new NotFoundException("One or more users were not found");
    }

    for (const user of users) {
      if (!user.isActive) {
        throw new BadRequestException("User is inactive and cannot be added to a roster");
      }
      if (!ROSTER_FIELD_ROLES.has(user.role as UserRole)) {
        throw new BadRequestException(
          "Only promoters and clients can be added to an activation roster"
        );
      }
    }

    try {
      await this.repository.createManyRosterEntries(activationId, uniqueUserIds);
    } catch (error: unknown) {
      if (ActivationService.isUniqueViolation(error)) {
        throw new ConflictException("One or more users are already on this activation roster");
      }
      throw error;
    }

    return this.getByIdForAdmin(currentUser, activationId);
  }

  public async removeFromRosterForAdmin(
    currentUser: AuthenticatedUser,
    activationId: string,
    userId: string
  ): Promise<void> {
    this.requireSupervisorOrAdmin(currentUser);
    const activation = await this.repository.findById(activationId);
    if (activation === null) {
      throw new NotFoundException("Activation not found");
    }
    const removed = await this.repository.deleteRosterEntry(activationId, userId);
    if (removed.count === 0) {
      throw new NotFoundException("Roster entry not found");
    }
  }

  private async assertFieldCanAccessActivation(
    currentUser: AuthenticatedUser,
    activationId: string
  ): Promise<void> {
    if (OPS_ROLES.has(currentUser.role)) {
      return;
    }
    const membership = await this.repository.findRosterMembership(activationId, currentUser.id);
    if (membership === null) {
      throw new ForbiddenException("You are not assigned to this activation");
    }
  }

  /** BACKEND_PRD §7.3 — field list (roster-scoped for promoters and clients; all current for ops). */
  public listForField(currentUser: AuthenticatedUser) {
    const now = new Date();
    if (OPS_ROLES.has(currentUser.role)) {
      return this.repository.findActivationsCurrentForOps(now);
    }
    return this.repository.findActivationsForRosterUser(currentUser.id, now);
  }

  public async getByIdForField(currentUser: AuthenticatedUser, id: string) {
    await this.assertFieldCanAccessActivation(currentUser, id);
    const row = await this.repository.findById(id);
    if (row === null) {
      throw new NotFoundException("Activation not found");
    }
    if (OPS_ROLES.has(currentUser.role)) {
      return row;
    }
    const { roster, ...rest } = row;
    void roster;
    return rest;
  }

  public async listProductsForField(
    currentUser: AuthenticatedUser,
    activationId: string,
    limit: number,
    offset: number
  ) {
    await this.assertFieldCanAccessActivation(currentUser, activationId);
    const activation = await this.repository.findById(activationId);
    if (activation === null) {
      throw new NotFoundException("Activation not found");
    }
    const take = Math.min(100, Math.max(1, limit));
    const skip = Math.max(0, offset);
    const [data, total] = await Promise.all([
      this.repository.findActivationProducts(activationId, { take, skip }),
      this.repository.countActivationProducts(activationId)
    ]);
    return { data, total, limit: take, offset: skip };
  }

  /**
   * Supervisor/admin: sales on this activation from roster members only, optionally filtered
   * by user and time (intersected with the activation date window).
   */
  public async listFieldActivitySalesForAdmin(
    currentUser: AuthenticatedUser,
    activationId: string,
    limit: number,
    userIdFilter?: string,
    fromRaw?: string,
    toRaw?: string
  ) {
    this.requireSupervisorOrAdmin(currentUser);
    const row = await this.repository.findById(activationId);
    if (row === null) {
      throw new NotFoundException("Activation not found");
    }
    const rosterIds = row.roster.map((r) => r.userId);
    const trimmedUser =
      userIdFilter !== undefined && userIdFilter.trim().length > 0
        ? userIdFilter.trim()
        : undefined;
    if (trimmedUser !== undefined) {
      this.assertRosterUserOrThrow(rosterIds, trimmedUser);
    }

    const filterFrom = this.parseOptionalIsoDate(fromRaw, "from");
    const filterTo = this.parseOptionalIsoDate(toRaw, "to");
    const range = this.mergeActivationTimeRange({
      activationStartsAt: row.startsAt,
      activationEndsAt: row.endsAt,
      ...(filterFrom !== undefined ? { filterFrom } : {}),
      ...(filterTo !== undefined ? { filterTo } : {})
    });
    if (range === null) {
      return [];
    }

    return this.repository.listFieldSalesForActivation({
      activationId,
      rosterUserIds: rosterIds,
      take: limit,
      ...(trimmedUser !== undefined ? { userId: trimmedUser } : {}),
      createdFrom: range.gte,
      ...(range.lte !== undefined ? { createdTo: range.lte } : {})
    });
  }

  /**
   * Supervisor/admin: recent location pings for roster users, intersected with the activation
   * window and optional narrower time range / single user.
   */
  public async listFieldActivityLocationsForAdmin(
    currentUser: AuthenticatedUser,
    activationId: string,
    limit: number,
    userIdFilter?: string,
    fromRaw?: string,
    toRaw?: string
  ) {
    this.requireSupervisorOrAdmin(currentUser);
    const row = await this.repository.findById(activationId);
    if (row === null) {
      throw new NotFoundException("Activation not found");
    }
    const rosterIds = row.roster.map((r) => r.userId);
    const trimmedUser =
      userIdFilter !== undefined && userIdFilter.trim().length > 0
        ? userIdFilter.trim()
        : undefined;
    if (trimmedUser !== undefined) {
      this.assertRosterUserOrThrow(rosterIds, trimmedUser);
    }

    const filterFrom = this.parseOptionalIsoDate(fromRaw, "from");
    const filterTo = this.parseOptionalIsoDate(toRaw, "to");
    const range = this.mergeActivationTimeRange({
      activationStartsAt: row.startsAt,
      activationEndsAt: row.endsAt,
      ...(filterFrom !== undefined ? { filterFrom } : {}),
      ...(filterTo !== undefined ? { filterTo } : {})
    });
    if (range === null) {
      return [];
    }

    return this.repository.listFieldLocationPingsForUsers(rosterIds, limit, range, trimmedUser);
  }

  /**
   * Supervisor/admin: full check-in for one location ping on this activation (roster + time window).
   * Includes selfie as a data URL when present.
   */
  public async getFieldActivityCheckInForAdmin(
    currentUser: AuthenticatedUser,
    activationId: string,
    pingId: string
  ) {
    this.requireSupervisorOrAdmin(currentUser);
    const activation = await this.repository.findById(activationId);
    if (activation === null) {
      throw new NotFoundException("Activation not found");
    }
    const rosterIds = new Set(activation.roster.map((r) => r.userId));

    const ping = await this.repository.findLocationPingByIdWithUserAndSelfie(pingId);
    if (ping === null) {
      throw new NotFoundException("Check-in not found");
    }
    if (!rosterIds.has(ping.userId)) {
      throw new NotFoundException("Check-in not found");
    }

    const recordedAt = ping.recordedAt;
    if (recordedAt < activation.startsAt) {
      throw new NotFoundException("Check-in not found");
    }
    if (activation.endsAt !== null && recordedAt > activation.endsAt) {
      throw new NotFoundException("Check-in not found");
    }

    let selfieDataUrl: string | null = null;
    if (
      ping.hasSelfieVerification &&
      ping.selfieMimeType !== null &&
      ping.selfieImage !== null &&
      ping.selfieImage.byteLength > 0
    ) {
      const b64 = Buffer.from(ping.selfieImage).toString("base64");
      selfieDataUrl = `data:${ping.selfieMimeType};base64,${b64}`;
    }

    return {
      id: ping.id,
      userId: ping.userId,
      attendanceKind: ping.attendanceKind,
      geofenceId: ping.geofenceId,
      distanceToGeofenceMeters: ping.distanceToGeofenceMeters,
      dwellSecondsAtGeofence: ping.dwellSecondsAtGeofence,
      latitude: ping.latitude,
      longitude: ping.longitude,
      placeLabel: ping.placeLabel,
      recordedAt: ping.recordedAt.toISOString(),
      hasSelfieVerification: ping.hasSelfieVerification,
      selfieDataUrl,
      user: {
        id: ping.user.id,
        fullName: ping.user.fullName,
        phone: ping.user.phone,
        role: ping.user.role
      }
    };
  }

  private requireClientForReadonlyActivationData(currentUser: AuthenticatedUser): void {
    if (currentUser.role !== "client") {
      throw new ForbiddenException("Only client accounts can use this resource");
    }
  }

  /**
   * Read-only: rostered clients see sales recorded by roster field staff for this activation.
   */
  public async listTeamSalesForClient(
    currentUser: AuthenticatedUser,
    activationId: string,
    limit: number
  ) {
    this.requireClientForReadonlyActivationData(currentUser);
    await this.assertFieldCanAccessActivation(currentUser, activationId);
    const row = await this.repository.findById(activationId);
    if (row === null) {
      throw new NotFoundException("Activation not found");
    }
    const rosterIds = row.roster.map((r) => r.userId);
    const take = Math.min(200, Math.max(1, limit));
    return this.repository.listFieldSalesForActivation({
      activationId,
      rosterUserIds: rosterIds,
      take,
      maxRows: 200
    });
  }

  /**
   * Read-only workbook: activation summary, product list, and line-level sales for roster field staff.
   * Optional `from` / `to` (ISO date-time) are intersected with the activation window.
   */
  public async exportClientActivationWorkbook(
    currentUser: AuthenticatedUser,
    activationId: string,
    fromRaw?: string,
    toRaw?: string
  ): Promise<Buffer> {
    this.requireClientForReadonlyActivationData(currentUser);
    await this.assertFieldCanAccessActivation(currentUser, activationId);
    const row = await this.repository.findById(activationId);
    if (row === null) {
      throw new NotFoundException("Activation not found");
    }
    const rosterIds = row.roster.map((r) => r.userId);
    const filterFrom = this.parseOptionalIsoDate(fromRaw, "from");
    const filterTo = this.parseOptionalIsoDate(toRaw, "to");

    let createdFrom: Date | undefined;
    let createdTo: Date | undefined;
    if (filterFrom !== undefined || filterTo !== undefined) {
      const range = this.mergeActivationTimeRange({
        activationStartsAt: row.startsAt,
        activationEndsAt: row.endsAt,
        ...(filterFrom !== undefined ? { filterFrom } : {}),
        ...(filterTo !== undefined ? { filterTo } : {})
      });
      if (range === null) {
        throw new BadRequestException(
          "The requested from/to range does not overlap this activation window"
        );
      }
      createdFrom = range.gte;
      createdTo = range.lte;
    }

    const sales = await this.repository.listFieldSalesForActivation({
      activationId,
      rosterUserIds: rosterIds,
      take: 5000,
      maxRows: 5000,
      ...(createdFrom !== undefined ? { createdFrom } : {}),
      ...(createdTo !== undefined ? { createdTo } : {})
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet([
        {
          name: row.name,
          region: row.regionLinks.map((l) => l.region.name).join(" · "),
          startsAt: row.startsAt.toISOString(),
          endsAt: row.endsAt?.toISOString() ?? ""
        }
      ]),
      "Activation"
    );
    const productRows = row.products.map((p) => ({
      name: p.name,
      sku: p.sku ?? "",
      sortOrder: p.sortOrder
    }));
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(productRows.length > 0 ? productRows : [{ name: "No products" }]),
      "Products"
    );
    const lineRows: { recordedAt: string; seller: string; product: string; quantity: number }[] =
      [];
    for (const sale of sales) {
      for (const item of sale.items) {
        lineRows.push({
          recordedAt: sale.createdAt.toISOString(),
          seller: sale.user.fullName,
          product: item.product.name,
          quantity: item.quantity
        });
      }
    }
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        lineRows.length > 0
          ? lineRows
          : [{ recordedAt: "", seller: "", product: "No sales", quantity: 0 }]
      ),
      "SalesLines"
    );
    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  }
}
