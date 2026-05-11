import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import type { AuthenticatedUser, UserRole } from "../../common/types/authenticated-user.type";
import { ActivationRepository } from "../activation/activation.repository";
import type { CreateSaleDto } from "./dto/create-sale.dto";
import { SaleRepository } from "./sale.repository";

const FIELD_SALE_ROLES = new Set<UserRole>(["promoter"]);

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code: string }).code === "P2002";

@Injectable()
export class SaleService {
  public constructor(
    @Inject(SaleRepository) private readonly saleRepository: SaleRepository,
    @Inject(ActivationRepository) private readonly activationRepository: ActivationRepository
  ) {}

  private requireFieldStaffForSales(currentUser: AuthenticatedUser): void {
    if (!FIELD_SALE_ROLES.has(currentUser.role)) {
      throw new ForbiddenException("Only promoters can use sales endpoints");
    }
  }

  private async assertRosterAndActiveWindow(activationId: string, userId: string): Promise<void> {
    const now = new Date();
    const activation = await this.activationRepository.findById(activationId);
    if (activation === null) {
      throw new NotFoundException("Activation not found");
    }
    if (!activation.isActive) {
      throw new BadRequestException("Activation is not active");
    }
    if (activation.startsAt > now) {
      throw new BadRequestException("Activation has not started yet");
    }
    if (activation.endsAt !== null && activation.endsAt < now) {
      throw new BadRequestException("Activation has ended");
    }
    const roster = await this.activationRepository.findRosterMembership(activationId, userId);
    if (roster === null) {
      throw new ForbiddenException("You are not assigned to this activation");
    }
  }

  public async createSale(
    currentUser: AuthenticatedUser,
    dto: CreateSaleDto,
    idempotencyKeyHeader: string | undefined
  ) {
    this.requireFieldStaffForSales(currentUser);
    await this.assertRosterAndActiveWindow(dto.activationId, currentUser.id);

    const trimmed = idempotencyKeyHeader?.trim();
    const idempotencyKey = trimmed !== undefined && trimmed.length > 0 ? trimmed : null;

    if (idempotencyKey !== null) {
      const existing = await this.saleRepository.findByIdempotency(currentUser.id, idempotencyKey);
      if (existing !== null) {
        return existing;
      }
    }

    const productIds = [...new Set(dto.items.map((row) => row.productId))];
    const found = await this.activationRepository.findProductsForActivation(
      dto.activationId,
      productIds
    );
    if (found.length !== productIds.length) {
      throw new BadRequestException("One or more products are invalid for this activation");
    }

    try {
      return await this.saleRepository.createSale({
        userId: currentUser.id,
        activationId: dto.activationId,
        idempotencyKey,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        items: dto.items.map((row) => ({
          productId: row.productId,
          quantity: row.quantity,
          unitPrice: null
        }))
      });
    } catch (error: unknown) {
      if (isUniqueViolation(error) && idempotencyKey !== null) {
        const replay = await this.saleRepository.findByIdempotency(currentUser.id, idempotencyKey);
        if (replay !== null) {
          return replay;
        }
      }
      throw error;
    }
  }

  public listMySales(
    currentUser: AuthenticatedUser,
    activationId: string | undefined,
    limit: number
  ) {
    this.requireFieldStaffForSales(currentUser);
    const take = Math.min(100, Math.max(1, limit));
    const filters = activationId !== undefined ? { activationId, take } : { take };
    return this.saleRepository.listForUser(currentUser.id, filters);
  }
}
