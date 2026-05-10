import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import type { AuthenticatedUser, UserRole } from "../../common/types/authenticated-user.type";
import type { Prisma } from "../../generated/prisma/client";
import { RegionRepository } from "../region/region.repository";
import { slugifyRegionName } from "../region/slug.util";
import { ActivationRepository } from "./activation.repository";
import type { AddActivationRosterBatchDto } from "./dto/add-activation-roster-batch.dto";
import type { AddActivationRosterDto } from "./dto/add-activation-roster.dto";
import type { CreateActivationDto } from "./dto/create-activation.dto";
import type { CreateActivationProductDto } from "./dto/create-activation-product.dto";
import type { UpdateActivationDto } from "./dto/update-activation.dto";

const OPS_ROLES = new Set<UserRole>(["admin", "supervisor"]);
const ROSTER_FIELD_ROLES = new Set<UserRole>(["promoter", "merchandizer"]);

@Injectable()
export class ActivationService {
  public constructor(
    @Inject(ActivationRepository) private readonly repository: ActivationRepository,
    @Inject(RegionRepository) private readonly regionRepository: RegionRepository
  ) {}

  public requireSupervisorOrAdmin(currentUser: AuthenticatedUser): void {
    if (!OPS_ROLES.has(currentUser.role)) {
      throw new ForbiddenException("Only supervisor or admin users can manage activations");
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

  private async resolveRegionOrThrow(regionId: string | undefined): Promise<void> {
    if (regionId === undefined || regionId.trim().length === 0) {
      return;
    }
    const region = await this.regionRepository.findById(regionId);
    if (region === null) {
      throw new NotFoundException("Region not found");
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
    await this.resolveRegionOrThrow(dto.regionId);

    try {
      return await this.repository.create({
        name,
        slug,
        description: dto.description?.trim() ?? null,
        regionId: dto.regionId ?? null,
        startsAt: dto.startsAt,
        endsAt: dto.endsAt ?? null,
        isActive: dto.isActive ?? true
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
    if (dto.regionId !== undefined) {
      if (dto.regionId.trim().length === 0) {
        data.region = { disconnect: true };
      } else {
        await this.resolveRegionOrThrow(dto.regionId);
        data.region = { connect: { id: dto.regionId } };
      }
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

    try {
      return await this.repository.update(id, data);
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

    return this.repository.createProduct(activationId, {
      name,
      sku,
      quantity,
      sortOrder
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
        "Only promoters and merchandizers can be added to an activation roster"
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
          "Only promoters and merchandizers can be added to an activation roster"
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
}
