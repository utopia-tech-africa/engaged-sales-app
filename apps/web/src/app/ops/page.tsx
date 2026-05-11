"use client";

import Link from "next/link";
import { type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";

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
import { listOutlets } from "@/lib/outlet/outlet-api";
import {
  parseActivationsFromOrval,
  parseAdminUsersFromOrval,
  parseGeofencesFromOrval,
  parseHealthFromOrval,
  parseRegionsFromOrval
} from "@/lib/ops/ops-adapters";
import { calmMutedLinkClass } from "@/lib/calm-ui";

const shellCard = "rounded-xl border border-border bg-card/80 shadow-sm dark:bg-card/50";
const listRowClass =
  "flex items-center justify-between gap-4 border-b border-border px-4 py-3.5 text-sm transition-colors last:border-b-0 hover:bg-muted/30";

type StatCellProps = {
  label: string;
  value: string | number;
  detail?: string;
  loading?: boolean;
  error?: boolean;
};

const StatCell = ({ label, value, detail, loading, error }: StatCellProps): ReactElement => (
  <div className="min-w-0 px-1 py-2 sm:px-2">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </p>
    {loading ? (
      <p className="mt-1.5 text-sm text-muted-foreground">…</p>
    ) : error ? (
      <p className="mt-1.5 text-sm text-destructive">Error</p>
    ) : (
      <p className="mt-1.5 truncate text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
    )}
    {detail !== undefined && detail.length > 0 && !loading && !error ? (
      <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
    ) : null}
  </div>
);

type QuickRowProps = { href: string; title: string; hint: string };

const QuickRow = ({ href, title, hint }: QuickRowProps): ReactElement => (
  <li>
    <Link href={href} className={listRowClass}>
      <span>
        <span className="font-medium text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
      </span>
      <span className="shrink-0 text-xs font-medium text-primary">Open</span>
    </Link>
  </li>
);

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

  const outletsQuery = useQuery({
    queryKey: ["ops", "outlets"],
    queryFn: async () => listOutlets(accessToken ?? ""),
    enabled: accessToken !== null
  });

  const geofences = geofencesQuery.data;
  const activeFences = geofences?.filter((g) => g.isActive).length;
  const totalFences = geofences?.length;

  const users = usersQuery.data;
  const activeUsers = users?.filter((u) => u.isActive).length;
  const fieldAccounts =
    users?.filter((u) => u.role === "promoter" || u.role === "client").length ?? undefined;

  const regions = regionsQuery.data;
  const activeRegions = regions?.filter((r) => r.isActive).length;

  const activations = activationsQuery.data;
  const activeActivations = activations?.filter((a) => a.isActive).length;

  const statGridClass =
    "grid grid-cols-2 gap-x-6 gap-y-6 border-t border-border pt-6 sm:grid-cols-3 xl:grid-cols-4";

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Overview</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Key counts for your territory setup. Use the sidebar or quick links below to go deeper.
          </p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          {meQuery.data ? (
            <>
              <p className="text-sm font-medium text-foreground">{meQuery.data.fullName}</p>
              <p className="text-xs capitalize text-muted-foreground">{meQuery.data.role}</p>
              <Link
                href="/ops/account"
                className={`${calmMutedLinkClass} mt-1 inline-block text-xs`}
              >
                Account & sessions →
              </Link>
            </>
          ) : meQuery.isLoading ? (
            <p className="text-xs text-muted-foreground">Loading profile…</p>
          ) : null}
        </div>
      </div>

      <section className={shellCard}>
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Key stats</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Live from your workspace data</p>
        </div>
        <div className="px-5 pb-6 pt-2">
          <div className={statGridClass}>
            {isAdmin ? (
              <StatCell
                label="API health"
                value="OK"
                detail="Core service reachable"
                loading={healthQuery.isLoading}
                error={healthQuery.isError}
              />
            ) : null}
            <StatCell
              label="Work areas"
              value={
                activeFences !== undefined && totalFences !== undefined
                  ? `${String(activeFences)} / ${String(totalFences)}`
                  : "—"
              }
              detail="Active / total geofences"
              loading={geofencesQuery.isLoading}
              error={geofencesQuery.isError}
            />
            {canManageActivations ? (
              <StatCell
                label="Activations"
                value={activations !== undefined ? activations.length : "—"}
                detail={
                  activeActivations !== undefined && activations !== undefined
                    ? `${String(activeActivations)} active`
                    : undefined
                }
                loading={activationsQuery.isLoading}
                error={activationsQuery.isError}
              />
            ) : null}
            <StatCell
              label="Regions"
              value={regions !== undefined ? regions.length : "—"}
              detail={
                activeRegions !== undefined && regions !== undefined
                  ? `${String(activeRegions)} active`
                  : undefined
              }
              loading={regionsQuery.isLoading}
              error={regionsQuery.isError}
            />
            <StatCell
              label="Users"
              value={users !== undefined ? users.length : "—"}
              detail={
                activeUsers !== undefined && users !== undefined
                  ? `${String(activeUsers)} active accounts`
                  : undefined
              }
              loading={usersQuery.isLoading}
              error={usersQuery.isError}
            />
            <StatCell
              label="Outlets"
              value={outletsQuery.data !== undefined ? outletsQuery.data.length : "—"}
              detail="Master list"
              loading={outletsQuery.isLoading}
              error={outletsQuery.isError}
            />
            <StatCell
              label="Your sessions"
              value={sessionsQuery.data !== undefined ? sessionsQuery.data.sessions.length : "—"}
              detail="Recorded logins"
              loading={sessionsQuery.isLoading}
              error={sessionsQuery.isError}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Quick access
        </h2>
        <div className={`${shellCard} overflow-hidden p-0`}>
          <ul>
            {canManageActivations ? (
              <QuickRow
                href="/ops/activations"
                title="Activations"
                hint="Campaigns, products, and field rosters"
              />
            ) : null}
            <QuickRow
              href="/ops/reporting"
              title="Reporting"
              hint="Sales, coverage, attendance, and exports"
            />
            {canManageActivations ? (
              <>
                <QuickRow
                  href="/ops/attendance"
                  title="Attendance"
                  hint="Daily field clock-in roll-up"
                />
                <QuickRow
                  href="/ops/targets"
                  title="Daily targets"
                  hint="Team achievement vs case goals"
                />
                <QuickRow
                  href="/ops/tracking"
                  title="Live tracking"
                  hint="Latest positions on the map"
                />
              </>
            ) : null}
            <QuickRow href="/ops/users" title="Users" hint="Invites, roles, and regions" />
            <QuickRow href="/ops/regions" title="Regions" hint="Territory definitions" />
            <QuickRow
              href="/ops/subwholesales"
              title="Subwholesales"
              hint="Nodes under each region"
            />
            <QuickRow
              href="/ops/geofences"
              title="Work areas"
              hint="Geofences for check-in validation"
            />
            <QuickRow
              href="/ops/outlets"
              title="Outlets"
              hint="Trade outlets and visit reporting"
            />
            <QuickRow
              href="/ops/stock"
              title="Stock overview"
              hint="Inventory and distributor rollup"
            />
            <QuickRow
              href="/ops/organization"
              title="Organization hub"
              hint="Grouped links to all setup areas"
            />
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          At a glance
        </h2>
        <div className={`${shellCard} px-5 py-4`}>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Field accounts (promoters & clients)</dt>
              <dd className="font-medium text-foreground">
                {fieldAccounts !== undefined
                  ? String(fieldAccounts)
                  : usersQuery.isLoading
                    ? "…"
                    : "—"}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Ops role</dt>
              <dd className="font-medium capitalize text-foreground">{role ?? "—"}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Work areas inactive</dt>
              <dd className="font-medium text-foreground">
                {totalFences !== undefined && activeFences !== undefined
                  ? String(Math.max(0, totalFences - activeFences))
                  : geofencesQuery.isLoading
                    ? "…"
                    : "—"}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Users deactivated</dt>
              <dd className="font-medium text-foreground">
                {users !== undefined && activeUsers !== undefined
                  ? String(Math.max(0, users.length - activeUsers))
                  : usersQuery.isLoading
                    ? "…"
                    : "—"}
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}
