import type { UserRole } from "../../generated/prisma/client";

export type LiveTrackingRow = {
  userId: string;
  fullName: string;
  phone: string;
  role: UserRole;
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
  recordedAt: string;
};
