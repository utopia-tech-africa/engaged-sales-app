"use client";

import dynamic from "next/dynamic";
import { type ReactElement } from "react";

import { type GeofenceLeafletMapProps } from "@/components/geofence-leaflet-map";

const GeofenceLeafletMap = dynamic(
  () => import("@/components/geofence-leaflet-map").then((m) => m.GeofenceLeafletMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[min(420px,55vh)] min-h-[240px] w-full items-center justify-center rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground"
        aria-hidden
      >
        Loading map…
      </div>
    )
  }
);

export const GeofenceMapPicker = (props: GeofenceLeafletMapProps): ReactElement => {
  return <GeofenceLeafletMap {...props} />;
};
