"use client";

import { configureBoneyard } from "boneyard-js/react";
import { type PropsWithChildren, type ReactElement, useEffect } from "react";

let configured = false;

/**
 * Applies boneyard-js theme defaults once (aligned with app muted / card chrome).
 */
export const BoneyardAppSetup = ({ children }: PropsWithChildren): ReactElement => {
  useEffect(() => {
    if (configured) {
      return;
    }
    configured = true;
    configureBoneyard({
      color: "#e5e7eb",
      darkColor: "#3f3f46",
      animate: "shimmer",
      shimmerColor: "#f3f4f6",
      darkShimmerColor: "#52525b",
      speed: "1.8s"
    });
  }, []);

  return <>{children}</>;
};
