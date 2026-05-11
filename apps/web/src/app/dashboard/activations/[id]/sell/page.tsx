"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type ReactElement, useMemo, useState } from "react";

import {
  activationsListProductsForField,
  getActivationsListProductsForFieldQueryKey,
  useSalesCreate
} from "@/lib/api/generated/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import {
  parseFieldActivationProductsPageFromOrval,
  parseSaleRecordFromOrval,
  type FieldActivationProduct
} from "@/lib/field/field-activations-adapters";
import {
  calmPrimaryButtonClass,
  calmSecondaryButtonClass,
  calmMutedLinkClass
} from "@/lib/calm-ui";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function FieldRecordSalePage(): ReactElement {
  const params = useParams();
  const router = useRouter();
  const activationId = typeof params.id === "string" ? params.id : "";
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: getActivationsListProductsForFieldQueryKey(activationId, { limit: 100, offset: 0 }),
    queryFn: () => activationsListProductsForField(activationId, { limit: 100, offset: 0 }),
    enabled: accessToken !== null && activationId.length > 0,
    select: (result) => parseFieldActivationProductsPageFromOrval(result)
  });

  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const products = productsQuery.data?.data ?? [];

  const setQty = (productId: string, value: number): void => {
    setQuantities((prev) => ({ ...prev, [productId]: Math.max(0, value) }));
  };

  const lineItems = useMemo(() => {
    return Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));
  }, [quantities]);

  const saleMutation = useSalesCreate({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "/me/sales"
        });
      }
    }
  });

  const handleSubmit = (): void => {
    if (lineItems.length === 0) {
      return;
    }
    saleMutation.mutate({
      data: { activationId, items: lineItems }
    });
  };

  if (activationId.length === 0) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Invalid activation.
      </p>
    );
  }

  if (saleMutation.isSuccess) {
    const sale = parseSaleRecordFromOrval(saleMutation.data);
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-foreground">Sale recorded</h1>
        <p className="text-sm text-muted-foreground">
          {sale.activation.name} · {sale.items.length} line
          {sale.items.length === 1 ? "" : "s"}
        </p>
        <ul className="space-y-1 text-sm">
          {sale.items.map((row) => (
            <li key={row.id} className="text-foreground">
              {row.product.name} × {row.quantity}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className={calmSecondaryButtonClass}
            onClick={() => {
              saleMutation.reset();
              setQuantities({});
            }}
          >
            Record another
          </button>
          <Link href={`/dashboard/activations/${activationId}`} className={calmPrimaryButtonClass}>
            Activation details
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/activations/${activationId}`}
          className={`${calmMutedLinkClass} mb-2 inline-block`}
        >
          ← Back
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Record a sale</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set quantity for each product, then submit. At least one line must be greater than zero.
        </p>
      </div>

      {productsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading products…</p>
      ) : null}
      {productsQuery.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load products.
        </p>
      ) : null}

      {productsQuery.isSuccess && products.length === 0 ? (
        <p className="text-sm text-muted-foreground">No products on this activation yet.</p>
      ) : null}

      {products.length > 0 ? (
        <ul className="space-y-3">
          {products.map((p: FieldActivationProduct) => {
            const q = quantities[p.id] ?? 0;
            return (
              <li
                key={p.id}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between dark:bg-card/50"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{p.name}</p>
                  {p.sku ? <p className="text-xs text-muted-foreground">SKU {p.sku}</p> : null}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    aria-label={`Decrease ${p.name}`}
                    className={cn(
                      calmSecondaryButtonClass,
                      "h-10 w-10 min-w-10 shrink-0 rounded-lg px-0 py-0 text-lg leading-none"
                    )}
                    onClick={() => {
                      setQty(p.id, q - 1);
                    }}
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-semibold tabular-nums">{q}</span>
                  <button
                    type="button"
                    aria-label={`Increase ${p.name}`}
                    className={cn(
                      calmSecondaryButtonClass,
                      "h-10 w-10 min-w-10 shrink-0 rounded-lg px-0 py-0 text-lg leading-none"
                    )}
                    onClick={() => {
                      setQty(p.id, q + 1);
                    }}
                  >
                    +
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {saleMutation.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Could not save sale. Check quantities and try again.
        </p>
      ) : null}

      {products.length > 0 ? (
        <button
          type="button"
          className={calmPrimaryButtonClass}
          disabled={lineItems.length === 0 || saleMutation.isPending}
          onClick={handleSubmit}
        >
          {saleMutation.isPending ? "Submitting…" : "Submit sale"}
        </button>
      ) : null}

      <p className="text-center text-sm">
        <button
          type="button"
          className={calmMutedLinkClass}
          onClick={() => {
            router.push("/dashboard/activations");
          }}
        >
          All activations
        </button>
      </p>
    </div>
  );
}
