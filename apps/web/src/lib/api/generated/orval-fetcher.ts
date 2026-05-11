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
  const headerBag = init?.headers !== undefined ? new Headers(init.headers) : new Headers();
  const authorizationHeader = headerBag.get("Authorization");
  const token =
    authorizationHeader !== null && authorizationHeader.length > 0
      ? authorizationHeader.replace(/^Bearer\s+/i, "")
      : getTokenFromPersistedAuth();

  const passthroughHeaders: Record<string, string> = {};
  headerBag.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "authorization" || lower === "content-type") {
      return;
    }
    passthroughHeaders[key] = value;
  });

  return apiRequest<T>(path, {
    method: (init?.method as "GET" | "POST" | "PATCH" | undefined) ?? "GET",
    body: init?.body,
    token,
    ...(init?.signal !== undefined && init.signal !== null ? { signal: init.signal } : {}),
    ...(Object.keys(passthroughHeaders).length > 0 ? { headers: passthroughHeaders } : {})
  });
};
