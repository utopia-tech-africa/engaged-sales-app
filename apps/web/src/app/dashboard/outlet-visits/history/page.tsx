"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { type ReactElement } from "react";

import { BoneyardInlineFallback } from "@/components/boneyard/boneyard-inline-fallback";
import { useAuthStore } from "@/lib/auth/auth-store";
import { calmMutedLinkClass } from "@/lib/calm-ui";
import { formatFieldCheckInDateTime } from "@/lib/format-field-check-in-datetime";
import { listMyOutletVisits } from "@/lib/outlet/outlet-api";

export default function OutletVisitHistoryPage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const visitsQuery = useQuery({
    queryKey: ["field", "outlet-visits", "history"],
    queryFn: async () => listMyOutletVisits(accessToken ?? "", 100),
    enabled: accessToken !== null
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Outlet visit history
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review your recent outlet execution submissions.{" "}
          <Link href="/dashboard/outlet-visits" className={calmMutedLinkClass}>
            Record new visit
          </Link>
        </p>
      </div>

      {visitsQuery.isLoading ? (
        <BoneyardInlineFallback
          name="field-outlet-visit-history"
          variant="lines4"
          className="min-h-[10rem]"
        />
      ) : null}
      {visitsQuery.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load outlet visit history.
        </p>
      ) : null}
      {visitsQuery.data?.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
          No outlet visits recorded yet.
        </p>
      ) : null}
      {visitsQuery.data !== undefined && visitsQuery.data.length > 0 ? (
        <ul className="space-y-2">
          {visitsQuery.data.map((visit) => (
            <li
              key={visit.id}
              className="rounded-xl border border-border bg-card/80 px-4 py-3 text-sm shadow-sm dark:bg-card/50"
            >
              <p className="font-medium text-foreground">
                {visit.outlet?.name ?? visit.outletId} ·{" "}
                {formatFieldCheckInDateTime(visit.checkedInAt)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {visit.outlet?.locationArea ?? "Area not available"} ·{" "}
                {visit.hasOutletPhoto ? "Photo attached" : "No photo"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {visit.latitude.toFixed(5)}, {visit.longitude.toFixed(5)}
              </p>
              {visit.stockAvailabilityNotes ? (
                <p className="mt-2 text-xs text-foreground/90">
                  <span className="font-medium">Stock:</span> {visit.stockAvailabilityNotes}
                </p>
              ) : null}
              {visit.salesMadeNotes ? (
                <p className="mt-1 text-xs text-foreground/90">
                  <span className="font-medium">Sales:</span> {visit.salesMadeNotes}
                </p>
              ) : null}
              {visit.consumerEngagementNotes ? (
                <p className="mt-1 text-xs text-foreground/90">
                  <span className="font-medium">Engagement:</span> {visit.consumerEngagementNotes}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
