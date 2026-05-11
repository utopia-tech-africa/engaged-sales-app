"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type PropsWithChildren, type ReactElement, useEffect } from "react";

import { FieldShell } from "@/components/field-shell";
import { useAuthSignOut } from "@/lib/api/generated/client";
import { useAuthStore, useAuthStoreHydrated } from "@/lib/auth/auth-store";
import { useRedirectClientAwayFromFieldMutationRoutes } from "@/lib/auth/use-redirect-client-from-field-mutation-routes";
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

  if (isOpsRole(user.role)) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-muted-foreground">
        Redirecting…
      </div>
    );
  }

  return (
    <FieldShell user={user} onSignOut={handleSignOut} isSigningOut={signOutMutation.isPending}>
      {children}
    </FieldShell>
  );
};
