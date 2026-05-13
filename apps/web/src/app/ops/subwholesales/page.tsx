"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type SyntheticEvent, type ReactElement, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { BoneyardInlineFallback } from "@/components/boneyard/boneyard-inline-fallback";
import { useAdminRegionListRegions } from "@/lib/api/generated/client";
import { ApiError } from "@/lib/api/problem-details";
import { useAuthStore } from "@/lib/auth/auth-store";
import { calmPrimaryButtonClass, calmSecondaryButtonClass } from "@/lib/calm-ui";
import { type RegionRow, parseRegionsFromOrval } from "@/lib/ops/ops-adapters";
import { slugifyRegionNamePreview } from "@/lib/ops/region-slug";
import {
  createSubwholesale,
  listSubwholesales,
  type SubwholesaleRecord,
  updateSubwholesale
} from "@/lib/subwholesale/subwholesale-api";
import { toast } from "@/lib/toast";

const cardClass = "rounded-xl border border-border bg-card/80 p-5 shadow-sm dark:bg-card/50";
const inputClass =
  "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const SELECT_ALL = "__all__";
const SELECT_NONE = "__none__";

const subwholesaleListKey = (regionFilter: string) =>
  ["ops", "subwholesales", regionFilter] as const;

export default function OpsSubwholesalesPage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const [regionFilter, setRegionFilter] = useState("");

  const regionsQuery = useAdminRegionListRegions({
    query: {
      enabled: accessToken !== null,
      select: (r) => parseRegionsFromOrval(r)
    }
  });

  const listQuery = useQuery({
    queryKey: subwholesaleListKey(regionFilter),
    queryFn: async () =>
      listSubwholesales(accessToken ?? "", regionFilter.length > 0 ? regionFilter : undefined),
    enabled: accessToken !== null
  });

  const invalidateList = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ["ops", "subwholesales"] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createSubwholesale>[1]) =>
      createSubwholesale(accessToken ?? "", payload),
    onSuccess: async () => {
      await invalidateList();
    }
  });

  const updateMutation = useMutation({
    mutationFn: (args: { id: string; body: Parameters<typeof updateSubwholesale>[2] }) =>
      updateSubwholesale(accessToken ?? "", args.id, args.body),
    onSuccess: async () => {
      await invalidateList();
    }
  });

  const [createRegionId, setCreateRegionId] = useState("");
  const [createName, setCreateName] = useState("");
  const [createActive, setCreateActive] = useState(true);
  const [createContactName, setCreateContactName] = useState("");
  const [createContactPhone, setCreateContactPhone] = useState("");
  const [createContactEmail, setCreateContactEmail] = useState("");
  const [createNotes, setCreateNotes] = useState("");

  const [editing, setEditing] = useState<SubwholesaleRecord | null>(null);
  const [editRegionId, setEditRegionId] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editName, setEditName] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editContactName, setEditContactName] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const createSlugPreview = slugifyRegionNamePreview(createName);

  const startEdit = (row: SubwholesaleRecord): void => {
    setEditing(row);
    setEditRegionId(row.regionId);
    setEditSlug(row.slug);
    setEditName(row.name);
    setEditActive(row.isActive);
    setEditContactName(row.contactName ?? "");
    setEditContactPhone(row.contactPhone ?? "");
    setEditContactEmail(row.contactEmail ?? "");
    setEditNotes(row.notes ?? "");
  };

  const cancelEdit = (): void => {
    setEditing(null);
  };

  const onCreateSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const name = createName.trim();
    if (createRegionId.length === 0) {
      toast.error("Select a parent region.");
      return;
    }
    if (!name) {
      toast.error("Display name is required.");
      return;
    }
    if (createSlugPreview.length < 2) {
      toast.error("Use a display name that yields a valid slug (at least 2 letters or numbers).");
      return;
    }
    createMutation.mutate(
      {
        regionId: createRegionId,
        name,
        isActive: createActive,
        ...(createContactName.trim() ? { contactName: createContactName.trim() } : {}),
        ...(createContactPhone.trim() ? { contactPhone: createContactPhone.trim() } : {}),
        ...(createContactEmail.trim() ? { contactEmail: createContactEmail.trim() } : {}),
        ...(createNotes.trim() ? { notes: createNotes.trim() } : {})
      },
      {
        onSuccess: () => {
          setCreateName("");
          setCreateContactName("");
          setCreateContactPhone("");
          setCreateContactEmail("");
          setCreateNotes("");
          toast.success("Subwholesale created.");
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
    if (editing === null) {
      return;
    }
    const slug = editSlug.trim().toLowerCase();
    const name = editName.trim();
    if (!slug || !name || editRegionId.length === 0) {
      toast.error("Region, slug, and name are required.");
      return;
    }
    updateMutation.mutate(
      {
        id: editing.id,
        body: {
          regionId: editRegionId,
          slug,
          name,
          isActive: editActive,
          contactName: editContactName.trim(),
          contactPhone: editContactPhone.trim(),
          contactEmail: editContactEmail.trim(),
          notes: editNotes.trim()
        }
      },
      {
        onSuccess: () => {
          cancelEdit();
          toast.success("Subwholesale updated.");
        },
        onError: (err: unknown) => {
          const msg =
            err instanceof ApiError ? (err.problem?.detail ?? err.message) : "Update failed.";
          toast.error(msg);
        }
      }
    );
  };

  const toggleQuick = (row: SubwholesaleRecord): void => {
    updateMutation.mutate(
      { id: row.id, body: { isActive: !row.isActive } },
      {
        onSuccess: () => {
          toast.success(row.isActive ? "Deactivated" : "Activated");
        },
        onError: (err: unknown) => {
          const msg =
            err instanceof ApiError ? (err.problem?.detail ?? err.message) : "Update failed.";
          toast.error(msg);
        }
      }
    );
  };

  const regions: RegionRow[] = regionsQuery.data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Subwholesales</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Wholesale nodes under a sales region (e.g. distributor hub). Each has a slug unique within
          its parent region.
        </p>
      </div>

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-foreground">Filter</h2>
        <label className="mt-3 block text-xs font-medium text-muted-foreground">
          Region
          <Select
            value={regionFilter.length > 0 ? regionFilter : SELECT_ALL}
            onValueChange={(value) => {
              setRegionFilter(value === SELECT_ALL ? "" : value);
            }}
          >
            <SelectTrigger className="mt-1 max-w-md">
              <SelectValue placeholder="All regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SELECT_ALL}>All regions</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </section>

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-foreground">Create subwholesale</h2>
        <form className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={onCreateSubmit}>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Parent region</label>
            <Select
              value={createRegionId.length > 0 ? createRegionId : SELECT_NONE}
              onValueChange={(value) => {
                setCreateRegionId(value === SELECT_NONE ? "" : value);
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_NONE}>Select region</SelectItem>
                {regions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="sw-name">
              Display name
            </label>
            <input
              id="sw-name"
              className={inputClass}
              value={createName}
              onChange={(e) => {
                setCreateName(e.target.value);
              }}
              placeholder="West distributor hub"
              required
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {createSlugPreview.length >= 2 ? (
                <>
                  Generated slug:{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-foreground">
                    {createSlugPreview}
                  </code>
                </>
              ) : (
                "Slug is derived from the name (same rules as regions)."
              )}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Contact name</label>
            <input
              className={inputClass}
              value={createContactName}
              onChange={(e) => {
                setCreateContactName(e.target.value);
              }}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Contact phone</label>
            <input
              className={inputClass}
              value={createContactPhone}
              onChange={(e) => {
                setCreateContactPhone(e.target.value);
              }}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Contact email</label>
            <input
              type="email"
              className={inputClass}
              value={createContactEmail}
              onChange={(e) => {
                setCreateContactEmail(e.target.value);
              }}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <textarea
              className={`${inputClass} min-h-20`}
              value={createNotes}
              onChange={(e) => {
                setCreateNotes(e.target.value);
              }}
            />
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
              {createMutation.isPending ? "Creating…" : "Create subwholesale"}
            </button>
          </div>
        </form>
      </section>

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-foreground">All subwholesales</h2>
        {listQuery.isLoading ? (
          <BoneyardInlineFallback name="ops-subwholesales-list" className="mt-3 min-h-[12rem]" />
        ) : null}
        {listQuery.isError ? (
          <p className="mt-3 text-sm text-destructive">Could not load subwholesales.</p>
        ) : null}
        {listQuery.data?.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No rows match this filter.</p>
        ) : null}
        <div className="mt-4 hidden lg:block">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-3 py-2 font-medium text-foreground">Region</th>
                  <th className="px-3 py-2 font-medium text-foreground">Name</th>
                  <th className="px-3 py-2 font-medium text-foreground">Slug</th>
                  <th className="px-3 py-2 font-medium text-foreground">Id</th>
                  <th className="px-3 py-2 font-medium text-foreground">Active</th>
                  <th className="px-3 py-2 font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listQuery.data?.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-foreground">{row.region.name}</td>
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
                            toast.success("Id copied");
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
          {listQuery.data?.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-border bg-muted/20 p-4 dark:bg-muted/10"
            >
              <p className="font-medium text-foreground">{row.name}</p>
              <p className="text-xs text-muted-foreground">
                {row.region.name} · {row.slug}
              </p>
              <p className="mt-2 break-all font-mono text-[11px] text-foreground">{row.id}</p>
              <div className="mt-3 flex flex-wrap gap-3">
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

      {editing !== null ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-4 backdrop-blur-sm sm:items-center">
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl"
            role="dialog"
            aria-labelledby="edit-sw-title"
          >
            <h2 id="edit-sw-title" className="text-lg font-semibold text-foreground">
              Edit subwholesale
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">Id: {editing.id}</p>
            <form className="mt-4 space-y-3" onSubmit={onEditSubmit}>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Region</label>
                <Select value={editRegionId} onValueChange={setEditRegionId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground" htmlFor="ed-sw-slug">
                  Slug
                </label>
                <input
                  id="ed-sw-slug"
                  className={inputClass}
                  value={editSlug}
                  onChange={(e) => {
                    setEditSlug(e.target.value);
                  }}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground" htmlFor="ed-sw-name">
                  Display name
                </label>
                <input
                  id="ed-sw-name"
                  className={inputClass}
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                  }}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Contact name</label>
                <input
                  className={inputClass}
                  value={editContactName}
                  onChange={(e) => {
                    setEditContactName(e.target.value);
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Contact phone</label>
                <input
                  className={inputClass}
                  value={editContactPhone}
                  onChange={(e) => {
                    setEditContactPhone(e.target.value);
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Contact email</label>
                <input
                  type="email"
                  className={inputClass}
                  value={editContactEmail}
                  onChange={(e) => {
                    setEditContactEmail(e.target.value);
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
                <textarea
                  className={`${inputClass} min-h-20`}
                  value={editNotes}
                  onChange={(e) => {
                    setEditNotes(e.target.value);
                  }}
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
