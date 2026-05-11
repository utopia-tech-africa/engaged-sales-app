import { ApiError, type ProblemDetails } from "./problem-details";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5000/api/v1";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT";
  body?: unknown;
  token?: string;
  /** Merged into fetch headers (e.g. Idempotency-Key). */
  headers?: Record<string, string>;
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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options?.method ?? "GET",
    headers: baseHeaders,
    ...(requestBody !== undefined ? { body: requestBody } : {})
  });

  if (!response.ok) {
    const problem = (await response.json().catch(() => undefined)) as ProblemDetails | undefined;
    throw new ApiError(problem?.detail ?? "Request failed", response.status, problem);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};
