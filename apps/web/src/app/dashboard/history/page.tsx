"use client";

import Link from "next/link";
import { type ReactElement } from "react";

import { BoneyardInlineFallback } from "@/components/boneyard/boneyard-inline-fallback";
import { LocationPlaceLine } from "@/components/location-place-line";
import { useMeListLocationHistory } from "@/lib/api/generated/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { parseLocationHistoryFromOrval } from "@/lib/auth/orval-auth-adapter";
import { calmMutedLinkClass } from "@/lib/calm-ui";
import { formatFieldCheckInDateTime } from "@/lib/format-field-check-in-datetime";

const HISTORY_LIMIT = 50;

export default function FieldHistoryPage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);

  const historyQuery = useMeListLocationHistory(
    { limit: HISTORY_LIMIT },
    {
      query: {
        enabled: accessToken !== null,
        select: (result) => parseLocationHistoryFromOrval(result)
      }
    }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Check-in history</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your most recent field check-ins (newest first).{" "}
          <Link href="/dashboard/check-in" className={calmMutedLinkClass}>
            Record a new check-in
          </Link>
        </p>
      </div>

      {historyQuery.isLoading ? (
        <BoneyardInlineFallback name="field-history" variant="lines4" className="min-h-[12rem]" />
      ) : null}
      {historyQuery.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load history. Pull to refresh or try again later.
        </p>
      ) : null}

      {historyQuery.isSuccess && historyQuery.data.length === 0 ? (
        <section className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            No check-ins yet. Use{" "}
            <Link
              href="/dashboard/check-in"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Check-in
            </Link>{" "}
            to record your first location.
          </p>
        </section>
      ) : null}

      {historyQuery.isSuccess && historyQuery.data.length > 0 ? (
        <ul className="space-y-2">
          {historyQuery.data.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-border bg-card/80 px-4 py-3 text-sm shadow-sm dark:bg-card/50"
            >
              <p className="font-medium text-foreground">
                <span className="mr-2 inline-block rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground">
                  {row.attendanceKind === "clock_out" ? "Out" : "In"}
                </span>
                {formatFieldCheckInDateTime(row.recordedAt)}
                {row.hasSelfieVerification ? (
                  <span className="ml-2 inline-block rounded-md bg-secondary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">
                    Verified
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-xs leading-snug">
                <LocationPlaceLine
                  placeLabel={row.placeLabel}
                  latitude={row.latitude}
                  longitude={row.longitude}
                />
              </p>
              {row.distanceToGeofenceMeters !== undefined &&
              row.distanceToGeofenceMeters !== null ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Outlet distance: {row.distanceToGeofenceMeters.toFixed(1)}m
                  {row.dwellSecondsAtGeofence !== undefined && row.dwellSecondsAtGeofence !== null
                    ? ` · Dwell: ${String(Math.floor(row.dwellSecondsAtGeofence / 60))}m ${String(
                        row.dwellSecondsAtGeofence % 60
                      )}s`
                    : ""}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
