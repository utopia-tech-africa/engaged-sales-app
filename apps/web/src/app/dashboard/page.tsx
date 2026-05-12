"use client";

import Link from "next/link";
import { type ReactElement } from "react";

import { getFieldNavItemsForUser } from "@/components/field-shell";
import {
  getMeListMySalesQueryKey,
  meListMySales,
  useAuthListSessions,
  useMeGetMe
} from "@/lib/api/generated/client";
import { CHECK_IN_PATH, fieldCheckInHref } from "@/lib/field/check-in-deep-link";
import { useAuthStore } from "@/lib/auth/auth-store";
import { parseMeProfileFromOrval, parseSessionsFromOrval } from "@/lib/auth/orval-auth-adapter";
import { parseMySalesListFromOrval } from "@/lib/field/field-activations-adapters";
import { formatFieldCheckInDateTime } from "@/lib/format-field-check-in-datetime";
import { calmMutedLinkClass } from "@/lib/calm-ui";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

export default function DashboardHomePage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const isClient = user?.role === "client";

  const meQuery = useMeGetMe({
    query: {
      enabled: accessToken !== null,
      select: (result) => parseMeProfileFromOrval(result)
    }
  });

  const sessionsQuery = useAuthListSessions({
    query: {
      enabled: accessToken !== null,
      select: (result) => parseSessionsFromOrval(result)
    }
  });

  const recentSalesQuery = useQuery({
    queryKey: getMeListMySalesQueryKey({ limit: 5 }),
    queryFn: () => meListMySales({ limit: 5 }),
    enabled: accessToken !== null && !isClient,
    select: (result) => parseMySalesListFromOrval(result)
  });

  const shortcuts = user !== null ? getFieldNavItemsForUser(user).slice(1) : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Home</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isClient
            ? "Profile, sessions, and read-only access to activations you are assigned to."
            : "Profile, sessions, and shortcuts to field tools."}
        </p>
      </div>

      <nav aria-label="Shortcuts">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {shortcuts.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link
                href={href === CHECK_IN_PATH ? fieldCheckInHref({ source: "home" }) : href}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card/80 px-3 py-4 text-center text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/30 dark:bg-card/50"
                )}
              >
                <Icon className="size-6 text-primary" aria-hidden />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {!isClient ? (
        <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground">Recent sales</h2>
            <Link href="/dashboard/activations" className={calmMutedLinkClass}>
              Activations
            </Link>
          </div>
          {recentSalesQuery.isLoading ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
          ) : null}
          {recentSalesQuery.isError ? (
            <p className="mt-2 text-sm text-muted-foreground">Sales history unavailable.</p>
          ) : null}
          {recentSalesQuery.data?.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No sales yet. Open an activation to record one.
            </p>
          ) : null}
          {recentSalesQuery.data !== undefined && recentSalesQuery.data.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {recentSalesQuery.data.map((sale) => (
                <li
                  key={sale.id}
                  className="rounded-lg border border-border bg-muted/30 p-3 text-xs dark:bg-muted/15"
                >
                  <p className="font-medium text-foreground">{sale.activation.name}</p>
                  <p className="text-muted-foreground">
                    {formatFieldCheckInDateTime(sale.createdAt)} · {sale.items.length} line
                    {sale.items.length === 1 ? "" : "s"}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : (
        <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
          <h2 className="text-base font-semibold text-foreground">Activations</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Open <Link href="/dashboard/activations">Activations</Link> to view assigned campaigns,
            team sales, and download Excel reports.
          </p>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
        <h2 className="text-base font-semibold text-foreground">Profile</h2>
        {meQuery.isLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading profile…</p>
        ) : null}
        {meQuery.isError ? (
          <p className="mt-2 text-sm text-destructive" role="alert">
            Failed to load profile.
          </p>
        ) : null}
        {meQuery.data ? (
          <dl className="mt-3 space-y-1 text-sm text-foreground/90">
            <div>
              <dt className="inline font-medium text-foreground">Name: </dt>
              <dd className="inline">{meQuery.data.fullName}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-foreground">Phone: </dt>
              <dd className="inline">{meQuery.data.phone}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-foreground">Role: </dt>
              <dd className="inline capitalize">{meQuery.data.role}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-foreground">Region: </dt>
              <dd className="inline">{meQuery.data.regionId ?? "Not set"}</dd>
            </div>
          </dl>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
        <h2 className="text-base font-semibold text-foreground">Sessions</h2>
        {sessionsQuery.isLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading sessions…</p>
        ) : null}
        {sessionsQuery.isError ? (
          <p className="mt-2 text-sm text-destructive" role="alert">
            Failed to load sessions.
          </p>
        ) : null}
        {sessionsQuery.data ? (
          <ul className="mt-3 space-y-2">
            {sessionsQuery.data.sessions.map((session) => (
              <li
                key={session.id}
                className="rounded-lg border border-border bg-muted/30 p-3 text-xs dark:bg-muted/15"
              >
                <p className="font-medium text-foreground">
                  {session.isCurrent ? "Current session" : "Past session"}
                </p>
                <p className="text-muted-foreground">IP: {session.ipAddress ?? "Unknown"}</p>
                <p className="text-muted-foreground">Active: {session.isActive ? "Yes" : "No"}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
