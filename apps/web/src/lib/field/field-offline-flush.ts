"use client";

import { type QueryClient } from "@tanstack/react-query";

import { meCreateOutletVisit, meUpdateMeLocation } from "@/lib/api/generated/client";
import { ApiError } from "@/lib/api/problem-details";
import { toast } from "@/lib/toast";

import { deleteFieldOutboxEntry, listFieldOutboxEntries } from "./field-offline-idb";

const invalidateAfterFieldSync = async (queryClient: QueryClient | undefined): Promise<void> => {
  if (queryClient === undefined) {
    return;
  }
  await queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      if (!Array.isArray(key) || typeof key[0] !== "string") {
        return false;
      }
      if (key[0].startsWith("/me/")) {
        return true;
      }
      if (key[0] === "field") {
        return true;
      }
      return false;
    }
  });
};

/**
 * Sends queued field writes (clock-in / outlet visit) in order. Stops on network or auth errors
 * so items stay queued for the next attempt.
 */
export const flushFieldOutbox = async (queryClient: QueryClient | undefined): Promise<void> => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return;
  }

  const entries = await listFieldOutboxEntries();
  if (entries.length === 0) {
    return;
  }

  let flushed = 0;

  for (const entry of entries) {
    try {
      if (entry.kind === "location_ping") {
        await meUpdateMeLocation(entry.payload);
      } else {
        await meCreateOutletVisit(entry.payload);
      }
      await deleteFieldOutboxEntry(entry.id);
      flushed += 1;
    } catch (error) {
      if (error instanceof ApiError && error.status === 0) {
        return;
      }
      if (error instanceof ApiError && error.status === 401) {
        return;
      }
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        await deleteFieldOutboxEntry(entry.id);
        toast.error("Could not sync a saved field record", {
          description: error.message.slice(0, 220)
        });
        continue;
      }
      return;
    }
  }

  if (flushed > 0) {
    await invalidateAfterFieldSync(queryClient);
    toast.success(
      flushed === 1 ? "Saved field record synced" : `${String(flushed)} saved field records synced`
    );
  }
};
