"use client";

import { createContext, useContext, type PropsWithChildren, type ReactElement } from "react";

import { type UsePwaInstallResult, usePwaInstall } from "@/hooks/use-pwa-install";

const PwaInstallContext = createContext<UsePwaInstallResult | null>(null);

export const PwaInstallProvider = ({ children }: PropsWithChildren): ReactElement => {
  const value = usePwaInstall();
  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
};

export const usePwaInstallContext = (): UsePwaInstallResult => {
  const value = useContext(PwaInstallContext);
  if (value === null) {
    throw new Error("usePwaInstallContext must be used within PwaInstallProvider");
  }
  return value;
};
