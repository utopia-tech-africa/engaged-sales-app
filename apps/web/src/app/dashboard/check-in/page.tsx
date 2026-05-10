"use client";

import { useQueryClient } from "@tanstack/react-query";
import { type ReactElement, useState } from "react";

import { ReverseGeocodeLabel } from "@/components/reverse-geocode-label";
import { useMeUpdateMeLocation } from "@/lib/api/generated/client";
import { parseLocationPingFromOrval, type LocationPing } from "@/lib/auth/orval-auth-adapter";
import { calmPrimaryButtonClass } from "@/lib/calm-ui";
import { formatFieldCheckInDateTime } from "@/lib/format-field-check-in-datetime";
import { requestCurrentPosition } from "@/lib/geolocation/request-current-position";

export default function FieldCheckInPage(): ReactElement {
  const queryClient = useQueryClient();
  const locationMutation = useMeUpdateMeLocation();
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [lastPing, setLastPing] = useState<LocationPing | null>(null);

  const handleCheckIn = (): void => {
    setGeoError(null);
    setIsLocating(true);
    void (async () => {
      const pos = await requestCurrentPosition();
      if (!pos.ok) {
        setIsLocating(false);
        setGeoError(pos.message);
        return;
      }
      locationMutation.mutate(
        {
          data: {
            latitude: pos.latitude,
            longitude: pos.longitude
          }
        },
        {
          onSuccess: (result) => {
            setLastPing(parseLocationPingFromOrval(result));
            void queryClient.invalidateQueries({
              predicate: (query) =>
                Array.isArray(query.queryKey) && query.queryKey[0] === "/me/location/history"
            });
          },
          onSettled: () => {
            setIsLocating(false);
          }
        }
      );
    })();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Field check-in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Record where you are right now. Your browser may ask for location permission—only
          coordinates are sent to the server.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
        {geoError ? (
          <p className="text-sm text-destructive" role="alert">
            {geoError}
          </p>
        ) : null}
        {locationMutation.isError ? (
          <p className="text-sm text-destructive" role="alert">
            Could not save check-in. Try again.
          </p>
        ) : null}
        {lastPing ? (
          <p className="mb-4 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-foreground dark:bg-muted/15">
            <span className="font-medium">Last saved: </span>
            {formatFieldCheckInDateTime(lastPing.recordedAt)}
            <br />
            <ReverseGeocodeLabel latitude={lastPing.latitude} longitude={lastPing.longitude} />
          </p>
        ) : null}
        <button
          type="button"
          className={calmPrimaryButtonClass}
          disabled={isLocating || locationMutation.isPending}
          onClick={handleCheckIn}
        >
          {isLocating || locationMutation.isPending ? "Saving check-in…" : "Check in with location"}
        </button>
      </section>
    </div>
  );
}
