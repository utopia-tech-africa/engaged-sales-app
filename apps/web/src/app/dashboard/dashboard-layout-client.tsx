"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type PropsWithChildren, type ReactElement, useEffect } from "react";

import { FieldOfflineSyncListener } from "@/components/field-offline-sync-listener";
import { FieldShell } from "@/components/field-shell";
import { useAuthSignOut, useMeGetFieldAttendance } from "@/lib/api/generated/client";
import { useAuthStore, useAuthStoreHydrated } from "@/lib/auth/auth-store";
import { useRedirectClientAwayFromFieldMutationRoutes } from "@/lib/auth/use-redirect-client-from-field-mutation-routes";
import type { FieldAttendancePayload } from "@/lib/field/field-attendance";
import { CHECK_IN_PATH, fieldCheckInHref } from "@/lib/field/check-in-deep-link";
import { isOpsRole } from "@/lib/ops/ops-adapters";

export const DashboardLayoutClient = ({ children }: PropsWithChildren): ReactElement => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const authHydrated = useAuthStoreHydrated();
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const signOutMutation = useAuthSignOut();

  useRedirectClientAwayFromFieldMutationRoutes();

  const isPromoter = user?.role === "promoter";
  const fieldAttendanceQuery = useMeGetFieldAttendance({
    query: {
      enabled: authHydrated && accessToken !== null && isPromoter,
      select: (raw) => raw as unknown as FieldAttendancePayload
    }
  });

  useEffect(() => {
    if (!authHydrated) {
      return;
    }
    if (accessToken !== null) {
      return;
    }

    const timer = window.setTimeout(() => {
      const latestState = useAuthStore.getState();
      if (latestState.accessToken !== null) {
        return;
      }
      const qs = searchParams.toString();
      const returnTo = qs.length > 0 ? `${pathname}?${qs}` : pathname;
      router.replace(`/auth/sign-in?redirect=${encodeURIComponent(returnTo)}`);
    }, 200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [authHydrated, accessToken, pathname, router, searchParams]);

  useEffect(() => {
    if (user !== null && isOpsRole(user.role)) {
      router.replace("/ops");
    }
  }, [user, router]);

  useEffect(() => {
    if (!isPromoter) {
      return;
    }
    const payload = fieldAttendanceQuery.data;
    if (payload === undefined || !payload.applicable || !payload.needsDailyClockIn) {
      return;
    }
    if (pathname === CHECK_IN_PATH) {
      return;
    }
    router.replace(fieldCheckInHref({ dailyGate: "1" }));
  }, [fieldAttendanceQuery.data, isPromoter, pathname, router]);

  const gatePayload = fieldAttendanceQuery.data;
  const needsDailyClockIn = gatePayload?.applicable === true && gatePayload.needsDailyClockIn;
  /** Avoid one frame of dashboard before `router.replace` to check-in when the daily gate applies. */
  const fieldGatePending =
    isPromoter &&
    pathname !== CHECK_IN_PATH &&
    (fieldAttendanceQuery.isLoading || needsDailyClockIn);
  /** Lock nav until clock-in succeeds (or while first attendance fetch runs on check-in). */
  const attendanceGateLocked =
    isPromoter &&
    (needsDailyClockIn || (pathname === CHECK_IN_PATH && fieldAttendanceQuery.isLoading));

  const handleSignOut = (): void => {
    void (async () => {
      if (refreshToken !== null) {
        await signOutMutation.mutateAsync({ data: { refreshToken } }).catch(() => undefined);
      }
      clearSession();
      router.replace("/auth/sign-in");
    })();
  };

  if (!authHydrated || accessToken === null || user === null) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (fieldGatePending) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (isOpsRole(user.role)) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-muted-foreground">
        Redirecting…
      </div>
    );
  }

  return (
    <FieldShell
      user={user}
      onSignOut={handleSignOut}
      isSigningOut={signOutMutation.isPending}
      attendanceGateLocked={attendanceGateLocked}
    >
      <FieldOfflineSyncListener />
      {children}
    </FieldShell>
  );
};
