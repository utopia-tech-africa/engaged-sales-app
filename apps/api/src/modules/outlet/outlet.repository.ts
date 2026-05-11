import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class OutletRepository {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public findAll() {
    return this.prisma.outlet.findMany({
      orderBy: { createdAt: "desc" }
    });
  }

  public findById(id: string) {
    return this.prisma.outlet.findUnique({
      where: { id }
    });
  }

  public create(data: {
    name: string;
    category: string;
    distributorName: string;
    locationArea: string;
    contactName: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    isActive: boolean;
  }) {
    return this.prisma.outlet.create({ data });
  }

  public update(
    id: string,
    data: Partial<{
      name: string;
      category: string;
      distributorName: string;
      locationArea: string;
      contactName: string | null;
      contactPhone: string | null;
      contactEmail: string | null;
      isActive: boolean;
    }>
  ) {
    return this.prisma.outlet.update({
      where: { id },
      data
    });
  }

  public createVisit(data: {
    outletId: string;
    userId: string;
    latitude: number;
    longitude: number;
    outletPhotoMimeType: string | null;
    outletPhotoImage: Uint8Array<ArrayBuffer> | null;
    hasOutletPhoto: boolean;
    stockAvailabilityNotes: string | null;
    salesMadeNotes: string | null;
    consumerEngagementNotes: string | null;
    visibilityExecutionNotes: string | null;
  }) {
    return this.prisma.outletVisit.create({
      data,
      select: {
        id: true,
        outletId: true,
        userId: true,
        latitude: true,
        longitude: true,
        hasOutletPhoto: true,
        stockAvailabilityNotes: true,
        salesMadeNotes: true,
        consumerEngagementNotes: true,
        visibilityExecutionNotes: true,
        checkedInAt: true
      }
    });
  }

  public listVisitsForUser(userId: string, take: number) {
    return this.prisma.outletVisit.findMany({
      where: { userId },
      orderBy: { checkedInAt: "desc" },
      take,
      select: {
        id: true,
        outletId: true,
        userId: true,
        latitude: true,
        longitude: true,
        hasOutletPhoto: true,
        stockAvailabilityNotes: true,
        salesMadeNotes: true,
        consumerEngagementNotes: true,
        visibilityExecutionNotes: true,
        checkedInAt: true,
        outlet: {
          select: {
            id: true,
            name: true,
            category: true,
            distributorName: true,
            locationArea: true
          }
        }
      }
    });
  }

  public listVisitsForAdmin(params: {
    take: number;
    skip?: number;
    outletId?: string;
    userId?: string;
    from?: Date;
    to?: Date;
  }) {
    const where: {
      outletId?: string;
      userId?: string;
      checkedInAt?: { gte?: Date; lte?: Date };
    } = {};
    if (params.outletId !== undefined) {
      where.outletId = params.outletId;
    }
    if (params.userId !== undefined) {
      where.userId = params.userId;
    }
    if (params.from !== undefined || params.to !== undefined) {
      where.checkedInAt = {
        ...(params.from !== undefined ? { gte: params.from } : {}),
        ...(params.to !== undefined ? { lte: params.to } : {})
      };
    }

    return this.prisma.outletVisit.findMany({
      where,
      orderBy: { checkedInAt: "desc" },
      take: params.take,
      ...(params.skip !== undefined ? { skip: params.skip } : {}),
      select: {
        id: true,
        outletId: true,
        userId: true,
        latitude: true,
        longitude: true,
        hasOutletPhoto: true,
        stockAvailabilityNotes: true,
        salesMadeNotes: true,
        consumerEngagementNotes: true,
        visibilityExecutionNotes: true,
        checkedInAt: true,
        outlet: {
          select: {
            id: true,
            name: true,
            category: true,
            distributorName: true,
            locationArea: true
          }
        },
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            role: true
          }
        }
      }
    });
  }
}
