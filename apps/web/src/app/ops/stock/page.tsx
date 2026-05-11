"use client";

import { useMutation } from "@tanstack/react-query";
import { type ReactElement, useState } from "react";
import * as XLSX from "xlsx";

import { useActivationListActivations } from "@/lib/api/generated/client";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useAuthStore } from "@/lib/auth/auth-store";
import { calmPrimaryButtonClass } from "@/lib/calm-ui";
import { parseActivationsFromOrval } from "@/lib/ops/ops-adapters";
import { getStockAdminOverview } from "@/lib/stock/stock-api";
import { toast } from "@/lib/toast";

const todayDateInput = (): string => new Date().toISOString().slice(0, 10);

export default function OpsStockOverviewPage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [activationId, setActivationId] = useState("");
  const [date, setDate] = useState(todayDateInput());

  const activationsQuery = useActivationListActivations({
    query: {
      enabled: accessToken !== null,
      select: (result) => parseActivationsFromOrval(result)
    }
  });

  const overviewMutation = useMutation({
    mutationFn: async () => getStockAdminOverview(accessToken ?? "", { activationId, date })
  });

  const exportExcel = (): void => {
    const data = overviewMutation.data;
    if (data === undefined) {
      return;
    }
    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.json_to_sheet([
      {
        date: data.date,
        activationName: data.activationName,
        openingStock: data.summary.openingStock,
        stockReceived: data.summary.stockReceived,
        stockSold: data.summary.stockSold,
        closingBalance: data.summary.closingBalance,
        dailySalesValue: data.summary.dailySalesValue
      }
    ]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    const skuSheet = XLSX.utils.json_to_sheet(data.bySku);
    XLSX.utils.book_append_sheet(workbook, skuSheet, "SKU Rollup");

    const userSheet = XLSX.utils.json_to_sheet(data.byUser);
    XLSX.utils.book_append_sheet(workbook, userSheet, "User Rollup");

    const distributorSheet = XLSX.utils.json_to_sheet(data.distributorAnalytics);
    XLSX.utils.book_append_sheet(workbook, distributorSheet, "Distributors");

    XLSX.writeFile(workbook, `ops-stock-overview-${data.date}.xlsx`);
    toast.success("Ops stock overview exported to Excel.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Stock overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cross-user inventory and sales rollup with per-distributor pickup analytics.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card/80 p-5 shadow-sm dark:bg-card/50">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-xs font-medium text-muted-foreground">
            Activation
            <Select value={activationId} onValueChange={setActivationId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select activation" />
              </SelectTrigger>
              <SelectContent>
                {(activationsQuery.data ?? []).map((activation) => (
                  <SelectItem key={activation.id} value={activation.id}>
                    {activation.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Date
            <DatePicker value={date} onChange={setDate} placeholder="Select date" />
          </label>
          <div className="flex items-end gap-2">
            <button
              type="button"
              className={calmPrimaryButtonClass}
              disabled={activationId.length === 0 || overviewMutation.isPending}
              onClick={() => {
                overviewMutation.mutate();
              }}
            >
              {overviewMutation.isPending ? "Loading..." : "Load overview"}
            </button>
            <button
              type="button"
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
              disabled={overviewMutation.data === undefined}
              onClick={exportExcel}
            >
              Export Excel
            </button>
          </div>
        </div>
      </section>

      {overviewMutation.isError ? (
        <p className="text-sm text-destructive">
          Could not load stock overview for the selected filters.
        </p>
      ) : null}

      {overviewMutation.data !== undefined ? (
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
            <h2 className="text-base font-semibold">Summary</h2>
            <p className="mt-2 text-sm">
              Opening stock: {overviewMutation.data.summary.openingStock}
            </p>
            <p className="text-sm">Stock received: {overviewMutation.data.summary.stockReceived}</p>
            <p className="text-sm">Stock sold: {overviewMutation.data.summary.stockSold}</p>
            <p className="text-sm">
              Closing balance: {overviewMutation.data.summary.closingBalance}
            </p>
            <p className="text-sm">
              Daily sales value: {overviewMutation.data.summary.dailySalesValue.toFixed(2)}
            </p>
          </section>

          <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
            <h2 className="text-base font-semibold">Per-distributor pickup analytics</h2>
            <ul className="mt-3 space-y-2">
              {overviewMutation.data.distributorAnalytics.map((row) => (
                <li
                  key={row.distributorName}
                  className="rounded-lg border border-border p-3 text-sm"
                >
                  <p className="font-medium">{row.distributorName}</p>
                  <p className="text-muted-foreground">
                    Qty picked: {row.totalQuantityPicked} · Pickup value:{" "}
                    {row.totalPickupCostValue.toFixed(2)} · Distinct SKUs: {row.distinctSkus}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}
