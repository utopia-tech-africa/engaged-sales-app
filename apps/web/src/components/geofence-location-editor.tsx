"use client";

import { type ReactElement, useCallback, useMemo, useState } from "react";

import { type GeofenceMapOtherZone } from "@/components/geofence-leaflet-map";
import { GeofenceMapPicker } from "@/components/geofence-map-picker";
import { requestCurrentPosition } from "@/lib/geolocation/request-current-position";

const inputClass =
  "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const placeSearchInputClass =
  "h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2.5 text-sm leading-snug text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const placeToolbarButtonClass =
  "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-border bg-card px-3 text-xs font-semibold text-card-foreground shadow-sm transition-colors hover:border-primary/60 hover:bg-muted " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "active:bg-muted disabled:pointer-events-none disabled:opacity-50 sm:text-sm";

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

type GeocodeHit = {
  lat: number;
  lon: number;
  displayName: string;
};

export type GeofenceLocationEditorProps = {
  latitude: string;
  longitude: string;
  onLatitudeChange: (value: string) => void;
  onLongitudeChange: (value: string) => void;
  radiusMeters: string;
  onRadiusChange: (value: string) => void;
  otherZones: GeofenceMapOtherZone[];
  highlightZoneId?: string | null;
  fieldIdPrefix: string;
  /** When the user picks a search result and the parent label is empty, fill it with a short place name. */
  onSuggestLabel?: (shortLabel: string) => void;
};

export const GeofenceLocationEditor = ({
  latitude,
  longitude,
  onLatitudeChange,
  onLongitudeChange,
  radiusMeters,
  onRadiusChange,
  otherZones,
  highlightZoneId = null,
  fieldIdPrefix,
  onSuggestLabel
}: GeofenceLocationEditorProps): ReactElement => {
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeHits, setPlaceHits] = useState<GeocodeHit[]>([]);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  const mapLat = useMemo(() => {
    const n = Number(latitude);
    return Number.isFinite(n) ? n : null;
  }, [latitude]);

  const mapLng = useMemo(() => {
    const n = Number(longitude);
    return Number.isFinite(n) ? n : null;
  }, [longitude]);

  const mapRadius = useMemo(() => {
    const n = Number(radiusMeters);
    return Number.isFinite(n) && n > 0 ? n : 500;
  }, [radiusMeters]);

  const onMapPick = useCallback(
    (lat: number, lng: number) => {
      onLatitudeChange(lat.toFixed(6));
      onLongitudeChange(lng.toFixed(6));
    },
    [onLatitudeChange, onLongitudeChange]
  );

  const searchPlace = useCallback(async (): Promise<void> => {
    const q = placeQuery.trim();
    setPlaceError(null);
    setPlaceHits([]);
    if (q.length < 2) {
      setPlaceError("Type at least 2 characters.");
      return;
    }
    setPlaceLoading(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data: unknown = await res.json();
      if (!res.ok) {
        let err = "Search failed.";
        if (isJsonObject(data) && typeof data.error === "string") {
          err = data.error;
        }
        setPlaceError(err);
        return;
      }
      if (!isJsonObject(data) || !("results" in data) || !Array.isArray(data.results)) {
        setPlaceError("Unexpected response.");
        return;
      }
      const raw = data.results;
      const hits: GeocodeHit[] = [];
      for (const item of raw) {
        if (
          item !== null &&
          typeof item === "object" &&
          "lat" in item &&
          "lon" in item &&
          "displayName" in item
        ) {
          const lat = Number((item as { lat: unknown }).lat);
          const lon = Number((item as { lon: unknown }).lon);
          const displayName = String((item as { displayName: unknown }).displayName);
          if (Number.isFinite(lat) && Number.isFinite(lon)) {
            hits.push({ lat, lon, displayName });
          }
        }
      }
      setPlaceHits(hits);
      if (hits.length === 0) {
        setPlaceError("No places found. Try a different search.");
      }
    } catch {
      setPlaceError("Could not search. Check your connection and try again.");
    } finally {
      setPlaceLoading(false);
    }
  }, [placeQuery]);

  const applyHit = useCallback(
    (hit: GeocodeHit): void => {
      onLatitudeChange(hit.lat.toFixed(6));
      onLongitudeChange(hit.lon.toFixed(6));
      setPlaceHits([]);
      setPlaceError(null);
      if (onSuggestLabel) {
        const short = hit.displayName.split(",").at(0)?.trim() ?? hit.displayName;
        onSuggestLabel(short);
      }
    },
    [onLatitudeChange, onLongitudeChange, onSuggestLabel]
  );

  const useMyLocation = useCallback((): void => {
    setPlaceError(null);
    void (async () => {
      const pos = await requestCurrentPosition();
      if (pos.ok) {
        onLatitudeChange(pos.latitude.toFixed(6));
        onLongitudeChange(pos.longitude.toFixed(6));
      } else {
        setPlaceError(pos.message);
      }
    })();
  }, [onLatitudeChange, onLongitudeChange]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Find on map</p>
        <p id={`${fieldIdPrefix}-place-hint`} className="mt-0.5 text-xs text-muted-foreground">
          Search for a place, use your location, or click the map to set the center.
        </p>
        <div className="mt-2 flex w-full min-w-0 flex-row flex-nowrap items-center gap-2">
          <input
            id={`${fieldIdPrefix}-place`}
            className={placeSearchInputClass}
            value={placeQuery}
            onChange={(e) => {
              setPlaceQuery(e.target.value);
            }}
            placeholder="e.g. Westlands Nairobi, Kenya"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void searchPlace();
              }
            }}
            aria-describedby={`${fieldIdPrefix}-place-hint`}
          />
          <button
            type="button"
            className={placeToolbarButtonClass}
            disabled={placeLoading}
            onClick={() => {
              void searchPlace();
            }}
          >
            {placeLoading ? "Searching…" : "Search place"}
          </button>
          <button type="button" className={placeToolbarButtonClass} onClick={useMyLocation}>
            My location
          </button>
        </div>
        {placeError ? (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {placeError}
          </p>
        ) : null}
        {placeHits.length > 0 ? (
          <ul
            className="mt-2 max-h-40 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-card text-sm shadow-sm"
            role="listbox"
          >
            {placeHits.map((hit) => (
              <li key={`${String(hit.lat)}-${String(hit.lon)}-${hit.displayName.slice(0, 24)}`}>
                <button
                  type="button"
                  className="w-full cursor-pointer px-3 py-2.5 text-left text-foreground transition-colors duration-150 hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  onClick={() => {
                    applyHit(hit);
                  }}
                >
                  <span className="font-medium">{hit.displayName}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <GeofenceMapPicker
        latitude={mapLat}
        longitude={mapLng}
        radiusMeters={mapRadius}
        onLocationPick={onMapPick}
        otherZones={otherZones}
        highlightId={highlightZoneId}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor={`${fieldIdPrefix}-lat`}
          >
            Latitude
          </label>
          <input
            id={`${fieldIdPrefix}-lat`}
            className={inputClass}
            value={latitude}
            onChange={(e) => {
              onLatitudeChange(e.target.value);
            }}
            placeholder="-1.286389"
            inputMode="decimal"
          />
        </div>
        <div>
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor={`${fieldIdPrefix}-lng`}
          >
            Longitude
          </label>
          <input
            id={`${fieldIdPrefix}-lng`}
            className={inputClass}
            value={longitude}
            onChange={(e) => {
              onLongitudeChange(e.target.value);
            }}
            placeholder="36.817223"
            inputMode="decimal"
          />
        </div>
        <div>
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor={`${fieldIdPrefix}-r`}
          >
            Radius (m)
          </label>
          <input
            id={`${fieldIdPrefix}-r`}
            className={inputClass}
            value={radiusMeters}
            onChange={(e) => {
              onRadiusChange(e.target.value);
            }}
            inputMode="numeric"
          />
        </div>
      </div>
    </div>
  );
};
