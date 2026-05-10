"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactElement, type SyntheticEvent, useEffect, useMemo, useState } from "react";

import { DatetimePicker } from "@/components/ui/datetime-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  getAdminActivationGetActivationQueryKey,
  getAdminActivationListActivationsQueryKey,
  useAdminActivationAddActivationProduct,
  useAdminActivationAddToRosterBatch,
  useAdminActivationCreateActivation,
  useAdminActivationGetActivation,
  useAdminActivationListActivations,
  useAdminActivationRemoveActivationProduct,
  useAdminActivationRemoveFromRoster,
  useAdminActivationUpdateActivation,
  useAdminRegionListRegions,
  useAdminUserListUsers
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
  type ActivationDetail,
  type ActivationListRow,
  parseActivationDetailFromOrval,
  parseActivationsFromOrval,
  parseAdminUsersFromOrval,
  parseRegionsFromOrval
} from "@/lib/ops/ops-adapters";

const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground";

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Radix Select requires a non-empty value; map optional region to this sentinel. */
const REGION_NONE = "__region_none__";

const panelClass =
  "rounded-xl border border-border bg-card/95 shadow-sm backdrop-blur-sm dark:bg-card/70";

const toDatetimeLocalValue = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${String(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatShort = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

type DetailTab = "settings" | "products" | "roster";

export default function OpsActivationsPage(): ReactElement {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const role = useAuthStore((state) => state.user?.role);
  const canManageActivations = role === "admin" || role === "supervisor";

  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("settings");
  const [createOpen, setCreateOpen] = useState(false);

  const [createName, setCreateName] = useState("");
  const [createStarts, setCreateStarts] = useState("");
  const [createEnds, setCreateEnds] = useState("");
  const [createRegionId, setCreateRegionId] = useState("");
  const [createActive, setCreateActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const [editName, setEditName] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editStarts, setEditStarts] = useState("");
  const [editEnds, setEditEnds] = useState("");
  const [editRegionId, setEditRegionId] = useState("");

  const [productName, setProductName] = useState("");
  const [productSku, setProductSku] = useState("");
  const [productQty, setProductQty] = useState("1");

  const [rosterSelectedUserIds, setRosterSelectedUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (!canManageActivations) {
      router.replace("/ops");
    }
  }, [canManageActivations, router]);

  useEffect(() => {
    setDetailTab("settings");
    setRosterSelectedUserIds([]);
  }, [selectedId]);

  const listQuery = useAdminActivationListActivations({
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

  const usersQuery = useAdminUserListUsers({
    query: {
      enabled: accessToken !== null && canManageActivations,
      select: (r) => parseAdminUsersFromOrval(r)
    }
  });

  const fieldTeamUsers = useMemo(() => {
    return (usersQuery.data ?? []).filter(
      (u) => (u.role === "promoter" || u.role === "merchandizer") && u.isActive
    );
  }, [usersQuery.data]);

  const detailQuery = useAdminActivationGetActivation(selectedId ?? "", {
    query: {
      enabled: accessToken !== null && canManageActivations && selectedId !== null,
      select: (r) => parseActivationDetailFromOrval(r)
    }
  });

  const detail: ActivationDetail | undefined = detailQuery.data;

  const rosterAddCandidates = useMemo(() => {
    const onRoster = new Set(detail?.roster.map((r) => r.userId) ?? []);
    return fieldTeamUsers.filter((u) => !onRoster.has(u.id));
  }, [detail, fieldTeamUsers]);

  useEffect(() => {
    setRosterSelectedUserIds((prev) =>
      prev.filter((id) => rosterAddCandidates.some((u) => u.id === id))
    );
  }, [rosterAddCandidates]);

  useEffect(() => {
    if (detail === undefined) {
      return;
    }
    setEditName(detail.name);
    setEditActive(detail.isActive);
    setEditStarts(toDatetimeLocalValue(detail.startsAt));
    setEditEnds(detail.endsAt !== null ? toDatetimeLocalValue(detail.endsAt) : "");
    setEditRegionId(detail.regionId ?? "");
  }, [detail]);

  const invalidateList = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: getAdminActivationListActivationsQueryKey() });
  };

  const invalidateDetail = async (id: string): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: getAdminActivationGetActivationQueryKey(id) });
  };

  const createMutation = useAdminActivationCreateActivation({
    mutation: {
      onSuccess: async () => {
        await invalidateList();
        setCreateName("");
        setCreateStarts("");
        setCreateEnds("");
        setCreateRegionId("");
        setCreateActive(true);
        setCreateOpen(false);
      }
    }
  });

  const updateMutation = useAdminActivationUpdateActivation({
    mutation: {
      onSuccess: async (_, v) => {
        await invalidateList();
        await invalidateDetail(String(v.id));
      }
    }
  });

  const addProductMutation = useAdminActivationAddActivationProduct({
    mutation: {
      onSuccess: async (_, v) => {
        await invalidateList();
        await invalidateDetail(String(v.id));
        setProductName("");
        setProductSku("");
        setProductQty("1");
      }
    }
  });

  const removeProductMutation = useAdminActivationRemoveActivationProduct({
    mutation: {
      onSuccess: async (_, v) => {
        await invalidateList();
        await invalidateDetail(String(v.id));
      }
    }
  });

  const addRosterBatchMutation = useAdminActivationAddToRosterBatch({
    mutation: {
      onSuccess: async (_, v) => {
        await invalidateList();
        await invalidateDetail(String(v.id));
        setRosterSelectedUserIds([]);
      }
    }
  });

  const removeRosterMutation = useAdminActivationRemoveFromRoster({
    mutation: {
      onSuccess: async (_, v) => {
        await invalidateList();
        await invalidateDetail(String(v.id));
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

  const onSaveDetail = (e: SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (selectedId === null || detail === undefined) {
      return;
    }
    setFormError(null);
    const name = editName.trim();
    if (!name) {
      setFormError("Name is required.");
      return;
    }
    const starts = new Date(editStarts);
    if (!editStarts || Number.isNaN(starts.getTime())) {
      setFormError("Invalid start date.");
      return;
    }
    let endsAt: string | null;
    if (editEnds.trim().length > 0) {
      const ends = new Date(editEnds);
      if (Number.isNaN(ends.getTime())) {
        setFormError("Invalid end date.");
        return;
      }
      endsAt = ends.toISOString();
    } else {
      endsAt = null;
    }

    updateMutation.mutate({
      id: selectedId,
      data: {
        name,
        isActive: editActive,
        startsAt: starts.toISOString(),
        endsAt,
        regionId: editRegionId.trim()
      }
    });
  };

  const onAddProduct = (e: SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (selectedId === null) {
      return;
    }
    setFormError(null);
    const name = productName.trim();
    if (!name) {
      setFormError("Product name is required.");
      return;
    }
    const qty = Number.parseInt(productQty, 10);
    addProductMutation.mutate({
      id: selectedId,
      data: {
        name,
        ...(productSku.trim().length > 0 ? { sku: productSku.trim() } : {}),
        ...(Number.isFinite(qty) && qty >= 1 ? { quantity: qty } : {})
      }
    });
  };

  const onAddRoster = (e: SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (selectedId === null || rosterSelectedUserIds.length === 0) {
      return;
    }
    setFormError(null);
    addRosterBatchMutation.mutate(
      { id: selectedId, data: { userIds: [...rosterSelectedUserIds] } },
      {
        onError: (err: unknown) => {
          setFormError(
            err instanceof ApiError ? (err.problem?.detail ?? err.message) : "Add to roster failed."
          );
        }
      }
    );
  };

  const tabBtn = (tab: DetailTab, label: string): ReactElement => (
    <button
      key={tab}
      type="button"
      onClick={() => {
        setDetailTab(tab);
      }}
      className={cn(
        "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        detailTab === tab
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );

  if (!canManageActivations) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <header className="flex flex-col gap-4 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Activations</h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Campaigns, product lines, and field-team rosters. Select one on the left to edit.
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

      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="space-y-6 lg:col-span-5">
          <div className={panelClass}>
            <div className="border-b border-border px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Library
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setCreateOpen((o) => !o);
                    setFormError(null);
                  }}
                  className={cn(calmSecondaryButtonClass, "px-3 py-1.5 text-xs font-medium")}
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
                <p className="text-sm text-muted-foreground">
                  Required fields only to get started.
                </p>
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
                <p className="px-5 py-8 text-center text-sm text-muted-foreground sm:px-6">
                  Loading…
                </p>
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
                <ul className="max-h-[min(32rem,calc(100vh-12rem))] overflow-y-auto">
                  {(listQuery.data ?? []).map((row: ActivationListRow) => {
                    const selected = selectedId === row.id;
                    return (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(row.id);
                            setFormError(null);
                          }}
                          className={cn(
                            "flex w-full flex-col gap-1 border-l-2 px-5 py-4 text-left transition-colors sm:px-6",
                            selected
                              ? "border-primary bg-primary/5"
                              : "border-transparent hover:bg-muted/40"
                          )}
                        >
                          <div className="flex min-w-0 items-start justify-between gap-3">
                            <span className="min-w-0 flex-1 font-medium text-foreground">
                              {row.name}
                            </span>
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
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className={cn(panelClass, "min-h-[28rem]")}>
            {selectedId === null ? (
              <div className="flex min-h-[22rem] flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                <p className="text-sm font-medium text-foreground">Nothing selected</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Pick an activation from the library to view details, products, and roster.
                </p>
              </div>
            ) : detailQuery.isLoading ? (
              <div className="flex min-h-[22rem] items-center justify-center p-12">
                <p className="text-sm text-muted-foreground">Loading activation…</p>
              </div>
            ) : detailQuery.isError || detail === undefined ? (
              <div className="flex min-h-[22rem] items-center justify-center p-12">
                <p className="text-sm text-destructive">Could not load this activation.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="border-b border-border px-6 py-6 sm:px-8">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold tracking-tight text-foreground">
                        {detail.name}
                      </h2>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{detail.slug}</p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold",
                        detail.isActive
                          ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {detail.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                <div className="border-b border-border px-4 py-3 sm:px-6">
                  <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
                    {tabBtn("settings", "Details")}
                    {tabBtn("products", "Products")}
                    {tabBtn("roster", "Roster")}
                  </div>
                </div>

                <div className="flex-1 px-6 py-8 sm:px-8">
                  {detailTab === "settings" ? (
                    <form className="mx-auto max-w-md space-y-5" onSubmit={onSaveDetail}>
                      <div>
                        <span className={labelClass}>Display name</span>
                        <input
                          className={inputClass}
                          value={editName}
                          onChange={(ev) => {
                            setEditName(ev.target.value);
                          }}
                        />
                      </div>
                      <div>
                        <span className={labelClass}>Region</span>
                        <Select
                          value={editRegionId === "" ? REGION_NONE : editRegionId}
                          onValueChange={(next) => {
                            setEditRegionId(next === REGION_NONE ? "" : next);
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
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <span className={labelClass}>Starts</span>
                          <DatetimePicker
                            id="activation-edit-starts"
                            className="mt-0"
                            value={editStarts}
                            onChange={setEditStarts}
                            emptyLabel="Start date & time"
                          />
                        </div>
                        <div>
                          <span className={labelClass}>Ends</span>
                          <DatetimePicker
                            id="activation-edit-ends"
                            className="mt-0"
                            value={editEnds}
                            onChange={setEditEnds}
                            emptyLabel="No end date"
                            clearable
                            onClear={() => {
                              setEditEnds("");
                            }}
                          />
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            Leave empty to clear the end date.
                          </p>
                        </div>
                      </div>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                        <input
                          type="checkbox"
                          className="size-4 rounded border-input"
                          checked={editActive}
                          onChange={(ev) => {
                            setEditActive(ev.target.checked);
                          }}
                        />
                        Activation is active
                      </label>
                      <button
                        type="submit"
                        className={cn(calmPrimaryButtonClass, "w-full sm:w-auto")}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending ? "Saving…" : "Save changes"}
                      </button>
                    </form>
                  ) : null}

                  {detailTab === "products" ? (
                    <div className="space-y-8">
                      <div>
                        <h3 className={labelClass}>Add product line</h3>
                        <form
                          className="mt-3 flex flex-col gap-4 rounded-lg border border-dashed border-border bg-muted/15 p-4"
                          onSubmit={onAddProduct}
                        >
                          <input
                            className={inputClass}
                            placeholder="Product name"
                            value={productName}
                            onChange={(ev) => {
                              setProductName(ev.target.value);
                            }}
                          />
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <input
                              className={inputClass}
                              placeholder="SKU (optional)"
                              value={productSku}
                              onChange={(ev) => {
                                setProductSku(ev.target.value);
                              }}
                            />
                            <input
                              className={inputClass}
                              placeholder="Qty"
                              inputMode="numeric"
                              value={productQty}
                              onChange={(ev) => {
                                setProductQty(ev.target.value);
                              }}
                            />
                          </div>
                          <button
                            type="submit"
                            className={cn(
                              calmPrimaryButtonClass,
                              "w-full shrink-0 sm:w-auto sm:self-start"
                            )}
                            disabled={addProductMutation.isPending}
                          >
                            {addProductMutation.isPending ? "Adding…" : "Add product"}
                          </button>
                        </form>
                      </div>
                      {detail.products.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground">
                          No product lines yet.
                        </p>
                      ) : (
                        <ul className="divide-y divide-border rounded-lg border border-border">
                          {detail.products.map((p) => (
                            <li
                              key={p.id}
                              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-foreground">{p.name}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {p.sku !== null ? `SKU ${p.sku} · ` : ""}Qty {p.quantity}
                                </p>
                              </div>
                              <button
                                type="button"
                                className={cn(
                                  calmSecondaryButtonClass,
                                  "w-auto shrink-0 self-start sm:self-auto"
                                )}
                                disabled={removeProductMutation.isPending}
                                onClick={() => {
                                  removeProductMutation.mutate({ id: selectedId, productId: p.id });
                                }}
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}

                  {detailTab === "roster" ? (
                    <div className="space-y-8">
                      <div>
                        <h3 className={labelClass}>Add field team members</h3>
                        <form
                          className="mt-3 flex flex-col gap-4 rounded-lg border border-dashed border-border bg-muted/15 p-4"
                          onSubmit={onAddRoster}
                        >
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className={cn(calmSecondaryButtonClass, "w-auto px-3 py-2 text-xs")}
                              disabled={
                                addRosterBatchMutation.isPending ||
                                rosterAddCandidates.length === 0 ||
                                rosterAddCandidates.every((u) =>
                                  rosterSelectedUserIds.includes(u.id)
                                )
                              }
                              onClick={() => {
                                setRosterSelectedUserIds(rosterAddCandidates.map((u) => u.id));
                              }}
                            >
                              Select all
                            </button>
                            <button
                              type="button"
                              className={cn(calmSecondaryButtonClass, "w-auto px-3 py-2 text-xs")}
                              disabled={
                                addRosterBatchMutation.isPending ||
                                rosterSelectedUserIds.length === 0
                              }
                              onClick={() => {
                                setRosterSelectedUserIds([]);
                              }}
                            >
                              Clear
                            </button>
                          </div>
                          <div className="max-h-60 overflow-y-auto rounded-lg border border-border bg-background">
                            {rosterAddCandidates.length === 0 ? (
                              <p className="p-4 text-sm text-muted-foreground">
                                {fieldTeamUsers.length === 0
                                  ? "No active promoters or merchandizers in the directory."
                                  : "Everyone eligible is already on this roster."}
                              </p>
                            ) : (
                              <ul className="divide-y divide-border">
                                {rosterAddCandidates.map((u) => {
                                  const rosterCheckId = `roster-add-${u.id}`;
                                  const checked = rosterSelectedUserIds.includes(u.id);
                                  return (
                                    <li key={u.id}>
                                      <label
                                        htmlFor={rosterCheckId}
                                        className="flex cursor-pointer items-start gap-3 px-3 py-2.5 text-sm hover:bg-muted/50"
                                      >
                                        <input
                                          id={rosterCheckId}
                                          type="checkbox"
                                          className="mt-0.5 size-4 shrink-0 rounded border-input"
                                          checked={checked}
                                          disabled={addRosterBatchMutation.isPending}
                                          onChange={(ev) => {
                                            const on = ev.target.checked;
                                            setRosterSelectedUserIds((prev) =>
                                              on
                                                ? prev.includes(u.id)
                                                  ? prev
                                                  : [...prev, u.id]
                                                : prev.filter((id) => id !== u.id)
                                            );
                                          }}
                                        />
                                        <span className="min-w-0 flex-1">
                                          <span className="font-medium text-foreground">
                                            {u.fullName}
                                          </span>
                                          <span className="mt-0.5 block text-xs capitalize text-muted-foreground">
                                            {u.role}
                                          </span>
                                        </span>
                                      </label>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                          <button
                            type="submit"
                            className={cn(
                              calmPrimaryButtonClass,
                              "w-full shrink-0 sm:w-auto sm:self-start"
                            )}
                            disabled={
                              addRosterBatchMutation.isPending ||
                              rosterSelectedUserIds.length === 0 ||
                              rosterAddCandidates.length === 0
                            }
                          >
                            {addRosterBatchMutation.isPending
                              ? "Adding…"
                              : rosterSelectedUserIds.length === 0
                                ? "Add to roster"
                                : `Add ${String(rosterSelectedUserIds.length)} to roster`}
                          </button>
                        </form>
                      </div>
                      {detail.roster.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground">
                          No one on the roster yet.
                        </p>
                      ) : (
                        <ul className="divide-y divide-border rounded-lg border border-border">
                          {detail.roster.map((r) => (
                            <li
                              key={r.id}
                              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-foreground">{r.user.fullName}</p>
                                <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                                  {r.user.role}
                                </p>
                              </div>
                              <button
                                type="button"
                                className={cn(
                                  calmSecondaryButtonClass,
                                  "w-auto shrink-0 self-start sm:self-auto"
                                )}
                                disabled={removeRosterMutation.isPending}
                                onClick={() => {
                                  removeRosterMutation.mutate({ id: selectedId, userId: r.userId });
                                }}
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
