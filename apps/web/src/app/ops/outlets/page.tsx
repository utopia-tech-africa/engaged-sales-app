"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { type ReactElement, type SyntheticEvent, useState } from "react";

import { ApiError } from "@/lib/api/problem-details";
import { useAuthStore } from "@/lib/auth/auth-store";
import { calmPrimaryButtonClass, calmSecondaryButtonClass } from "@/lib/calm-ui";
import {
  createOutlet,
  listOutlets,
  updateOutlet,
  type OutletRecord
} from "@/lib/outlet/outlet-api";

const cardClass = "rounded-xl border border-border bg-card/80 p-5 shadow-sm dark:bg-card/50";
const inputClass =
  "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const outletQueryKey = ["ops", "outlets"] as const;

type OutletFormState = {
  name: string;
  category: string;
  distributorName: string;
  locationArea: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  isActive: boolean;
};

const blankForm: OutletFormState = {
  name: "",
  category: "",
  distributorName: "",
  locationArea: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  isActive: true
};

const toPayload = (state: OutletFormState) => ({
  name: state.name.trim(),
  category: state.category.trim(),
  distributorName: state.distributorName.trim(),
  locationArea: state.locationArea.trim(),
  ...(state.contactName.trim().length > 0 ? { contactName: state.contactName.trim() } : {}),
  ...(state.contactPhone.trim().length > 0 ? { contactPhone: state.contactPhone.trim() } : {}),
  ...(state.contactEmail.trim().length > 0 ? { contactEmail: state.contactEmail.trim() } : {}),
  isActive: state.isActive
});

export default function OpsOutletsPage(): ReactElement {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const [createForm, setCreateForm] = useState<OutletFormState>(blankForm);
  const [editingOutlet, setEditingOutlet] = useState<OutletRecord | null>(null);
  const [editForm, setEditForm] = useState<OutletFormState>(blankForm);
  const [formError, setFormError] = useState<string | null>(null);

  const outletsQuery = useQuery({
    queryKey: outletQueryKey,
    queryFn: async () => listOutlets(accessToken ?? ""),
    enabled: accessToken !== null
  });

  const createMutation = useMutation({
    mutationFn: async (payload: OutletFormState) =>
      createOutlet(accessToken ?? "", toPayload(payload)),
    onSuccess: async () => {
      setCreateForm(blankForm);
      await queryClient.invalidateQueries({ queryKey: outletQueryKey });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: OutletFormState }) =>
      updateOutlet(accessToken ?? "", id, toPayload(payload)),
    onSuccess: async () => {
      setEditingOutlet(null);
      await queryClient.invalidateQueries({ queryKey: outletQueryKey });
    }
  });

  const handleCreate = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setFormError(null);
    if (
      createForm.name.trim().length < 2 ||
      createForm.category.trim().length < 2 ||
      createForm.distributorName.trim().length < 2 ||
      createForm.locationArea.trim().length < 2
    ) {
      setFormError("Name, category, distributor and location/area are required.");
      return;
    }
    createMutation.mutate(createForm, {
      onError: (error: unknown) => {
        const message =
          error instanceof ApiError
            ? (error.problem?.detail ?? error.message)
            : "Could not create outlet.";
        setFormError(message);
      }
    });
  };

  const startEdit = (outlet: OutletRecord): void => {
    setFormError(null);
    setEditingOutlet(outlet);
    setEditForm({
      name: outlet.name,
      category: outlet.category,
      distributorName: outlet.distributorName,
      locationArea: outlet.locationArea,
      contactName: outlet.contactName ?? "",
      contactPhone: outlet.contactPhone ?? "",
      contactEmail: outlet.contactEmail ?? "",
      isActive: outlet.isActive
    });
  };

  const handleEditSave = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (editingOutlet === null) return;
    setFormError(null);
    updateMutation.mutate(
      { id: editingOutlet.id, payload: editForm },
      {
        onError: (error: unknown) => {
          const message =
            error instanceof ApiError
              ? (error.problem?.detail ?? error.message)
              : "Could not update outlet.";
          setFormError(message);
        }
      }
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Outlets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage outlet records (name, category, distributor, area and contacts).
        </p>
        <p className="mt-1 text-sm">
          <Link
            href="/ops/outlets/visits"
            className="text-primary underline-offset-4 hover:underline"
          >
            Open outlet visit reports
          </Link>
        </p>
      </div>

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-foreground">Create outlet</h2>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
          <label className="text-xs font-medium text-muted-foreground">
            Outlet name
            <input
              className={inputClass}
              value={createForm.name}
              onChange={(event) => {
                setCreateForm((prev) => ({ ...prev, name: event.target.value }));
              }}
              required
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Category
            <input
              className={inputClass}
              value={createForm.category}
              onChange={(event) => {
                setCreateForm((prev) => ({ ...prev, category: event.target.value }));
              }}
              required
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Distributor
            <input
              className={inputClass}
              value={createForm.distributorName}
              onChange={(event) => {
                setCreateForm((prev) => ({ ...prev, distributorName: event.target.value }));
              }}
              required
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Location / Area
            <input
              className={inputClass}
              value={createForm.locationArea}
              onChange={(event) => {
                setCreateForm((prev) => ({ ...prev, locationArea: event.target.value }));
              }}
              required
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Contact name
            <input
              className={inputClass}
              value={createForm.contactName}
              onChange={(event) => {
                setCreateForm((prev) => ({ ...prev, contactName: event.target.value }));
              }}
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Contact phone
            <input
              className={inputClass}
              value={createForm.contactPhone}
              onChange={(event) => {
                setCreateForm((prev) => ({ ...prev, contactPhone: event.target.value }));
              }}
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground md:col-span-2">
            Contact email
            <input
              className={inputClass}
              value={createForm.contactEmail}
              onChange={(event) => {
                setCreateForm((prev) => ({ ...prev, contactEmail: event.target.value }));
              }}
              type="email"
            />
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground md:col-span-2">
            <input
              type="checkbox"
              checked={createForm.isActive}
              onChange={(event) => {
                setCreateForm((prev) => ({ ...prev, isActive: event.target.checked }));
              }}
            />
            Active outlet
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              className={calmPrimaryButtonClass}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create outlet"}
            </button>
          </div>
        </form>
      </section>

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-foreground">Outlet database</h2>
        {outletsQuery.isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading...</p>
        ) : null}
        {outletsQuery.isError ? (
          <p className="mt-3 text-sm text-destructive">Could not load outlets.</p>
        ) : null}
        {outletsQuery.data?.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No outlets yet.</p>
        ) : null}
        {outletsQuery.data !== undefined && outletsQuery.data.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {outletsQuery.data.map((outlet) => (
              <li
                key={outlet.id}
                className="rounded-lg border border-border bg-muted/20 p-4 dark:bg-muted/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{outlet.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {outlet.category} · {outlet.distributorName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {outlet.locationArea}
                      {outlet.contactName ? ` · ${outlet.contactName}` : ""}
                      {outlet.contactPhone ? ` · ${outlet.contactPhone}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        outlet.isActive
                          ? "rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-400"
                          : "rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      }
                    >
                      {outlet.isActive ? "Active" : "Inactive"}
                    </span>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => {
                        startEdit(outlet);
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {editingOutlet !== null ? (
        <div className="fixed inset-0 z-100 flex items-end justify-center bg-background/70 p-4 backdrop-blur-sm sm:items-center">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground">Edit outlet</h2>
            <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleEditSave}>
              <label className="text-xs font-medium text-muted-foreground">
                Outlet name
                <input
                  className={inputClass}
                  value={editForm.name}
                  onChange={(event) => {
                    setEditForm((prev) => ({ ...prev, name: event.target.value }));
                  }}
                />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Category
                <input
                  className={inputClass}
                  value={editForm.category}
                  onChange={(event) => {
                    setEditForm((prev) => ({ ...prev, category: event.target.value }));
                  }}
                />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Distributor
                <input
                  className={inputClass}
                  value={editForm.distributorName}
                  onChange={(event) => {
                    setEditForm((prev) => ({ ...prev, distributorName: event.target.value }));
                  }}
                />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Location / Area
                <input
                  className={inputClass}
                  value={editForm.locationArea}
                  onChange={(event) => {
                    setEditForm((prev) => ({ ...prev, locationArea: event.target.value }));
                  }}
                />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Contact name
                <input
                  className={inputClass}
                  value={editForm.contactName}
                  onChange={(event) => {
                    setEditForm((prev) => ({ ...prev, contactName: event.target.value }));
                  }}
                />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Contact phone
                <input
                  className={inputClass}
                  value={editForm.contactPhone}
                  onChange={(event) => {
                    setEditForm((prev) => ({ ...prev, contactPhone: event.target.value }));
                  }}
                />
              </label>
              <label className="text-xs font-medium text-muted-foreground md:col-span-2">
                Contact email
                <input
                  className={inputClass}
                  type="email"
                  value={editForm.contactEmail}
                  onChange={(event) => {
                    setEditForm((prev) => ({ ...prev, contactEmail: event.target.value }));
                  }}
                />
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground md:col-span-2">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(event) => {
                    setEditForm((prev) => ({ ...prev, isActive: event.target.checked }));
                  }}
                />
                Active outlet
              </label>
              <div className="flex flex-col-reverse gap-2 md:col-span-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className={calmSecondaryButtonClass}
                  onClick={() => {
                    setEditingOutlet(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={calmPrimaryButtonClass}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {formError !== null ? (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      ) : null}
    </div>
  );
}
