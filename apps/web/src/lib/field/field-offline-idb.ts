"use client";

/**
 * Queued field writes (clock-in / outlet visit) for offline sync.
 * Stored in IndexedDB for this origin only; cleared on sign-out. Payloads may include photos—treat
 * the device as trusted and keep OS disk encryption on for sensitive deployments.
 */
import type { CreateOutletVisitDto } from "@/lib/api/generated/model/createOutletVisitDto";
import type { UpdateLocationDto } from "@/lib/api/generated/model/updateLocationDto";

const DB_NAME = "engaged-sales-field-offline";
const STORE = "field-outbox";
const DB_VERSION = 1;

export type FieldOutboxEntry =
  | { id: string; kind: "location_ping"; createdAt: number; payload: UpdateLocationDto }
  | { id: string; kind: "outlet_visit"; createdAt: number; payload: CreateOutletVisitDto };

export const FIELD_OUTBOX_CHANGED_EVENT = "engaged-sales-field-outbox-changed";

export const dispatchFieldOutboxChanged = (): void => {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(FIELD_OUTBOX_CHANGED_EVENT));
};

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available on this device."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = (): void => {
      reject(request.error ?? new Error("Could not open offline storage."));
    };
    request.onsuccess = (): void => {
      resolve(request.result);
    };
    request.onupgradeneeded = (): void => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
  });

export const addFieldOutboxEntry = async (entry: FieldOutboxEntry): Promise<void> => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = (): void => {
      db.close();
      resolve();
    };
    tx.onerror = (): void => {
      reject(tx.error ?? new Error("Could not save to offline storage."));
    };
    const store = tx.objectStore(STORE);
    const put = store.add(entry);
    put.onerror = (): void => {
      reject(put.error ?? new Error("Could not save to offline storage."));
    };
  });
  dispatchFieldOutboxChanged();
};

export const deleteFieldOutboxEntry = async (id: string): Promise<void> => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = (): void => {
      db.close();
      resolve();
    };
    tx.onerror = (): void => {
      reject(tx.error ?? new Error("Could not update offline storage."));
    };
    const store = tx.objectStore(STORE);
    const del = store.delete(id);
    del.onerror = (): void => {
      reject(del.error ?? new Error("Could not update offline storage."));
    };
  });
  dispatchFieldOutboxChanged();
};

export const clearFieldOutbox = async (): Promise<void> => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = (): void => {
      db.close();
      resolve();
    };
    tx.onerror = (): void => {
      reject(tx.error ?? new Error("Could not clear offline storage."));
    };
    const store = tx.objectStore(STORE);
    const req = store.clear();
    req.onerror = (): void => {
      reject(req.error ?? new Error("Could not clear offline storage."));
    };
  });
  dispatchFieldOutboxChanged();
};

export const listFieldOutboxEntries = async (): Promise<FieldOutboxEntry[]> => {
  const db = await openDb();
  const rows = await new Promise<FieldOutboxEntry[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = (): void => {
      resolve(req.result as FieldOutboxEntry[]);
    };
    req.onerror = (): void => {
      reject(req.error ?? new Error("Could not read offline storage."));
    };
    tx.oncomplete = (): void => {
      db.close();
    };
  });
  return [...rows].sort((a, b) => a.createdAt - b.createdAt);
};

export const countFieldOutboxEntries = async (): Promise<number> => {
  const rows = await listFieldOutboxEntries();
  return rows.length;
};
