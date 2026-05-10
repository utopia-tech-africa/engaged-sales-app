import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MeRepository {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        role: true,
        gender: true,
        regionId: true
      }
    });
  }

  public updateProfile(
    userId: string,
    patch: Partial<{
      fullName: string;
      gender: "male" | "female" | "other";
      regionId: string;
    }>
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(patch.fullName !== undefined ? { fullName: patch.fullName } : {}),
        ...(patch.gender !== undefined ? { gender: patch.gender } : {}),
        ...(patch.regionId !== undefined ? { regionId: patch.regionId } : {})
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        role: true,
        gender: true,
        regionId: true
      }
    });
  }

  public addLocation(userId: string, latitude: number, longitude: number) {
    return this.prisma.locationPing.create({
      data: {
        userId,
        latitude,
        longitude
      },
      select: {
        userId: true,
        latitude: true,
        longitude: true,
        recordedAt: true
      }
    });
  }

  public listLocationPingsByUser(userId: string, take: number) {
    return this.prisma.locationPing.findMany({
      where: { userId },
      orderBy: { recordedAt: "desc" },
      take,
      select: {
        id: true,
        latitude: true,
        longitude: true,
        recordedAt: true
      }
    });
  }
}
