"use client";

import { format } from "date-fns";
import { type ReactElement, useMemo, useState } from "react";

import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  useAdminAttendanceGetDailySummary,
  useAdminRegionListRegions
} from "@/lib/api/generated/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { calmPrimaryButtonClass, calmSecondaryButtonClass } from "@/lib/calm-ui";
import {
  type AdminAttendanceDailySummary,
  parseAdminAttendanceDailySummaryFromOrval
} from "@/lib/ops/ops-attendance-adapters";
import { type RegionRow, parseRegionsFromOrval } from "@/lib/ops/ops-adapters";
import { cn } from "@/lib/utils";

const cardClass = "rounded-xl border border-border bg-card/80 p-5 shadow-sm dark:bg-card/50";
const SELECT_ALL = "__all__";

const statusPill = (label: string, tone: "ok" | "warn" | "bad"): string =>
  cn(
    "inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
    tone === "ok" && "bg-secondary/15 text-secondary",
    tone === "warn" && "bg-amber-500/15 text-amber-800 dark:text-amber-200",
    tone === "bad" && "bg-destructive/15 text-destructive"
  );

const formatTimeInZone = (iso: string, timeZone: string): string =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date(iso));

const SummaryTiles = ({
  summary
}: {
  summary: AdminAttendanceDailySummary["summary"];
}): ReactElement => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
    <div className={cardClass}>
      <p className="text-xs font-medium text-muted-foreground">Team size</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{summary.total}</p>
    </div>
    <div className={cardClass}>
      <p className="text-xs font-medium text-muted-foreground">Present</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
        {summary.present}
      </p>
    </div>
    <div className={cardClass}>
      <p className="text-xs font-medium text-muted-foreground">Missed</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-destructive">{summary.missed}</p>
    </div>
    <div className={cardClass}>
      <p className="text-xs font-medium text-muted-foreground">Late clock-in</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-300">
        {summary.late}
      </p>
    </div>
    <div className={cardClass}>
      <p className="text-xs font-medium text-muted-foreground">No clock-out</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
        {summary.missingClockOut}
      </p>
    </div>
  </div>
);

export default function OpsAttendancePage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [regionId, setRegionId] = useState<string>("");

  const regionsQuery = useAdminRegionListRegions({
    query: {
      enabled: accessToken !== null,
      select: (r) => parseRegionsFromOrval(r)
    }
  });

  const summaryParams = useMemo(
    () => ({
      date,
      ...(regionId.trim().length > 0 ? { regionId: regionId.trim() } : {})
    }),
    [date, regionId]
  );

  const summaryQuery = useAdminAttendanceGetDailySummary(summaryParams, {
    query: {
      enabled: accessToken !== null && date.length === 10,
      select: (r) => parseAdminAttendanceDailySummaryFromOrval(r)
    }
  });

  const regions: RegionRow[] = regionsQuery.data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Daily attendance</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Roll-up for field staff (promoters and merchandizers) by calendar day. Boundaries and
          &ldquo;late&rdquo; use the API{" "}
          <span className="font-mono text-xs text-foreground">ATTENDANCE_TIMEZONE</span> and{" "}
          <span className="font-mono text-xs text-foreground">
            ATTENDANCE_EXPECTED_CHECK_IN_HHMM
          </span>
          .
        </p>
      </div>

      <section className={cardClass}>
        <h2 className="text-sm font-semibold text-foreground">Filters</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-xs font-medium text-muted-foreground">
            Date
            <DatePicker value={date} onChange={setDate} placeholder="Select date" />
          </label>
          <label className="block text-xs font-medium text-muted-foreground">
            Region (optional)
            <Select
              value={regionId.length > 0 ? regionId : SELECT_ALL}
              onValueChange={(value) => {
                setRegionId(value === SELECT_ALL ? "" : value);
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
          <div className="flex items-end gap-2">
            <button
              type="button"
              className={calmSecondaryButtonClass}
              onClick={() => {
                setDate(format(new Date(), "yyyy-MM-dd"));
              }}
            >
              Today
            </button>
            <button
              type="button"
              className={calmPrimaryButtonClass}
              onClick={() => {
                void summaryQuery.refetch();
              }}
              disabled={summaryQuery.isFetching}
            >
              {summaryQuery.isFetching ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
      </section>

      {summaryQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading attendance…</p>
      ) : null}
      {summaryQuery.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load attendance. Check your connection and try again.
        </p>
      ) : null}

      {summaryQuery.isSuccess ? (
        <div className="space-y-6">
          {(() => {
            const daily = summaryQuery.data;
            const tz = daily.timezone;
            const formatDayTime = (iso: string | null): string =>
              iso === null ? "—" : formatTimeInZone(iso, tz);
            return (
              <>
                <p className="text-xs text-muted-foreground">
                  Day <span className="font-mono text-foreground">{daily.date}</span> · IANA{" "}
                  <span className="font-mono text-foreground">{daily.timezone}</span> · Expected
                  clock-in{" "}
                  <span className="font-mono text-foreground">{daily.expectedCheckInLocal}</span>{" "}
                  local
                </p>
                <SummaryTiles summary={daily.summary} />

                {daily.rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active field staff match this filter.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30 dark:bg-muted/15">
                          <th className="px-3 py-2 font-medium text-muted-foreground">Name</th>
                          <th className="px-3 py-2 font-medium text-muted-foreground">Region</th>
                          <th className="px-3 py-2 font-medium text-muted-foreground">Clock in</th>
                          <th className="px-3 py-2 font-medium text-muted-foreground">Clock out</th>
                          <th className="px-3 py-2 font-medium text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {daily.rows.map((row) => (
                          <tr key={row.userId} className="border-b border-border/80 last:border-0">
                            <td className="px-3 py-2">
                              <span className="font-medium text-foreground">{row.fullName}</span>
                              <span className="mt-0.5 block text-xs capitalize text-muted-foreground">
                                {row.role}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {row.regionName ?? "—"}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs tabular-nums text-foreground">
                              {formatDayTime(row.firstClockInAt)}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs tabular-nums text-foreground">
                              {formatDayTime(row.lastClockOutAt)}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {row.missed ? (
                                  <span className={statusPill("Missed", "bad")}>Missed</span>
                                ) : null}
                                {row.late ? (
                                  <span className={statusPill("Late", "warn")}>Late</span>
                                ) : null}
                                {!row.missed && !row.late ? (
                                  <span className={statusPill("On time", "ok")}>On time</span>
                                ) : null}
                                {row.missingClockOut ? (
                                  <span className={statusPill("No out", "warn")}>No clock-out</span>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      ) : null}
    </div>
  );
}
