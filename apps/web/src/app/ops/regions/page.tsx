"use client";

import { useQueryClient } from "@tanstack/react-query";
import { type SyntheticEvent, type ReactElement, useState } from "react";

import {
  getAdminRegionListRegionsQueryKey,
  useAdminRegionCreateRegion,
  useAdminRegionListRegions,
  useAdminRegionUpdateRegion
} from "@/lib/api/generated/client";
import { ApiError } from "@/lib/api/problem-details";
import { useAuthStore } from "@/lib/auth/auth-store";
import { calmPrimaryButtonClass, calmSecondaryButtonClass } from "@/lib/calm-ui";
import { type RegionRow, parseRegionsFromOrval } from "@/lib/ops/ops-adapters";
import { slugifyRegionNamePreview } from "@/lib/ops/region-slug";
import { toast } from "@/lib/toast";

const cardClass = "rounded-xl border border-border bg-card/80 p-5 shadow-sm dark:bg-card/50";

const inputClass =
  "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function OpsRegionsPage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAdmin = useAuthStore((state) => state.user?.role === "admin");
  const queryClient = useQueryClient();

  const regionsQuery = useAdminRegionListRegions({
    query: {
      enabled: accessToken !== null,
      select: (r) => parseRegionsFromOrval(r)
    }
  });

  const createMutation = useAdminRegionCreateRegion({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getAdminRegionListRegionsQueryKey() });
      }
    }
  });

  const updateMutation = useAdminRegionUpdateRegion({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getAdminRegionListRegionsQueryKey() });
      }
    }
  });

  const [createName, setCreateName] = useState("");
  const [createActive, setCreateActive] = useState(true);

  const [editing, setEditing] = useState<RegionRow | null>(null);
  const [editSlug, setEditSlug] = useState("");
  const [editName, setEditName] = useState("");
  const [editActive, setEditActive] = useState(true);

  const startEdit = (row: RegionRow): void => {
    setEditing(row);
    setEditSlug(row.slug);
    setEditName(row.name);
    setEditActive(row.isActive);
  };

  const cancelEdit = (): void => {
    setEditing(null);
  };

  const createSlugPreview = slugifyRegionNamePreview(createName);

  const onCreateSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const name = createName.trim();
    if (!name) {
      toast.error("Display name is required.");
      return;
    }
    if (createSlugPreview.length < 2) {
      toast.error(
        "Use a display name that includes at least 2 letters or numbers for the generated key (e.g. Nairobi West)."
      );
      return;
    }
    createMutation.mutate(
      {
        data: { name, isActive: createActive }
      },
      {
        onSuccess: () => {
          setCreateName("");
          setCreateActive(true);
          toast.success("Region created");
        },
        onError: (err: unknown) => {
          const msg =
            err instanceof ApiError ? (err.problem?.detail ?? err.message) : "Create failed.";
          toast.error(msg);
        }
      }
    );
  };

  const onEditSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!editing) return;
    const slug = editSlug.trim().toLowerCase();
    const name = editName.trim();
    if (!slug || !name) {
      toast.error("Slug and name are required.");
      return;
    }
    updateMutation.mutate(
      {
        id: editing.id,
        data: { slug, name, isActive: editActive }
      },
      {
        onSuccess: () => {
          cancelEdit();
          toast.success("Region updated");
        },
        onError: (err: unknown) => {
          const msg =
            err instanceof ApiError ? (err.problem?.detail ?? err.message) : "Update failed.";
          toast.error(msg);
        }
      }
    );
  };

  const toggleQuick = (row: RegionRow): void => {
    updateMutation.mutate(
      {
        id: row.id,
        data: { isActive: !row.isActive }
      },
      {
        onSuccess: () => {
          toast.success(row.isActive ? "Region deactivated" : "Region activated");
        },
        onError: (err: unknown) => {
          const msg =
            err instanceof ApiError ? (err.problem?.detail ?? err.message) : "Update failed.";
          toast.error(msg);
        }
      }
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Regions</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Sales territories for user assignment. New regions derive a slug from the display name;
          edit an existing row to change slug or name.
          {isAdmin ? (
            <>
              {" "}
              Profile APIs use the region id (cuid) in <code className="text-xs">regionId</code>
              —copy it from the table when configuring users.
            </>
          ) : (
            " Copy the region id from the table when assigning users to a territory."
          )}
        </p>
      </div>

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-foreground">Create region</h2>
        <form className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={onCreateSubmit}>
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="reg-name">
              Display name
            </label>
            <input
              id="reg-name"
              className={inputClass}
              value={createName}
              onChange={(e) => {
                setCreateName(e.target.value);
              }}
              placeholder="Nairobi West"
              required
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {createSlugPreview.length >= 2 ? (
                <>
                  Generated slug:{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-foreground">
                    {createSlugPreview}
                  </code>
                  . If that key already exists, the server adds a numeric suffix.
                </>
              ) : (
                "Slug is generated from this name once it contains at least 2 letters or numbers."
              )}
            </p>
          </div>
          <div className="flex items-end gap-2">
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
          <div className="flex items-end sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              className={calmPrimaryButtonClass}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating…" : "Create region"}
            </button>
          </div>
        </form>
      </section>

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-foreground">All regions</h2>
        {regionsQuery.isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
        ) : null}
        {regionsQuery.isError ? (
          <p className="mt-3 text-sm text-destructive">Could not load regions.</p>
        ) : null}
        {regionsQuery.data?.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No regions yet. Create one above.</p>
        ) : null}
        <div className="mt-4 hidden lg:block">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-3 py-2 font-medium text-foreground">Name</th>
                  <th className="px-3 py-2 font-medium text-foreground">Slug</th>
                  <th className="px-3 py-2 font-medium text-foreground">Id (for regionId)</th>
                  <th className="px-3 py-2 font-medium text-foreground">Active</th>
                  <th className="px-3 py-2 font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {regionsQuery.data?.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-foreground">{row.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.slug}</td>
                    <td className="px-3 py-2">
                      <code className="break-all text-xs text-foreground">{row.id}</code>
                    </td>
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
                            void navigator.clipboard.writeText(row.id);
                            toast.success("Region id copied");
                          }}
                        >
                          Copy id
                        </button>
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
          {regionsQuery.data?.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-border bg-muted/20 p-4 dark:bg-muted/10"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{row.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{row.slug}</p>
                  <p className="mt-2 break-all font-mono text-[11px] text-foreground">{row.id}</p>
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
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="text-sm font-medium text-primary"
                  onClick={() => {
                    void navigator.clipboard.writeText(row.id);
                    toast.success("Region id copied");
                  }}
                >
                  Copy id
                </button>
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
        <div className="fixed inset-0 z-1000 flex items-end justify-center bg-background/70 p-4 backdrop-blur-sm sm:items-center">
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl"
            role="dialog"
            aria-labelledby="edit-region-title"
          >
            <h2 id="edit-region-title" className="text-lg font-semibold text-foreground">
              Edit region
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">Id stays the same: {editing.id}</p>
            <form className="mt-4 space-y-3" onSubmit={onEditSubmit}>
              <div>
                <label className="text-xs font-medium text-muted-foreground" htmlFor="ed-slug">
                  Slug
                </label>
                <input
                  id="ed-slug"
                  className={inputClass}
                  value={editSlug}
                  onChange={(e) => {
                    setEditSlug(e.target.value);
                  }}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground" htmlFor="ed-name">
                  Display name
                </label>
                <input
                  id="ed-name"
                  className={inputClass}
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                  }}
                  required
                />
              </div>
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
