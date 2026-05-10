/**
 * First segments of a Nominatim-style address for compact UI (matches prior ReverseGeocodeLabel behavior).
 */
export const shortenPlaceNameForDisplay = (displayName: string): string => {
  const parts = displayName.split(",").map((part) => part.trim());
  const head = parts.slice(0, 3).join(", ");
  return head.length > 0 ? head : displayName;
};
