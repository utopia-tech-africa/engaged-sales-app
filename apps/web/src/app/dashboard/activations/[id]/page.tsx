"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type ReactElement } from "react";

import {
  activationsGetByIdForField,
  getActivationsGetByIdForFieldQueryKey
} from "@/lib/api/generated/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { parseFieldActivationDetailFromOrval } from "@/lib/field/field-activations-adapters";
import { calmPrimaryButtonClass, calmMutedLinkClass } from "@/lib/calm-ui";
import { formatFieldCheckInDateTime } from "@/lib/format-field-check-in-datetime";
import { useQuery } from "@tanstack/react-query";

export default function FieldActivationDetailPage(): ReactElement {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const accessToken = useAuthStore((state) => state.accessToken);

  const detailQuery = useQuery({
    queryKey: getActivationsGetByIdForFieldQueryKey(id),
    queryFn: () => activationsGetByIdForField(id),
    enabled: accessToken !== null && id.length > 0,
    select: (result) => parseFieldActivationDetailFromOrval(result)
  });

  if (id.length === 0) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Invalid activation.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/activations" className={`${calmMutedLinkClass} mb-2 inline-block`}>
          ← All activations
        </Link>
        {detailQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
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
              {detailQuery.data.region?.name ?? "No region"} ·{" "}
              {detailQuery.data.products?.length ?? detailQuery.data._count?.products ?? 0} products
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Runs {formatFieldCheckInDateTime(detailQuery.data.startsAt)}
              {detailQuery.data.endsAt
                ? ` – ${formatFieldCheckInDateTime(detailQuery.data.endsAt)}`
                : ""}
            </p>
          </>
        ) : null}
      </div>

      {detailQuery.data ? (
        <div className="space-y-3">
          <Link href={`/dashboard/activations/${id}/sell`} className={calmPrimaryButtonClass}>
            Record a sale
          </Link>
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
        </div>
      ) : null}
    </div>
  );
}
