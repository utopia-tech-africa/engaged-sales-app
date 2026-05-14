"use client";

import { type ReactElement } from "react";

import { cn } from "@/lib/utils";

import { BoneyardBlock } from "./boneyard-block";

type BoneyardFullPageFallbackProps = {
  name: string;
  /** `dvh` for field shell; `screen` for ops min-height layout. */
  height?: "dvh" | "screen";
};

export const BoneyardFullPageFallback = ({
  name,
  height = "dvh"
}: BoneyardFullPageFallbackProps): ReactElement => (
  <div
    className={cn(
      "flex items-center justify-center bg-background",
      height === "dvh" ? "h-dvh" : "min-h-screen"
    )}
  >
    <BoneyardBlock name={name} loading variant="pageGate" className="w-72 max-w-[85vw]">
      <span className="sr-only">Loading</span>
    </BoneyardBlock>
  </div>
);
