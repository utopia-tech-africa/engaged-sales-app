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

  /**
   * Active geofences linked to activations where `userId` is on the roster and the activation
   * is currently running (active flag + date window). Used for promoter sign-in scoping.
   */
  public findActiveLinkedToUserRosterActivations(
    userId: string,
    now: Date
  ): Promise<
    {
      id: string;
      label: string;
      centerLatitude: number;
      centerLongitude: number;
      radiusMeters: number;
      isActive: boolean;
    }[]
  > {
    return this.prisma.geofence.findMany({
      where: {
        isActive: true,
        activationLinks: {
          some: {
            activation: {
              isActive: true,
              startsAt: { lte: now },
              OR: [{ endsAt: null }, { endsAt: { gte: now } }],
              roster: { some: { userId } }
            }
          }
        }
      },
      select: {
        id: true,
        label: true,
        centerLatitude: true,
        centerLongitude: true,
        radiusMeters: true,
        isActive: true
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

  public countByIds(ids: readonly string[]): Promise<number> {
    if (ids.length === 0) {
      return Promise.resolve(0);
    }
    return this.prisma.geofence.count({ where: { id: { in: [...ids] } } });
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
