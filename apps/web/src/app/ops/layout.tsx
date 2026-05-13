import { Suspense, type ReactElement, type ReactNode } from "react";

import { BoneyardFullPageFallback } from "@/components/boneyard/boneyard-full-page-fallback";

import { OpsLayoutClient } from "./ops-layout-client";

export default function OpsLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <Suspense fallback={<BoneyardFullPageFallback name="ops-layout-suspense" height="screen" />}>
      <OpsLayoutClient>{children}</OpsLayoutClient>
    </Suspense>
  );
}
