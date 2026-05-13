"use client";

import { type ReactElement } from "react";

import { BoneyardBlock } from "./boneyard-block";

type BoneyardInlineFallbackProps = {
  name: string;
  variant?: "lines3" | "lines4";
  className?: string;
};

/** Small inline skeleton for Suspense or section placeholders. */
export const BoneyardInlineFallback = ({
  name,
  variant = "lines3",
  className
}: BoneyardInlineFallbackProps): ReactElement => (
  <BoneyardBlock name={name} loading variant={variant} className={className}>
    <span className="sr-only">Loading</span>
  </BoneyardBlock>
);
