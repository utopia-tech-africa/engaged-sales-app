"use client";

import Link from "next/link";
import { type ReactElement } from "react";

import { ReverseGeocodeLabel } from "@/components/reverse-geocode-label";
import { useMeListLocationHistory } from "@/lib/api/generated/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { parseLocationHistoryFromOrval } from "@/lib/auth/orval-auth-adapter";
import { calmMutedLinkClass } from "@/lib/calm-ui";
import { formatFieldCheckInDateTime } from "@/lib/format-field-check-in-datetime";

const HISTORY_LIMIT = 50;

export default function FieldHistoryPage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);

  const historyQuery = useMeListLocationHistory(HISTORY_LIMIT, {
    query: {
      enabled: accessToken !== null,
      select: (result) => parseLocationHistoryFromOrval(result)
    }
  });

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
        <p className="text-sm text-muted-foreground">Loading history…</p>
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
                {formatFieldCheckInDateTime(row.recordedAt)}
              </p>
              <p className="mt-1 text-xs leading-snug">
                <ReverseGeocodeLabel latitude={row.latitude} longitude={row.longitude} />
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
