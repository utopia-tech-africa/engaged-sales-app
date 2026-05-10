import { apiRequest } from "../http-client";

const getTokenFromPersistedAuth = (): string | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }

  const rawValue = localStorage.getItem("engaged-sales-auth");
  if (!rawValue) {
    return undefined;
  }

  const parsed = JSON.parse(rawValue) as {
    state?: {
      accessToken?: string | null;
    };
  };

  return parsed.state?.accessToken ?? undefined;
};

export const orvalFetcher = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const path = url.replace(/^https?:\/\/[^/]+\/api\/v1/, "");
  const authorizationHeader = init?.headers ? new Headers(init.headers).get("Authorization") : null;
  const token = authorizationHeader?.replace(/^Bearer\s+/i, "") ?? getTokenFromPersistedAuth();

  return apiRequest<T>(path, {
    method: (init?.method as "GET" | "POST" | "PATCH" | undefined) ?? "GET",
    body: init?.body,
    token
  });
};
