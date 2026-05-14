"use client";

import { useQueryClient } from "@tanstack/react-query";
import { type ReactElement, type SyntheticEvent, useMemo, useState } from "react";

import { BoneyardInlineFallback } from "@/components/boneyard/boneyard-inline-fallback";
import { GeofenceLocationEditor } from "@/components/geofence-location-editor";
import {
  getAdminGeofenceListGeofencesQueryKey,
  useAdminGeofenceCreateGeofence,
  useAdminGeofenceListGeofences,
  useAdminGeofenceUpdateGeofence
} from "@/lib/api/generated/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { ApiError } from "@/lib/api/problem-details";
import { calmPrimaryButtonClass, calmSecondaryButtonClass } from "@/lib/calm-ui";
import { type GeofenceRow, parseGeofencesFromOrval } from "@/lib/ops/ops-adapters";

const cardClass = "rounded-xl border border-border bg-card/80 p-5 shadow-sm dark:bg-card/50";

const inputClass =
  "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const toMapZones = (rows: GeofenceRow[]) =>
  rows.map((row) => ({
    id: row.id,
    label: row.label,
    centerLatitude: row.centerLatitude,
    centerLongitude: row.centerLongitude,
    radiusMeters: row.radiusMeters
  }));

export default function OpsGeofencesPage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  const geofencesQuery = useAdminGeofenceListGeofences({
    query: {
      enabled: accessToken !== null,
      select: (r) => parseGeofencesFromOrval(r)
    }
  });

  const createMutation = useAdminGeofenceCreateGeofence({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getAdminGeofenceListGeofencesQueryKey() });
      }
    }
  });

  const updateMutation = useAdminGeofenceUpdateGeofence({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getAdminGeofenceListGeofencesQueryKey() });
      }
    }
  });

  const [createLabel, setCreateLabel] = useState("");
  const [createLat, setCreateLat] = useState("");
  const [createLng, setCreateLng] = useState("");
  const [createRadius, setCreateRadius] = useState("5000");
  const [createActive, setCreateActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const [editing, setEditing] = useState<GeofenceRow | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editLat, setEditLat] = useState("");
  const [editLng, setEditLng] = useState("");
  const [editRadius, setEditRadius] = useState("");
  const [editActive, setEditActive] = useState(true);

  const startEdit = (row: GeofenceRow): void => {
    setEditing(row);
    setEditLabel(row.label);
    setEditLat(String(row.centerLatitude));
    setEditLng(String(row.centerLongitude));
    setEditRadius(String(row.radiusMeters));
    setEditActive(row.isActive);
  };

  const cancelEdit = (): void => {
    setEditing(null);
  };

  const onCreateSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setFormError(null);
    const lat = Number(createLat);
    const lng = Number(createLng);
    const radius = Number(createRadius);
    if (!createLabel.trim() || Number.isNaN(lat) || Number.isNaN(lng) || Number.isNaN(radius)) {
      setFormError("Fill in label and valid numbers for coordinates and radius.");
      return;
    }
    createMutation.mutate(
      {
        data: {
          label: createLabel.trim(),
          centerLatitude: lat,
          centerLongitude: lng,
          radiusMeters: radius,
          isActive: createActive
        }
      },
      {
        onSuccess: () => {
          setCreateLabel("");
          setCreateLat("");
          setCreateLng("");
          setCreateRadius("5000");
          setCreateActive(true);
        },
        onError: (err: unknown) => {
          const msg =
            err instanceof ApiError ? (err.problem?.detail ?? err.message) : "Create failed.";
          setFormError(msg);
        }
      }
    );
  };

  const onEditSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!editing) return;
    const lat = Number(editLat);
    const lng = Number(editLng);
    const radius = Number(editRadius);
    if (!editLabel.trim() || Number.isNaN(lat) || Number.isNaN(lng) || Number.isNaN(radius)) {
      setFormError("Invalid edit values.");
      return;
    }
    setFormError(null);
    updateMutation.mutate(
      {
        id: editing.id,
        data: {
          label: editLabel.trim(),
          centerLatitude: lat,
          centerLongitude: lng,
          radiusMeters: radius,
          isActive: editActive
        }
      },
      {
        onSuccess: () => {
          cancelEdit();
        },
        onError: (err: unknown) => {
          const msg =
            err instanceof ApiError ? (err.problem?.detail ?? err.message) : "Update failed.";
          setFormError(msg);
        }
      }
    );
  };

  const toggleQuick = (row: GeofenceRow): void => {
    updateMutation.mutate({
      id: row.id,
      data: { isActive: !row.isActive }
    });
  };

  const otherZonesForCreate = useMemo(
    () => toMapZones(geofencesQuery.data ?? []),
    [geofencesQuery.data]
  );

  const otherZonesForEdit = useMemo(() => {
    if (!editing) return [];
    return toMapZones((geofencesQuery.data ?? []).filter((row) => row.id !== editing.id));
  }, [geofencesQuery.data, editing]);

  const createErrUnknown: unknown = createMutation.error;
  const createApiErr =
    createErrUnknown instanceof ApiError
      ? (createErrUnknown.problem?.detail ?? createErrUnknown.message)
      : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Work areas (geofences)
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Circular zones used at sign-in: when any area is active, users must be inside at least one
          active circle to log in. Search for a place, use your location, or click the map to set
          the center; adjust radius in meters as needed.
        </p>
      </div>

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-foreground">Create work area</h2>
        <form className="mt-4 space-y-4" onSubmit={onCreateSubmit}>
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-0 flex-1 sm:max-w-md">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="gf-label">
                Label
              </label>
              <input
                id="gf-label"
                className={inputClass}
                value={createLabel}
                onChange={(e) => {
                  setCreateLabel(e.target.value);
                }}
                placeholder="Nairobi CBD"
                required
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={createActive}
                onChange={(e) => {
                  setCreateActive(e.target.checked);
                }}
              />
              Active
            </label>
          </div>
          <GeofenceLocationEditor
            fieldIdPrefix="create-gf"
            latitude={createLat}
            longitude={createLng}
            onLatitudeChange={setCreateLat}
            onLongitudeChange={setCreateLng}
            radiusMeters={createRadius}
            onRadiusChange={setCreateRadius}
            otherZones={otherZonesForCreate}
            onSuggestLabel={(short) => {
              setCreateLabel((prev) => (prev.trim() ? prev : short));
            }}
          />
          <div>
            <button
              type="submit"
              className={calmPrimaryButtonClass}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating…" : "Create work area"}
            </button>
          </div>
        </form>
        {formError ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
        {createApiErr ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {createApiErr}
          </p>
        ) : null}
      </section>

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-foreground">Existing areas</h2>
        {geofencesQuery.isLoading ? (
          <BoneyardInlineFallback name="ops-geofences-list" className="mt-3 min-h-[12rem]" />
        ) : null}
        {geofencesQuery.isError ? (
          <p className="mt-3 text-sm text-destructive">Could not load geofences.</p>
        ) : null}
        {geofencesQuery.data?.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No work areas yet. Create one above.</p>
        ) : null}
        <div className="mt-4 hidden lg:block">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-3 py-2 font-medium text-foreground">Label</th>
                  <th className="px-3 py-2 font-medium text-foreground">Center</th>
                  <th className="px-3 py-2 font-medium text-foreground">Radius (m)</th>
                  <th className="px-3 py-2 font-medium text-foreground">Active</th>
                  <th className="px-3 py-2 font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {geofencesQuery.data?.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-foreground">{row.label}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.centerLatitude.toFixed(5)}, {row.centerLongitude.toFixed(5)}
                    </td>
                    <td className="px-3 py-2 text-foreground">{row.radiusMeters}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          row.isActive
                            ? "rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-400"
                            : "rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        }
                      >
                        {row.isActive ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="text-xs font-medium text-primary hover:underline"
                          onClick={() => {
                            startEdit(row);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-xs font-medium text-muted-foreground hover:text-foreground"
                          disabled={updateMutation.isPending}
                          onClick={() => {
                            toggleQuick(row);
                          }}
                        >
                          {row.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <ul className="mt-4 flex flex-col gap-3 lg:hidden">
          {geofencesQuery.data?.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-border bg-muted/20 p-4 dark:bg-muted/10"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{row.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.centerLatitude.toFixed(5)}, {row.centerLongitude.toFixed(5)} ·{" "}
                    {row.radiusMeters}m
                  </p>
                </div>
                <span
                  className={
                    row.isActive
                      ? "shrink-0 rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-400"
                      : "shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs"
                  }
                >
                  {row.isActive ? "Active" : "Off"}
                </span>
              </div>
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  className="text-sm font-medium text-primary"
                  onClick={() => {
                    startEdit(row);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="text-sm text-muted-foreground"
                  disabled={updateMutation.isPending}
                  onClick={() => {
                    toggleQuick(row);
                  }}
                >
                  Toggle active
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {editing ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-background/70 p-4 backdrop-blur-sm sm:items-center">
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl"
            role="dialog"
            aria-labelledby="edit-geofence-title"
          >
            <h2 id="edit-geofence-title" className="text-lg font-semibold text-foreground">
              Edit work area
            </h2>
            <form className="mt-4 space-y-4" onSubmit={onEditSubmit}>
              <div>
                <label className="text-xs font-medium text-muted-foreground" htmlFor="ed-label">
                  Label
                </label>
                <input
                  id="ed-label"
                  className={inputClass}
                  value={editLabel}
                  onChange={(e) => {
                    setEditLabel(e.target.value);
                  }}
                  required
                />
              </div>
              <GeofenceLocationEditor
                fieldIdPrefix="edit-gf"
                latitude={editLat}
                longitude={editLng}
                onLatitudeChange={setEditLat}
                onLongitudeChange={setEditLng}
                radiusMeters={editRadius}
                onRadiusChange={setEditRadius}
                otherZones={otherZonesForEdit}
                onSuggestLabel={(short) => {
                  setEditLabel((prev) => (prev.trim() ? prev : short));
                }}
              />
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={editActive}
                  onChange={(e) => {
                    setEditActive(e.target.checked);
                  }}
                />
                Active
              </label>
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button type="button" className={calmSecondaryButtonClass} onClick={cancelEdit}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className={calmPrimaryButtonClass}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
