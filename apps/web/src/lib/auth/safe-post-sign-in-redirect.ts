import type { Role } from "@/lib/auth/auth-types";
import { isOpsRole } from "@/lib/ops/ops-adapters";

/**
 * Returns a safe in-app path after sign-in. Only same-origin relative paths under `/dashboard` (field)
 * or `/ops` (ops) are honored; blocks open redirects and protocol-relative URLs.
 */
export const resolvePostSignInRedirect = (
  redirectParam: string | null | undefined,
  role: Role
): string => {
  const opsUser = isOpsRole(role);
  const fallback = opsUser ? "/ops" : "/dashboard";

  const raw = redirectParam?.trim();
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return fallback;
  }

  const pathOnly = raw.split("?")[0]?.split("#")[0] ?? "";
  if (pathOnly.includes("..") || pathOnly.includes("\\")) {
    return fallback;
  }

  if (opsUser) {
    const allowedOps = pathOnly === "/ops" || pathOnly.startsWith("/ops/");
    return allowedOps ? raw : fallback;
  }

  const allowedField = pathOnly === "/dashboard" || pathOnly.startsWith("/dashboard/");

  return allowedField ? raw : fallback;
};
