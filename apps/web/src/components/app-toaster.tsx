"use client";

import { type ReactElement, useEffect, useState } from "react";

import { useAuthStore } from "@/lib/auth/auth-store";
import { Toaster } from "@/components/ui/sonner";

const LG_MIN_WIDTH_PX = 1024;

const useIsDesktopLg = (): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${String(LG_MIN_WIDTH_PX)}px)`);
    const sync = (): void => {
      setMatches(mediaQuery.matches);
    };
    sync();
    mediaQuery.addEventListener("change", sync);
    return () => {
      mediaQuery.removeEventListener("change", sync);
    };
  }, []);

  return matches;
};

export const AppToaster = (): ReactElement => {
  const role = useAuthStore((state) => state.user?.role);
  const isDesktop = useIsDesktopLg();
  const isOpsRole = role === "admin" || role === "supervisor";
  const position = isOpsRole && isDesktop ? "bottom-right" : "top-center";

  return <Toaster closeButton position={position} richColors />;
};
