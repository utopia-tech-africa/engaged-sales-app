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

const dash = "—";

const attentionTone = (text: string): string => {
  if (text === dash || text.startsWith("None") || text.startsWith("All ")) {
    return "text-muted-foreground";
  }
  return "text-amber-700 dark:text-amber-400";
};

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
  const inactiveFences =
    totalFences !== undefined && activeFences !== undefined
      ? Math.max(0, totalFences - activeFences)
      : undefined;

  const users = usersQuery.data;
  const activeUsers = users?.filter((u) => u.isActive).length;
  const fieldAccounts =
    users?.filter((u) => u.role === "promoter" || u.role === "client").length ?? undefined;
  const deactivatedUsers =
    users !== undefined && activeUsers !== undefined
      ? Math.max(0, users.length - activeUsers)
      : undefined;

  const regions = regionsQuery.data;
  const activeRegions = regions?.filter((r) => r.isActive).length;
  const inactiveRegions =
    regions !== undefined && activeRegions !== undefined
      ? Math.max(0, regions.length - activeRegions)
      : undefined;

  const activations = activationsQuery.data;
  const activeActivations = activations?.filter((a) => a.isActive).length;
  const inactiveActivations =
    activations !== undefined && activeActivations !== undefined
      ? Math.max(0, activations.length - activeActivations)
      : undefined;

  const statGridClass =
    "grid grid-cols-2 gap-x-6 gap-y-6 border-t border-border pt-6 sm:grid-cols-3 xl:grid-cols-4";

  const platformSnapshot = (): string => {
    if (healthQuery.isLoading) {
      return "…";
    }
    if (healthQuery.isError) {
      return "Not reachable";
    }
    if (healthQuery.data) {
      return "Core API responding";
    }
    return dash;
  };

  const platformAttention = (): string => {
    if (healthQuery.isError) {
      return "Check deployment & env";
    }
    return "None";
  };

  const activationSnapshot = (): string => {
    if (!canManageActivations) {
      return "Managed by supervisors";
    }
    if (activationsQuery.isLoading) {
      return "…";
    }
    if (activationsQuery.isError) {
      return "Could not load";
    }
    if (activations === undefined) {
      return dash;
    }
    const live = activeActivations ?? 0;
    const campaignCount = activations.length;
    const campaignPlural = campaignCount === 1 ? "" : "s";
    return [
      String(campaignCount),
      " campaign",
      campaignPlural,
      " · ",
      String(live),
      " active"
    ].join("");
  };

  const activationAttention = (): string => {
    if (!canManageActivations) {
      return dash;
    }
    if (activationsQuery.isLoading) {
      return "…";
    }
    if (inactiveActivations === undefined) {
      return dash;
    }
    if (inactiveActivations === 0) {
      return "All listed campaigns are active";
    }
    return [String(inactiveActivations), " not active — review dates or toggles"].join("");
  };

  const geofenceSnapshot = (): string => {
    if (geofencesQuery.isLoading) {
      return "…";
    }
    if (geofencesQuery.isError) {
      return "Could not load";
    }
    if (activeFences === undefined || totalFences === undefined) {
      return dash;
    }
    return [String(activeFences), " live · ", String(totalFences), " total geofences"].join("");
  };

  const geofenceAttention = (): string => {
    if (inactiveFences === undefined || geofencesQuery.isLoading) {
      return geofencesQuery.isLoading ? "…" : dash;
    }
    if (inactiveFences === 0) {
      return "All fences enabled";
    }
    return [String(inactiveFences), " paused — promoters may not validate in those areas"].join("");
  };

  const regionSnapshot = (): string => {
    if (regionsQuery.isLoading) {
      return "…";
    }
    if (regionsQuery.isError) {
      return "Could not load";
    }
    if (regions === undefined || activeRegions === undefined) {
      return dash;
    }
    const regionCount = regions.length;
    const regionPlural = regionCount === 1 ? "" : "s";
    return [
      String(regionCount),
      " region",
      regionPlural,
      " · ",
      String(activeRegions),
      " active"
    ].join("");
  };

  const regionAttention = (): string => {
    if (inactiveRegions === undefined || regionsQuery.isLoading) {
      return regionsQuery.isLoading ? "…" : dash;
    }
    if (inactiveRegions === 0) {
      return "None";
    }
    const territoryLabelPlural = inactiveRegions === 1 ? "" : "s";
    return [String(inactiveRegions), " inactive territory label", territoryLabelPlural].join("");
  };

  const teamSnapshot = (): string => {
    if (usersQuery.isLoading) {
      return "…";
    }
    if (usersQuery.isError) {
      return "Could not load";
    }
    if (users === undefined || activeUsers === undefined) {
      return dash;
    }
    const field = fieldAccounts ?? 0;
    const accountCount = users.length;
    return [
      String(accountCount),
      " accounts · ",
      String(activeUsers),
      " active · ",
      String(field),
      " field (promoter/client)"
    ].join("");
  };

  const teamAttention = (): string => {
    if (deactivatedUsers === undefined || usersQuery.isLoading) {
      return usersQuery.isLoading ? "…" : dash;
    }
    if (deactivatedUsers === 0) {
      return "None";
    }
    return [String(deactivatedUsers), " deactivated — cannot sign in"].join("");
  };

  const outletSnapshot = (): string => {
    if (outletsQuery.isLoading) {
      return "…";
    }
    if (outletsQuery.isError) {
      return "Could not load";
    }
    if (outletsQuery.data === undefined) {
      return dash;
    }
    const outletCount = outletsQuery.data.length;
    const outletPlural = outletCount === 1 ? "" : "s";
    return [String(outletCount), " outlet", outletPlural, " in master"].join("");
  };

  const outletAttention = (): string => dash;

  const sessionSnapshot = (): string => {
    if (sessionsQuery.isLoading) {
      return "…";
    }
    if (sessionsQuery.data === undefined) {
      return dash;
    }
    const sessionCount = sessionsQuery.data.sessions.length;
    const sessionPlural = sessionCount === 1 ? "" : "s";
    return [String(sessionCount), " recorded session", sessionPlural, " for your login"].join("");
  };

  const sessionAttention = (): string => dash;

  const opsRows: { domain: string; snapshot: () => string; attention: () => string }[] = [
    ...(isAdmin
      ? [
          {
            domain: "Platform & API",
            snapshot: platformSnapshot,
            attention: platformAttention
          }
        ]
      : []),
    ...(canManageActivations
      ? [
          {
            domain: "Campaigns & rosters",
            snapshot: activationSnapshot,
            attention: activationAttention
          }
        ]
      : []),
    {
      domain: "Geofencing & check-in",
      snapshot: geofenceSnapshot,
      attention: geofenceAttention
    },
    {
      domain: "Territories",
      snapshot: regionSnapshot,
      attention: regionAttention
    },
    {
      domain: "People & access",
      snapshot: teamSnapshot,
      attention: teamAttention
    },
    {
      domain: "Outlet universe",
      snapshot: outletSnapshot,
      attention: outletAttention
    },
    {
      domain: "Your sessions",
      snapshot: sessionSnapshot,
      attention: sessionAttention
    }
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Overview</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Key counts above; operational snapshot below. Everything else lives in the sidebar.
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
                  ? [String(activeFences), " / ", String(totalFences)].join("")
                  : dash
              }
              detail="Active / total geofences"
              loading={geofencesQuery.isLoading}
              error={geofencesQuery.isError}
            />
            {canManageActivations ? (
              <StatCell
                label="Activations"
                value={activations !== undefined ? activations.length : dash}
                detail={
                  activeActivations !== undefined && activations !== undefined
                    ? [String(activeActivations), " active"].join("")
                    : undefined
                }
                loading={activationsQuery.isLoading}
                error={activationsQuery.isError}
              />
            ) : null}
            <StatCell
              label="Regions"
              value={regions !== undefined ? regions.length : dash}
              detail={
                activeRegions !== undefined && regions !== undefined
                  ? [String(activeRegions), " active"].join("")
                  : undefined
              }
              loading={regionsQuery.isLoading}
              error={regionsQuery.isError}
            />
            <StatCell
              label="Users"
              value={users !== undefined ? users.length : dash}
              detail={
                activeUsers !== undefined && users !== undefined
                  ? [String(activeUsers), " active accounts"].join("")
                  : undefined
              }
              loading={usersQuery.isLoading}
              error={usersQuery.isError}
            />
            <StatCell
              label="Outlets"
              value={outletsQuery.data !== undefined ? outletsQuery.data.length : dash}
              detail="Master list"
              loading={outletsQuery.isLoading}
              error={outletsQuery.isError}
            />
            <StatCell
              label="Your sessions"
              value={sessionsQuery.data !== undefined ? sessionsQuery.data.sessions.length : dash}
              detail="Recorded logins"
              loading={sessionsQuery.isLoading}
              error={sessionsQuery.isError}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Operations snapshot
        </h2>
        <p className="text-xs text-muted-foreground">
          Where counts meet risk: inactive resources and access gaps. Navigate from the left
          sidebar.
        </p>
        <div className={`${shellCard} overflow-x-auto`}>
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 font-medium text-foreground">Area</th>
                <th className="px-4 py-3 font-medium text-foreground">Snapshot</th>
                <th className="px-4 py-3 font-medium text-foreground">Attention</th>
              </tr>
            </thead>
            <tbody>
              {opsRows.map((row) => {
                const snap = row.snapshot();
                const att = row.attention();
                return (
                  <tr key={row.domain} className="border-b border-border last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                      {row.domain}
                    </td>
                    <td className="max-w-[14rem] px-4 py-3 text-muted-foreground sm:max-w-none">
                      {snap}
                    </td>
                    <td className={`px-4 py-3 text-xs sm:text-sm ${attentionTone(att)}`}>{att}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
