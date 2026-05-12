"use client";

import { Fragment, useEffect, useMemo, useState, type ReactElement } from "react";
import { io, type Socket } from "socket.io-client";

import { ActivationFieldActivityMap } from "@/components/activation-field-activity-map";
import { CheckInDetailModal } from "@/components/check-in-detail-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useTrackingGetCheckIn } from "@/lib/api/generated/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { parseAdminFieldActivityCheckInFromOrval } from "@/lib/ops/field-activity-adapters";

import { formatShort } from "../activations/activations-shared";

type LiveTrackingRow = {
  userId: string;
  fullName: string;
  phone: string;
  role: "promoter";
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

const cardClass = "rounded-xl border border-border bg-card/80 p-5 shadow-sm dark:bg-card/50";
const inputClass =
  "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const SELECT_ALL = "__all__";

const getTrackingSocketOrigin = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5000/api/v1";
  return apiUrl.replace(/\/api\/v1\/?$/, "");
};

export default function OpsTrackingPage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [rowsByUser, setRowsByUser] = useState<Record<string, LiveTrackingRow>>({});
  const [mapCheckInPingId, setMapCheckInPingId] = useState<string | null>(null);
  const [socketState, setSocketState] = useState<
    "connected" | "disconnected" | "reconnecting" | "connecting" | "error"
  >("disconnected");
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [nameFilter, setNameFilter] = useState("");
  const [clockTick, setClockTick] = useState(() => Date.now());

  useEffect(() => {
    if (accessToken === null || accessToken.length === 0) {
      return;
    }
    const socket: Socket = io(`${getTrackingSocketOrigin()}/tracking`, {
      transports: ["websocket"],
      auth: { token: accessToken }
    });
    socket.on("connect", () => {
      setSocketState("connected");
      setReconnectAttempts(0);
    });
    socket.on("disconnect", () => {
      setSocketState("disconnected");
    });
    socket.io.on("reconnect_attempt", (attempt) => {
      setSocketState("reconnecting");
      setReconnectAttempts(attempt);
    });
    socket.io.on("reconnect_error", () => {
      setSocketState("error");
    });
    socket.io.on("error", () => {
      setSocketState("error");
    });
    socket.on("tracking:snapshot", (payload: { rows: LiveTrackingRow[] }) => {
      setRowsByUser(() =>
        payload.rows.reduce<Record<string, LiveTrackingRow>>((acc, row) => {
          acc[row.userId] = row;
          return acc;
        }, {})
      );
    });
    socket.on("tracking:update", (row: LiveTrackingRow) => {
      setRowsByUser((prev) => ({ ...prev, [row.userId]: row }));
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken]);

  useEffect(() => {
    const handle = window.setInterval(() => {
      setClockTick(Date.now());
    }, 30_000);
    return () => {
      window.clearInterval(handle);
    };
  }, []);

  const rows = useMemo(
    () =>
      Object.values(rowsByUser).sort(
        (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
      ),
    [rowsByUser]
  );

  const regions = useMemo(() => {
    const unique = new Map<string, string>();
    for (const row of rows) {
      if (row.regionId !== null && row.regionName !== null) {
        unique.set(row.regionId, row.regionName);
      }
    }
    return [...unique.entries()].map(([id, name]) => ({ id, name }));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const needle = nameFilter.trim().toLowerCase();
    return rows.filter((row) => {
      const regionMatches = regionFilter === "all" || row.regionId === regionFilter;
      const nameMatches =
        needle.length === 0 ||
        row.fullName.toLowerCase().includes(needle) ||
        row.phone.toLowerCase().includes(needle);
      return regionMatches && nameMatches;
    });
  }, [nameFilter, regionFilter, rows]);

  const roster = useMemo(
    () => filteredRows.map((row) => ({ userId: row.userId, fullName: row.fullName })),
    [filteredRows]
  );

  const mapCheckInDetailQuery = useTrackingGetCheckIn(mapCheckInPingId ?? "", {
    query: {
      enabled: accessToken !== null && mapCheckInPingId !== null && mapCheckInPingId.length > 0,
      select: (r) => parseAdminFieldActivityCheckInFromOrval(r)
    }
  });

  const staleStats = useMemo(() => {
    let stale = 0;
    let offline = 0;
    for (const row of filteredRows) {
      const ageMs = clockTick - new Date(row.recordedAt).getTime();
      if (ageMs > 15 * 60_000) {
        offline += 1;
      } else if (ageMs > 5 * 60_000) {
        stale += 1;
      }
    }
    return { stale, offline };
  }, [clockTick, filteredRows]);

  const socketLabel =
    socketState === "connected"
      ? "Live"
      : socketState === "reconnecting"
        ? `Reconnecting (attempt ${String(reconnectAttempts)})`
        : socketState === "connecting" || (socketState === "disconnected" && accessToken !== null)
          ? "Connecting"
          : socketState === "error"
            ? "Connection error"
            : "Disconnected";

  return (
    <Fragment>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Live field tracking
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time websocket stream of latest GPS positions for active promoters. Tap a map
            marker, then{" "}
            <span className="font-medium text-foreground">View selfie &amp; details</span> to open
            the verification photo when one was submitted with check-in.
          </p>
        </div>

        <section className={cardClass}>
          <p className="text-xs text-muted-foreground">
            Socket: <span className="font-medium text-foreground">{socketLabel}</span> · Tracked
            staff: <span className="font-medium text-foreground">{filteredRows.length}</span> ·
            Stale:{" "}
            <span className="font-medium text-amber-700 dark:text-amber-300">
              {staleStats.stale}
            </span>{" "}
            · Offline: <span className="font-medium text-destructive">{staleStats.offline}</span>
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-muted-foreground">
              Region
              <Select
                value={regionFilter === "all" ? SELECT_ALL : regionFilter}
                onValueChange={(value) => {
                  setRegionFilter(value === SELECT_ALL ? "all" : value);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_ALL}>All regions</SelectItem>
                  {regions.map((region) => (
                    <SelectItem key={region.id} value={region.id}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              Name / phone
              <input
                className={inputClass}
                value={nameFilter}
                placeholder="Search staff"
                onChange={(event) => {
                  setNameFilter(event.target.value);
                }}
              />
            </label>
          </div>
        </section>

        <section className={cardClass}>
          <ActivationFieldActivityMap
            roster={roster}
            pings={filteredRows.map((row) => ({
              id: row.locationPingId,
              userId: row.userId,
              latitude: row.latitude,
              longitude: row.longitude,
              placeLabel: row.placeLabel,
              recordedAt: row.recordedAt,
              hasSelfieVerification: row.hasSelfieVerification,
              attendanceKind: row.attendanceKind,
              geofenceId: row.geofenceId,
              distanceToGeofenceMeters: row.distanceToGeofenceMeters,
              dwellSecondsAtGeofence: row.dwellSecondsAtGeofence
            }))}
            onSelectPing={(pingId) => {
              setMapCheckInPingId(pingId);
            }}
          />
        </section>

        <section className={cardClass}>
          <h2 className="text-sm font-semibold text-foreground">Latest by staff</h2>
          {filteredRows.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Waiting for location updates…</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/25">
                    <th className="px-3 py-2 font-medium text-muted-foreground">Name</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Region</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Status</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Event</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Outlet distance</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Dwell</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const ageMs = clockTick - new Date(row.recordedAt).getTime();
                    const status =
                      ageMs > 15 * 60_000 ? "offline" : ageMs > 5 * 60_000 ? "stale" : "live";
                    return (
                      <tr key={row.userId} className="border-b border-border/70 last:border-0">
                        <td className="px-3 py-2">
                          <span className="font-medium text-foreground">{row.fullName}</span>
                          <span className="ml-2 text-xs capitalize text-muted-foreground">
                            {row.role}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {row.regionName ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <span
                            className={[
                              "rounded-md px-2 py-0.5 font-semibold uppercase tracking-wide",
                              status === "live"
                                ? "bg-secondary/15 text-secondary"
                                : status === "stale"
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                  : "bg-destructive/15 text-destructive"
                            ].join(" ")}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs font-medium capitalize text-foreground">
                          {row.attendanceKind === "clock_out" ? "Clock out" : "Clock in"}
                        </td>
                        <td className="px-3 py-2 text-xs tabular-nums text-foreground">
                          {row.distanceToGeofenceMeters !== null
                            ? `${row.distanceToGeofenceMeters.toFixed(1)}m`
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs tabular-nums text-foreground">
                          {row.dwellSecondsAtGeofence !== null
                            ? `${String(Math.floor(row.dwellSecondsAtGeofence / 60))}m ${String(
                                row.dwellSecondsAtGeofence % 60
                              )}s`
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {new Date(row.recordedAt).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <CheckInDetailModal
        open={mapCheckInPingId !== null}
        onClose={() => {
          setMapCheckInPingId(null);
        }}
        isLoading={mapCheckInDetailQuery.isLoading}
        isError={mapCheckInDetailQuery.isError}
        detail={mapCheckInDetailQuery.data}
        formatDateTime={formatShort}
        contextSubtitle="Live map · check-in verification"
      />
    </Fragment>
  );
}
