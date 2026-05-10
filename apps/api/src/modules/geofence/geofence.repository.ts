import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class GeofenceRepository {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public findActive() {
    return this.prisma.geofence.findMany({
      where: { isActive: true },
      select: {
        id: true,
        label: true,
        centerLatitude: true,
        centerLongitude: true,
        radiusMeters: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  public findAll() {
    return this.prisma.geofence.findMany({
      orderBy: { createdAt: "desc" }
    });
  }

  public findById(id: string) {
    return this.prisma.geofence.findUnique({ where: { id } });
  }

  public create(data: {
    label: string;
    centerLatitude: number;
    centerLongitude: number;
    radiusMeters: number;
    isActive: boolean;
  }) {
    return this.prisma.geofence.create({ data });
  }

  public update(
    id: string,
    data: Partial<{
      label: string;
      centerLatitude: number;
      centerLongitude: number;
      radiusMeters: number;
      isActive: boolean;
    }>
  ) {
    return this.prisma.geofence.update({
      where: { id },
      data
    });
  }
}
