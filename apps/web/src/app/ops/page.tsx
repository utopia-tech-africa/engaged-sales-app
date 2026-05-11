"use client";

import Link from "next/link";
import { type ReactElement } from "react";

import {
  useActivationListActivations,
  useAdminGeofenceListGeofences,
  useAdminRegionListRegions,
  useAdminUserListUsers,
  useAuthListSessions,
  useHealthGetHealth,
  useMeGetMe
} from "@/lib/api/generated/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { parseMeProfileFromOrval, parseSessionsFromOrval } from "@/lib/auth/orval-auth-adapter";
import {
  parseActivationsFromOrval,
  parseAdminUsersFromOrval,
  parseGeofencesFromOrval,
  parseHealthFromOrval,
  parseRegionsFromOrval
} from "@/lib/ops/ops-adapters";

const cardClass = "rounded-xl border border-border bg-card/80 p-5 shadow-sm dark:bg-card/50";

export default function OpsOverviewPage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAdmin = useAuthStore((state) => state.user?.role === "admin");
  const role = useAuthStore((state) => state.user?.role);
  const canManageActivations = role === "admin" || role === "supervisor";

  const healthQuery = useHealthGetHealth({
    query: {
      enabled: accessToken !== null && isAdmin,
      select: (r) => parseHealthFromOrval(r)
    }
  });

  const meQuery = useMeGetMe({
    query: {
      enabled: accessToken !== null,
      select: (r) => parseMeProfileFromOrval(r)
    }
  });

  const sessionsQuery = useAuthListSessions({
    query: {
      enabled: accessToken !== null,
      select: (r) => parseSessionsFromOrval(r)
    }
  });

  const geofencesQuery = useAdminGeofenceListGeofences({
    query: {
      enabled: accessToken !== null,
      select: (r) => parseGeofencesFromOrval(r)
    }
  });

  const regionsQuery = useAdminRegionListRegions({
    query: {
      enabled: accessToken !== null,
      select: (r) => parseRegionsFromOrval(r)
    }
  });

  const usersQuery = useAdminUserListUsers({
    query: {
      enabled: accessToken !== null,
      select: (r) => parseAdminUsersFromOrval(r)
    }
  });

  const activationsQuery = useActivationListActivations({
    query: {
      enabled: accessToken !== null && canManageActivations,
      select: (r) => parseActivationsFromOrval(r)
    }
  });

  const sessionCount = sessionsQuery.data?.sessions.length ?? "—";
  const activeFences = geofencesQuery.data?.filter((g) => g.isActive).length ?? "—";
  const totalFences = geofencesQuery.data?.length ?? "—";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin
            ? "Desktop-first operations console. Configure work areas and monitor core signals; more modules from the product roadmap will plug in here."
            : "Desktop-first operations console. Configure work areas, regions, and your team; more capabilities will appear here over time."}
        </p>
      </div>

      <div
        className={[
          "grid gap-4 sm:grid-cols-2",
          isAdmin && canManageActivations
            ? "xl:grid-cols-7"
            : isAdmin || canManageActivations
              ? "xl:grid-cols-6"
              : "xl:grid-cols-5"
        ].join(" ")}
      >
        {isAdmin ? (
          <div className={cardClass}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              API health
            </p>
            {healthQuery.isLoading ? (
              <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
            ) : null}
            {healthQuery.isError ? (
              <p className="mt-2 text-sm text-destructive">Unreachable</p>
            ) : null}
            {healthQuery.data ? (
              <p className="mt-2 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                OK
              </p>
            ) : null}
          </div>
        ) : null}
        <div className={cardClass}>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Active work areas
          </p>
          {geofencesQuery.isLoading ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
          ) : null}
          {geofencesQuery.isError ? (
            <p className="mt-2 text-sm text-destructive">Could not load</p>
          ) : null}
          {geofencesQuery.data !== undefined ? (
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {activeFences}
              <span className="text-base font-normal text-muted-foreground"> / {totalFences}</span>
            </p>
          ) : null}
          <Link
            href="/ops/geofences"
            className="mt-3 inline-block text-sm font-medium text-primary"
          >
            Manage →
          </Link>
        </div>
        {canManageActivations ? (
          <div className={cardClass}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Activations
            </p>
            {activationsQuery.isLoading ? (
              <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
            ) : null}
            {activationsQuery.isError ? (
              <p className="mt-2 text-sm text-destructive">Could not load</p>
            ) : null}
            {activationsQuery.data !== undefined ? (
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {activationsQuery.data.length}
              </p>
            ) : null}
            <Link
              href="/ops/activations"
              className="mt-3 inline-block text-sm font-medium text-primary"
            >
              Manage →
            </Link>
            <Link
              href="/ops/attendance"
              className="mt-2 inline-block text-sm font-medium text-primary"
            >
              Daily attendance →
            </Link>
          </div>
        ) : null}
        <div className={cardClass}>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Regions
          </p>
          {regionsQuery.isLoading ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
          ) : null}
          {regionsQuery.isError ? (
            <p className="mt-2 text-sm text-destructive">Could not load</p>
          ) : null}
          {regionsQuery.data !== undefined ? (
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {regionsQuery.data.length}
            </p>
          ) : null}
          <Link href="/ops/regions" className="mt-3 inline-block text-sm font-medium text-primary">
            Manage →
          </Link>
        </div>
        <div className={cardClass}>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Users</p>
          {usersQuery.isLoading ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
          ) : null}
          {usersQuery.isError ? (
            <p className="mt-2 text-sm text-destructive">Could not load</p>
          ) : null}
          {usersQuery.data !== undefined ? (
            <p className="mt-2 text-2xl font-semibold text-foreground">{usersQuery.data.length}</p>
          ) : null}
          <Link href="/ops/users" className="mt-3 inline-block text-sm font-medium text-primary">
            Manage →
          </Link>
        </div>
        <div className={cardClass}>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Your sessions
          </p>
          {sessionsQuery.isLoading ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
          ) : null}
          {sessionsQuery.data !== undefined ? (
            <p className="mt-2 text-2xl font-semibold text-foreground">{sessionCount}</p>
          ) : null}
          <Link href="/ops/account" className="mt-3 inline-block text-sm font-medium text-primary">
            Account →
          </Link>
        </div>
        <div className={cardClass}>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Signed in as
          </p>
          {meQuery.data ? (
            <>
              <p className="mt-2 truncate text-sm font-semibold text-foreground">
                {meQuery.data.fullName}
              </p>
              <p className="text-xs capitalize text-muted-foreground">{meQuery.data.role}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">—</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground">Platform modules</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin
            ? "Roadmap capabilities beyond activations (sales capture, surveys, live map) will plug in here as APIs ship."
            : canManageActivations
              ? "Beyond activations: sales capture, surveys, and live map views will appear here over time."
              : "Coming capabilities: sales capture, surveys, and live map views."}
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className={cardClass}>
            <h3 className="font-medium text-foreground">Activations & rosters</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {canManageActivations
                ? "Campaigns with product lines and a field roster of promoters and merchandizers."
                : "Supervisors and admins create campaigns, product lists, and promoter rosters."}
            </p>
            {canManageActivations ? (
              <Link
                href="/ops/activations"
                className="mt-3 inline-block text-sm font-medium text-primary"
              >
                Open →
              </Link>
            ) : (
              <span className="mt-3 inline-block rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                Supervisor / admin
              </span>
            )}
          </div>
          <div className={cardClass}>
            <h3 className="font-medium text-foreground">Field team</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Directory, roles, and regions — use Users in the sidebar to invite and manage
              accounts.
            </p>
            <Link href="/ops/users" className="mt-3 inline-block text-sm font-medium text-primary">
              Users →
            </Link>
          </div>
          <div className={cardClass}>
            <h3 className="font-medium text-foreground">Submissions & analytics</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {isAdmin
                ? "Sales, surveys, flagged submissions, KPI overview — `/admin/overview` style feeds."
                : "Sales, surveys, flagged submissions, and KPI overview."}
            </p>
            <span className="mt-3 inline-block rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
              Coming soon
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
