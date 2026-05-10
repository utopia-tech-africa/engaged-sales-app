import type { Metadata } from "next";
import { Suspense, type ReactElement, type ReactNode } from "react";

import { DashboardLayoutClient } from "./dashboard-layout-client";

export const metadata: Metadata = {
  title: { default: "Home", template: "%s · Field" },
  description: "Field dashboard — profile, check-ins, history, and support."
};

export default function DashboardLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-background text-muted-foreground">
          Loading…
        </div>
      }
    >
      <DashboardLayoutClient>{children}</DashboardLayoutClient>
    </Suspense>
  );
}
