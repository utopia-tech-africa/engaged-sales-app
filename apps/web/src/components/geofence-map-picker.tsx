"use client";

import dynamic from "next/dynamic";
import { type ReactElement } from "react";

import { BoneyardBlock } from "@/components/boneyard/boneyard-block";
import { type GeofenceLeafletMapProps } from "@/components/geofence-leaflet-map";

const GeofenceLeafletMap = dynamic(
  () => import("@/components/geofence-leaflet-map").then((m) => m.GeofenceLeafletMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[min(420px,55vh)] min-h-[240px] w-full items-center justify-center rounded-lg border border-border bg-muted/30"
        aria-hidden
      >
        <BoneyardBlock
          name="geofence-map-loading"
          loading
          variant="lines4"
          className="w-full max-w-xs px-4"
        >
          <span className="sr-only">Loading map</span>
        </BoneyardBlock>
      </div>
    )
  }
);

export const GeofenceMapPicker = (props: GeofenceLeafletMapProps): ReactElement => {
  return <GeofenceLeafletMap {...props} />;
};
