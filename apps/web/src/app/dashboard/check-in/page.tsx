import { Suspense, type ReactElement } from "react";

import { BoneyardInlineFallback } from "@/components/boneyard/boneyard-inline-fallback";

import { FieldCheckInPageInner } from "./check-in-page-inner";

export default function FieldCheckInPage(): ReactElement {
  return (
    <Suspense fallback={<BoneyardInlineFallback name="check-in-suspense" className="mt-1" />}>
      <FieldCheckInPageInner />
    </Suspense>
  );
}
