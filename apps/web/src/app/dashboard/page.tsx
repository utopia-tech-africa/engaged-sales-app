"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactElement, useEffect, useState } from "react";

import { MobileShell } from "@/components/mobile-shell";
import {
  useAuthListSessions,
  useAuthSignOut,
  useMeGetMe,
  useMeUpdateMeLocation
} from "@/lib/api/generated/client";
import { useAuthStore, useAuthStoreHydrated } from "@/lib/auth/auth-store";
import {
  parseLocationPingFromOrval,
  parseMeProfileFromOrval,
  parseSessionsFromOrval,
  type LocationPing
} from "@/lib/auth/orval-auth-adapter";
import {
  calmMutedLinkClass,
  calmPrimaryButtonClass,
  calmSecondaryButtonClass
} from "@/lib/calm-ui";
import { requestCurrentPosition } from "@/lib/geolocation/request-current-position";
import { isOpsRole } from "@/lib/ops/ops-adapters";

export default function DashboardPage(): ReactElement {
  const router = useRouter();
  const authHydrated = useAuthStoreHydrated();
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    if (authHydrated && accessToken === null) {
      router.replace("/auth/sign-in");
    }
  }, [authHydrated, accessToken, router]);

  const meQuery = useMeGetMe({
    query: {
      enabled: accessToken !== null,
      select: (result) => parseMeProfileFromOrval(result)
    }
  });

  useEffect(() => {
    if (meQuery.data !== undefined && isOpsRole(meQuery.data.role)) {
      router.replace("/ops");
    }
  }, [meQuery.data, router]);

  const sessionsQuery = useAuthListSessions({
    query: {
      enabled: accessToken !== null,
      select: (result) => parseSessionsFromOrval(result)
    }
  });
  const signOutMutation = useAuthSignOut();
  const locationMutation = useMeUpdateMeLocation();
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [lastPing, setLastPing] = useState<LocationPing | null>(null);

  const handleCheckIn = (): void => {
    setGeoError(null);
    setIsLocating(true);
    void (async () => {
      const pos = await requestCurrentPosition();
      if (!pos.ok) {
        setIsLocating(false);
        setGeoError(pos.message);
        return;
      }
      locationMutation.mutate(
        {
          data: {
            latitude: pos.latitude,
            longitude: pos.longitude
          }
        },
        {
          onSuccess: (result) => {
            setLastPing(parseLocationPingFromOrval(result));
          },
          onSettled: () => {
            setIsLocating(false);
          }
        }
      );
    })();
  };

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

  if (!authHydrated || accessToken === null) {
    return <MobileShell title="Loading…" subtitle="Restoring your session." />;
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

      <section className="mb-4 rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
        <h2 className="text-base font-semibold text-foreground">Field check-in</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Record where you are right now. Your browser will ask for location permission—only
          coordinates are sent to the server.
        </p>
        {geoError ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {geoError}
          </p>
        ) : null}
        {locationMutation.isError ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            Could not save check-in. Try again.
          </p>
        ) : null}
        {lastPing ? (
          <p className="mt-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-foreground dark:bg-muted/15">
            <span className="font-medium">Last saved: </span>
            {new Date(lastPing.recordedAt).toLocaleString()}
            <br />
            <span className="text-muted-foreground">
              {lastPing.latitude.toFixed(5)}, {lastPing.longitude.toFixed(5)}
            </span>
          </p>
        ) : null}
        <button
          type="button"
          className={`${calmPrimaryButtonClass} mt-4`}
          disabled={isLocating || locationMutation.isPending}
          onClick={handleCheckIn}
        >
          {isLocating || locationMutation.isPending ? "Saving check-in…" : "Check in with location"}
        </button>
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
