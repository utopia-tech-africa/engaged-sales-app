import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import type { LiveTrackingRow } from "./tracking.types";

@Injectable()
export class TrackingRepository {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public async listLatestFieldRows(): Promise<LiveTrackingRow[]> {
    const rows = await this.prisma.$queryRaw<
      {
        userId: string;
        fullName: string;
        phone: string;
        role: "promoter" | "merchandizer";
        regionId: string | null;
        regionName: string | null;
        locationPingId: string;
        attendanceKind: "clock_in" | "clock_out";
        geofenceId: string | null;
        distanceToGeofenceMeters: number | null;
        dwellSecondsAtGeofence: number | null;
        latitude: number;
        longitude: number;
        placeLabel: string | null;
        hasSelfieVerification: boolean;
        recordedAt: Date;
      }[]
    >`
      SELECT DISTINCT ON (lp."userId")
        u.id AS "userId",
        u."fullName" AS "fullName",
        u.phone AS "phone",
        u.role AS "role",
        u."regionId" AS "regionId",
        r.name AS "regionName",
        lp.id AS "locationPingId",
        lp."attendanceKind" AS "attendanceKind",
        lp."geofenceId" AS "geofenceId",
        lp."distanceToGeofenceMeters" AS "distanceToGeofenceMeters",
        lp."dwellSecondsAtGeofence" AS "dwellSecondsAtGeofence",
        lp.latitude AS "latitude",
        lp.longitude AS "longitude",
        lp."placeLabel" AS "placeLabel",
        lp."hasSelfieVerification" AS "hasSelfieVerification",
        lp."recordedAt" AS "recordedAt"
      FROM "LocationPing" lp
      INNER JOIN "User" u ON u.id = lp."userId"
      LEFT JOIN "Region" r ON r.id = u."regionId"
      WHERE
        u."isActive" = true
        AND u.role IN ('promoter', 'merchandizer')
      ORDER BY lp."userId", lp."recordedAt" DESC
    `;

    return rows.map((row) => ({
      ...row,
      recordedAt: row.recordedAt.toISOString()
    }));
  }

  public findOpsUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        isActive: true
      }
    });
  }
}
