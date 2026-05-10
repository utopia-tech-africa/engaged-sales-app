import { Inject, Injectable } from "@nestjs/common";

import type { Prisma } from "../../generated/prisma/client";

import { PrismaService } from "../prisma/prisma.service";

const activationAdminInclude = {
  region: { select: { id: true, name: true, slug: true } },
  _count: { select: { products: true, roster: true } }
} satisfies Prisma.ActivationInclude;

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

@Injectable()
export class ActivationRepository {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public findAllForList(): Promise<ActivationListRowEntity[]> {
    return this.prisma.activation.findMany({
      orderBy: { startsAt: "desc" },
      include: activationAdminInclude
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
}
