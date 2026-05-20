"use client";

import { useQuery } from "@tanstack/react-query";
import { type ReactElement, useMemo, useState } from "react";
import * as XLSX from "xlsx";

import { BoneyardInlineFallback } from "@/components/boneyard/boneyard-inline-fallback";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useAuthStore } from "@/lib/auth/auth-store";
import { listOutletVisitReports, listOutlets } from "@/lib/outlet/outlet-api";
import { toast } from "@/lib/toast";

const cardClass = "rounded-xl border border-border bg-card/80 p-5 shadow-sm dark:bg-card/50";

export default function OpsOutletVisitsReportPage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [outletId, setOutletId] = useState("");
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [isExportingAll, setIsExportingAll] = useState(false);

  const outletsQuery = useQuery({
    queryKey: ["ops", "outlets"],
    queryFn: async () => listOutlets(accessToken ?? ""),
    enabled: accessToken !== null
  });

  const visitsQuery = useQuery({
    queryKey: ["ops", "outlet-visits", { outletId, userId, from, to }],
    queryFn: async () =>
      listOutletVisitReports(accessToken ?? "", {
        limit: 200,
        ...(outletId ? { outletId } : {}),
        ...(userId.trim() ? { userId: userId.trim() } : {}),
        ...(from ? { from: new Date(`${from}T00:00:00.000Z`).toISOString() } : {}),
        ...(to ? { to: new Date(`${to}T23:59:59.999Z`).toISOString() } : {})
      }),
    enabled: accessToken !== null
  });

  const uniqueUsers = useMemo(() => {
    const users = new Map<string, { id: string; fullName: string; phone: string }>();
    for (const row of visitsQuery.data ?? []) {
      if (row.user !== undefined) {
        users.set(row.user.id, {
          id: row.user.id,
          fullName: row.user.fullName,
          phone: row.user.phone
        });
      }
    }
    return [...users.values()];
  }, [visitsQuery.data]);

  const exportExcel = (): void => {
    if (visitsQuery.data === undefined || visitsQuery.data.length === 0) {
      return;
    }
    const rows = visitsQuery.data.map((visit) => ({
      checkedInAt: visit.checkedInAt,
      outletName: visit.outlet?.name ?? visit.outletId,
      outletCategory: visit.outlet?.category ?? "",
      distributorName: visit.outlet?.distributorName ?? "",
      locationArea: visit.outlet?.locationArea ?? "",
      userName: visit.user?.fullName ?? visit.userId,
      userPhone: visit.user?.phone ?? "",
      userRole: visit.user?.role ?? "",
      latitude: visit.latitude,
      longitude: visit.longitude,
      hasOutletPhoto: visit.hasOutletPhoto ? "Yes" : "No",
      stockAvailabilityNotes: visit.stockAvailabilityNotes ?? "",
      salesMadeNotes: visit.salesMadeNotes ?? "",
      consumerEngagementNotes: visit.consumerEngagementNotes ?? ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Outlet Visits");
    const now = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `outlet-visit-reports-${now}.xlsx`);
    toast.success(`Exported ${String(rows.length)} rows to Excel.`);
  };

  const exportAllPagesExcel = async (): Promise<void> => {
    if (accessToken === null) {
      return;
    }
    setIsExportingAll(true);
    try {
      const pageSize = 200;
      let skip = 0;
      const allRows: Awaited<ReturnType<typeof listOutletVisitReports>> = [];
      for (;;) {
        const page = await listOutletVisitReports(accessToken, {
          limit: pageSize,
          skip,
          ...(outletId ? { outletId } : {}),
          ...(userId.trim() ? { userId: userId.trim() } : {}),
          ...(from ? { from: new Date(`${from}T00:00:00.000Z`).toISOString() } : {}),
          ...(to ? { to: new Date(`${to}T23:59:59.999Z`).toISOString() } : {})
        });
        allRows.push(...page);
        if (page.length < pageSize) {
          break;
        }
        skip += pageSize;
      }

      if (allRows.length === 0) {
        toast.info("No rows matched the selected filters.");
        return;
      }

      const rows = allRows.map((visit) => ({
        checkedInAt: visit.checkedInAt,
        outletName: visit.outlet?.name ?? visit.outletId,
        outletCategory: visit.outlet?.category ?? "",
        distributorName: visit.outlet?.distributorName ?? "",
        locationArea: visit.outlet?.locationArea ?? "",
        userName: visit.user?.fullName ?? visit.userId,
        userPhone: visit.user?.phone ?? "",
        userRole: visit.user?.role ?? "",
        latitude: visit.latitude,
        longitude: visit.longitude,
        hasOutletPhoto: visit.hasOutletPhoto ? "Yes" : "No",
        stockAvailabilityNotes: visit.stockAvailabilityNotes ?? "",
        salesMadeNotes: visit.salesMadeNotes ?? "",
        consumerEngagementNotes: visit.consumerEngagementNotes ?? ""
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Outlet Visits");
      const now = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `outlet-visit-reports-all-pages-${now}.xlsx`);
      toast.success(`Exported ${String(rows.length)} rows from all pages.`);
    } catch {
      toast.error("Failed to export all pages. Please try again.");
    } finally {
      setIsExportingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Outlet visit reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Filter outlet execution records by outlet, field user and date range.
        </p>
      </div>

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-foreground">Filters</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium text-muted-foreground">
            Outlet
            <Select
              value={outletId.length > 0 ? outletId : "all"}
              onValueChange={(value) => {
                setOutletId(value === "all" ? "" : value);
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All outlets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All outlets</SelectItem>
                {outletsQuery.data?.map((outlet) => (
                  <SelectItem key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Field user
            <Select
              value={userId.length > 0 ? userId : "all"}
              onValueChange={(value) => {
                setUserId(value === "all" ? "" : value);
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {uniqueUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.fullName} ({user.phone})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            From
            <DatePicker value={from} onChange={setFrom} placeholder="From date" />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            To
            <DatePicker value={to} onChange={setTo} placeholder="To date" />
          </label>
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">Results</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={visitsQuery.data === undefined || visitsQuery.data.length === 0}
              onClick={exportExcel}
            >
              Export current page
            </button>
            <button
              type="button"
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isExportingAll || accessToken === null}
              onClick={() => {
                void exportAllPagesExcel();
              }}
            >
              {isExportingAll ? "Exporting all..." : "Export all pages"}
            </button>
          </div>
        </div>
        {visitsQuery.isLoading ? (
          <BoneyardInlineFallback name="ops-outlet-visits-report" className="mt-3 min-h-[12rem]" />
        ) : null}
        {visitsQuery.isError ? (
          <p className="mt-3 text-sm text-destructive">Could not load outlet visit reports.</p>
        ) : null}
        {visitsQuery.data?.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No outlet visits match the selected filters.
          </p>
        ) : null}
        {visitsQuery.data !== undefined && visitsQuery.data.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {visitsQuery.data.map((visit) => (
              <li
                key={visit.id}
                className="rounded-lg border border-border bg-muted/20 p-4 dark:bg-muted/10"
              >
                <p className="font-medium text-foreground">
                  {visit.outlet?.name ?? visit.outletId} ·{" "}
                  {new Date(visit.checkedInAt).toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {visit.user?.fullName ?? visit.userId} · {visit.user?.phone ?? "No phone"} ·{" "}
                  {visit.outlet?.locationArea ?? "No area"} ·{" "}
                  {visit.hasOutletPhoto ? "Photo" : "No photo"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {visit.latitude.toFixed(5)}, {visit.longitude.toFixed(5)}
                </p>
                {visit.stockAvailabilityNotes ? (
                  <p className="mt-2 text-xs">
                    <span className="font-medium">Stock:</span> {visit.stockAvailabilityNotes}
                  </p>
                ) : null}
                {visit.salesMadeNotes ? (
                  <p className="mt-1 text-xs">
                    <span className="font-medium">Sales:</span> {visit.salesMadeNotes}
                  </p>
                ) : null}
                {visit.consumerEngagementNotes ? (
                  <p className="mt-1 text-xs">
                    <span className="font-medium">Engagement:</span> {visit.consumerEngagementNotes}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
