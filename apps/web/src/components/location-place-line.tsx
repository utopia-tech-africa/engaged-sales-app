"use client";

import { type ReactElement } from "react";

import { ReverseGeocodeLabel } from "@/components/reverse-geocode-label";
import { shortenPlaceNameForDisplay } from "@/lib/format-short-place-name";
import { cn } from "@/lib/utils";

type LocationPlaceLineProps = {
  placeLabel: string | null | undefined;
  latitude: number;
  longitude: number;
  className?: string;
};

/**
 * Uses server-persisted place text when present; otherwise resolves via client reverse geocode (legacy pings).
 */
export function LocationPlaceLine({
  placeLabel,
  latitude,
  longitude,
  className
}: LocationPlaceLineProps): ReactElement {
  const trimmed = typeof placeLabel === "string" ? placeLabel.trim() : "";
  if (trimmed.length > 0) {
    const short = shortenPlaceNameForDisplay(trimmed);
    const showEllipsis = short.length < trimmed.length;
    return (
      <span className={cn("text-muted-foreground", className)} title={trimmed}>
        {short}
        {showEllipsis ? "…" : null}
      </span>
    );
  }

  return <ReverseGeocodeLabel latitude={latitude} longitude={longitude} className={className} />;
}
