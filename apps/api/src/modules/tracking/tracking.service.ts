import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { TrackingRepository } from "./tracking.repository";

const OPS_ROLES = new Set<AuthenticatedUser["role"]>(["admin", "supervisor"]);

@Injectable()
export class TrackingService {
  public constructor(@Inject(TrackingRepository) private readonly repository: TrackingRepository) {}

  public async getCheckInForAdmin(currentUser: AuthenticatedUser, pingId: string) {
    if (!OPS_ROLES.has(currentUser.role)) {
      throw new ForbiddenException("Only supervisor or admin users can view tracking check-ins");
    }

    const ping = await this.repository.findLocationPingByIdWithUserAndSelfie(pingId);
    if (ping === null) {
      throw new NotFoundException("Check-in not found");
    }

    if (ping.user.role !== "promoter") {
      throw new NotFoundException("Check-in not found");
    }

    let selfieDataUrl: string | null = null;
    if (
      ping.hasSelfieVerification &&
      ping.selfieMimeType !== null &&
      ping.selfieImage !== null &&
      ping.selfieImage.byteLength > 0
    ) {
      const b64 = Buffer.from(ping.selfieImage).toString("base64");
      selfieDataUrl = `data:${ping.selfieMimeType};base64,${b64}`;
    }

    return {
      id: ping.id,
      userId: ping.userId,
      attendanceKind: ping.attendanceKind,
      geofenceId: ping.geofenceId,
      distanceToGeofenceMeters: ping.distanceToGeofenceMeters,
      dwellSecondsAtGeofence: ping.dwellSecondsAtGeofence,
      latitude: ping.latitude,
      longitude: ping.longitude,
      placeLabel: ping.placeLabel,
      recordedAt: ping.recordedAt.toISOString(),
      hasSelfieVerification: ping.hasSelfieVerification,
      selfieDataUrl,
      user: {
        id: ping.user.id,
        fullName: ping.user.fullName,
        phone: ping.user.phone,
        role: ping.user.role
      }
    };
  }
}
