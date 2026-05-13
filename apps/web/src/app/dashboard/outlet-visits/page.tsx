"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { type ChangeEvent, type ReactElement, type SyntheticEvent, useState } from "react";

import { BoneyardInlineFallback } from "@/components/boneyard/boneyard-inline-fallback";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useNetworkOnline } from "@/hooks/use-network-online";
import { ApiError } from "@/lib/api/problem-details";
import { useAuthStore } from "@/lib/auth/auth-store";
import { calmPrimaryButtonClass } from "@/lib/calm-ui";
import { enqueueOutletVisitForOfflineSync } from "@/lib/field/field-offline-enqueue";
import {
  createOutletVisit,
  listOutlets,
  type CreateOutletVisitPayload
} from "@/lib/outlet/outlet-api";

const inputClass =
  "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const SELECT_NONE = "__none__";

const readFileAsDataUrl = async (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = reader.result;
      if (typeof value === "string") {
        resolve(value);
        return;
      }
      reject(new Error("Could not read file."));
    };
    reader.onerror = () => {
      reject(new Error("Could not read file."));
    };
    reader.readAsDataURL(file);
  });

export default function OutletVisitsPage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const online = useNetworkOnline();
  const [outletId, setOutletId] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [outletPhotoBase64, setOutletPhotoBase64] = useState<string | undefined>(undefined);
  const [stockAvailabilityNotes, setStockAvailabilityNotes] = useState("");
  const [salesMadeNotes, setSalesMadeNotes] = useState("");
  const [consumerEngagementNotes, setConsumerEngagementNotes] = useState("");
  const [visibilityExecutionNotes, setVisibilityExecutionNotes] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const outletsQuery = useQuery({
    queryKey: ["field", "outlets"],
    queryFn: async () => listOutlets(accessToken ?? ""),
    enabled: accessToken !== null,
    staleTime: 60 * 60 * 1000,
    select: (rows) => rows.filter((row) => row.isActive)
  });

  const createVisitMutation = useMutation({
    mutationFn: async (payload: CreateOutletVisitPayload) =>
      createOutletVisit(accessToken ?? "", payload)
  });

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file === undefined) {
      setOutletPhotoBase64(undefined);
      return;
    }
    void readFileAsDataUrl(file)
      .then((value) => {
        setOutletPhotoBase64(value);
      })
      .catch(() => {
        setErrorMessage("Could not read outlet photo.");
      });
  };

  const useCurrentLocation = (): void => {
    setStatusMessage(null);
    setErrorMessage(null);
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setErrorMessage("Geolocation is not available on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(String(position.coords.latitude));
        setLongitude(String(position.coords.longitude));
      },
      () => {
        setErrorMessage("Could not read your current location. Enter coordinates manually.");
      }
    );
  };

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);

    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);
    if (!outletId || Number.isNaN(parsedLatitude) || Number.isNaN(parsedLongitude)) {
      setErrorMessage("Select an outlet and provide valid latitude/longitude.");
      return;
    }

    const payload = {
      outletId,
      latitude: parsedLatitude,
      longitude: parsedLongitude,
      ...(outletPhotoBase64 !== undefined ? { outletPhotoBase64 } : {}),
      ...(stockAvailabilityNotes.trim().length > 0
        ? { stockAvailabilityNotes: stockAvailabilityNotes.trim() }
        : {}),
      ...(salesMadeNotes.trim().length > 0 ? { salesMadeNotes: salesMadeNotes.trim() } : {}),
      ...(consumerEngagementNotes.trim().length > 0
        ? { consumerEngagementNotes: consumerEngagementNotes.trim() }
        : {}),
      ...(visibilityExecutionNotes.trim().length > 0
        ? { visibilityExecutionNotes: visibilityExecutionNotes.trim() }
        : {})
    };

    const clearFormAfterSuccess = (): void => {
      setStatusMessage("Outlet visit submitted successfully.");
      setOutletPhotoBase64(undefined);
      setStockAvailabilityNotes("");
      setSalesMadeNotes("");
      setConsumerEngagementNotes("");
      setVisibilityExecutionNotes("");
    };

    if (!online) {
      void (async () => {
        try {
          await enqueueOutletVisitForOfflineSync(payload);
          setStatusMessage(
            "Visit saved on this device. It will send automatically when you are back online."
          );
          setOutletPhotoBase64(undefined);
          setStockAvailabilityNotes("");
          setSalesMadeNotes("");
          setConsumerEngagementNotes("");
          setVisibilityExecutionNotes("");
        } catch {
          setErrorMessage(
            "Could not save on this device. Check storage permissions or free space, then try again."
          );
        }
      })();
      return;
    }

    createVisitMutation.mutate(payload, {
      onSuccess: () => {
        clearFormAfterSuccess();
      },
      onError: (error: unknown) => {
        if (error instanceof ApiError && error.status === 0) {
          void (async () => {
            try {
              await enqueueOutletVisitForOfflineSync(payload);
              setStatusMessage(
                "Visit saved on this device. It will send automatically when you are back online."
              );
              setOutletPhotoBase64(undefined);
              setStockAvailabilityNotes("");
              setSalesMadeNotes("");
              setConsumerEngagementNotes("");
              setVisibilityExecutionNotes("");
            } catch {
              const message =
                error instanceof ApiError
                  ? (error.problem?.detail ?? error.message)
                  : "Could not submit outlet visit.";
              setErrorMessage(message);
            }
          })();
          return;
        }
        const message =
          error instanceof ApiError
            ? (error.problem?.detail ?? error.message)
            : "Could not submit outlet visit.";
        setErrorMessage(message);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Outlet visit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Check into an outlet and record stock, sales, consumer engagement, and visibility
          execution. If you lose signal, you can still submit—the visit is stored on this phone and
          sent when you are online again.
        </p>
        <p className="mt-1 text-sm">
          <Link
            href="/dashboard/outlet-visits/history"
            className="text-primary underline-offset-4 hover:underline"
          >
            View outlet visit history
          </Link>
        </p>
      </div>

      <form
        className="space-y-4 rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50"
        onSubmit={handleSubmit}
      >
        <label className="block text-xs font-medium text-muted-foreground">
          Outlet
          <Select
            value={outletId.length > 0 ? outletId : SELECT_NONE}
            onValueChange={(value) => {
              setOutletId(value === SELECT_NONE ? "" : value);
            }}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select outlet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SELECT_NONE}>Select outlet</SelectItem>
              {outletsQuery.data?.map((outlet) => (
                <SelectItem key={outlet.id} value={outlet.id}>
                  {outlet.name} - {outlet.locationArea}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-muted-foreground">
            Latitude
            <input
              className={inputClass}
              value={latitude}
              onChange={(event) => {
                setLatitude(event.target.value);
              }}
              inputMode="decimal"
              required
            />
          </label>
          <label className="block text-xs font-medium text-muted-foreground">
            Longitude
            <input
              className={inputClass}
              value={longitude}
              onChange={(event) => {
                setLongitude(event.target.value);
              }}
              inputMode="decimal"
              required
            />
          </label>
        </div>

        <button
          type="button"
          className="inline-flex rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/50"
          onClick={useCurrentLocation}
        >
          Use current location
        </button>

        <label className="block text-xs font-medium text-muted-foreground">
          Outlet photo (optional)
          <input
            className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:font-medium`}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handlePhotoChange}
          />
        </label>

        <label className="block text-xs font-medium text-muted-foreground">
          Stock availability
          <textarea
            className={`${inputClass} min-h-20`}
            value={stockAvailabilityNotes}
            onChange={(event) => {
              setStockAvailabilityNotes(event.target.value);
            }}
            placeholder="Record stock availability details"
          />
        </label>

        <label className="block text-xs font-medium text-muted-foreground">
          Sales made
          <textarea
            className={`${inputClass} min-h-20`}
            value={salesMadeNotes}
            onChange={(event) => {
              setSalesMadeNotes(event.target.value);
            }}
            placeholder="Record sales achieved at this outlet"
          />
        </label>

        <label className="block text-xs font-medium text-muted-foreground">
          Consumer engagement
          <textarea
            className={`${inputClass} min-h-20`}
            value={consumerEngagementNotes}
            onChange={(event) => {
              setConsumerEngagementNotes(event.target.value);
            }}
            placeholder="Record demos, sampling, or conversations"
          />
        </label>

        <label className="block text-xs font-medium text-muted-foreground">
          Visibility execution
          <textarea
            className={`${inputClass} min-h-20`}
            value={visibilityExecutionNotes}
            onChange={(event) => {
              setVisibilityExecutionNotes(event.target.value);
            }}
            placeholder="Record POSM placement and shelf visibility work"
          />
        </label>

        <button
          type="submit"
          className={calmPrimaryButtonClass}
          disabled={createVisitMutation.isPending}
        >
          {createVisitMutation.isPending ? "Submitting..." : "Submit outlet visit"}
        </button>
      </form>

      {outletsQuery.isLoading ? (
        <BoneyardInlineFallback name="field-outlet-visits-outlets" className="min-h-24" />
      ) : null}
      {outletsQuery.isError ? (
        <p className="text-sm text-destructive">
          Could not load outlet list. Contact your supervisor.
        </p>
      ) : null}
      {statusMessage !== null ? <p className="text-sm text-emerald-600">{statusMessage}</p> : null}
      {errorMessage !== null ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
