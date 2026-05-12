"use client";

import { SerwistProvider } from "@serwist/next/react";
import { type PropsWithChildren, type ReactElement } from "react";

/**
 * Registers the Serwist service worker in production so the app can be installed and cached.
 * Disabled in development to avoid stale caches while iterating.
 * Uses `type: "classic"` because Serwist emits a non-ESM worker bundle; the library default is
 * `module`, which causes registration to fail and hides the install prompt.
 */
export const PwaProvider = ({ children }: PropsWithChildren): ReactElement => {
  const disable = process.env.NODE_ENV === "development";

  return (
    <SerwistProvider swUrl="/sw.js" disable={disable} options={{ type: "classic" }}>
      {children}
    </SerwistProvider>
  );
};
