/** Base URL for JSON API calls (must match `orval` spec server path `/api/v1`). */
export const getApiBaseUrl = (): string =>
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5000/api/v1";
