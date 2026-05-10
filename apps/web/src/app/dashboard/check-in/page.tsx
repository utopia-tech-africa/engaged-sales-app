import { Suspense, type ReactElement } from "react";

import { FieldCheckInPageInner } from "./check-in-page-inner";

export default function FieldCheckInPage(): ReactElement {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <FieldCheckInPageInner />
    </Suspense>
  );
}
