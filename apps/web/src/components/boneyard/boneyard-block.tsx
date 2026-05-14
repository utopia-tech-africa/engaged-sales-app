"use client";

import { Skeleton } from "boneyard-js/react";
import type { SkeletonResult } from "boneyard-js";
import { type PropsWithChildren, type ReactElement } from "react";

import {
  BONEYARD_LINES_3,
  BONEYARD_LINES_4,
  BONEYARD_LIST_ROWS,
  BONEYARD_PAGE_GATE,
  BONEYARD_STAT_VALUE
} from "./preset-bones";

const VARIANT_PRESETS: Record<
  "lines3" | "lines4" | "listRows" | "statValue" | "pageGate",
  SkeletonResult
> = {
  lines3: BONEYARD_LINES_3,
  lines4: BONEYARD_LINES_4,
  listRows: BONEYARD_LIST_ROWS,
  statValue: BONEYARD_STAT_VALUE,
  pageGate: BONEYARD_PAGE_GATE
};

export type BoneyardBlockVariant = keyof typeof VARIANT_PRESETS;

type BoneyardBlockProps = PropsWithChildren<{
  /** Unique per capture target when you later run `boneyard-js build`. */
  name: string;
  loading: boolean;
  variant?: BoneyardBlockVariant;
  /** Overrides variant preset when you need an exact layout. */
  initialBones?: SkeletonResult;
  className?: string;
}>;

/**
 * Boneyard `<Skeleton>` with bundled layout presets (no CLI required). Replace `Loading…`
 * copy with this; run `pnpm exec boneyard-js build` later to swap in DOM-captured bones.
 */
export const BoneyardBlock = ({
  name,
  loading,
  variant = "lines3",
  initialBones,
  className,
  children
}: BoneyardBlockProps): ReactElement => (
  <Skeleton
    name={name}
    loading={loading}
    initialBones={initialBones ?? VARIANT_PRESETS[variant]}
    className={className}
    transition
  >
    {children}
  </Skeleton>
);
