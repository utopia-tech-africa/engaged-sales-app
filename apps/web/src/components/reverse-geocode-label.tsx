"use client";

import { useQuery } from "@tanstack/react-query";
import { type ReactElement } from "react";

import { shortenPlaceNameForDisplay } from "@/lib/format-short-place-name";
import { cn } from "@/lib/utils";

const formatCoordPair = (latitude: number, longitude: number): string =>
  `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

const fetchReverseDisplayName = async (latitude: number, longitude: number): Promise<string> => {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude)
  });
  const res = await fetch(`/api/reverse-geocode?${params.toString()}`);
  const data: unknown = await res.json();
  if (!res.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : "Could not resolve place name.";
    throw new Error(message);
  }
  if (
    typeof data === "object" &&
    data !== null &&
    "displayName" in data &&
    typeof data.displayName === "string"
  ) {
    return (data as { displayName: string }).displayName;
  }
  throw new Error("Unexpected geocoder response.");
};

type ReverseGeocodeLabelProps = {
  latitude: number;
  longitude: number;
  className?: string;
};

/**
 * Resolves a human-readable place label via the app reverse-geocode route (Nominatim).
 * Falls back to coordinates if lookup fails.
 */
export function ReverseGeocodeLabel({
  latitude,
  longitude,
  className
}: ReverseGeocodeLabelProps): ReactElement {
  const coords = formatCoordPair(latitude, longitude);

  const query = useQuery({
    queryKey: ["reverse-geocode", latitude, longitude] as const,
    queryFn: () => fetchReverseDisplayName(latitude, longitude),
    staleTime: 7 * 24 * 60 * 60 * 1000,
    gcTime: 14 * 24 * 60 * 60 * 1000,
    retry: 1
  });

  if (query.isPending) {
    return (
      <span className={cn("text-muted-foreground", className)} aria-live="polite">
        Resolving place…
      </span>
    );
  }

  if (query.isError) {
    return (
      <span className={cn("text-muted-foreground", className)} title={coords}>
        {coords}
      </span>
    );
  }

  const full = query.data;
  const short = shortenPlaceNameForDisplay(full);
  const showEllipsis = short.length < full.length;

  return (
    <span className={cn("text-muted-foreground", className)} title={full}>
      {short}
      {showEllipsis ? "…" : null}
    </span>
  );
}
