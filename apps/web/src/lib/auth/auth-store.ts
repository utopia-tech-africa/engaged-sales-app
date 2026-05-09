"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { AuthUser } from "./auth-types";

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (payload: { user: AuthUser; accessToken: string; refreshToken: string }) => void;
  clearSession: () => void;
};

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
        set({
          user: null,
          accessToken: null,
          refreshToken: null
        });
      }
    }),
    {
      name: "engaged-sales-auth",
      storage: createJSONStorage(() => localStorage)
    }
  )
);
