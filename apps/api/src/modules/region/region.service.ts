import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import type { AuthenticatedUser, UserRole } from "../../common/types/authenticated-user.type";
import type { CreateRegionDto } from "./dto/create-region.dto";
import type { UpdateRegionDto } from "./dto/update-region.dto";
import { RegionRepository } from "./region.repository";
import { slugifyRegionName } from "./slug.util";

const REGION_MANAGER_ROLES = new Set<UserRole>(["admin", "supervisor"]);

@Injectable()
export class RegionService {
  public constructor(@Inject(RegionRepository) private readonly repository: RegionRepository) {}

  public requireSupervisorOrAdmin(currentUser: AuthenticatedUser): void {
    if (!REGION_MANAGER_ROLES.has(currentUser.role)) {
      throw new ForbiddenException("Only supervisor or admin users can manage regions");
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
    return this.repository.findAll();
  }

  public async createForAdmin(currentUser: AuthenticatedUser, dto: CreateRegionDto) {
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
    try {
      return await this.repository.create({
        slug,
        name,
        isActive: dto.isActive ?? true
      });
    } catch (error: unknown) {
      if (RegionService.isUniqueViolation(error)) {
        throw new ConflictException("A region with this slug already exists");
      }
      throw error;
    }
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

  public async updateForAdmin(currentUser: AuthenticatedUser, id: string, dto: UpdateRegionDto) {
    this.requireSupervisorOrAdmin(currentUser);
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException("Region not found");
    }
    const patch: {
      slug?: string;
      name?: string;
      isActive?: boolean;
    } = {};
    if (dto.slug !== undefined) {
      patch.slug = dto.slug.trim().toLowerCase();
    }
    if (dto.name !== undefined) {
      patch.name = dto.name.trim();
    }
    if (dto.isActive !== undefined) {
      patch.isActive = dto.isActive;
    }
    try {
      return await this.repository.update(id, patch);
    } catch (error: unknown) {
      if (RegionService.isUniqueViolation(error)) {
        throw new ConflictException("A region with this slug already exists");
      }
      throw error;
    }
  }
}
