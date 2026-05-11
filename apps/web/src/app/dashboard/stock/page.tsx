"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { type ReactElement, type SyntheticEvent, useMemo, useState } from "react";
import * as XLSX from "xlsx";

import {
  activationsListProductsForField,
  getActivationsListProductsForFieldQueryKey,
  useActivationsListForField
} from "@/lib/api/generated/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { ApiError } from "@/lib/api/problem-details";
import { useAuthStore } from "@/lib/auth/auth-store";
import { calmPrimaryButtonClass } from "@/lib/calm-ui";
import {
  parseFieldActivationListFromOrval,
  parseFieldActivationProductsPageFromOrval
} from "@/lib/field/field-activations-adapters";
import {
  getStockDailySummary,
  recordStockPickup,
  recordStockSale,
  type StockDailySummary
} from "@/lib/stock/stock-api";
import { toast } from "@/lib/toast";

const inputClass =
  "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const todayDateInput = (): string => new Date().toISOString().slice(0, 10);

export default function FieldStockPage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [activationId, setActivationId] = useState("");
  const [distributorName, setDistributorName] = useState("");
  const [pickupQuantities, setPickupQuantities] = useState<Record<string, number>>({});
  const [pickupCosts, setPickupCosts] = useState<Record<string, number>>({});
  const [saleQuantities, setSaleQuantities] = useState<Record<string, number>>({});
  const [sellingPrices, setSellingPrices] = useState<Record<string, number>>({});
  const [reportDate, setReportDate] = useState(todayDateInput());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<StockDailySummary | null>(null);

  const activationsQuery = useActivationsListForField({
    query: {
      enabled: accessToken !== null,
      select: (result) => parseFieldActivationListFromOrval(result)
    }
  });

  const productsQuery = useQuery({
    queryKey: getActivationsListProductsForFieldQueryKey(activationId, { limit: 200, offset: 0 }),
    queryFn: () => activationsListProductsForField(activationId, { limit: 200, offset: 0 }),
    enabled: accessToken !== null && activationId.length > 0,
    select: (result) => parseFieldActivationProductsPageFromOrval(result)
  });

  const pickupMutation = useMutation({
    mutationFn: async () => {
      const items = Object.entries(pickupQuantities)
        .filter(([, quantity]) => quantity > 0)
        .map(([productId, quantity]) => ({
          productId,
          quantity,
          costPrice: pickupCosts[productId] ?? 0
        }));
      if (items.length === 0) {
        throw new Error("Enter at least one pickup quantity.");
      }
      return recordStockPickup(accessToken ?? "", {
        activationId,
        distributorName: distributorName.trim(),
        items
      });
    },
    onSuccess: () => {
      setPickupQuantities({});
      setPickupCosts({});
    }
  });

  const saleMutation = useMutation({
    mutationFn: async () => {
      const items = Object.entries(saleQuantities)
        .filter(([, quantity]) => quantity > 0)
        .map(([productId, quantity]) => ({
          productId,
          quantity,
          sellingPrice: sellingPrices[productId] ?? 0
        }));
      if (items.length === 0) {
        throw new Error("Enter at least one sold quantity.");
      }
      return recordStockSale(accessToken ?? "", {
        activationId,
        items
      });
    },
    onSuccess: () => {
      setSaleQuantities({});
      setSellingPrices({});
    }
  });

  const loadSummaryMutation = useMutation({
    mutationFn: async () =>
      getStockDailySummary(accessToken ?? "", { activationId, date: reportDate }),
    onSuccess: (result) => {
      setSummary(result);
    }
  });

  const products = productsQuery.data?.data ?? [];

  const inventoryTotals = useMemo(() => {
    if (summary === null) {
      return null;
    }
    return summary.rows.reduce(
      (acc, row) => ({
        openingStock: acc.openingStock + row.openingStock,
        stockReceived: acc.stockReceived + row.stockReceived,
        stockSold: acc.stockSold + row.stockSold,
        closingBalance: acc.closingBalance + row.closingBalance,
        dailySalesValue: Number((acc.dailySalesValue + row.dailySalesValue).toFixed(2))
      }),
      { openingStock: 0, stockReceived: 0, stockSold: 0, closingBalance: 0, dailySalesValue: 0 }
    );
  }, [summary]);

  const exportDailySummaryExcel = (): void => {
    if (summary === null) {
      return;
    }
    const workbook = XLSX.utils.book_new();
    const summaryRows = [
      {
        date: summary.date,
        activationId: summary.activationId,
        openingStock: inventoryTotals?.openingStock ?? 0,
        stockReceived: inventoryTotals?.stockReceived ?? 0,
        stockSold: inventoryTotals?.stockSold ?? 0,
        closingBalance: inventoryTotals?.closingBalance ?? 0,
        dailySalesValue: inventoryTotals?.dailySalesValue ?? 0
      }
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "Summary");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary.rows), "SKU Daily");
    XLSX.writeFile(workbook, `stock-daily-summary-${summary.date}.xlsx`);
    toast.success("Stock daily summary exported to Excel.");
  };

  const handlePickupSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setErrorMessage(null);
    if (!activationId || distributorName.trim().length === 0) {
      setErrorMessage("Select activation and enter distributor name.");
      return;
    }
    pickupMutation.mutate(undefined, {
      onError: (error: unknown) => {
        if (error instanceof ApiError) {
          setErrorMessage(error.problem?.detail ?? error.message);
          return;
        }
        if (error instanceof Error) {
          setErrorMessage(error.message);
          return;
        }
        setErrorMessage("Could not save stock pickup.");
      }
    });
  };

  const handleSaleSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setErrorMessage(null);
    if (!activationId) {
      setErrorMessage("Select activation first.");
      return;
    }
    saleMutation.mutate(undefined, {
      onError: (error: unknown) => {
        if (error instanceof ApiError) {
          setErrorMessage(error.problem?.detail ?? error.message);
          return;
        }
        if (error instanceof Error) {
          setErrorMessage(error.message);
          return;
        }
        setErrorMessage("Could not save stock sale.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Sales & stock tracking
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track stock pickup, sales, remaining balance and daily inventory performance.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
        <label className="text-xs font-medium text-muted-foreground">
          Activation
          <Select value={activationId} onValueChange={setActivationId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select activation" />
            </SelectTrigger>
            <SelectContent>
              {(activationsQuery.data ?? []).map((activation: { id: string; name: string }) => (
                <SelectItem key={activation.id} value={activation.id}>
                  {activation.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </section>

      <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
        <h2 className="text-base font-semibold text-foreground">Stock pick-up tracking</h2>
        <form className="mt-3 space-y-3" onSubmit={handlePickupSubmit}>
          <label className="text-xs font-medium text-muted-foreground">
            Distributor name
            <input
              className={inputClass}
              value={distributorName}
              onChange={(event) => { setDistributorName(event.target.value); }}
              placeholder="ABC Distributors"
            />
          </label>
          {products.map((product) => (
            <div
              key={product.id}
              className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-3"
            >
              <p className="text-sm font-medium text-foreground">
                {product.name} {product.sku ? `(${product.sku})` : ""}
              </p>
              <label className="text-xs text-muted-foreground">
                Quantity picked
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  value={pickupQuantities[product.id] ?? 0}
                  onChange={(event) =>
                    { setPickupQuantities((prev) => ({
                      ...prev,
                      [product.id]: Number(event.target.value)
                    })); }
                  }
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Cost price
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  step="0.01"
                  value={pickupCosts[product.id] ?? 0}
                  onChange={(event) =>
                    { setPickupCosts((prev) => ({
                      ...prev,
                      [product.id]: Number(event.target.value)
                    })); }
                  }
                />
              </label>
            </div>
          ))}
          <button
            type="submit"
            className={calmPrimaryButtonClass}
            disabled={pickupMutation.isPending}
          >
            {pickupMutation.isPending ? "Saving..." : "Save stock pickup"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
        <h2 className="text-base font-semibold text-foreground">Sales tracking</h2>
        <form className="mt-3 space-y-3" onSubmit={handleSaleSubmit}>
          {products.map((product) => (
            <div
              key={product.id}
              className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-3"
            >
              <p className="text-sm font-medium text-foreground">
                {product.name} {product.sku ? `(${product.sku})` : ""}
              </p>
              <label className="text-xs text-muted-foreground">
                Quantity sold
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  value={saleQuantities[product.id] ?? 0}
                  onChange={(event) =>
                    { setSaleQuantities((prev) => ({
                      ...prev,
                      [product.id]: Number(event.target.value)
                    })); }
                  }
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Selling price
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  step="0.01"
                  value={sellingPrices[product.id] ?? 0}
                  onChange={(event) =>
                    { setSellingPrices((prev) => ({
                      ...prev,
                      [product.id]: Number(event.target.value)
                    })); }
                  }
                />
              </label>
            </div>
          ))}
          <button
            type="submit"
            className={calmPrimaryButtonClass}
            disabled={saleMutation.isPending}
          >
            {saleMutation.isPending ? "Saving..." : "Save sales"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
        <h2 className="text-base font-semibold text-foreground">Inventory balance</h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="text-xs font-medium text-muted-foreground">
            Date
            <DatePicker
              value={reportDate}
              onChange={setReportDate}
              placeholder="Select report date"
            />
          </label>
          <button
            type="button"
            className={calmPrimaryButtonClass}
            disabled={activationId.length === 0 || loadSummaryMutation.isPending}
            onClick={() => { loadSummaryMutation.mutate(); }}
          >
            {loadSummaryMutation.isPending ? "Loading..." : "Load summary"}
          </button>
        </div>

        {summary !== null ? (
          <div className="mt-4 space-y-3">
            <button
              type="button"
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted/50"
              onClick={exportDailySummaryExcel}
            >
              Export daily summary (Excel)
            </button>
            {inventoryTotals !== null ? (
              <div className="rounded-lg border border-border p-3 text-sm">
                <p>Opening stock: {inventoryTotals.openingStock}</p>
                <p>Stock received: {inventoryTotals.stockReceived}</p>
                <p>Stock sold: {inventoryTotals.stockSold}</p>
                <p>Closing balance: {inventoryTotals.closingBalance}</p>
                <p>Daily sales value: {inventoryTotals.dailySalesValue.toFixed(2)}</p>
              </div>
            ) : null}
            <ul className="space-y-2">
              {summary.rows.map((row) => (
                <li key={row.productId} className="rounded-lg border border-border p-3 text-xs">
                  <p className="font-medium text-foreground">
                    {row.productName} {row.sku ? `(${row.sku})` : ""}
                  </p>
                  <p className="text-muted-foreground">
                    Opening {row.openingStock} · Received {row.stockReceived} · Sold {row.stockSold}{" "}
                    · Closing {row.closingBalance}
                  </p>
                  <p className="text-muted-foreground">
                    Sales value {row.dailySalesValue.toFixed(2)} · Case achievement{" "}
                    {row.dailyCaseAchievement !== null
                      ? `${row.dailyCaseAchievement.toFixed(2)}%`
                      : "N/A"}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {errorMessage !== null ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {productsQuery.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load activation SKUs.
        </p>
      ) : null}
    </div>
  );
}
