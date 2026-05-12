"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

import { clearFieldOutbox } from "@/lib/field/field-offline-idb";

import type { AuthUser } from "./auth-types";

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (payload: { user: AuthUser; accessToken: string; refreshToken: string }) => void;
  clearSession: () => void;
};

/**
 * `createJSONStorage(() => localStorage)` evaluates `localStorage` when the store
 * module loads. During Next.js SSR that throws / yields no storage, so persist
 * would disable itself entirely. Use a noop storage on the server and real
 * `localStorage` only in the browser.
 */
const ssrNoopWebStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {
    void 0;
  },
  removeItem: () => {
    void 0;
  }
};

const getAuthPersistStorage = (): StateStorage =>
  typeof window === "undefined" ? ssrNoopWebStorage : window.localStorage;

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: (payload) => {
        set({
          user: payload.user,
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken
        });
      },
      clearSession: () => {
        void clearFieldOutbox().catch(() => undefined);
        set({
          user: null,
          accessToken: null,
          refreshToken: null
        });
      }
    }),
    {
      name: "engaged-sales-auth",
      storage: createJSONStorage(getAuthPersistStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken
      })
    }
  )
);

/**
 * Persisted auth is read from localStorage after the first paint. Until then,
 * `accessToken`/`user` are still initial `null` — do not treat that as signed out.
 */
export const useAuthStoreHydrated = (): boolean => {
  const [hydrated, setHydrated] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return useAuthStore.persist.hasHydrated();
  });

  useEffect(() => {
    const persistApi = useAuthStore.persist;
    if (persistApi.hasHydrated()) {
      queueMicrotask(() => {
        setHydrated(true);
      });
      return;
    }
    return persistApi.onFinishHydration(() => {
      setHydrated(true);
    });
  }, []);

  return hydrated;
};
