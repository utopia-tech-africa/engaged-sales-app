"use client";

import { type LatLngExpression } from "leaflet";
import { type ReactElement, useMemo } from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from "react-leaflet";

import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: LatLngExpression = [-1.286389, 36.817223];

const USER_PALETTE = [
  "#2563eb",
  "#16a34a",
  "#c026d3",
  "#ea580c",
  "#0891b2",
  "#ca8a04",
  "#4f46e5",
  "#dc2626"
];

const colorForUser = (userId: string, indexMap: Map<string, number>): string => {
  const idx = indexMap.get(userId) ?? 0;
  return USER_PALETTE[idx % USER_PALETTE.length] ?? "#64748b";
};

export type FieldActivityRosterLabel = { userId: string; fullName: string };

export type FieldActivityPing = {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  placeLabel?: string | null;
  recordedAt: string;
  hasSelfieVerification?: boolean;
  attendanceKind?: "clock_in" | "clock_out";
  geofenceId?: string | null;
  distanceToGeofenceMeters?: number | null;
  dwellSecondsAtGeofence?: number | null;
};

type ActivationFieldActivityMapProps = {
  roster: FieldActivityRosterLabel[];
  pings: FieldActivityPing[];
  onSelectPing?: (pingId: string) => void;
};

export const ActivationFieldActivityMap = ({
  roster,
  pings,
  onSelectPing
}: ActivationFieldActivityMapProps): ReactElement => {
  const userIndex = useMemo(() => {
    const m = new Map<string, number>();
    roster.forEach((r, i) => {
      m.set(r.userId, i);
    });
    return m;
  }, [roster]);

  const trails = useMemo(() => {
    const byUser = new Map<string, FieldActivityPing[]>();
    for (const p of pings) {
      const list = byUser.get(p.userId) ?? [];
      list.push(p);
      byUser.set(p.userId, list);
    }
    const out: { userId: string; positions: LatLngExpression[]; latest: FieldActivityPing }[] = [];
    for (const [userId, list] of byUser) {
      const sorted = [...list].sort(
        (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
      );
      if (sorted.length === 0) {
        continue;
      }
      const positions = sorted.map((x) => [x.latitude, x.longitude] as LatLngExpression);
      const latest = sorted[sorted.length - 1];
      out.push({ userId, positions, latest });
    }
    return out;
  }, [pings]);

  const center = useMemo((): LatLngExpression => {
    if (pings.length === 0) {
      return DEFAULT_CENTER;
    }
    const lat = pings.reduce((s, p) => s + p.latitude, 0) / pings.length;
    const lng = pings.reduce((s, p) => s + p.longitude, 0) / pings.length;
    return [lat, lng];
  }, [pings]);

  const nameFor = (userId: string): string =>
    roster.find((r) => r.userId === userId)?.fullName ?? userId.slice(0, 8);

  return (
    <MapContainer
      center={center}
      zoom={pings.length > 0 ? 13 : 12}
      className="z-0 h-[min(480px,60vh)] w-full min-h-[260px] rounded-lg border border-border"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {trails.map(({ userId, positions }) => {
        const color = colorForUser(userId, userIndex);
        return positions.length > 1 ? (
          <Polyline
            key={`trail-${userId}`}
            positions={positions}
            pathOptions={{ color, weight: 4, opacity: 0.78 }}
          />
        ) : null;
      })}
      {pings.map((p) => {
        const color = colorForUser(p.userId, userIndex);
        return (
          <CircleMarker
            key={p.id}
            center={[p.latitude, p.longitude]}
            radius={6}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.88, weight: 2 }}
          >
            <Popup>
              <span className="font-semibold">{nameFor(p.userId)}</span>
              <br />
              {new Date(p.recordedAt).toLocaleString()}
              <br />
              <span className="text-xs font-medium capitalize text-muted-foreground">
                {p.attendanceKind === "clock_out" ? "Clock out" : "Clock in"}
              </span>
              {p.hasSelfieVerification ? (
                <>
                  <br />
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    Selfie verified
                  </span>
                </>
              ) : null}
              {p.placeLabel !== null && p.placeLabel !== undefined && p.placeLabel.length > 0 ? (
                <>
                  <br />
                  {p.placeLabel}
                </>
              ) : null}
              {p.distanceToGeofenceMeters !== null && p.distanceToGeofenceMeters !== undefined ? (
                <>
                  <br />
                  <span className="text-xs text-muted-foreground">
                    Outlet distance: {p.distanceToGeofenceMeters.toFixed(1)}m
                  </span>
                </>
              ) : null}
              {p.dwellSecondsAtGeofence !== null && p.dwellSecondsAtGeofence !== undefined ? (
                <>
                  <br />
                  <span className="text-xs text-muted-foreground">
                    Dwell: {Math.floor(p.dwellSecondsAtGeofence / 60)}m{" "}
                    {p.dwellSecondsAtGeofence % 60}s
                  </span>
                </>
              ) : null}
              {onSelectPing !== undefined ? (
                <>
                  <br />
                  <button
                    type="button"
                    className="mt-1 text-xs font-semibold text-primary underline"
                    onClick={() => {
                      onSelectPing(p.id);
                    }}
                  >
                    View check-in details
                  </button>
                </>
              ) : null}
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
};
