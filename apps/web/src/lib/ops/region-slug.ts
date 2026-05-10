/**
 * Client-side preview of the slug the API will derive from a display name (keep in sync with API `slugifyRegionName`).
 */
export const slugifyRegionNamePreview = (name: string): string => {
  const trimmed = name.trim().toLowerCase();
  const decomposed = trimmed.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return decomposed
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};
