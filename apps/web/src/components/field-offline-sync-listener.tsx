"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useNetworkOnline } from "@/hooks/use-network-online";
import { flushFieldOutbox } from "@/lib/field/field-offline-flush";

/**
 * Runs whenever the app believes it is back online so queued field submissions can sync.
 */
export const FieldOfflineSyncListener = (): null => {
  const queryClient = useQueryClient();
  const online = useNetworkOnline();

  useEffect(() => {
    if (!online) {
      return;
    }
    void flushFieldOutbox(queryClient);
  }, [online, queryClient]);

  return null;
};
