import type { SkeletonResult } from "boneyard-js";

/** Compact bones: [x%, yPx, w%, hPx, radiusPx|string] — matches boneyard `CompactBone` tuples. */

export const BONEYARD_LINES_3: SkeletonResult = {
  name: "preset-lines-3",
  viewportWidth: 768,
  width: 360,
  height: 68,
  bones: [
    [0, 0, 45, 12, 6],
    [0, 22, 100, 14, 6],
    [0, 46, 72, 14, 6]
  ]
};

export const BONEYARD_LINES_4: SkeletonResult = {
  name: "preset-lines-4",
  viewportWidth: 768,
  width: 360,
  height: 90,
  bones: [
    [0, 0, 38, 12, 6],
    [0, 20, 100, 14, 6],
    [0, 42, 94, 14, 6],
    [0, 64, 58, 14, 6]
  ]
};

/** List-style rows (stacked cards). */
export const BONEYARD_LIST_ROWS: SkeletonResult = {
  name: "preset-list-rows",
  viewportWidth: 768,
  width: 360,
  height: 200,
  bones: [
    [0, 0, 100, 44, 8],
    [0, 52, 100, 44, 8],
    [0, 104, 100, 44, 8],
    [0, 156, 100, 44, 8]
  ]
};

/** Large numeric / headline stat area. */
export const BONEYARD_STAT_VALUE: SkeletonResult = {
  name: "preset-stat-value",
  viewportWidth: 200,
  width: 160,
  height: 36,
  bones: [[0, 4, 62, 28, 6]]
};

/** Centered full-panel placeholder (layouts, gates). */
export const BONEYARD_PAGE_GATE: SkeletonResult = {
  name: "preset-page-gate",
  viewportWidth: 390,
  width: 320,
  height: 120,
  bones: [
    [10, 16, 80, 14, 6],
    [10, 42, 55, 12, 6],
    [10, 64, 70, 12, 6],
    [10, 86, 40, 10, 6]
  ]
};
