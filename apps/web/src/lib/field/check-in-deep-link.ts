/**
 * Canonical web path for field check-in. Use for notifications, shortcuts, and bookmarks:
 * `${origin}/dashboard/check-in` or with params via {@link fieldCheckInHref}.
 */
export const CHECK_IN_PATH = "/dashboard/check-in";

export function fieldCheckInHref(query?: Record<string, string>): string {
  if (!query || Object.keys(query).length === 0) {
    return CHECK_IN_PATH;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== "") {
      params.set(key, value);
    }
  }

  const qs = params.toString();
  return qs.length > 0 ? `${CHECK_IN_PATH}?${qs}` : CHECK_IN_PATH;
}
