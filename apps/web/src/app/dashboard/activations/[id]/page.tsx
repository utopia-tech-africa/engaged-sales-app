"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type ReactElement, useState } from "react";

import { BoneyardInlineFallback } from "@/components/boneyard/boneyard-inline-fallback";
import {
  activationsGetByIdForField,
  getActivationsGetByIdForFieldQueryKey
} from "@/lib/api/generated/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import {
  downloadClientActivationWorkbook,
  fetchClientTeamSales,
  type ClientTeamSaleRow
} from "@/lib/field/client-activation-api";
import { parseFieldActivationDetailFromOrval } from "@/lib/field/field-activations-adapters";
import { calmPrimaryButtonClass, calmMutedLinkClass } from "@/lib/calm-ui";
import { formatFieldCheckInDateTime } from "@/lib/format-field-check-in-datetime";
import { toast } from "@/lib/toast";
import { useQuery } from "@tanstack/react-query";

const teamSalesKey = (activationId: string) => ["client", "team-sales", activationId] as const;

export default function FieldActivationDetailPage(): ReactElement {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const accessToken = useAuthStore((state) => state.accessToken);
  const userRole = useAuthStore((state) => state.user?.role);
  const isClient = userRole === "client";
  const [exportPending, setExportPending] = useState(false);

  const detailQuery = useQuery({
    queryKey: getActivationsGetByIdForFieldQueryKey(id),
    queryFn: () => activationsGetByIdForField(id),
    enabled: accessToken !== null && id.length > 0,
    select: (result) => parseFieldActivationDetailFromOrval(result)
  });

  const teamSalesQuery = useQuery({
    queryKey: teamSalesKey(id),
    queryFn: async () => fetchClientTeamSales(accessToken ?? "", id, 100),
    enabled: isClient && accessToken !== null && id.length > 0 && detailQuery.isSuccess
  });

  if (id.length === 0) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Invalid activation.
      </p>
    );
  }

  const onDownloadReport = (): void => {
    if (accessToken === null) {
      return;
    }
    setExportPending(true);
    void downloadClientActivationWorkbook(accessToken, id)
      .then(() => {
        toast.success("Report downloaded.");
      })
      .catch(() => {
        toast.error("Could not download report.");
      })
      .finally(() => {
        setExportPending(false);
      });
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/activations" className={`${calmMutedLinkClass} mb-2 inline-block`}>
          ← All activations
        </Link>
        {detailQuery.isLoading ? (
          <BoneyardInlineFallback
            name="field-activation-detail"
            className="mt-1 min-h-[4rem] max-w-md"
          />
        ) : null}
        {detailQuery.isError ? (
          <p className="text-sm text-destructive" role="alert">
            Could not load this activation.
          </p>
        ) : null}
        {detailQuery.data ? (
          <>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {detailQuery.data.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {detailQuery.data.regionLinks.map((l) => l.region.name).join(" · ") || "No regions"} ·{" "}
              {detailQuery.data.products?.length ?? detailQuery.data._count?.products ?? 0} products
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Runs {formatFieldCheckInDateTime(detailQuery.data.startsAt)}
              {detailQuery.data.endsAt
                ? ` – ${formatFieldCheckInDateTime(detailQuery.data.endsAt)}`
                : ""}
            </p>
            {isClient ? (
              <p className="mt-2 text-xs text-muted-foreground">
                You have read-only access. Download an Excel summary or review team sales below.
              </p>
            ) : null}
          </>
        ) : null}
      </div>

      {detailQuery.data ? (
        <div className="space-y-3">
          {isClient ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={calmPrimaryButtonClass}
                disabled={exportPending}
                onClick={onDownloadReport}
              >
                {exportPending ? "Preparing…" : "Download Excel report"}
              </button>
            </div>
          ) : (
            <Link href={`/dashboard/activations/${id}/sell`} className={calmPrimaryButtonClass}>
              Record a sale
            </Link>
          )}
          {detailQuery.data.products !== undefined && detailQuery.data.products.length > 0 ? (
            <section>
              <h2 className="text-sm font-semibold text-foreground">Products</h2>
              <ul className="mt-2 space-y-1.5">
                {detailQuery.data.products.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm dark:bg-muted/10"
                  >
                    <span className="font-medium text-foreground">{p.name}</span>
                    {p.sku ? (
                      <span className="ml-2 text-xs text-muted-foreground">SKU {p.sku}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {isClient ? (
            <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
              <h2 className="text-sm font-semibold text-foreground">Team sales (read-only)</h2>
              {teamSalesQuery.isLoading ? (
                <BoneyardInlineFallback
                  name="field-team-sales"
                  variant="lines4"
                  className="mt-2 min-h-[8rem]"
                />
              ) : null}
              {teamSalesQuery.isError ? (
                <p className="mt-2 text-sm text-destructive">Could not load sales.</p>
              ) : null}
              {teamSalesQuery.data?.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No sales recorded yet for this window.
                </p>
              ) : null}
              {teamSalesQuery.data !== undefined && teamSalesQuery.data.length > 0 ? (
                <ul className="mt-3 space-y-3">
                  {teamSalesQuery.data.map((sale: ClientTeamSaleRow) => (
                    <li
                      key={sale.id}
                      className="rounded-lg border border-border bg-muted/20 p-3 text-xs dark:bg-muted/10"
                    >
                      <p className="font-medium text-foreground">
                        {sale.user.fullName}{" "}
                        <span className="text-muted-foreground">· {sale.user.phone}</span>
                      </p>
                      <p className="text-muted-foreground">
                        {formatFieldCheckInDateTime(sale.createdAt)}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {sale.items.map((row) => (
                          <li key={`${sale.id}-${row.product.id}`} className="text-foreground/90">
                            {row.product.name}
                            {row.product.sku ? ` (${row.product.sku})` : ""}:{" "}
                            <span className="font-medium">{row.quantity}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
