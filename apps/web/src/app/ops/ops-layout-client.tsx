"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type PropsWithChildren, type ReactElement, useEffect } from "react";

import { OpsShell } from "@/components/ops-shell";
import { BoneyardFullPageFallback } from "@/components/boneyard/boneyard-full-page-fallback";
import { useAuthSignOut } from "@/lib/api/generated/client";
import { useAuthStore, useAuthStoreHydrated } from "@/lib/auth/auth-store";
import { isOpsRole } from "@/lib/ops/ops-adapters";

export const OpsLayoutClient = ({ children }: PropsWithChildren): ReactElement => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const authHydrated = useAuthStoreHydrated();
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const signOutMutation = useAuthSignOut();

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
    if (user !== null && !isOpsRole(user.role)) {
      router.replace("/dashboard");
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
    return <BoneyardFullPageFallback name="ops-auth-loading" height="screen" />;
  }

  if (!isOpsRole(user.role)) {
    return <BoneyardFullPageFallback name="ops-redirect-field" height="screen" />;
  }

  return (
    <OpsShell user={user} onSignOut={handleSignOut} isSigningOut={signOutMutation.isPending}>
      {children}
    </OpsShell>
  );
};
