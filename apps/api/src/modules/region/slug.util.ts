/**
 * Derive a URL-safe region slug from a display name (lowercase, hyphens, no leading/trailing hyphen).
 */
export const slugifyRegionName = (name: string): string => {
  const trimmed = name.trim().toLowerCase();
  const decomposed = trimmed.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return decomposed
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};
