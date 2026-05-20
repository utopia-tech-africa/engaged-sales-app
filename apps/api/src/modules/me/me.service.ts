import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DateTime } from "luxon";

import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import type { AttendanceKind } from "../../generated/prisma/client";
import type { EnvironmentVariables } from "../../config/environment";
import { GeofenceService } from "../geofence/geofence.service";
import { OutletRepository } from "../outlet/outlet.repository";
import { TrackingStreamService } from "../tracking/tracking-stream.service";
import type { CreateOutletVisitDto } from "./dto/create-outlet-visit.dto";
import type { UpdateLocationDto } from "./dto/update-location.dto";
import type { UpdateMeDto } from "./dto/update-me.dto";
import { type LocationPingHistoryRow, MeRepository } from "./me.repository";
import { parseOutletPhotoBase64 } from "./outlet-photo.util";
import { ReverseGeocodeService } from "./reverse-geocode.service";
import { parseSelfieBase64 } from "./selfie-image.util";

const toProfilePatch = (
  value: UpdateMeDto
): Partial<{
  fullName: string;
  gender: "male" | "female" | "other";
  regionId: string;
}> => {
  return {
    ...(value.fullName !== undefined ? { fullName: value.fullName } : {}),
    ...(value.gender !== undefined ? { gender: value.gender } : {}),
    ...(value.regionId !== undefined ? { regionId: value.regionId } : {})
  };
};

@Injectable()
export class MeService {
  public constructor(
    @Inject(MeRepository) private readonly meRepository: MeRepository,
    @Inject(ReverseGeocodeService) private readonly reverseGeocode: ReverseGeocodeService,
    @Inject(GeofenceService) private readonly geofenceService: GeofenceService,
    @Inject(OutletRepository) private readonly outletRepository: OutletRepository,
    @Inject(TrackingStreamService) private readonly trackingStream: TrackingStreamService,
    @Inject(ConfigService)
    private readonly configService: ConfigService<EnvironmentVariables, true>
  ) {}

  private ensureFieldVisitRole(role: AuthenticatedUser["role"]): void {
    if (role !== "promoter") {
      throw new BadRequestException("Only promoters can submit outlet visits");
    }
  }

  private getAttendanceTimezone(): string {
    return this.configService.get("ATTENDANCE_TIMEZONE", { infer: true });
  }

  public async getCurrentUser(currentUser: AuthenticatedUser) {
    const profile = await this.meRepository.getProfile(currentUser.id);
    if (!profile) {
      throw new NotFoundException("User profile not found");
    }

    return profile;
  }

  /**
   * Field promoters: local calendar day (ATTENDANCE_TIMEZONE), first clock-in gate, and segment suggestion.
   */
  public async getFieldAttendance(currentUser: AuthenticatedUser) {
    const tz = this.getAttendanceTimezone();
    if (!DateTime.now().setZone(tz).isValid) {
      throw new BadRequestException(`Invalid ATTENDANCE_TIMEZONE: ${tz}`);
    }

    if (currentUser.role !== "promoter") {
      return {
        applicable: false as const,
        timezone: tz,
        localDate: "",
        needsDailyClockIn: false,
        suggestedNextAttendanceKind: "clock_in" as const
      };
    }

    const { localDate, startUtc, endUtcExclusive } = this.getAttendanceLocalDayBounds(tz);
    const clockInsToday = await this.meRepository.countAttendanceKindInWindow(
      currentUser.id,
      startUtc,
      endUtcExclusive,
      "clock_in"
    );
    const needsDailyClockIn = clockInsToday === 0;
    const latestToday = await this.meRepository.findLatestPingInRecordedAtWindow(
      currentUser.id,
      startUtc,
      endUtcExclusive
    );
    const suggestedNextAttendanceKind: "clock_in" | "clock_out" =
      latestToday === null
        ? "clock_in"
        : latestToday.attendanceKind === "clock_in"
          ? "clock_out"
          : "clock_in";

    return {
      applicable: true as const,
      timezone: tz,
      localDate,
      needsDailyClockIn,
      suggestedNextAttendanceKind
    };
  }

  private getAttendanceLocalDayBounds(tz: string): {
    localDate: string;
    startUtc: Date;
    endUtcExclusive: Date;
  } {
    const nowLocal = DateTime.now().setZone(tz);
    const dayStart = nowLocal.startOf("day");
    const dayEndExclusive = dayStart.plus({ days: 1 });
    return {
      localDate: dayStart.toFormat("yyyy-MM-dd"),
      startUtc: dayStart.toUTC().toJSDate(),
      endUtcExclusive: dayEndExclusive.toUTC().toJSDate()
    };
  }

  private async assertVisitSegmentOrThrow(
    currentUser: AuthenticatedUser,
    requestedKind: AttendanceKind,
    windowStart: Date,
    windowEndExclusive: Date
  ): Promise<void> {
    if (currentUser.role !== "promoter") {
      return;
    }
    const latestToday = await this.meRepository.findLatestPingInRecordedAtWindow(
      currentUser.id,
      windowStart,
      windowEndExclusive
    );
    if (latestToday === null) {
      if (requestedKind !== "clock_in") {
        throw new BadRequestException("Start your day with a clock-in.");
      }
      return;
    }
    if (latestToday.attendanceKind === "clock_in") {
      if (requestedKind !== "clock_out") {
        throw new BadRequestException("Clock out before you can clock in again.");
      }
      return;
    }
    if (requestedKind !== "clock_in") {
      throw new BadRequestException("Clock in to start your next visit.");
    }
  }

  public async updateCurrentUser(currentUser: AuthenticatedUser, payload: UpdateMeDto) {
    if (Object.keys(payload).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }

    const patch = toProfilePatch(payload);
    return this.meRepository.updateProfile(currentUser.id, patch);
  }

  public async updateLocation(currentUser: AuthenticatedUser, payload: UpdateLocationDto) {
    const tz = this.getAttendanceTimezone();
    const { startUtc, endUtcExclusive } = this.getAttendanceLocalDayBounds(tz);
    const attendanceKind: AttendanceKind = payload.attendanceKind ?? "clock_in";
    await this.assertVisitSegmentOrThrow(currentUser, attendanceKind, startUtc, endUtcExclusive);

    const selfie = parseSelfieBase64(payload.selfieImageBase64);
    const nearest = await this.geofenceService.findNearestActiveGeofence(
      payload.latitude,
      payload.longitude
    );
    const enforceDistance = this.configService.get("ATTENDANCE_ENFORCE_GEOFENCE_DISTANCE", {
      infer: true
    });
    const maxDistanceMeters = this.configService.get("ATTENDANCE_MIN_DISTANCE_TO_OUTLET_METERS", {
      infer: true
    });
    if (
      enforceDistance &&
      nearest !== null &&
      nearest.distanceMeters > maxDistanceMeters &&
      attendanceKind !== "clock_out"
    ) {
      throw new BadRequestException(
        `Check-in rejected: you must be within ${String(maxDistanceMeters)} meters of the assigned outlet/work area.`
      );
    }

    const placeLabel = await this.reverseGeocode.resolvePlaceLabel(
      payload.latitude,
      payload.longitude
    );
    const previous = await this.meRepository.findLatestLocationPingByUser(currentUser.id);
    const dwellSecondsAtGeofence =
      previous?.geofenceId !== null &&
      previous?.geofenceId !== undefined &&
      nearest !== null &&
      previous.geofenceId === nearest.geofenceId
        ? Math.max(0, Math.floor((Date.now() - previous.recordedAt.getTime()) / 1000))
        : null;
    const saved = await this.meRepository.addLocation(
      currentUser.id,
      payload.latitude,
      payload.longitude,
      placeLabel,
      selfie.mimeType,
      selfie.buffer,
      attendanceKind,
      nearest?.geofenceId ?? null,
      nearest !== null ? Number(nearest.distanceMeters.toFixed(2)) : null,
      dwellSecondsAtGeofence
    );
    const trackingProfile = await this.meRepository.getTrackingProfile(currentUser.id);
    if (trackingProfile !== null) {
      this.trackingStream.publish({
        userId: trackingProfile.id,
        fullName: trackingProfile.fullName,
        phone: trackingProfile.phone,
        role: trackingProfile.role,
        regionId: trackingProfile.regionId,
        regionName: trackingProfile.region?.name ?? null,
        locationPingId: saved.id,
        attendanceKind: saved.attendanceKind,
        geofenceId: saved.geofenceId,
        distanceToGeofenceMeters: saved.distanceToGeofenceMeters,
        dwellSecondsAtGeofence: saved.dwellSecondsAtGeofence,
        latitude: saved.latitude,
        longitude: saved.longitude,
        placeLabel: saved.placeLabel,
        hasSelfieVerification: saved.hasSelfieVerification,
        recordedAt: saved.recordedAt.toISOString()
      });
    }
    return saved;
  }

  public async listLocationHistory(
    currentUser: AuthenticatedUser,
    limit: number
  ): Promise<LocationPingHistoryRow[]> {
    const take = Math.min(100, Math.max(1, limit));
    const rows: LocationPingHistoryRow[] = await this.meRepository.listLocationPingsByUser(
      currentUser.id,
      take
    );
    return rows;
  }

  public async createOutletVisit(currentUser: AuthenticatedUser, payload: CreateOutletVisitDto) {
    this.ensureFieldVisitRole(currentUser.role);
    const outlet = await this.outletRepository.findById(payload.outletId);
    if (!outlet?.isActive) {
      throw new NotFoundException("Active outlet not found");
    }

    const parsedPhoto =
      payload.outletPhotoBase64 !== undefined
        ? parseOutletPhotoBase64(payload.outletPhotoBase64)
        : null;
    const outletPhotoBytes =
      parsedPhoto !== null
        ? (() => {
            const bytes = new Uint8Array(parsedPhoto.buffer.length);
            bytes.set(parsedPhoto.buffer);
            return bytes;
          })()
        : null;

    return this.outletRepository.createVisit({
      outletId: outlet.id,
      userId: currentUser.id,
      latitude: payload.latitude,
      longitude: payload.longitude,
      outletPhotoMimeType: parsedPhoto?.mimeType ?? null,
      outletPhotoImage: outletPhotoBytes,
      hasOutletPhoto: parsedPhoto !== null,
      stockAvailabilityNotes: payload.stockAvailabilityNotes?.trim() ?? null,
      salesMadeNotes: payload.salesMadeNotes?.trim() ?? null,
      consumerEngagementNotes: payload.consumerEngagementNotes?.trim() ?? null
    });
  }
}
