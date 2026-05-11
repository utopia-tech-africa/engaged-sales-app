"use client";

import { z } from "zod";

import { getApiBaseUrl } from "@/lib/api/api-base-url";
import { useAuthStore } from "@/lib/auth/auth-store";

const refreshPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().optional()
});

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Rotates refresh token and updates the persisted session. Single-flights concurrent callers.
 * Returns true when a new access token is stored; false when not attempted or refresh failed.
 */
export const refreshAccessToken = async (): Promise<boolean> => {
  if (typeof window === "undefined") {
    return false;
  }
  if (refreshInFlight !== null) {
    return refreshInFlight;
  }

  refreshInFlight = (async (): Promise<boolean> => {
    try {
      const { refreshToken, user } = useAuthStore.getState();
      if (refreshToken === null || refreshToken.length === 0 || user === null) {
        return false;
      }

      const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken })
      });

      if (!res.ok) {
        if (res.status === 401) {
          useAuthStore.getState().clearSession();
        }
        return false;
      }

      const json: unknown = await res.json();
      const pair = refreshPairSchema.parse(json);

      useAuthStore.getState().setSession({
        user,
        accessToken: pair.accessToken,
        refreshToken: pair.refreshToken
      });
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
};
