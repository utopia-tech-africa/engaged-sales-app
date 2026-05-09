"use client";

import Link from "next/link";
import { type ReactElement } from "react";

import {
  useAdminGeofenceListGeofences,
  useAuthListSessions,
  useHealthGetHealth,
  useMeGetMe
} from "@/lib/api/generated/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { parseMeProfileFromOrval, parseSessionsFromOrval } from "@/lib/auth/orval-auth-adapter";
import { parseGeofencesFromOrval, parseHealthFromOrval } from "@/lib/ops/ops-adapters";

const cardClass = "rounded-xl border border-border bg-card/80 p-5 shadow-sm dark:bg-card/50";

export default function OpsOverviewPage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);

  const healthQuery = useHealthGetHealth({
    query: {
      enabled: accessToken !== null,
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

  const sessionCount = sessionsQuery.data?.sessions.length ?? "—";
  const activeFences = geofencesQuery.data?.filter((g) => g.isActive).length ?? "—";
  const totalFences = geofencesQuery.data?.length ?? "—";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Desktop-first operations console. Configure work areas and monitor core signals; more
          modules from the product roadmap will plug in here.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            <p className="mt-2 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">OK</p>
          ) : null}
        </div>
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
          Placeholders for roadmap capabilities (activations, sales, surveys, live map). Wire these
          to the API as endpoints land.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Activations & rosters",
              body: "Create activations, assign promoters, import products — backend routes from PRD §7.9."
            },
            {
              title: "Field team",
              body: "Directory, roles, regions, session oversight — pair with `/admin/users` when available."
            },
            {
              title: "Submissions & analytics",
              body: "Sales, surveys, flagged submissions, KPI overview — `/admin/overview` style feeds."
            }
          ].map((item) => (
            <div key={item.title} className={cardClass}>
              <h3 className="font-medium text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              <span className="mt-3 inline-block rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                Coming soon
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
