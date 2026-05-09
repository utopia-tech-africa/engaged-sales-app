"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactElement, useEffect } from "react";

import { MobileShell } from "@/components/mobile-shell";
import { useAuthListSessions, useAuthSignOut, useMeGetMe } from "@/lib/api/generated/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { parseMeProfileFromOrval, parseSessionsFromOrval } from "@/lib/auth/orval-auth-adapter";
import { calmMutedLinkClass, calmSecondaryButtonClass } from "@/lib/calm-ui";

export default function DashboardPage(): ReactElement {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    if (accessToken === null) {
      router.replace("/auth/sign-in");
    }
  }, [accessToken, router]);

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
  const signOutMutation = useAuthSignOut();

  const handleSignOut = (): void => {
    void (async () => {
      if (refreshToken !== null) {
        await signOutMutation
          .mutateAsync({
            data: { refreshToken }
          })
          .catch(() => undefined);
      }
      clearSession();
      router.replace("/auth/sign-in");
    })();
  };

  if (accessToken === null) {
    return <MobileShell title="Redirecting..." subtitle="Taking you to sign in." />;
  }

  return (
    <MobileShell
      variant="app"
      title="Dashboard"
      subtitle="Your active auth session and profile details."
    >
      <section className="mb-4 rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
        <h2 className="text-base font-semibold text-foreground">Profile</h2>
        {meQuery.isLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading profile...</p>
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
              <dd className="inline">{meQuery.data.role}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-foreground">Region: </dt>
              <dd className="inline">{meQuery.data.regionId ?? "Not set"}</dd>
            </div>
          </dl>
        ) : null}
      </section>

      <section className="mb-4 rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
        <h2 className="text-base font-semibold text-foreground">Sessions</h2>
        {sessionsQuery.isLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading sessions...</p>
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

      <div className="mt-5 flex flex-col gap-3">
        <button
          type="button"
          className={calmSecondaryButtonClass}
          disabled={signOutMutation.isPending}
          onClick={handleSignOut}
        >
          {signOutMutation.isPending ? "Signing out..." : "Sign out"}
        </button>
        <Link href="/auth/sign-in" className={calmMutedLinkClass}>
          Back to auth
        </Link>
      </div>
    </MobileShell>
  );
}
