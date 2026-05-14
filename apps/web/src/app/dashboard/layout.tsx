import type { Metadata } from "next";
import { Suspense, type ReactElement, type ReactNode } from "react";

import { BoneyardFullPageFallback } from "@/components/boneyard/boneyard-full-page-fallback";

import { DashboardLayoutClient } from "./dashboard-layout-client";

export const metadata: Metadata = {
  title: { default: "Home", template: "%s · Field" },
  description: "Field dashboard — profile, check-ins, history, and support."
};

export default function DashboardLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <Suspense fallback={<BoneyardFullPageFallback name="dashboard-layout-suspense" />}>
      <DashboardLayoutClient>{children}</DashboardLayoutClient>
    </Suspense>
  );
}
