"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuthStore } from "@/lib/auth/auth-store";

const blockedPathPrefixes = [
  "/dashboard/check-in",
  "/dashboard/outlet-visits",
  "/dashboard/stock",
  "/dashboard/history"
] as const;

const isClientBlockedPath = (pathname: string): boolean => {
  if (/\/dashboard\/activations\/[^/]+\/sell/.test(pathname)) {
    return true;
  }
  return blockedPathPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
};

/**
 * Clients have a read-only portal (activations + exports). Keep them off field execution routes if they land via bookmark.
 */
export const useRedirectClientAwayFromFieldMutationRoutes = (): void => {
  const role = useAuthStore((state) => state.user?.role);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (role !== "client") {
      return;
    }
    if (!isClientBlockedPath(pathname)) {
      return;
    }
    router.replace("/dashboard/activations");
  }, [role, pathname, router]);
};
