"use client";

import Link from "next/link";
import { type ReactElement } from "react";

import { useAuthListSessions, useMeGetMe } from "@/lib/api/generated/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { parseMeProfileFromOrval, parseSessionsFromOrval } from "@/lib/auth/orval-auth-adapter";
import { calmMutedLinkClass } from "@/lib/calm-ui";

const cardClass = "rounded-xl border border-border bg-card/80 p-5 shadow-sm dark:bg-card/50";

export default function OpsAccountPage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your profile and active sessions. Use the field dashboard for GPS check-ins if you are
          also testing promoter flows.
        </p>
      </div>

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-foreground">Profile</h2>
        {meQuery.isLoading ? <p className="mt-2 text-sm text-muted-foreground">Loading…</p> : null}
        {meQuery.isError ? (
          <p className="mt-2 text-sm text-destructive">Failed to load profile.</p>
        ) : null}
        {meQuery.data ? (
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium text-foreground">{meQuery.data.fullName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-medium text-foreground">{meQuery.data.phone}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Role</dt>
              <dd className="font-medium capitalize text-foreground">{meQuery.data.role}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Region</dt>
              <dd className="font-medium text-foreground">{meQuery.data.regionId ?? "—"}</dd>
            </div>
          </dl>
        ) : null}
      </section>

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-foreground">Sessions</h2>
        {sessionsQuery.isLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
        ) : null}
        {sessionsQuery.isError ? (
          <p className="mt-2 text-sm text-destructive">Failed to load sessions.</p>
        ) : null}
        {sessionsQuery.data ? (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
            {sessionsQuery.data.sessions.map((session) => (
              <li
                key={session.id}
                className="flex flex-col gap-1 px-3 py-3 text-sm sm:flex-row sm:justify-between"
              >
                <div>
                  <span className="font-medium text-foreground">
                    {session.isCurrent ? "Current session" : "Other session"}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    IP: {session.ipAddress ?? "Unknown"} · Active: {session.isActive ? "Yes" : "No"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <p className="text-sm text-muted-foreground">
        <Link href="/dashboard" className={calmMutedLinkClass}>
          Open field dashboard (check-in, mobile layout)
        </Link>
      </p>
    </div>
  );
}
