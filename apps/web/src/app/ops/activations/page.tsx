"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactElement, type SyntheticEvent, useEffect, useState } from "react";

import { DatetimePicker } from "@/components/ui/datetime-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  getActivationListActivationsQueryKey,
  useActivationCreateActivation,
  useActivationListActivations,
  useAdminRegionListRegions
} from "@/lib/api/generated/client";
import { ApiError } from "@/lib/api/problem-details";
import { useAuthStore } from "@/lib/auth/auth-store";
import {
  calmMutedLinkClass,
  calmPrimaryButtonClass,
  calmSecondaryButtonClass
} from "@/lib/calm-ui";
import { cn } from "@/lib/utils";
import {
  type ActivationListRow,
  parseActivationDetailFromOrval,
  parseActivationsFromOrval,
  parseRegionsFromOrval
} from "@/lib/ops/ops-adapters";

import { formatShort, inputClass, labelClass, panelClass, REGION_NONE } from "./activations-shared";

export default function OpsActivationsPage(): ReactElement {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const role = useAuthStore((state) => state.user?.role);
  const canManageActivations = role === "admin" || role === "supervisor";

  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const [createName, setCreateName] = useState("");
  const [createStarts, setCreateStarts] = useState("");
  const [createEnds, setCreateEnds] = useState("");
  const [createRegionId, setCreateRegionId] = useState("");
  const [createActive, setCreateActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!canManageActivations) {
      router.replace("/ops");
    }
  }, [canManageActivations, router]);

  const listQuery = useActivationListActivations({
    query: {
      enabled: accessToken !== null && canManageActivations,
      select: (r) => parseActivationsFromOrval(r)
    }
  });

  const regionsQuery = useAdminRegionListRegions({
    query: {
      enabled: accessToken !== null && canManageActivations,
      select: (r) => parseRegionsFromOrval(r)
    }
  });

  const invalidateList = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: getActivationListActivationsQueryKey() });
  };

  const createMutation = useActivationCreateActivation({
    mutation: {
      onSuccess: async (raw) => {
        await invalidateList();
        setCreateName("");
        setCreateStarts("");
        setCreateEnds("");
        setCreateRegionId("");
        setCreateActive(true);
        setCreateOpen(false);
        try {
          const created = parseActivationDetailFromOrval(raw);
          router.push(`/ops/activations/${created.id}`);
        } catch {
          /* stay on list if response shape unexpected */
        }
      }
    }
  });

  const onCreate = (e: SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setFormError(null);
    const name = createName.trim();
    if (!name) {
      setFormError("Name is required.");
      return;
    }
    if (!createStarts) {
      setFormError("Start date & time is required.");
      return;
    }
    const startsAt = new Date(createStarts);
    if (Number.isNaN(startsAt.getTime())) {
      setFormError("Invalid start date.");
      return;
    }
    const endsAt = createEnds.trim().length > 0 ? new Date(createEnds) : undefined;
    if (createEnds.trim().length > 0 && Number.isNaN(endsAt?.getTime() ?? NaN)) {
      setFormError("Invalid end date.");
      return;
    }

    createMutation.mutate(
      {
        data: {
          name,
          startsAt: startsAt.toISOString(),
          ...(endsAt !== undefined ? { endsAt: endsAt.toISOString() } : {}),
          ...(createRegionId.trim().length > 0 ? { regionId: createRegionId.trim() } : {}),
          isActive: createActive
        }
      },
      {
        onError: (err: unknown) => {
          setFormError(
            err instanceof ApiError ? (err.problem?.detail ?? err.message) : "Create failed."
          );
        }
      }
    );
  };

  if (!canManageActivations) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 pb-16">
      <header className="flex flex-col gap-4 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Activations</h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Campaigns, product lines, and field-team rosters. Open one to manage details, products,
            roster, and field activity.
          </p>
        </div>
        <Link href="/ops" className={cn(calmMutedLinkClass, "shrink-0 text-sm")}>
          ← Back to overview
        </Link>
      </header>

      {formError !== null ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {formError}
        </div>
      ) : null}

      <div className={panelClass}>
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              All activations
            </h2>
            <button
              type="button"
              onClick={() => {
                setCreateOpen((o) => !o);
                setFormError(null);
              }}
              className={cn(
                calmSecondaryButtonClass,
                "h-auto w-auto shrink-0 min-h-9 px-3 py-1.5 text-xs font-medium"
              )}
            >
              {createOpen ? "Close" : "New activation"}
            </button>
          </div>
        </div>

        {createOpen ? (
          <form
            className="space-y-4 border-b border-border bg-muted/20 px-5 py-5 sm:px-6"
            onSubmit={onCreate}
          >
            <p className="text-sm text-muted-foreground">Required fields only to get started.</p>
            <div>
              <span className={labelClass}>Name</span>
              <input
                className={inputClass}
                value={createName}
                onChange={(ev) => {
                  setCreateName(ev.target.value);
                }}
                placeholder="e.g. Spring roadshow"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className={labelClass}>Starts</span>
                <DatetimePicker
                  id="activation-create-starts"
                  className="mt-0"
                  value={createStarts}
                  onChange={setCreateStarts}
                  emptyLabel="Start date & time"
                />
              </div>
              <div>
                <span className={labelClass}>Ends (optional)</span>
                <DatetimePicker
                  id="activation-create-ends"
                  className="mt-0"
                  value={createEnds}
                  onChange={setCreateEnds}
                  emptyLabel="End date & time (optional)"
                  clearable
                  onClear={() => {
                    setCreateEnds("");
                  }}
                />
              </div>
            </div>
            <div>
              <span className={labelClass}>Region (optional)</span>
              <Select
                value={createRegionId === "" ? REGION_NONE : createRegionId}
                onValueChange={(next) => {
                  setCreateRegionId(next === REGION_NONE ? "" : next);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={REGION_NONE}>No region</SelectItem>
                  {(regionsQuery.data ?? []).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="size-4 rounded border-input"
                checked={createActive}
                onChange={(ev) => {
                  setCreateActive(ev.target.checked);
                }}
              />
              Active when created
            </label>
            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
              <button
                type="submit"
                className={cn(calmPrimaryButtonClass, "w-full sm:w-auto")}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating…" : "Create"}
              </button>
              <button
                type="button"
                className={cn(calmSecondaryButtonClass, "w-full sm:w-auto")}
                onClick={() => {
                  setCreateOpen(false);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        <div className="px-0 py-2">
          {listQuery.isLoading ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground sm:px-6">Loading…</p>
          ) : null}
          {listQuery.isError ? (
            <p className="px-5 py-8 text-center text-sm text-destructive sm:px-6">
              Could not load activations.
            </p>
          ) : null}
          {listQuery.data?.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground sm:px-6">
              No activations yet. Use{" "}
              <span className="font-medium text-foreground">New activation</span> above.
            </p>
          ) : null}
          {(listQuery.data?.length ?? 0) > 0 ? (
            <ul className="divide-y divide-border">
              {(listQuery.data ?? []).map((row: ActivationListRow) => (
                <li key={row.id}>
                  <Link
                    href={`/ops/activations/${row.id}`}
                    className="flex w-full flex-col gap-1 px-5 py-4 text-left transition-colors sm:px-6 hover:bg-muted/40"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <span className="min-w-0 flex-1 font-medium text-foreground">{row.name}</span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          row.isActive
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {row.isActive ? "Active" : "Off"}
                      </span>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">{row.slug}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{row._count.products} products</span>
                      <span>{row._count.roster} on roster</span>
                      <span>{formatShort(row.startsAt)}</span>
                    </div>
                    <span className="text-xs font-medium text-primary">Open details →</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
