"use client";

import { type LatLngExpression } from "leaflet";
import { type ReactElement, useEffect } from "react";
import { Circle, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";

import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: LatLngExpression = [-1.286389, 36.817223];

export type GeofenceMapOtherZone = {
  id: string;
  label: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
};

type MapClickHandlerProps = {
  onLocationPick: (lat: number, lng: number) => void;
};

const MapClickHandler = ({ onLocationPick }: MapClickHandlerProps): null => {
  useMapEvents({
    click: (e) => {
      onLocationPick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
};

type MapCenterSyncProps = {
  latitude: number | null;
  longitude: number | null;
};

/**
 * Pans the map when latitude/longitude are updated from the form or place search (not redundant with click).
 */
const MapCenterSync = ({ latitude, longitude }: MapCenterSyncProps): null => {
  const map = useMap();
  useEffect(() => {
    if (latitude === null || longitude === null) return;
    const current = map.getCenter();
    if (Math.abs(current.lat - latitude) < 1e-7 && Math.abs(current.lng - longitude) < 1e-7) {
      return;
    }
    map.setView([latitude, longitude], Math.max(map.getZoom(), 14), { animate: true });
  }, [latitude, longitude, map]);
  return null;
};

export type GeofenceLeafletMapProps = {
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  onLocationPick: (lat: number, lng: number) => void;
  otherZones?: GeofenceMapOtherZone[];
  /** Highlight the editing row on the map (optional). */
  highlightId?: string | null;
};

export const GeofenceLeafletMap = ({
  latitude,
  longitude,
  radiusMeters,
  onLocationPick,
  otherZones = [],
  highlightId = null
}: GeofenceLeafletMapProps): ReactElement => {
  const hasCenter = latitude !== null && longitude !== null;
  const center: LatLngExpression = hasCenter ? [latitude, longitude] : DEFAULT_CENTER;
  const safeRadius = Number.isFinite(radiusMeters) && radiusMeters > 0 ? radiusMeters : 500;

  return (
    <MapContainer
      center={center}
      zoom={hasCenter ? 14 : 12}
      className="z-0 h-[min(420px,55vh)] w-full min-h-[240px] rounded-lg border border-border"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler onLocationPick={onLocationPick} />
      <MapCenterSync latitude={latitude} longitude={longitude} />

      {otherZones.map((zone) => {
        const isHighlight = highlightId !== null && zone.id === highlightId;
        return (
          <Circle
            key={zone.id}
            center={[zone.centerLatitude, zone.centerLongitude]}
            radius={zone.radiusMeters}
            pathOptions={{
              color: isHighlight ? "#0d9488" : "#64748b",
              weight: isHighlight ? 2 : 1,
              fillColor: isHighlight ? "#14b8a6" : "#94a3b8",
              fillOpacity: isHighlight ? 0.12 : 0.06
            }}
          />
        );
      })}

      {hasCenter ? (
        <Circle
          center={[latitude, longitude]}
          radius={safeRadius}
          pathOptions={{
            color: "#2563eb",
            weight: 2,
            fillColor: "#3b82f6",
            fillOpacity: 0.18
          }}
        />
      ) : null}
    </MapContainer>
  );
};
