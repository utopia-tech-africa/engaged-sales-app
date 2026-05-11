export const FIELD_ACTIVITY_PALETTE = [
  "#2563eb",
  "#16a34a",
  "#c026d3",
  "#ea580c",
  "#0891b2",
  "#ca8a04",
  "#4f46e5",
  "#dc2626"
] as const;

/** Radix Select sentinel: all roster members. */
export const FIELD_ACTIVITY_USER_ALL = "__field_activity_all__";

export const labelClass =
  "mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground";

export const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Radix Select requires a non-empty value; map optional region to this sentinel. */
export const REGION_NONE = "__region_none__";

export const panelClass =
  "rounded-xl border border-border bg-card/95 shadow-sm backdrop-blur-sm dark:bg-card/70";

export const toDatetimeLocalValue = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${String(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const formatShort = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

export type ActivationDetailTab = "settings" | "products" | "roster" | "field-activity";
