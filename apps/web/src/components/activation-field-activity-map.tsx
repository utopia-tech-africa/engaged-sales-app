"use client";

import { type LatLngExpression } from "leaflet";
import { Fragment, type ReactElement, useMemo } from "react";
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
  userId: string;
  latitude: number;
  longitude: number;
  placeLabel?: string | null;
  recordedAt: string;
};

type ActivationFieldActivityMapProps = {
  roster: FieldActivityRosterLabel[];
  pings: FieldActivityPing[];
};

export const ActivationFieldActivityMap = ({
  roster,
  pings
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
      {trails.map(({ userId, positions, latest }) => {
        const color = colorForUser(userId, userIndex);
        return (
          <Fragment key={userId}>
            {positions.length > 1 ? (
              <Polyline positions={positions} pathOptions={{ color, weight: 4, opacity: 0.78 }} />
            ) : null}
            <CircleMarker
              center={[latest.latitude, latest.longitude]}
              radius={8}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.9, weight: 2 }}
            >
              <Popup>
                <span className="font-semibold">{nameFor(userId)}</span>
                <br />
                {new Date(latest.recordedAt).toLocaleString()}
                {latest.placeLabel !== null &&
                latest.placeLabel !== undefined &&
                latest.placeLabel.length > 0 ? (
                  <>
                    <br />
                    {latest.placeLabel}
                  </>
                ) : null}
              </Popup>
            </CircleMarker>
          </Fragment>
        );
      })}
    </MapContainer>
  );
};
