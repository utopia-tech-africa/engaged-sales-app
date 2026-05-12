"use client";

import { useSyncExternalStore } from "react";

const subscribe = (onStoreChange: () => void): (() => void) => {
  if (typeof window === "undefined") {
    return () => {
      void 0;
    };
  }
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
};

const getSnapshot = (): boolean => (typeof navigator === "undefined" ? true : navigator.onLine);

/** Assumes online until the browser reports otherwise (avoids false offline banners during SSR). */
const getServerSnapshot = (): boolean => true;

/**
 * Tracks browser online/offline signals. `navigator.onLine` can be wrong on some networks;
 * combined with `online` / `offline` events it is still the standard baseline for PWAs.
 */
export const useNetworkOnline = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
