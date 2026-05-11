import { Inject, Injectable } from "@nestjs/common";

import type { Prisma } from "../../generated/prisma/client";

import { PrismaService } from "../prisma/prisma.service";

const activationAdminInclude = {
  region: { select: { id: true, name: true, slug: true } },
  _count: { select: { products: true, roster: true } }
} satisfies Prisma.ActivationInclude;

const activationFieldListInclude = {
  region: { select: { id: true, name: true, slug: true } },
  _count: { select: { products: true } }
} satisfies Prisma.ActivationInclude;

export type ActivationFieldListRow = Prisma.ActivationGetPayload<{
  include: typeof activationFieldListInclude;
}>;

const activationDetailInclude = {
  region: { select: { id: true, name: true, slug: true } },
  products: { orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }] },
  roster: {
    orderBy: { createdAt: "asc" as const },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          role: true,
          isActive: true
        }
      }
    }
  }
} satisfies Prisma.ActivationInclude;

export type ActivationListRowEntity = Prisma.ActivationGetPayload<{
  include: typeof activationAdminInclude;
}>;
export type ActivationDetailEntity = Prisma.ActivationGetPayload<{
  include: typeof activationDetailInclude;
}>;

const saleFieldAdminInclude = {
  user: { select: { id: true, fullName: true, phone: true, role: true } },
  items: {
    include: {
      product: { select: { id: true, name: true, sku: true } }
    }
  }
} satisfies Prisma.SaleInclude;

export type FieldSaleAdminRow = Prisma.SaleGetPayload<{ include: typeof saleFieldAdminInclude }>;

@Injectable()
export class ActivationRepository {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public findAllForList(): Promise<ActivationListRowEntity[]> {
    return this.prisma.activation.findMany({
      orderBy: { startsAt: "desc" },
      include: activationAdminInclude
    });
  }

  private static currentActivationWhere(now: Date): Prisma.ActivationWhereInput {
    return {
      isActive: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }]
    };
  }

  public findActivationsForRosterUser(
    userId: string,
    now: Date
  ): Promise<ActivationFieldListRow[]> {
    return this.prisma.activation.findMany({
      where: {
        ...ActivationRepository.currentActivationWhere(now),
        roster: { some: { userId } }
      },
      orderBy: { startsAt: "desc" },
      include: activationFieldListInclude
    });
  }

  public findActivationsCurrentForOps(now: Date): Promise<ActivationFieldListRow[]> {
    return this.prisma.activation.findMany({
      where: ActivationRepository.currentActivationWhere(now),
      orderBy: { startsAt: "desc" },
      include: activationFieldListInclude
    });
  }

  public findRosterMembership(
    activationId: string,
    userId: string
  ): Promise<{ userId: string } | null> {
    return this.prisma.activationRoster.findUnique({
      where: { activationId_userId: { activationId, userId } },
      select: { userId: true }
    });
  }

  public findActivationProducts(
    activationId: string,
    args: { take: number; skip: number }
  ): Promise<ActivationDetailEntity["products"]> {
    return this.prisma.activationProduct.findMany({
      where: { activationId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      take: args.take,
      skip: args.skip
    });
  }

  public countActivationProducts(activationId: string): Promise<number> {
    return this.prisma.activationProduct.count({ where: { activationId } });
  }

  public findProductsForActivation(
    activationId: string,
    productIds: readonly string[]
  ): Promise<{ id: string }[]> {
    if (productIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.prisma.activationProduct.findMany({
      where: { activationId, id: { in: [...productIds] } },
      select: { id: true }
    });
  }

  public findById(id: string): Promise<ActivationDetailEntity | null> {
    return this.prisma.activation.findUnique({
      where: { id },
      include: activationDetailInclude
    });
  }

  public findBySlug(slug: string): Promise<{ id: string } | null> {
    return this.prisma.activation.findUnique({
      where: { slug },
      select: { id: true }
    });
  }

  public findFirstBySlugExcludingId(
    slug: string,
    excludeActivationId: string
  ): Promise<{ id: string } | null> {
    return this.prisma.activation.findFirst({
      where: { slug, NOT: { id: excludeActivationId } },
      select: { id: true }
    });
  }

  public create(data: {
    name: string;
    slug: string;
    description: string | null;
    regionId: string | null;
    startsAt: Date;
    endsAt: Date | null;
    isActive: boolean;
  }): Promise<ActivationDetailEntity> {
    return this.prisma.activation.create({
      data,
      include: activationDetailInclude
    });
  }

  public update(
    id: string,
    data: Prisma.ActivationUpdateInput | Prisma.ActivationUncheckedUpdateInput
  ): Promise<ActivationDetailEntity> {
    return this.prisma.activation.update({
      where: { id },
      data,
      include: activationDetailInclude
    });
  }

  public async nextProductSortOrder(activationId: string): Promise<number> {
    const agg = await this.prisma.activationProduct.aggregate({
      where: { activationId },
      _max: { sortOrder: true }
    });
    return (agg._max.sortOrder ?? -1) + 1;
  }

  public createProduct(
    activationId: string,
    data: { name: string; sku: string | null; quantity: number; sortOrder: number }
  ) {
    return this.prisma.activationProduct.create({
      data: {
        activationId,
        name: data.name,
        sku: data.sku,
        quantity: data.quantity,
        sortOrder: data.sortOrder
      }
    });
  }

  public deleteProduct(activationId: string, productId: string) {
    return this.prisma.activationProduct.deleteMany({
      where: { id: productId, activationId }
    });
  }

  public createRosterEntry(activationId: string, userId: string) {
    return this.prisma.activationRoster.create({
      data: { activationId, userId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            role: true,
            isActive: true
          }
        }
      }
    });
  }

  public deleteRosterEntry(activationId: string, userId: string) {
    return this.prisma.activationRoster.deleteMany({
      where: { activationId, userId }
    });
  }

  public findUserForRoster(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isActive: true }
    });
  }

  public findRosterEntriesForUsers(activationId: string, userIds: readonly string[]) {
    if (userIds.length === 0) {
      return Promise.resolve([] as { userId: string }[]);
    }
    return this.prisma.activationRoster.findMany({
      where: { activationId, userId: { in: [...userIds] } },
      select: { userId: true }
    });
  }

  public findUsersForRosterByIds(userIds: readonly string[]) {
    if (userIds.length === 0) {
      return Promise.resolve([] as { id: string; role: string; isActive: boolean }[]);
    }
    return this.prisma.user.findMany({
      where: { id: { in: [...userIds] } },
      select: { id: true, role: true, isActive: true }
    });
  }

  public createManyRosterEntries(activationId: string, userIds: readonly string[]) {
    return this.prisma.activationRoster.createMany({
      data: userIds.map((userId) => ({ activationId, userId }))
    });
  }

  /**
   * Supervisor/admin: sales on this activation from roster members only, with seller and line items.
   */
  public listFieldSalesForActivation(args: {
    activationId: string;
    rosterUserIds: readonly string[];
    take: number;
    userId?: string;
    createdFrom?: Date;
    createdTo?: Date;
  }) {
    const { activationId, rosterUserIds, take, userId, createdFrom, createdTo } = args;
    if (rosterUserIds.length === 0) {
      return Promise.resolve([] as FieldSaleAdminRow[]);
    }
    const lim = Math.min(200, Math.max(1, take));
    const userFilter =
      userId !== undefined
        ? rosterUserIds.includes(userId)
          ? userId
          : null
        : { in: [...rosterUserIds] };
    if (userFilter === null) {
      return Promise.resolve([] as FieldSaleAdminRow[]);
    }
    return this.prisma.sale.findMany({
      where: {
        activationId,
        userId: typeof userFilter === "string" ? userFilter : userFilter,
        ...(createdFrom !== undefined || createdTo !== undefined
          ? {
              createdAt: {
                ...(createdFrom !== undefined ? { gte: createdFrom } : {}),
                ...(createdTo !== undefined ? { lte: createdTo } : {})
              }
            }
          : {})
      },
      orderBy: { createdAt: "desc" },
      take: lim,
      include: saleFieldAdminInclude
    });
  }

  /**
   * Recent location pings for the given users (e.g. activation roster), newest rows first.
   * When `recordedInRange` is set, only pings inside that window (e.g. activation dates).
   */
  public listFieldLocationPingsForUsers(
    userIds: readonly string[],
    take: number,
    recordedInRange?: { gte: Date; lte?: Date },
    onlyUserId?: string
  ) {
    let effectiveIds = [...userIds];
    if (onlyUserId !== undefined) {
      effectiveIds = userIds.includes(onlyUserId) ? [onlyUserId] : [];
    }
    if (effectiveIds.length === 0) {
      return Promise.resolve(
        [] as {
          id: string;
          userId: string;
          latitude: number;
          longitude: number;
          placeLabel: string | null;
          recordedAt: Date;
        }[]
      );
    }
    const lim = Math.min(2000, Math.max(1, take));
    return this.prisma.locationPing.findMany({
      where: {
        userId: { in: effectiveIds },
        ...(recordedInRange !== undefined
          ? {
              recordedAt: {
                gte: recordedInRange.gte,
                ...(recordedInRange.lte !== undefined ? { lte: recordedInRange.lte } : {})
              }
            }
          : {})
      },
      orderBy: { recordedAt: "desc" },
      take: lim,
      select: {
        id: true,
        userId: true,
        latitude: true,
        longitude: true,
        placeLabel: true,
        recordedAt: true
      }
    });
  }
}
