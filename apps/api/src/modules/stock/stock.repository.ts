import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class StockRepository {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public findActivationProductRows(activationId: string) {
    return this.prisma.activationProduct.findMany({
      where: { activationId },
      select: { id: true, name: true, sku: true, quantity: true }
    });
  }

  public createPickup(args: {
    userId: string;
    activationId: string;
    distributorName: string;
    pickedAt: Date;
    items: { productId: string; quantity: number; costPrice: number }[];
  }) {
    return this.prisma.stockPickup.create({
      data: {
        userId: args.userId,
        activationId: args.activationId,
        distributorName: args.distributorName,
        pickedAt: args.pickedAt,
        items: {
          create: args.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            costPrice: item.costPrice
          }))
        }
      },
      select: {
        id: true,
        activationId: true,
        distributorName: true,
        pickedAt: true,
        items: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            costPrice: true
          }
        }
      }
    });
  }

  public createSale(args: {
    userId: string;
    activationId: string;
    soldAt: Date;
    items: { productId: string; quantity: number; sellingPrice: number }[];
  }) {
    return this.prisma.sale.create({
      data: {
        userId: args.userId,
        activationId: args.activationId,
        createdAt: args.soldAt,
        items: {
          create: args.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.sellingPrice
          }))
        }
      },
      select: {
        id: true,
        activationId: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            unitPrice: true
          }
        }
      }
    });
  }

  public listPickedItems(args: { userId: string; activationId: string; from?: Date; to?: Date }) {
    return this.prisma.stockPickupItem.findMany({
      where: {
        pickup: {
          userId: args.userId,
          activationId: args.activationId,
          ...(args.from !== undefined || args.to !== undefined
            ? {
                pickedAt: {
                  ...(args.from !== undefined ? { gte: args.from } : {}),
                  ...(args.to !== undefined ? { lte: args.to } : {})
                }
              }
            : {})
        }
      },
      select: {
        productId: true,
        quantity: true,
        costPrice: true,
        pickup: {
          select: {
            distributorName: true,
            pickedAt: true
          }
        }
      }
    });
  }

  public listSoldItems(args: { userId: string; activationId: string; from?: Date; to?: Date }) {
    return this.prisma.saleItem.findMany({
      where: {
        sale: {
          userId: args.userId,
          activationId: args.activationId,
          ...(args.from !== undefined || args.to !== undefined
            ? {
                createdAt: {
                  ...(args.from !== undefined ? { gte: args.from } : {}),
                  ...(args.to !== undefined ? { lte: args.to } : {})
                }
              }
            : {})
        }
      },
      select: {
        productId: true,
        quantity: true,
        unitPrice: true,
        sale: {
          select: {
            createdAt: true
          }
        }
      }
    });
  }

  public listPickedItemsForActivation(args: { activationId: string; from?: Date; to?: Date }) {
    return this.prisma.stockPickupItem.findMany({
      where: {
        pickup: {
          activationId: args.activationId,
          ...(args.from !== undefined || args.to !== undefined
            ? {
                pickedAt: {
                  ...(args.from !== undefined ? { gte: args.from } : {}),
                  ...(args.to !== undefined ? { lte: args.to } : {})
                }
              }
            : {})
        }
      },
      select: {
        productId: true,
        quantity: true,
        costPrice: true,
        pickup: {
          select: {
            userId: true,
            distributorName: true,
            pickedAt: true,
            user: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                role: true
              }
            }
          }
        }
      }
    });
  }

  public listSoldItemsForActivation(args: { activationId: string; from?: Date; to?: Date }) {
    return this.prisma.saleItem.findMany({
      where: {
        sale: {
          activationId: args.activationId,
          ...(args.from !== undefined || args.to !== undefined
            ? {
                createdAt: {
                  ...(args.from !== undefined ? { gte: args.from } : {}),
                  ...(args.to !== undefined ? { lte: args.to } : {})
                }
              }
            : {})
        }
      },
      select: {
        productId: true,
        quantity: true,
        unitPrice: true,
        sale: {
          select: {
            userId: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                role: true
              }
            }
          }
        }
      }
    });
  }
}
