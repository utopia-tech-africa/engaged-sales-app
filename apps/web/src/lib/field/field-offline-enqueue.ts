"use client";

import type { CreateOutletVisitDto } from "@/lib/api/generated/model/createOutletVisitDto";
import type { UpdateLocationDto } from "@/lib/api/generated/model/updateLocationDto";

import { addFieldOutboxEntry } from "./field-offline-idb";

export const enqueueLocationPingForOfflineSync = async (
  payload: UpdateLocationDto
): Promise<void> => {
  await addFieldOutboxEntry({
    id: crypto.randomUUID(),
    kind: "location_ping",
    createdAt: Date.now(),
    payload
  });
};

export const enqueueOutletVisitForOfflineSync = async (
  payload: CreateOutletVisitDto
): Promise<void> => {
  await addFieldOutboxEntry({
    id: crypto.randomUUID(),
    kind: "outlet_visit",
    createdAt: Date.now(),
    payload
  });
};
