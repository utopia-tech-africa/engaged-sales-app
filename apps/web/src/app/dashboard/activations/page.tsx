"use client";

import Link from "next/link";
import { type ReactElement } from "react";

import {
  activationsListForField,
  getActivationsListForFieldQueryKey
} from "@/lib/api/generated/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import {
  parseFieldActivationListFromOrval,
  type FieldActivationListItem
} from "@/lib/field/field-activations-adapters";
import { calmMutedLinkClass } from "@/lib/calm-ui";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

export default function FieldActivationsPage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);

  const listQuery = useQuery({
    queryKey: getActivationsListForFieldQueryKey(),
    queryFn: () => activationsListForField(),
    enabled: accessToken !== null,
    select: (result) => parseFieldActivationListFromOrval(result)
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Activations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Campaigns you can work today. Open one to view products or record a sale.
        </p>
      </div>

      {listQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading activations…</p>
      ) : null}
      {listQuery.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load activations. Try again.
        </p>
      ) : null}

      {listQuery.isSuccess && listQuery.data.length === 0 ? (
        <section className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            No active activations assigned to you. Contact your supervisor if this looks wrong.
          </p>
        </section>
      ) : null}

      {listQuery.isSuccess && listQuery.data.length > 0 ? (
        <ul className="space-y-2">
          {listQuery.data.map((row: FieldActivationListItem) => (
            <li key={row.id}>
              <Link
                href={`/dashboard/activations/${row.id}`}
                className={cn(
                  "block rounded-xl border border-border bg-card/80 px-4 py-3 text-left shadow-sm transition-colors hover:border-primary/40 dark:bg-card/50"
                )}
              >
                <p className="font-medium text-foreground">{row.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {row.regionLinks.map((l) => l.region.name).join(" · ") || "No regions"} ·{" "}
                  {row._count?.products ?? 0} product
                  {(row._count?.products ?? 0) === 1 ? "" : "s"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-center text-sm">
        <Link href="/dashboard" className={calmMutedLinkClass}>
          Back to home
        </Link>
      </p>
    </div>
  );
}
