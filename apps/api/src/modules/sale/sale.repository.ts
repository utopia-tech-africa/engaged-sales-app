import { Inject, Injectable } from "@nestjs/common";

import type { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const saleDetailInclude = {
  items: {
    include: {
      product: { select: { id: true, name: true, sku: true } }
    }
  },
  activation: { select: { id: true, name: true, slug: true } }
} satisfies Prisma.SaleInclude;

export type SaleDetailEntity = Prisma.SaleGetPayload<{ include: typeof saleDetailInclude }>;

@Injectable()
export class SaleRepository {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public findByIdempotency(
    userId: string,
    idempotencyKey: string
  ): Promise<SaleDetailEntity | null> {
    return this.prisma.sale.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
      include: saleDetailInclude
    });
  }

  public createSale(args: {
    userId: string;
    activationId: string;
    idempotencyKey: string | null;
    latitude: number | null;
    longitude: number | null;
    items: { productId: string; quantity: number; unitPrice: number | null }[];
  }): Promise<SaleDetailEntity> {
    return this.prisma.sale.create({
      data: {
        userId: args.userId,
        activationId: args.activationId,
        idempotencyKey: args.idempotencyKey,
        latitude: args.latitude,
        longitude: args.longitude,
        items: {
          create: args.items.map((row) => ({
            productId: row.productId,
            quantity: row.quantity,
            unitPrice: row.unitPrice
          }))
        }
      },
      include: saleDetailInclude
    });
  }

  public listForUser(
    userId: string,
    filters: { activationId?: string; take: number }
  ): Promise<SaleDetailEntity[]> {
    return this.prisma.sale.findMany({
      where: {
        userId,
        ...(filters.activationId !== undefined ? { activationId: filters.activationId } : {})
      },
      orderBy: { createdAt: "desc" },
      take: filters.take,
      include: saleDetailInclude
    });
  }
}
