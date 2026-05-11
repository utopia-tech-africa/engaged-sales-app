"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { type ReactElement, useMemo, useState } from "react";

import { LocationPlaceLine } from "@/components/location-place-line";
import { useMeUpdateMeLocation } from "@/lib/api/generated/client";
import { parseLocationPingFromOrval, type LocationPing } from "@/lib/auth/orval-auth-adapter";
import { calmPrimaryButtonClass } from "@/lib/calm-ui";
import { formatFieldCheckInDateTime } from "@/lib/format-field-check-in-datetime";
import { requestCurrentPosition } from "@/lib/geolocation/request-current-position";
import { toast } from "@/lib/toast";

const DEEP_LINK_HINTS: Record<string, string> = {
  notification: "Opened from a notification or reminder link.",
  push: "Opened from a notification or reminder link.",
  home: "Opened from Home shortcuts.",
  shortcut: "Opened from a saved shortcut."
};

export function FieldCheckInPageInner(): ReactElement {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const locationMutation = useMeUpdateMeLocation();
  const [isLocating, setIsLocating] = useState(false);
  const [lastPing, setLastPing] = useState<LocationPing | null>(null);

  const deepLinkHint = useMemo(() => {
    const source = searchParams.get("source")?.trim() ?? "";
    if (source.length === 0) {
      return null;
    }
    return DEEP_LINK_HINTS[source] ?? "Opened via link.";
  }, [searchParams]);

  const handleCheckIn = (): void => {
    setIsLocating(true);
    void (async () => {
      const pos = await requestCurrentPosition();
      if (!pos.ok) {
        setIsLocating(false);
        toast.error(pos.message);
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
            toast.success("Check-in saved");
            void queryClient.invalidateQueries({
              predicate: (query) =>
                Array.isArray(query.queryKey) && query.queryKey[0] === "/me/location/history"
            });
          },
          onError: () => {
            toast.error("Could not save check-in. Try again.");
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

      {deepLinkHint ? (
        <p
          className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground dark:bg-muted/20"
          role="status"
        >
          {deepLinkHint}
        </p>
      ) : null}

      <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
        {lastPing ? (
          <p className="mb-4 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-foreground dark:bg-muted/15">
            <span className="font-medium">Last saved: </span>
            {formatFieldCheckInDateTime(lastPing.recordedAt)}
            <br />
            <LocationPlaceLine
              placeLabel={lastPing.placeLabel}
              latitude={lastPing.latitude}
              longitude={lastPing.longitude}
            />
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
