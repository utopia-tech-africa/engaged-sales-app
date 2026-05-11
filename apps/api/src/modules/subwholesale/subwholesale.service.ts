import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import type { AuthenticatedUser, UserRole } from "../../common/types/authenticated-user.type";
import { RegionRepository } from "../region/region.repository";
import { slugifyRegionName } from "../region/slug.util";
import type { CreateSubwholesaleDto } from "./dto/create-subwholesale.dto";
import type { UpdateSubwholesaleDto } from "./dto/update-subwholesale.dto";
import { SubwholesaleRepository } from "./subwholesale.repository";

const MANAGER_ROLES = new Set<UserRole>(["admin", "supervisor"]);

@Injectable()
export class SubwholesaleService {
  public constructor(
    @Inject(SubwholesaleRepository) private readonly repository: SubwholesaleRepository,
    @Inject(RegionRepository) private readonly regionRepository: RegionRepository
  ) {}

  private requireManager(currentUser: AuthenticatedUser): void {
    if (!MANAGER_ROLES.has(currentUser.role)) {
      throw new ForbiddenException("Only supervisor or admin users can manage subwholesales");
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

  public listForAdmin(currentUser: AuthenticatedUser, regionId?: string) {
    this.requireManager(currentUser);
    const trimmed = regionId?.trim();
    return this.repository.findMany({
      ...(trimmed !== undefined && trimmed.length > 0 ? { regionId: trimmed } : {})
    });
  }

  public async createForAdmin(currentUser: AuthenticatedUser, dto: CreateSubwholesaleDto) {
    this.requireManager(currentUser);
    const regionId = dto.regionId.trim();
    const region = await this.regionRepository.findById(regionId);
    if (region === null) {
      throw new NotFoundException("Region not found");
    }
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
    const slug = await this.allocateUniqueSlug(regionId, base.slice(0, 64));
    try {
      return await this.repository.create({
        regionId,
        slug,
        name,
        contactName: dto.contactName?.trim() ?? null,
        contactPhone: dto.contactPhone?.trim() ?? null,
        contactEmail: dto.contactEmail?.trim().toLowerCase() ?? null,
        notes: dto.notes?.trim() ?? null,
        isActive: dto.isActive ?? true
      });
    } catch (error: unknown) {
      if (SubwholesaleService.isUniqueViolation(error)) {
        throw new ConflictException("A subwholesale with this slug already exists in this region");
      }
      throw error;
    }
  }

  private async allocateUniqueSlug(regionId: string, base: string): Promise<string> {
    const normalized = base.slice(0, 64);
    let candidate = normalized;
    for (
      let n = 2;
      (await this.repository.findByRegionAndSlug(regionId, candidate)) !== null;
      n += 1
    ) {
      const suffix = `-${String(n)}`;
      const maxStem = Math.max(1, 64 - suffix.length);
      candidate = `${normalized.slice(0, maxStem)}${suffix}`;
      if (n > 500) {
        throw new BadRequestException("Could not allocate a unique slug; try a different name.");
      }
    }
    return candidate;
  }

  public async updateForAdmin(
    currentUser: AuthenticatedUser,
    id: string,
    dto: UpdateSubwholesaleDto
  ) {
    this.requireManager(currentUser);
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }
    const existing = await this.repository.findById(id);
    if (existing === null) {
      throw new NotFoundException("Subwholesale not found");
    }
    const targetRegionId = dto.regionId?.trim() ?? existing.regionId;
    if (dto.regionId !== undefined) {
      const region = await this.regionRepository.findById(targetRegionId);
      if (region === null) {
        throw new NotFoundException("Region not found");
      }
    }
    const patch: {
      regionId?: string;
      slug?: string;
      name?: string;
      contactName?: string | null;
      contactPhone?: string | null;
      contactEmail?: string | null;
      notes?: string | null;
      isActive?: boolean;
    } = {};
    if (dto.regionId !== undefined) {
      patch.regionId = targetRegionId;
    }
    if (dto.name !== undefined) {
      patch.name = dto.name.trim();
    }
    if (dto.slug !== undefined) {
      patch.slug = dto.slug.trim().toLowerCase();
    }
    if (dto.contactName !== undefined) {
      patch.contactName = dto.contactName.trim().length > 0 ? dto.contactName.trim() : null;
    }
    if (dto.contactPhone !== undefined) {
      patch.contactPhone = dto.contactPhone.trim().length > 0 ? dto.contactPhone.trim() : null;
    }
    if (dto.contactEmail !== undefined) {
      patch.contactEmail =
        dto.contactEmail.trim().length > 0 ? dto.contactEmail.trim().toLowerCase() : null;
    }
    if (dto.notes !== undefined) {
      patch.notes = dto.notes.trim().length > 0 ? dto.notes.trim() : null;
    }
    if (dto.isActive !== undefined) {
      patch.isActive = dto.isActive;
    }
    const effectiveRegionId = patch.regionId ?? existing.regionId;
    if (patch.slug !== undefined) {
      const collision = await this.repository.findByRegionAndSlug(effectiveRegionId, patch.slug);
      if (collision !== null && collision.id !== id) {
        throw new ConflictException("A subwholesale with this slug already exists in this region");
      }
    }
    try {
      return await this.repository.update(id, patch);
    } catch (error: unknown) {
      if (SubwholesaleService.isUniqueViolation(error)) {
        throw new ConflictException("A subwholesale with this slug already exists in this region");
      }
      throw error;
    }
  }
}
