"use client";

import { useAuthStore } from "@/lib/auth/auth-store";
import { refreshAccessToken } from "@/lib/auth/refresh-access-token";

import { getApiBaseUrl } from "./api-base-url";
import { ApiError, type ProblemDetails } from "./problem-details";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT";
  body?: unknown;
  token?: string;
  /** Merged into fetch headers (e.g. Idempotency-Key). */
  headers?: Record<string, string>;
  /** Passed to `fetch` (e.g. `AbortSignal.timeout(ms)` for long-running endpoints). */
  signal?: AbortSignal;
  /** Internal: prevent infinite loop when retrying after token rotation. */
  _authRetry?: boolean;
};

const shouldAttemptSessionRefresh = (
  status: number,
  path: string,
  options: RequestOptions | undefined
): boolean => {
  if (status !== 401 || options?._authRetry === true) {
    return false;
  }
  if (path === "/auth/refresh" || path.startsWith("/auth/refresh?")) {
    return false;
  }
  const token = options?.token;
  return typeof token === "string" && token.length > 0;
};

export const apiRequest = async <T>(path: string, options?: RequestOptions): Promise<T> => {
  const requestBody =
    typeof options?.body === "string"
      ? options.body
      : options?.body !== undefined
        ? JSON.stringify(options.body)
        : undefined;

  const baseHeaders: Record<string, string> = {
    ...(requestBody !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(options?.token !== undefined ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options?.headers ?? {})
  };

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: options?.method ?? "GET",
      headers: baseHeaders,
      ...(requestBody !== undefined ? { body: requestBody } : {}),
      ...(options?.signal !== undefined ? { signal: options.signal } : {})
    });
  } catch (error: unknown) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new ApiError(
        "Could not reach the server. Check your network, VPN, and that the API is running.",
        0
      );
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(
        "Request timed out. The server may be busy or unreachable — try again in a moment.",
        0
      );
    }
    throw error;
  }

  if (!response.ok) {
    if (shouldAttemptSessionRefresh(response.status, path, options)) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        const nextToken = useAuthStore.getState().accessToken;
        return apiRequest<T>(path, {
          ...options,
          token: nextToken ?? undefined,
          _authRetry: true
        });
      }
    }
    const problem = (await response.json().catch(() => undefined)) as ProblemDetails | undefined;
    throw new ApiError(problem?.detail ?? "Request failed", response.status, problem);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

type BlobRequestOptions = {
  token?: string;
  _authRetry?: boolean;
};

const shouldAttemptSessionRefreshBlob = (
  status: number,
  path: string,
  options: BlobRequestOptions | undefined
): boolean => {
  if (status !== 401 || options?._authRetry === true) {
    return false;
  }
  if (path === "/auth/refresh" || path.startsWith("/auth/refresh?")) {
    return false;
  }
  const token = options?.token;
  return typeof token === "string" && token.length > 0;
};

/** Authenticated GET returning a binary body (e.g. Excel export). Applies the same 401 refresh retry as `apiRequest`. */
export const apiRequestBlob = async (path: string, options?: BlobRequestOptions): Promise<Blob> => {
  const baseHeaders: Record<string, string> = {
    ...(options?.token !== undefined ? { Authorization: `Bearer ${options.token}` } : {})
  };

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: "GET",
      headers: baseHeaders
    });
  } catch (error: unknown) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new ApiError(
        "Could not reach the server. Check your network, VPN, and that the API is running.",
        0
      );
    }
    throw error;
  }

  if (!response.ok) {
    if (shouldAttemptSessionRefreshBlob(response.status, path, options)) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        const nextToken = useAuthStore.getState().accessToken;
        return apiRequestBlob(path, {
          ...options,
          token: nextToken ?? undefined,
          _authRetry: true
        });
      }
    }
    const problem = (await response.json().catch(() => undefined)) as ProblemDetails | undefined;
    throw new ApiError(problem?.detail ?? "Request failed", response.status, problem);
  }

  return response.blob();
};
