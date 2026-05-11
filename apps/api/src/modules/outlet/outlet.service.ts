import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import type { AuthenticatedUser, UserRole } from "../../common/types/authenticated-user.type";
import type { CreateOutletDto } from "./dto/create-outlet.dto";
import type { UpdateOutletDto } from "./dto/update-outlet.dto";
import { OutletRepository } from "./outlet.repository";

const OUTLET_MANAGER_ROLES = new Set<UserRole>(["admin", "supervisor"]);

@Injectable()
export class OutletService {
  public constructor(
    @Inject(OutletRepository) private readonly outletRepository: OutletRepository
  ) {}

  private assertOutletManager(currentUser: AuthenticatedUser): void {
    if (!OUTLET_MANAGER_ROLES.has(currentUser.role)) {
      throw new ForbiddenException("Only supervisor or admin users can manage outlets");
    }
  }

  public listForAdmin(currentUser: AuthenticatedUser) {
    this.assertOutletManager(currentUser);
    return this.outletRepository.findAll();
  }

  public createForAdmin(currentUser: AuthenticatedUser, dto: CreateOutletDto) {
    this.assertOutletManager(currentUser);
    return this.outletRepository.create({
      name: dto.name.trim(),
      category: dto.category.trim(),
      distributorName: dto.distributorName.trim(),
      locationArea: dto.locationArea.trim(),
      contactName: dto.contactName?.trim() ?? null,
      contactPhone: dto.contactPhone?.trim() ?? null,
      contactEmail: dto.contactEmail?.trim().toLowerCase() ?? null,
      isActive: dto.isActive ?? true
    });
  }

  public async updateForAdmin(currentUser: AuthenticatedUser, id: string, dto: UpdateOutletDto) {
    this.assertOutletManager(currentUser);
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }
    const existing = await this.outletRepository.findById(id);
    if (existing === null) {
      throw new NotFoundException("Outlet not found");
    }

    return this.outletRepository.update(id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.category !== undefined ? { category: dto.category.trim() } : {}),
      ...(dto.distributorName !== undefined ? { distributorName: dto.distributorName.trim() } : {}),
      ...(dto.locationArea !== undefined ? { locationArea: dto.locationArea.trim() } : {}),
      ...(dto.contactName !== undefined ? { contactName: dto.contactName.trim() } : {}),
      ...(dto.contactPhone !== undefined ? { contactPhone: dto.contactPhone.trim() } : {}),
      ...(dto.contactEmail !== undefined
        ? { contactEmail: dto.contactEmail.trim().toLowerCase() }
        : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {})
    });
  }

  public listVisitsForField(currentUser: AuthenticatedUser, limit: number) {
    const take = Math.min(100, Math.max(1, limit));
    return this.outletRepository.listVisitsForUser(currentUser.id, take);
  }

  public listVisitsForAdmin(
    currentUser: AuthenticatedUser,
    params: {
      limit: number;
      outletId?: string;
      userId?: string;
      from?: string;
      to?: string;
    }
  ) {
    this.assertOutletManager(currentUser);
    const take = Math.min(200, Math.max(1, params.limit));
    const fromDate = params.from !== undefined ? new Date(params.from) : undefined;
    const toDate = params.to !== undefined ? new Date(params.to) : undefined;
    if (fromDate !== undefined && Number.isNaN(fromDate.getTime())) {
      throw new BadRequestException("from must be a valid ISO datetime");
    }
    if (toDate !== undefined && Number.isNaN(toDate.getTime())) {
      throw new BadRequestException("to must be a valid ISO datetime");
    }
    return this.outletRepository.listVisitsForAdmin({
      take,
      ...(params.outletId !== undefined ? { outletId: params.outletId } : {}),
      ...(params.userId !== undefined ? { userId: params.userId } : {}),
      ...(fromDate !== undefined ? { from: fromDate } : {}),
      ...(toDate !== undefined ? { to: toDate } : {})
    });
  }
}
