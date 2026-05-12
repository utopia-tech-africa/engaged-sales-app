import Link from "next/link";
import type { Metadata } from "next";
import type { ReactElement } from "react";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false }
};

/**
 * Shown when a document navigation fails offline and Serwist serves this fallback.
 */
export default function OfflinePage(): ReactElement {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <h1 className="text-lg font-semibold text-foreground">You are offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This page is not available without a connection. When you are back online, the app will load
        normally.
      </p>
      <Link
        href="/"
        className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm"
      >
        Try home
      </Link>
    </div>
  );
}
