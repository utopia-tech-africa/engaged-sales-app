"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { type ReactElement, useEffect, useMemo, useRef, useState } from "react";

import { LocationPlaceLine } from "@/components/location-place-line";
import { SelfieCapture } from "@/components/selfie-capture";
import { useMeGetFieldAttendance, useMeUpdateMeLocation } from "@/lib/api/generated/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import type { FieldAttendancePayload } from "@/lib/field/field-attendance";
import { parseLocationPingFromOrval, type LocationPing } from "@/lib/auth/orval-auth-adapter";
import { calmPrimaryButtonClass, calmSecondaryButtonClass } from "@/lib/calm-ui";
import { formatFieldCheckInDateTime } from "@/lib/format-field-check-in-datetime";
import { requestCurrentPosition } from "@/lib/geolocation/request-current-position";
import { toast } from "@/lib/toast";

const DEEP_LINK_HINTS: Record<string, string> = {
  notification: "Opened from a notification or reminder link.",
  push: "Opened from a notification or reminder link.",
  home: "Opened from Home shortcuts.",
  shortcut: "Opened from a saved shortcut."
};

type GpsFix = { latitude: number; longitude: number };

type AttendanceKind = "clock_in" | "clock_out";

const attendanceActionLabel = (kind: AttendanceKind): string =>
  kind === "clock_out" ? "clock-out" : "clock-in";

export function FieldCheckInPageInner(): ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const locationMutation = useMeUpdateMeLocation();
  const fieldAttendanceQuery = useMeGetFieldAttendance({
    query: {
      enabled: user?.role === "promoter",
      select: (raw) => raw as unknown as FieldAttendancePayload
    }
  });
  const lastServerSuggestionRef = useRef<{ localDate: string; kind: AttendanceKind } | null>(null);
  const [attendanceKind, setAttendanceKind] = useState<AttendanceKind>("clock_in");
  const [isLocating, setIsLocating] = useState(false);
  const [gpsFix, setGpsFix] = useState<GpsFix | null>(null);
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);
  const [lastPing, setLastPing] = useState<LocationPing | null>(null);

  const deepLinkHint = useMemo(() => {
    const source = searchParams.get("source")?.trim() ?? "";
    if (source.length === 0) {
      return null;
    }
    return DEEP_LINK_HINTS[source] ?? "Opened via link.";
  }, [searchParams]);

  useEffect(() => {
    const payload = fieldAttendanceQuery.data;
    if (!payload?.applicable) {
      return;
    }
    const prev = lastServerSuggestionRef.current;
    if (
      prev !== null &&
      prev.localDate === payload.localDate &&
      prev.kind === payload.suggestedNextAttendanceKind
    ) {
      return;
    }
    lastServerSuggestionRef.current = {
      localDate: payload.localDate,
      kind: payload.suggestedNextAttendanceKind
    };
    setAttendanceKind(payload.suggestedNextAttendanceKind);
  }, [fieldAttendanceQuery.data]);

  const handleConfirmLocation = (): void => {
    setIsLocating(true);
    void (async () => {
      const pos = await requestCurrentPosition();
      setIsLocating(false);
      if (!pos.ok) {
        toast.error(pos.message);
        return;
      }
      setGpsFix({ latitude: pos.latitude, longitude: pos.longitude });
      setSelfieDataUrl(null);
      toast.success("Location captured for this attendance event");
    })();
  };

  const handleSubmitCheckIn = (): void => {
    if (gpsFix === null || selfieDataUrl === null) {
      return;
    }
    locationMutation.mutate(
      {
        data: {
          latitude: gpsFix.latitude,
          longitude: gpsFix.longitude,
          attendanceKind,
          selfieImageBase64: selfieDataUrl
        }
      },
      {
        onSuccess: (result) => {
          setLastPing(parseLocationPingFromOrval(result));
          setGpsFix(null);
          setSelfieDataUrl(null);
          toast.success(`${attendanceKind === "clock_out" ? "Clock-out" : "Clock-in"} saved`);
          void queryClient.invalidateQueries({
            predicate: (query) =>
              Array.isArray(query.queryKey) &&
              (query.queryKey[0] === "/me/location/history" ||
                query.queryKey[0] === "/me/field-attendance")
          });
          if (searchParams.get("dailyGate") === "1") {
            router.replace("/dashboard");
          }
        },
        onError: () => {
          toast.error(`Could not save ${attendanceActionLabel(attendanceKind)}. Try again.`);
        }
      }
    );
  };

  const canSubmit = gpsFix !== null && selfieDataUrl !== null && !locationMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Field attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Record a clock-in when you arrive and a clock-out when you leave. GPS and a selfie are
          required for each save.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
        <h2 className="text-sm font-semibold text-foreground">Attendance type</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose before you capture location—this is sent with your ping.
        </p>
        <div className="mt-3 inline-flex rounded-lg border border-border p-0.5">
          {(
            [
              { kind: "clock_in" as const, label: "Clock in" },
              { kind: "clock_out" as const, label: "Clock out" }
            ] as const
          ).map(({ kind, label }) => {
            const active = attendanceKind === kind;
            return (
              <button
                key={kind}
                type="button"
                disabled={locationMutation.isPending}
                className={[
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                ].join(" ")}
                onClick={() => {
                  setAttendanceKind(kind);
                  setGpsFix(null);
                  setSelfieDataUrl(null);
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {deepLinkHint ? (
        <p
          className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground dark:bg-muted/20"
          role="status"
        >
          {deepLinkHint}
        </p>
      ) : null}

      <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
        <h2 className="text-sm font-semibold text-foreground">1. Location</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Allow location access when prompted—only coordinates are sent with your{" "}
          {attendanceActionLabel(attendanceKind)}.
        </p>
        {gpsFix ? (
          <p className="mt-3 text-xs text-foreground">
            <span className="font-medium text-secondary">Ready: </span>
            {gpsFix.latitude.toFixed(5)}, {gpsFix.longitude.toFixed(5)}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className={calmPrimaryButtonClass}
            disabled={isLocating || locationMutation.isPending}
            onClick={handleConfirmLocation}
          >
            {isLocating ? "Getting location…" : gpsFix ? "Update location" : "Capture location"}
          </button>
          {gpsFix ? (
            <button
              type="button"
              className={calmSecondaryButtonClass}
              disabled={locationMutation.isPending}
              onClick={() => {
                setGpsFix(null);
                setSelfieDataUrl(null);
              }}
            >
              Clear
            </button>
          ) : null}
        </div>
      </section>

      {gpsFix ? (
        <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
          <h2 className="text-sm font-semibold text-foreground">2. Selfie verification</h2>
          {selfieDataUrl ? (
            <div className="mt-3 space-y-3">
              <p className="text-xs font-medium text-secondary">
                Selfie ready for this {attendanceActionLabel(attendanceKind)}.
              </p>
              <img
                src={selfieDataUrl}
                alt="Selected selfie"
                className="aspect-video w-full max-w-md rounded-xl border border-border object-cover"
              />
              <button
                type="button"
                className={calmSecondaryButtonClass}
                disabled={locationMutation.isPending}
                onClick={() => {
                  setSelfieDataUrl(null);
                }}
              >
                Retake selfie
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <SelfieCapture
                key={`${String(gpsFix.latitude)}-${String(gpsFix.longitude)}`}
                disabled={locationMutation.isPending}
                onPhotoReady={(url) => {
                  setSelfieDataUrl(url);
                }}
              />
            </div>
          )}
        </section>
      ) : null}

      {gpsFix && selfieDataUrl ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className={calmPrimaryButtonClass}
            disabled={!canSubmit}
            onClick={handleSubmitCheckIn}
          >
            {locationMutation.isPending
              ? `Saving ${attendanceActionLabel(attendanceKind)}…`
              : `Submit ${attendanceActionLabel(attendanceKind)}`}
          </button>
        </div>
      ) : null}

      {lastPing ? (
        <section className="rounded-xl border border-border bg-muted/20 p-4 dark:bg-muted/10">
          <p className="text-xs font-medium text-foreground">Last saved attendance</p>
          <p className="mt-2 text-xs text-foreground">
            <span className="mr-2 rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground">
              {lastPing.attendanceKind === "clock_out" ? "Clock out" : "Clock in"}
            </span>
            {formatFieldCheckInDateTime(lastPing.recordedAt)}
            {lastPing.hasSelfieVerification ? (
              <span className="ml-2 rounded-md bg-secondary/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-secondary">
                Verified
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-xs leading-snug">
            <LocationPlaceLine
              placeLabel={lastPing.placeLabel}
              latitude={lastPing.latitude}
              longitude={lastPing.longitude}
            />
          </p>
        </section>
      ) : null}
    </div>
  );
}
