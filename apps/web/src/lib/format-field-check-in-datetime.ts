const formatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "2-digit",
  hour: "numeric",
  minute: "2-digit",
  hour12: true
});

/**
 * Compact wordy datetime for field check-ins, e.g. "Thu, 8 May 26, 9:30 pm".
 */
export const formatFieldCheckInDateTime = (iso: string | Date): string => {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  return formatter.format(d);
};
