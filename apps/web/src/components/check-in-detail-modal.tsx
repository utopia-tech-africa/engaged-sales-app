"use client";

import { Camera, Clock, Loader2, MapPin, User, X } from "lucide-react";
import { type ReactElement } from "react";

import { LocationPlaceLine } from "@/components/location-place-line";
import { calmSecondaryButtonClass } from "@/lib/calm-ui";
import type { AdminFieldActivityCheckInDetail } from "@/lib/ops/field-activity-adapters";
import { cn } from "@/lib/utils";

export type CheckInDetailModalProps = {
  open: boolean;
  onClose: () => void;
  isLoading: boolean;
  isError: boolean;
  detail: AdminFieldActivityCheckInDetail | undefined;
  formatDateTime: (iso: string) => string;
  /** Shown under the title (e.g. activation roster vs live map). */
  contextSubtitle?: string;
};

const staffInitials = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

export function CheckInDetailModal({
  open,
  onClose,
  isLoading,
  isError,
  detail,
  formatDateTime,
  contextSubtitle = "Roster attendance verification"
}: CheckInDetailModalProps): ReactElement | null {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-3000 flex items-end justify-center sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px] transition-opacity dark:bg-black/65"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl",
          "sm:max-h-[min(640px,90vh)] sm:max-w-xl sm:rounded-2xl"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="check-in-detail-title"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3 sm:px-5 dark:bg-muted/15">
          <div className="min-w-0">
            <h2
              id="check-in-detail-title"
              className="truncate text-base font-semibold text-foreground"
            >
              Check-in details
            </h2>
            <p className="truncate text-xs text-muted-foreground">{contextSubtitle}</p>
          </div>
          <button
            type="button"
            className={cn(
              calmSecondaryButtonClass,
              "h-9 w-9 shrink-0 rounded-full p-0 text-muted-foreground hover:text-foreground"
            )}
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-4" strokeWidth={2.25} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-muted-foreground">
              <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
              <p className="text-sm">Loading check-in…</p>
            </div>
          ) : null}

          {isError ? (
            <div className="px-5 py-10">
              <p
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive"
                role="alert"
              >
                Could not load this check-in. Try again or pick another point on the map.
              </p>
            </div>
          ) : null}

          {detail !== undefined ? (
            <div className="space-y-5 px-4 pb-6 pt-4 sm:px-5">
              {detail.selfieDataUrl !== null ? (
                <figure className="overflow-hidden rounded-xl border border-border bg-muted/40 shadow-inner dark:bg-muted/20">
                  <img
                    src={detail.selfieDataUrl}
                    alt={`Verification photo for ${detail.user.fullName}`}
                    className="aspect-4/3 w-full object-cover sm:aspect-16/10 sm:max-h-[320px]"
                  />
                  <figcaption className="flex items-center gap-2 border-t border-border bg-card/90 px-3 py-2 text-xs text-muted-foreground dark:bg-card/80">
                    <Camera className="size-3.5 shrink-0 text-primary" aria-hidden />
                    Selfie on file for this check-in
                  </figcaption>
                </figure>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/25 px-4 py-10 text-center dark:bg-muted/10">
                  <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                    <Camera className="size-6 text-muted-foreground" aria-hidden />
                  </div>
                  <p className="text-sm font-medium text-foreground">No verification photo</p>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    This check-in predates selfie verification or was saved without a photo.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3 dark:bg-muted/10">
                <div
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary/25 text-sm font-semibold text-secondary-foreground dark:bg-secondary/35"
                  aria-hidden
                >
                  {staffInitials(detail.user.fullName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{detail.user.fullName}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <User className="size-3 shrink-0 opacity-70" aria-hidden />
                      {detail.user.role}
                    </span>
                    <span className="text-border">·</span>
                    <span className="tabular-nums">{detail.user.phone}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-card/80 px-4 py-3 shadow-sm dark:bg-card/50">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Clock className="size-3.5 shrink-0" aria-hidden />
                    Time
                  </div>
                  <p className="mt-2 text-sm font-medium tabular-nums text-foreground">
                    {formatDateTime(detail.recordedAt)}
                  </p>
                  <p className="mt-1 text-xs font-medium capitalize text-muted-foreground">
                    {detail.attendanceKind === "clock_out" ? "Clock out" : "Clock in"}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card/80 px-4 py-3 shadow-sm dark:bg-card/50">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" aria-hidden />
                    Coordinates
                  </div>
                  <p className="mt-2 font-mono text-xs tabular-nums text-foreground leading-relaxed">
                    {detail.latitude.toFixed(5)}
                    <br />
                    {detail.longitude.toFixed(5)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card/80 px-4 py-3 shadow-sm dark:bg-card/50">
                <p className="text-xs font-medium text-muted-foreground">Place</p>
                <p className="mt-2 text-sm leading-snug text-foreground">
                  <LocationPlaceLine
                    placeLabel={detail.placeLabel}
                    latitude={detail.latitude}
                    longitude={detail.longitude}
                    className="text-foreground"
                  />
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-card/80 px-4 py-3 shadow-sm dark:bg-card/50">
                  <p className="text-xs font-medium text-muted-foreground">Outlet distance</p>
                  <p className="mt-2 text-sm font-medium tabular-nums text-foreground">
                    {detail.distanceToGeofenceMeters !== null &&
                    detail.distanceToGeofenceMeters !== undefined
                      ? `${detail.distanceToGeofenceMeters.toFixed(1)}m`
                      : "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card/80 px-4 py-3 shadow-sm dark:bg-card/50">
                  <p className="text-xs font-medium text-muted-foreground">Dwell at outlet</p>
                  <p className="mt-2 text-sm font-medium tabular-nums text-foreground">
                    {detail.dwellSecondsAtGeofence !== null &&
                    detail.dwellSecondsAtGeofence !== undefined
                      ? `${String(Math.floor(detail.dwellSecondsAtGeofence / 60))}m ${String(
                          detail.dwellSecondsAtGeofence % 60
                        )}s`
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
