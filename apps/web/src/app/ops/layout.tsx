import { Suspense, type ReactElement, type ReactNode } from "react";

import { OpsLayoutClient } from "./ops-layout-client";

export default function OpsLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
          Loading…
        </div>
      }
    >
      <OpsLayoutClient>{children}</OpsLayoutClient>
    </Suspense>
  );
}
