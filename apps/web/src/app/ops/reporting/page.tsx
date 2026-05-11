"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { type ReactElement, useState } from "react";

import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  useActivationListActivations,
  useAdminRegionListRegions
} from "@/lib/api/generated/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { calmPrimaryButtonClass } from "@/lib/calm-ui";
import { parseActivationsFromOrval, parseRegionsFromOrval } from "@/lib/ops/ops-adapters";
import {
  exportReportingDashboardExcel,
  exportReportingDashboardPdf,
  getReportingDashboard
} from "@/lib/reports/reports-api";
import { toast } from "@/lib/toast";

const SELECT_ALL = "__all__";
const todayDateInput = (): string => new Date().toISOString().slice(0, 10);

export default function OpsReportingPage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [activationId, setActivationId] = useState("");
  const [regionId, setRegionId] = useState("");
  const [from, setFrom] = useState(todayDateInput());
  const [to, setTo] = useState(todayDateInput());

  const activationsQuery = useActivationListActivations({
    query: {
      enabled: accessToken !== null,
      select: (result) => parseActivationsFromOrval(result)
    }
  });
  const regionsQuery = useAdminRegionListRegions({
    query: {
      enabled: accessToken !== null,
      select: (result) => parseRegionsFromOrval(result)
    }
  });

  const dashboardMutation = useMutation({
    mutationFn: async () =>
      getReportingDashboard(accessToken ?? "", {
        from,
        to,
        ...(activationId.length > 0 ? { activationId } : {}),
        ...(regionId.length > 0 ? { regionId } : {})
      })
  });

  const runDashboard = (): void => {
    dashboardMutation.mutate();
  };

  const exportExcel = async (): Promise<void> => {
    try {
      await exportReportingDashboardExcel(accessToken ?? "", {
        from,
        to,
        ...(activationId.length > 0 ? { activationId } : {}),
        ...(regionId.length > 0 ? { regionId } : {})
      });
      toast.success("Reporting dashboard exported to Excel.");
    } catch {
      toast.error("Could not export Excel report.");
    }
  };

  const exportPdf = async (): Promise<void> => {
    try {
      await exportReportingDashboardPdf(accessToken ?? "", {
        from,
        to,
        ...(activationId.length > 0 ? { activationId } : {}),
        ...(regionId.length > 0 ? { regionId } : {})
      });
      toast.success("Reporting dashboard exported to PDF.");
    } catch {
      toast.error("Could not export PDF report.");
    }
  };

  const data = dashboardMutation.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Reporting dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time management dashboard for sales performance, coverage, attendance, productivity,
          and staff activity.
        </p>
        <p className="mt-1 text-sm">
          <Link
            href="/ops/reporting/settings"
            className="text-primary underline-offset-4 hover:underline"
          >
            Configure daily/weekly email reports
          </Link>
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card/80 p-5 shadow-sm dark:bg-card/50">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs font-medium text-muted-foreground">
            From
            <DatePicker value={from} onChange={setFrom} placeholder="From date" />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            To
            <DatePicker value={to} onChange={setTo} placeholder="To date" />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Activation
            <Select
              value={activationId.length > 0 ? activationId : SELECT_ALL}
              onValueChange={(value) => {
                setActivationId(value === SELECT_ALL ? "" : value);
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All activations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_ALL}>All activations</SelectItem>
                {(activationsQuery.data ?? []).map((activation) => (
                  <SelectItem key={activation.id} value={activation.id}>
                    {activation.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Region (city)
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
                {(regionsQuery.data ?? []).map((region) => (
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
              className={calmPrimaryButtonClass}
              onClick={runDashboard}
              disabled={dashboardMutation.isPending}
            >
              {dashboardMutation.isPending ? "Loading..." : "Load report"}
            </button>
            <button
              type="button"
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
              disabled={data === undefined}
              onClick={() => {
                void exportExcel();
              }}
            >
              Excel
            </button>
            <button
              type="button"
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
              disabled={data === undefined}
              onClick={() => {
                void exportPdf();
              }}
            >
              PDF
            </button>
          </div>
        </div>
      </section>

      {dashboardMutation.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load reporting data for current filters.
        </p>
      ) : null}

      {data !== undefined ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard label="Total cases sold" value={String(data.kpis.totalCasesSold)} />
            <KpiCard label="Sales value" value={String(data.kpis.totalSalesValue)} />
            <KpiCard
              label="Team achievement %"
              value={`${String(data.kpis.teamAchievementPercent)}%`}
            />
            <KpiCard
              label="Outlet coverage %"
              value={`${String(data.kpis.outletCoveragePercent)}%`}
            />
            <KpiCard
              label="Route coverage %"
              value={`${String(data.kpis.routeCoveragePercent)}%`}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <SimpleTableCard
              title="Sales by city"
              columns={["City", "Cases", "Sales value"]}
              rows={data.salesByCity.map((row) => [
                row.city,
                String(row.casesSold),
                String(row.salesValue)
              ])}
            />
            <SimpleTableCard
              title="Sales by SKU"
              columns={["SKU", "Product", "Cases", "Sales value"]}
              rows={data.salesBySku.map((row) => [
                row.sku ?? "—",
                row.productName,
                String(row.casesSold),
                String(row.salesValue)
              ])}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <SimpleTableCard
              title="Sales by promoter"
              columns={["Promoter", "Role", "Cases", "Sales value"]}
              rows={data.salesByPromoter.map((row) => [
                row.fullName,
                row.role,
                String(row.casesSold),
                String(row.salesValue)
              ])}
            />
            <SimpleTableCard
              title="Productivity report"
              columns={["Promoter", "Target cases", "Sold", "Achievement %"]}
              rows={data.productivityReport.rows.map((row) => [
                row.fullName,
                String(row.targetCases),
                String(row.casesSold),
                String(row.achievementPercent)
              ])}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
              <h2 className="text-sm font-semibold text-foreground">Outlet coverage</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Visited {data.outletCoverage.visitedOutlets} of {data.outletCoverage.totalOutlets}{" "}
                outlets ({data.outletCoverage.coveragePercent}%).
              </p>
            </section>
            <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
              <h2 className="text-sm font-semibold text-foreground">Route coverage</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {data.routeCoverage.activeRouteUsers} active route users /{" "}
                {data.routeCoverage.totalActiveFieldStaff} active field staff (
                {data.routeCoverage.routeCoveragePercent}%).
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Geofences covered: {data.routeCoverage.coveredGeofences} /{" "}
                {data.routeCoverage.totalActiveGeofences}
              </p>
            </section>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
              <h2 className="text-sm font-semibold text-foreground">Attendance report</h2>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>Present: {data.attendanceReport.summary.present}</li>
                <li>Missed: {data.attendanceReport.summary.missed}</li>
                <li>Late: {data.attendanceReport.summary.late}</li>
                <li>Missing clock-out: {data.attendanceReport.summary.missingClockOut}</li>
              </ul>
            </section>
            <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
              <h2 className="text-sm font-semibold text-foreground">Active vs inactive staff</h2>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>Active field staff: {data.activeVsInactiveStaff.activeFieldStaff}</li>
                <li>Inactive field staff: {data.activeVsInactiveStaff.inactiveFieldStaff}</li>
                <li>Active supervisors: {data.activeVsInactiveStaff.activeSupervisors}</li>
                <li>Inactive supervisors: {data.activeVsInactiveStaff.inactiveSupervisors}</li>
              </ul>
            </section>
          </section>
        </>
      ) : null}
    </div>
  );
}

const KpiCard = ({ label, value }: { label: string; value: string }): ReactElement => (
  <div className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
  </div>
);

const SimpleTableCard = ({
  title,
  columns,
  rows
}: {
  title: string;
  columns: string[];
  rows: string[][];
}): ReactElement => (
  <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
    <h2 className="text-sm font-semibold text-foreground">{title}</h2>
    <div className="mt-3 overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {columns.map((column) => (
              <th key={column} className="px-3 py-2 font-medium text-muted-foreground">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${title}-${String(index)}`}
              className="border-b border-border/70 last:border-0"
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={`${title}-${String(index)}-${String(cellIndex)}`}
                  className="px-3 py-2 text-foreground"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);
