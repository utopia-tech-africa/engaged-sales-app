"use client";

import { useEffect, useState } from "react";

import { countFieldOutboxEntries, FIELD_OUTBOX_CHANGED_EVENT } from "@/lib/field/field-offline-idb";

export const useFieldOutboxCount = (): number => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refresh = (): void => {
      void countFieldOutboxEntries()
        .then(setCount)
        .catch(() => {
          setCount(0);
        });
    };
    refresh();
    window.addEventListener(FIELD_OUTBOX_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener(FIELD_OUTBOX_CHANGED_EVENT, refresh);
    };
  }, []);

  return count;
};
