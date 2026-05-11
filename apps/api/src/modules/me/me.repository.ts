import { Inject, Injectable } from "@nestjs/common";

import type { AttendanceKind } from "../../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";

/** Shape returned by {@link MeRepository.listLocationPingsByUser} (explicit for ESLint / Prisma inference). */
export type LocationPingHistoryRow = {
  id: string;
  attendanceKind: AttendanceKind;
  geofenceId: string | null;
  distanceToGeofenceMeters: number | null;
  dwellSecondsAtGeofence: number | null;
  latitude: number;
  longitude: number;
  placeLabel: string | null;
  hasSelfieVerification: boolean;
  recordedAt: Date;
};

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

  public getTrackingProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        role: true,
        regionId: true,
        region: {
          select: { name: true }
        }
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

  public addLocation(
    userId: string,
    latitude: number,
    longitude: number,
    placeLabel: string | null,
    selfieMimeType: string,
    selfieImage: Buffer,
    attendanceKind: AttendanceKind,
    geofenceId: string | null,
    distanceToGeofenceMeters: number | null,
    dwellSecondsAtGeofence: number | null
  ) {
    return this.prisma.locationPing.create({
      data: {
        userId,
        attendanceKind,
        geofenceId,
        distanceToGeofenceMeters,
        dwellSecondsAtGeofence,
        latitude,
        longitude,
        placeLabel,
        selfieMimeType,
        selfieImage: new Uint8Array(selfieImage),
        hasSelfieVerification: true
      },
      select: {
        id: true,
        userId: true,
        attendanceKind: true,
        geofenceId: true,
        distanceToGeofenceMeters: true,
        dwellSecondsAtGeofence: true,
        latitude: true,
        longitude: true,
        placeLabel: true,
        hasSelfieVerification: true,
        recordedAt: true
      }
    });
  }

  public async listLocationPingsByUser(
    userId: string,
    take: number
  ): Promise<LocationPingHistoryRow[]> {
    return this.prisma.locationPing.findMany({
      where: { userId },
      orderBy: { recordedAt: "desc" },
      take,
      select: {
        id: true,
        attendanceKind: true,
        geofenceId: true,
        distanceToGeofenceMeters: true,
        dwellSecondsAtGeofence: true,
        latitude: true,
        longitude: true,
        placeLabel: true,
        hasSelfieVerification: true,
        recordedAt: true
      }
    });
  }

  public findLatestLocationPingByUser(userId: string) {
    return this.prisma.locationPing.findFirst({
      where: { userId },
      orderBy: { recordedAt: "desc" },
      select: {
        geofenceId: true,
        recordedAt: true
      }
    });
  }
}
