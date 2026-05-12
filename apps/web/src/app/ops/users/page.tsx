"use client";

import { useQueryClient } from "@tanstack/react-query";
import { type SyntheticEvent, type ReactElement, useState } from "react";

import {
  getAdminUserListUsersQueryKey,
  useAdminRegionListRegions,
  useAdminUserCreateUser,
  useAdminUserListUsers,
  useAdminUserUpdateUser
} from "@/lib/api/generated/client";
import type { AdminUserUpdateUserBody } from "@/lib/api/generated/model";
import { AdminUserCreateUserBodyRole } from "@/lib/api/generated/model";
import { ApiError } from "@/lib/api/problem-details";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useAuthStore } from "@/lib/auth/auth-store";
import { calmPrimaryButtonClass, calmSecondaryButtonClass } from "@/lib/calm-ui";
import {
  type AdminUserRow,
  parseAdminUserFromOrval,
  parseAdminUsersFromOrval,
  parseRegionsFromOrval
} from "@/lib/ops/ops-adapters";
import { toast } from "@/lib/toast";

const cardClass = "rounded-xl border border-border bg-card/80 p-5 shadow-sm dark:bg-card/50";

const inputClass =
  "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const ALL_ROLES = [
  AdminUserCreateUserBodyRole.promoter,
  AdminUserCreateUserBodyRole.client,
  AdminUserCreateUserBodyRole.supervisor,
  AdminUserCreateUserBodyRole.admin
] as const;

const FIELD_ROLES = [
  AdminUserCreateUserBodyRole.promoter,
  AdminUserCreateUserBodyRole.client
] as const;

/** Radix Select requires a non-empty value; map to/from optional region & gender. */
const SELECT_NONE = "__none__";

export default function OpsUsersPage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const isAdmin = currentUser?.role === "admin";
  const creatableRoles = isAdmin ? ALL_ROLES : FIELD_ROLES;

  const usersQuery = useAdminUserListUsers({
    query: {
      enabled: accessToken !== null,
      select: (r) => parseAdminUsersFromOrval(r)
    }
  });

  const regionsQuery = useAdminRegionListRegions({
    query: {
      enabled: accessToken !== null,
      select: (r) => parseRegionsFromOrval(r)
    }
  });

  const createMutation = useAdminUserCreateUser({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getAdminUserListUsersQueryKey() });
      }
    }
  });

  const updateMutation = useAdminUserUpdateUser({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getAdminUserListUsersQueryKey() });
      }
    }
  });

  const [createFullName, setCreateFullName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createRole, setCreateRole] = useState<(typeof ALL_ROLES)[number]>(
    AdminUserCreateUserBodyRole.promoter
  );
  const [createRegionId, setCreateRegionId] = useState("");
  const [createGender, setCreateGender] = useState<"" | "male" | "female" | "other">("");
  const [formError, setFormError] = useState<string | null>(null);

  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState<(typeof ALL_ROLES)[number]>(
    AdminUserCreateUserBodyRole.promoter
  );
  const [editRegionId, setEditRegionId] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editGender, setEditGender] = useState<"" | "male" | "female" | "other">("");

  const supervisorCanEdit = (row: AdminUserRow): boolean => {
    if (isAdmin) {
      return true;
    }
    return row.role !== "supervisor" && row.role !== "admin";
  };

  const startEdit = (row: AdminUserRow): void => {
    setFormError(null);
    setEditing(row);
    setEditFullName(row.fullName);
    setEditRole(row.role);
    setEditRegionId(row.regionId ?? "");
    setEditActive(row.isActive);
    setEditGender(row.gender ?? "");
  };

  const cancelEdit = (): void => {
    setFormError(null);
    setEditing(null);
  };

  const onCreateSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setFormError(null);
    const fullName = createFullName.trim();
    const phone = createPhone.trim();
    if (!fullName || !phone) {
      toast.error("Full name and phone are required.");
      return;
    }
    createMutation.mutate(
      {
        data: {
          fullName,
          phone,
          role: createRole,
          ...(createRegionId ? { regionId: createRegionId } : {}),
          ...(createGender ? { gender: createGender } : {})
        }
      },
      {
        onSuccess: (result: unknown) => {
          try {
            const user = parseAdminUserFromOrval(result);
            toast.success("User invited", {
              description: `${user.fullName} · ${user.phone} · Access code: ${user.uniqueCode}`
            });
          } catch {
            toast.success("User invited", {
              description:
                "Sign-in SMS sent. Find the new user in the list below to copy the access code."
            });
          }
          setCreateFullName("");
          setCreatePhone("");
          setCreateRole(AdminUserCreateUserBodyRole.promoter);
          setCreateRegionId("");
          setCreateGender("");
        },
        onError: (err: unknown) => {
          const msg =
            err instanceof ApiError ? (err.problem?.detail ?? err.message) : "Create failed.";
          toast.error("Could not invite user", { description: msg });
        }
      }
    );
  };

  const onEditSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!editing) return;
    setFormError(null);
    const fullName = editFullName.trim();
    if (!fullName) {
      setFormError("Full name is required.");
      return;
    }
    const body: AdminUserUpdateUserBody = {
      fullName,
      role: editRole,
      isActive: editActive
    };
    if (editGender) {
      body.gender = editGender;
    }
    const regionChanged = (editing.regionId ?? "") !== editRegionId;
    if (regionChanged) {
      body.regionId = editRegionId.length > 0 ? editRegionId : null;
    }
    updateMutation.mutate(
      { id: editing.id, data: body },
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

  const toggleQuickActive = (row: AdminUserRow): void => {
    if (currentUser?.id === row.id) {
      return;
    }
    updateMutation.mutate({
      id: row.id,
      data: { isActive: !row.isActive }
    });
  };

  const roleOptionsForEdit = isAdmin ? ALL_ROLES : FIELD_ROLES;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Users</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Invite field and ops accounts with phone and access code.
          {isAdmin ? (
            <>
              {" "}
              New users are only created after the invite SMS is delivered (
              <code className="text-xs">MNOTIFY_SMS_API_KEY</code> or{" "}
              <code className="text-xs">MNOTIFY_KEY</code>; current mNotify keys use API v2 by
              default; failures roll back the user).
            </>
          ) : (
            " New users are only saved if the invite SMS is sent successfully."
          )}{" "}
          Supervisors manage promoters and clients; only admins can create or edit supervisor and
          admin accounts.
        </p>
      </div>

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-foreground">Invite user</h2>
        <form className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={onCreateSubmit}>
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="u-name">
              Full name
            </label>
            <input
              id="u-name"
              className={inputClass}
              value={createFullName}
              onChange={(e) => {
                setCreateFullName(e.target.value);
              }}
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="u-phone">
              Phone
            </label>
            <input
              id="u-phone"
              className={inputClass}
              value={createPhone}
              onChange={(e) => {
                setCreatePhone(e.target.value);
              }}
              placeholder="0244123456"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="u-role">
              Role
            </label>
            <Select
              value={createRole}
              onValueChange={(value) => {
                setCreateRole(value as (typeof ALL_ROLES)[number]);
              }}
            >
              <SelectTrigger className="mt-1" id="u-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {creatableRoles.map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="u-region">
              Region (optional)
            </label>
            <Select
              value={createRegionId.length > 0 ? createRegionId : SELECT_NONE}
              onValueChange={(value) => {
                setCreateRegionId(value === SELECT_NONE ? "" : value);
              }}
            >
              <SelectTrigger className="mt-1" id="u-region">
                <SelectValue placeholder="— None —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_NONE}>— None —</SelectItem>
                {regionsQuery.data?.map((reg) => (
                  <SelectItem key={reg.id} value={reg.id}>
                    {reg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="u-gender">
              Gender (optional)
            </label>
            <Select
              value={createGender.length > 0 ? createGender : SELECT_NONE}
              onValueChange={(value) => {
                setCreateGender(
                  value === SELECT_NONE ? "" : (value as "male" | "female" | "other")
                );
              }}
            >
              <SelectTrigger className="mt-1" id="u-gender">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_NONE}>—</SelectItem>
                <SelectItem value="male">male</SelectItem>
                <SelectItem value="female">female</SelectItem>
                <SelectItem value="other">other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              className={calmPrimaryButtonClass}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating…" : "Create & send invite"}
            </button>
          </div>
        </form>
        {formError ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
      </section>

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-foreground">All users</h2>
        {usersQuery.isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
        ) : null}
        {usersQuery.isError ? (
          <p className="mt-3 text-sm text-destructive">Could not load users.</p>
        ) : null}
        {usersQuery.data?.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No users in this list.</p>
        ) : null}
        <div className="mt-4 hidden xl:block">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-3 py-2 font-medium text-foreground">Name</th>
                  <th className="px-3 py-2 font-medium text-foreground">Role</th>
                  <th className="px-3 py-2 font-medium text-foreground">Phone</th>
                  <th className="px-3 py-2 font-medium text-foreground">Access code</th>
                  <th className="px-3 py-2 font-medium text-foreground">Region</th>
                  <th className="px-3 py-2 font-medium text-foreground">Active</th>
                  <th className="px-3 py-2 font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersQuery.data?.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-foreground">
                      <span className="font-medium">{row.fullName}</span>
                      <p className="text-xs text-muted-foreground">{row.email ?? "—"}</p>
                    </td>
                    <td className="px-3 py-2 capitalize text-muted-foreground">{row.role}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.phone}</td>
                    <td className="px-3 py-2">
                      <code className="text-xs text-foreground">{row.uniqueCode}</code>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{row.region?.name ?? "—"}</td>
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
                            void navigator.clipboard.writeText(row.uniqueCode);
                          }}
                        >
                          Copy code
                        </button>
                        {supervisorCanEdit(row) ? (
                          <button
                            type="button"
                            className="text-xs font-medium text-primary hover:underline"
                            onClick={() => {
                              startEdit(row);
                            }}
                          >
                            Edit
                          </button>
                        ) : null}
                        {supervisorCanEdit(row) ? (
                          <button
                            type="button"
                            className="text-xs font-medium text-muted-foreground hover:text-foreground"
                            disabled={updateMutation.isPending || currentUser?.id === row.id}
                            onClick={() => {
                              toggleQuickActive(row);
                            }}
                          >
                            {row.isActive ? "Deactivate" : "Activate"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <ul className="mt-4 flex flex-col gap-3 xl:hidden">
          {usersQuery.data?.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-border bg-muted/20 p-4 dark:bg-muted/10"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{row.fullName}</p>
                  <p className="text-xs capitalize text-muted-foreground">{row.role}</p>
                  <p className="mt-2 font-mono text-[11px] text-foreground">{row.uniqueCode}</p>
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
                {supervisorCanEdit(row) ? (
                  <button
                    type="button"
                    className="text-sm font-medium text-primary"
                    onClick={() => {
                      startEdit(row);
                    }}
                  >
                    Edit
                  </button>
                ) : null}
                {supervisorCanEdit(row) ? (
                  <button
                    type="button"
                    className="text-sm text-muted-foreground"
                    disabled={updateMutation.isPending || currentUser?.id === row.id}
                    onClick={() => {
                      toggleQuickActive(row);
                    }}
                  >
                    Toggle active
                  </button>
                ) : null}
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
            aria-labelledby="edit-user-title"
          >
            <h2 id="edit-user-title" className="text-lg font-semibold text-foreground">
              Edit user
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Id: <code className="text-foreground">{editing.id}</code> · Access code:{" "}
              <code className="text-foreground">{editing.uniqueCode}</code>
            </p>
            <form className="mt-4 space-y-3" onSubmit={onEditSubmit}>
              <div>
                <label className="text-xs font-medium text-muted-foreground" htmlFor="eu-name">
                  Full name
                </label>
                <input
                  id="eu-name"
                  className={inputClass}
                  value={editFullName}
                  onChange={(e) => {
                    setEditFullName(e.target.value);
                  }}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground" htmlFor="eu-role">
                  Role
                </label>
                <Select
                  value={editRole}
                  onValueChange={(value) => {
                    setEditRole(value as (typeof ALL_ROLES)[number]);
                  }}
                >
                  <SelectTrigger className="mt-1" id="eu-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptionsForEdit.map((r) => (
                      <SelectItem key={r} value={r} className="capitalize">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground" htmlFor="eu-region">
                  Region
                </label>
                <Select
                  value={editRegionId.length > 0 ? editRegionId : SELECT_NONE}
                  onValueChange={(value) => {
                    setEditRegionId(value === SELECT_NONE ? "" : value);
                  }}
                >
                  <SelectTrigger className="mt-1" id="eu-region">
                    <SelectValue placeholder="— None assigned —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NONE}>— None assigned —</SelectItem>
                    {regionsQuery.data?.map((reg) => (
                      <SelectItem key={reg.id} value={reg.id}>
                        {reg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Assign a territory or choose &quot;None&quot; to remove the user&apos;s region.
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground" htmlFor="eu-gender">
                  Gender
                </label>
                <Select
                  value={editGender.length > 0 ? editGender : SELECT_NONE}
                  onValueChange={(value) => {
                    setEditGender(
                      value === SELECT_NONE ? "" : (value as "male" | "female" | "other")
                    );
                  }}
                >
                  <SelectTrigger className="mt-1" id="eu-gender">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NONE}>—</SelectItem>
                    <SelectItem value="male">male</SelectItem>
                    <SelectItem value="female">female</SelectItem>
                    <SelectItem value="other">other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={editActive}
                  disabled={currentUser?.id === editing.id}
                  onChange={(e) => {
                    setEditActive(e.target.checked);
                  }}
                />
                Active
              </label>
              {currentUser?.id === editing.id ? (
                <p className="text-xs text-muted-foreground">
                  You cannot deactivate yourself here.
                </p>
              ) : null}
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
            {formError ? (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
