"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Fragment,
  type ReactElement,
  type SyntheticEvent,
  useEffect,
  useMemo,
  useState
} from "react";

import { ActivationFieldActivityMap } from "@/components/activation-field-activity-map";
import { BoneyardInlineFallback } from "@/components/boneyard/boneyard-inline-fallback";
import { CheckInDetailModal } from "@/components/check-in-detail-modal";
import { DatetimePicker } from "@/components/ui/datetime-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  getActivationGetActivationQueryKey,
  getActivationListActivationsQueryKey,
  useActivationAddProduct,
  useActivationAddToRosterBatch,
  useActivationGetActivation,
  useActivationGetFieldActivityCheckIn,
  useActivationListFieldActivityLocations,
  useActivationListFieldActivitySales,
  useActivationRemoveFromRoster,
  useActivationRemoveProduct,
  useActivationUpdateActivation,
  useAdminGeofenceListGeofences,
  useAdminRegionListRegions,
  useAdminUserListUsers
} from "@/lib/api/generated/client";
import type {
  ActivationListFieldActivityLocationsParams,
  ActivationListFieldActivitySalesParams
} from "@/lib/api/generated/model";
import { ApiError } from "@/lib/api/problem-details";
import { useAuthStore } from "@/lib/auth/auth-store";
import {
  calmMutedLinkClass,
  calmPrimaryButtonClass,
  calmSecondaryButtonClass
} from "@/lib/calm-ui";
import { cn } from "@/lib/utils";
import {
  parseAdminFieldActivityCheckInFromOrval,
  parseAdminFieldActivityLocationsFromOrval,
  parseAdminFieldActivitySalesFromOrval
} from "@/lib/ops/field-activity-adapters";
import {
  type ActivationDetail,
  parseActivationDetailFromOrval,
  parseAdminUsersFromOrval,
  parseGeofencesFromOrval,
  parseRegionsFromOrval
} from "@/lib/ops/ops-adapters";

import { ActivationMultiSelect } from "./activation-multi-select";
import {
  FIELD_ACTIVITY_PALETTE,
  FIELD_ACTIVITY_USER_ALL,
  type ActivationDetailTab,
  formatShort,
  inputClass,
  labelClass,
  panelClass,
  toDatetimeLocalValue
} from "./activations-shared";

type ActivationDetailViewProps = {
  activationId: string;
};

export function ActivationDetailView({ activationId }: ActivationDetailViewProps): ReactElement {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const role = useAuthStore((state) => state.user?.role);
  const canManageActivations = role === "admin" || role === "supervisor";

  const queryClient = useQueryClient();
  const [detailTab, setDetailTab] = useState<ActivationDetailTab>("settings");
  const [formError, setFormError] = useState<string | null>(null);

  const [editName, setEditName] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editStarts, setEditStarts] = useState("");
  const [editEnds, setEditEnds] = useState("");
  const [editRegionIds, setEditRegionIds] = useState<string[]>([]);
  const [editGeofenceIds, setEditGeofenceIds] = useState<string[]>([]);

  const [productName, setProductName] = useState("");
  const [productSku, setProductSku] = useState("");
  const [productQty, setProductQty] = useState("1");
  const [productMonthlyTarget, setProductMonthlyTarget] = useState("");

  const [rosterSelectedUserIds, setRosterSelectedUserIds] = useState<string[]>([]);

  const [fieldActivityFilterUserId, setFieldActivityFilterUserId] = useState("");
  const [fieldActivityFrom, setFieldActivityFrom] = useState("");
  const [fieldActivityTo, setFieldActivityTo] = useState("");
  const [fieldActivityCheckInPingId, setFieldActivityCheckInPingId] = useState<string | null>(null);

  useEffect(() => {
    if (!canManageActivations) {
      router.replace("/ops");
    }
  }, [canManageActivations, router]);

  useEffect(() => {
    setDetailTab("settings");
    setRosterSelectedUserIds([]);
    setFieldActivityFilterUserId("");
    setFieldActivityFrom("");
    setFieldActivityTo("");
    setFormError(null);
  }, [activationId]);

  const regionsQuery = useAdminRegionListRegions({
    query: {
      enabled: accessToken !== null && canManageActivations,
      select: (r) => parseRegionsFromOrval(r)
    }
  });

  const geofencesQuery = useAdminGeofenceListGeofences({
    query: {
      enabled: accessToken !== null && canManageActivations,
      select: (r) => parseGeofencesFromOrval(r)
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
      (u) => (u.role === "promoter" || u.role === "client") && u.isActive
    );
  }, [usersQuery.data]);

  const detailQuery = useActivationGetActivation(activationId, {
    query: {
      enabled: accessToken !== null && canManageActivations && activationId.length > 0,
      select: (r) => parseActivationDetailFromOrval(r)
    }
  });

  const detail: ActivationDetail | undefined = detailQuery.data;

  const fieldActivityEnabled =
    accessToken !== null &&
    canManageActivations &&
    activationId.length > 0 &&
    detailTab === "field-activity";

  const fieldActivitySalesParams = useMemo((): ActivationListFieldActivitySalesParams => {
    const p: ActivationListFieldActivitySalesParams = { limit: 100 };
    if (fieldActivityFilterUserId.length > 0) {
      p.userId = fieldActivityFilterUserId;
    }
    if (fieldActivityFrom.length > 0) {
      p.from = new Date(fieldActivityFrom).toISOString();
    }
    if (fieldActivityTo.length > 0) {
      p.to = new Date(fieldActivityTo).toISOString();
    }
    return p;
  }, [fieldActivityFilterUserId, fieldActivityFrom, fieldActivityTo]);

  const fieldActivityLocationsParams = useMemo((): ActivationListFieldActivityLocationsParams => {
    const p: ActivationListFieldActivityLocationsParams = { limit: 800 };
    if (fieldActivityFilterUserId.length > 0) {
      p.userId = fieldActivityFilterUserId;
    }
    if (fieldActivityFrom.length > 0) {
      p.from = new Date(fieldActivityFrom).toISOString();
    }
    if (fieldActivityTo.length > 0) {
      p.to = new Date(fieldActivityTo).toISOString();
    }
    return p;
  }, [fieldActivityFilterUserId, fieldActivityFrom, fieldActivityTo]);

  const fieldSalesQuery = useActivationListFieldActivitySales(
    activationId,
    fieldActivitySalesParams,
    {
      query: {
        enabled: fieldActivityEnabled,
        refetchInterval: detailTab === "field-activity" ? 30_000 : false,
        select: (r) => parseAdminFieldActivitySalesFromOrval(r)
      }
    }
  );

  const fieldLocationsQuery = useActivationListFieldActivityLocations(
    activationId,
    fieldActivityLocationsParams,
    {
      query: {
        enabled: fieldActivityEnabled,
        refetchInterval: detailTab === "field-activity" ? 30_000 : false,
        select: (r) => parseAdminFieldActivityLocationsFromOrval(r)
      }
    }
  );

  const fieldActivityCheckInDetailQuery = useActivationGetFieldActivityCheckIn(
    activationId,
    fieldActivityCheckInPingId ?? "",
    {
      query: {
        enabled:
          accessToken !== null &&
          fieldActivityCheckInPingId !== null &&
          fieldActivityCheckInPingId.length > 0,
        select: (r) => parseAdminFieldActivityCheckInFromOrval(r)
      }
    }
  );

  const rosterMapLabels = useMemo(() => {
    if (detail === undefined) {
      return [];
    }
    return detail.roster.map((r) => ({ userId: r.userId, fullName: r.user.fullName }));
  }, [detail]);

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
    setEditRegionIds(detail.regionLinks.map((l) => l.regionId));
    setEditGeofenceIds(detail.geofenceLinks.map((l) => l.geofenceId));
  }, [detail]);

  const invalidateList = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: getActivationListActivationsQueryKey() });
  };

  const invalidateDetail = async (id: string): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: getActivationGetActivationQueryKey(id) });
  };

  const updateMutation = useActivationUpdateActivation({
    mutation: {
      onSuccess: async (_, v) => {
        await invalidateList();
        await invalidateDetail(String(v.id));
      }
    }
  });

  const addProductMutation = useActivationAddProduct({
    mutation: {
      onSuccess: async (_, v) => {
        await invalidateList();
        await invalidateDetail(String(v.id));
        setProductName("");
        setProductSku("");
        setProductQty("1");
        setProductMonthlyTarget("");
      }
    }
  });

  const removeProductMutation = useActivationRemoveProduct({
    mutation: {
      onSuccess: async (_, v) => {
        await invalidateList();
        await invalidateDetail(String(v.id));
      }
    }
  });

  const addRosterBatchMutation = useActivationAddToRosterBatch({
    mutation: {
      onSuccess: async (_, v) => {
        await invalidateList();
        await invalidateDetail(String(v.id));
        setRosterSelectedUserIds([]);
      }
    }
  });

  const removeRosterMutation = useActivationRemoveFromRoster({
    mutation: {
      onSuccess: async (_, v) => {
        await invalidateList();
        await invalidateDetail(String(v.id));
      }
    }
  });

  const onSaveDetail = (e: SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (detail === undefined) {
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
      id: activationId,
      data: {
        name,
        isActive: editActive,
        startsAt: starts.toISOString(),
        endsAt,
        regionIds: [...editRegionIds],
        geofenceIds: [...editGeofenceIds]
      }
    });
  };

  const onAddProduct = (e: SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setFormError(null);
    const name = productName.trim();
    if (!name) {
      setFormError("Product name is required.");
      return;
    }
    const qty = Number.parseInt(productQty, 10);
    const monthlyRaw = productMonthlyTarget.trim();
    const monthlyParsed = monthlyRaw.length > 0 ? Number.parseInt(monthlyRaw, 10) : Number.NaN;
    const monthlyTargetCases =
      Number.isFinite(monthlyParsed) && monthlyParsed >= 0 ? monthlyParsed : undefined;
    addProductMutation.mutate({
      id: activationId,
      data: {
        name,
        ...(productSku.trim().length > 0 ? { sku: productSku.trim() } : {}),
        ...(Number.isFinite(qty) && qty >= 1 ? { quantity: qty } : {}),
        ...(monthlyTargetCases !== undefined ? { monthlyTargetCases } : {})
      }
    });
  };

  const onAddRoster = (e: SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (rosterSelectedUserIds.length === 0) {
      return;
    }
    setFormError(null);
    addRosterBatchMutation.mutate(
      { id: activationId, data: { userIds: [...rosterSelectedUserIds] } },
      {
        onError: (err: unknown) => {
          setFormError(
            err instanceof ApiError ? (err.problem?.detail ?? err.message) : "Add to roster failed."
          );
        }
      }
    );
  };

  const tabBtn = (tab: ActivationDetailTab, label: string): ReactElement => (
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

  if (activationId.length === 0) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Invalid activation.
      </p>
    );
  }

  return (
    <Fragment>
      <div className="w-full space-y-6 pb-16">
        <header className="flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href="/ops/activations"
              className={cn(calmMutedLinkClass, "inline-block text-sm")}
            >
              ← All activations
            </Link>
            {detailQuery.isLoading ? (
              <BoneyardInlineFallback
                name="ops-activation-detail-title"
                variant="lines4"
                className="mt-3 max-w-md"
              />
            ) : detail !== undefined ? (
              <>
                <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                  {detail.name}
                </h1>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{detail.slug}</p>
              </>
            ) : (
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">Activation</h1>
            )}
          </div>
          {detail !== undefined ? (
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
          ) : null}
        </header>

        {formError !== null ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {formError}
          </div>
        ) : null}

        <div className={cn(panelClass, "min-h-112")}>
          {detailQuery.isLoading ? (
            <div className="flex min-h-88 items-center justify-center p-12">
              <BoneyardInlineFallback
                name="ops-activation-detail-panel"
                variant="lines4"
                className="w-full max-w-lg"
              />
            </div>
          ) : detailQuery.isError || detail === undefined ? (
            <div className="flex min-h-88 flex-col items-center justify-center gap-3 p-12 text-center">
              <p className="text-sm text-destructive">Could not load this activation.</p>
              <Link href="/ops/activations" className={calmMutedLinkClass}>
                Back to list
              </Link>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="border-b border-border px-4 py-3 sm:px-6">
                <div className="flex flex-wrap gap-1 rounded-lg bg-muted/50 p-1">
                  {tabBtn("settings", "Details")}
                  {tabBtn("products", "Products")}
                  {tabBtn("roster", "Roster")}
                  {tabBtn("field-activity", "Field activity")}
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
                      <span className={labelClass}>Regions</span>
                      <p className="mb-2 text-xs text-muted-foreground">
                        Optional. Open the list to choose one or more territories this campaign
                        spans.
                      </p>
                      <ActivationMultiSelect
                        id="activation-edit-regions"
                        options={(regionsQuery.data ?? []).map((r) => ({
                          id: r.id,
                          label: r.name,
                          isActive: r.isActive
                        }))}
                        valueIds={editRegionIds}
                        onValueChange={setEditRegionIds}
                        isLoading={regionsQuery.isLoading}
                        placeholder="Select regions"
                        emptyListHint="No regions yet. Add them under Regions."
                      />
                    </div>
                    <div>
                      <span className={labelClass}>Sign-in work areas</span>
                      <p className="mb-2 text-xs text-muted-foreground">
                        Rostered promoters must sign in inside at least one selected zone while this
                        activation is current. Open the list to pick several. Leave none selected to
                        use only global work-area rules (if any).
                      </p>
                      <ActivationMultiSelect
                        id="activation-edit-work-areas"
                        options={(geofencesQuery.data ?? []).map((g) => ({
                          id: g.id,
                          label: g.label,
                          isActive: g.isActive
                        }))}
                        valueIds={editGeofenceIds}
                        onValueChange={setEditGeofenceIds}
                        isLoading={geofencesQuery.isLoading}
                        placeholder="Select work areas"
                        emptyListHint="No work areas defined yet. Add them under Geofences."
                      />
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
                        <input
                          className={inputClass}
                          placeholder="Monthly target (cases, optional)"
                          inputMode="numeric"
                          value={productMonthlyTarget}
                          onChange={(ev) => {
                            setProductMonthlyTarget(ev.target.value);
                          }}
                        />
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
                                {p.monthlyTargetCases != null ? (
                                  <> · Monthly target {p.monthlyTargetCases} cases</>
                                ) : null}
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
                                removeProductMutation.mutate({ id: activationId, productId: p.id });
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
                              rosterAddCandidates.every((u) => rosterSelectedUserIds.includes(u.id))
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
                              addRosterBatchMutation.isPending || rosterSelectedUserIds.length === 0
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
                                ? "No active promoters or clients in the directory."
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
                                removeRosterMutation.mutate({ id: activationId, userId: r.userId });
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

                {detailTab === "field-activity" ? (
                  <div className="w-full space-y-10">
                    <div className="rounded-lg border border-border bg-muted/10 p-4 dark:bg-muted/5">
                      <h3 className={labelClass}>Filters</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Scope map and sales by roster member and time. Bounds are intersected with
                        this activation&apos;s start/end dates on the server.
                      </p>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="sm:col-span-2 lg:col-span-1">
                          <span className={labelClass}>Promoter</span>
                          <Select
                            value={
                              fieldActivityFilterUserId.length > 0
                                ? fieldActivityFilterUserId
                                : FIELD_ACTIVITY_USER_ALL
                            }
                            onValueChange={(next) => {
                              setFieldActivityFilterUserId(
                                next === FIELD_ACTIVITY_USER_ALL ? "" : next
                              );
                            }}
                          >
                            <SelectTrigger className="mt-1.5 w-full">
                              <SelectValue placeholder="All on roster" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={FIELD_ACTIVITY_USER_ALL}>All on roster</SelectItem>
                              {rosterMapLabels.map((r) => (
                                <SelectItem key={r.userId} value={r.userId}>
                                  {r.fullName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <span className={labelClass}>From</span>
                          <DatetimePicker
                            id="field-activity-from"
                            className="mt-1.5"
                            value={fieldActivityFrom}
                            onChange={setFieldActivityFrom}
                            emptyLabel="From date & time (optional)"
                            clearable
                            onClear={() => {
                              setFieldActivityFrom("");
                            }}
                          />
                        </div>
                        <div>
                          <span className={labelClass}>To</span>
                          <DatetimePicker
                            id="field-activity-to"
                            className="mt-1.5"
                            value={fieldActivityTo}
                            onChange={setFieldActivityTo}
                            emptyLabel="To date & time (optional)"
                            clearable
                            onClear={() => {
                              setFieldActivityTo("");
                            }}
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            className={cn(calmSecondaryButtonClass, "w-full")}
                            onClick={() => {
                              setFieldActivityFilterUserId("");
                              setFieldActivityFrom("");
                              setFieldActivityTo("");
                            }}
                          >
                            Clear filters
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className={labelClass}>Roster on map</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        Recent check-ins for people on this activation&apos;s roster. Lines connect
                        pings in time order (oldest → newest); the marker is the latest position.
                        Add promoters to the roster in the Roster tab so their locations appear
                        here.
                      </p>
                      {rosterMapLabels.length > 0 ? (
                        <ul className="mt-4 flex flex-wrap gap-3 text-sm">
                          {rosterMapLabels.map((r, i) => (
                            <li key={r.userId} className="flex items-center gap-2">
                              <span
                                className="size-3 shrink-0 rounded-full"
                                style={{
                                  backgroundColor:
                                    FIELD_ACTIVITY_PALETTE[i % FIELD_ACTIVITY_PALETTE.length]
                                }}
                              />
                              <span className="text-foreground">{r.fullName}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-4 text-sm text-muted-foreground">
                          No roster members — add field staff under Roster first.
                        </p>
                      )}
                      <div className="mt-4">
                        {fieldLocationsQuery.isLoading ? (
                          <BoneyardInlineFallback
                            name="ops-activation-field-locations"
                            variant="lines4"
                            className="mt-4 min-h-[12rem] w-full"
                          />
                        ) : fieldLocationsQuery.isError ? (
                          <p className="text-sm text-destructive" role="alert">
                            Could not load location history.
                          </p>
                        ) : (
                          <ActivationFieldActivityMap
                            roster={rosterMapLabels}
                            pings={
                              // TanStack keeps `data` optional until success; this branch can still be idle/disabled.
                              fieldLocationsQuery.data ?? []
                            }
                            onSelectPing={(pingId) => {
                              setFieldActivityCheckInPingId(pingId);
                            }}
                          />
                        )}
                      </div>
                      {fieldLocationsQuery.isSuccess &&
                      fieldLocationsQuery.data.length === 0 &&
                      rosterMapLabels.length > 0 ? (
                        <p className="mt-3 text-sm text-muted-foreground">
                          No location pings yet for roster members (they appear when the mobile app
                          records check-ins).
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <h3 className={labelClass}>Sales (roster only)</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Line items from promoters on this activation&apos;s roster, within the
                        activation window and your filters above. Sales by non-rostered users are
                        hidden.
                      </p>
                      {fieldSalesQuery.isLoading ? (
                        <BoneyardInlineFallback
                          name="ops-activation-field-sales"
                          variant="lines4"
                          className="mt-4 min-h-[10rem] w-full"
                        />
                      ) : fieldSalesQuery.isError ? (
                        <p className="mt-4 text-sm text-destructive" role="alert">
                          Could not load sales.
                        </p>
                      ) : (fieldSalesQuery.data?.length ?? 0) === 0 ? (
                        <p className="mt-4 text-sm text-muted-foreground">No sales recorded yet.</p>
                      ) : (
                        <ul className="mt-4 space-y-4">
                          {(fieldSalesQuery.data ?? []).map((sale) => (
                            <li
                              key={sale.id}
                              className="rounded-lg border border-border bg-muted/10 px-4 py-3 dark:bg-muted/5"
                            >
                              <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between">
                                <p className="font-medium text-foreground">{sale.user.fullName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatShort(sale.createdAt)} · {sale.user.role}
                                </p>
                              </div>
                              <ul className="mt-2 space-y-1 text-sm text-foreground">
                                {sale.items.map((line) => (
                                  <li key={line.id}>
                                    {line.product.name}
                                    {line.product.sku !== null &&
                                    line.product.sku !== undefined &&
                                    line.product.sku.length > 0
                                      ? ` (${line.product.sku})`
                                      : ""}
                                    <span className="text-muted-foreground">
                                      {" "}
                                      × {line.quantity}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      <CheckInDetailModal
        open={fieldActivityCheckInPingId !== null}
        onClose={() => {
          setFieldActivityCheckInPingId(null);
        }}
        isLoading={fieldActivityCheckInDetailQuery.isLoading}
        isError={fieldActivityCheckInDetailQuery.isError}
        detail={fieldActivityCheckInDetailQuery.data}
        formatDateTime={formatShort}
      />
    </Fragment>
  );
}
