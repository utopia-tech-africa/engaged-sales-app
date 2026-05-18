/**
 * Ensures `public/icons/logo.png` has a transparent background by flood-filling
 * from the image edges through pixels that match the corner backdrop color.
 *
 *   pnpm exec node ./scripts/ensure-logo-transparency.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logoPath = path.join(__dirname, "..", "public", "icons", "logo.png");

/** Max per-channel distance from backdrop sample to treat as background. */
const COLOR_TOLERANCE = 28;

const indexRgb = (width, x, y) => (y * width + x) * 3;

const matchesBackdrop = (data, idx, backdrop) => {
  const r = data[idx];
  const g = data[idx + 1];
  const b = data[idx + 2];
  return (
    Math.abs(r - backdrop[0]) <= COLOR_TOLERANCE &&
    Math.abs(g - backdrop[1]) <= COLOR_TOLERANCE &&
    Math.abs(b - backdrop[2]) <= COLOR_TOLERANCE
  );
};

const { data, info } = await sharp(logoPath).raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;

const corners = [
  [0, 0],
  [width - 1, 0],
  [0, height - 1],
  [width - 1, height - 1]
];
const backdrop = [0, 0, 0];
for (const [x, y] of corners) {
  const i = indexRgb(width, x, y);
  backdrop[0] += data[i];
  backdrop[1] += data[i + 1];
  backdrop[2] += data[i + 2];
}
backdrop[0] = Math.round(backdrop[0] / corners.length);
backdrop[1] = Math.round(backdrop[1] / corners.length);
backdrop[2] = Math.round(backdrop[2] / corners.length);

const transparent = new Uint8Array(width * height);
const queue = [];

const tryEnqueue = (x, y) => {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return;
  }
  const flat = y * width + x;
  if (transparent[flat] === 1) {
    return;
  }
  const idx = indexRgb(width, x, y);
  if (!matchesBackdrop(data, idx, backdrop)) {
    return;
  }
  transparent[flat] = 1;
  queue.push(flat);
};

for (let x = 0; x < width; x += 1) {
  tryEnqueue(x, 0);
  tryEnqueue(x, height - 1);
}
for (let y = 0; y < height; y += 1) {
  tryEnqueue(0, y);
  tryEnqueue(width - 1, y);
}

while (queue.length > 0) {
  const flat = queue.pop();
  const x = flat % width;
  const y = Math.floor(flat / width);
  tryEnqueue(x - 1, y);
  tryEnqueue(x + 1, y);
  tryEnqueue(x, y - 1);
  tryEnqueue(x, y + 1);
}

const rgba = Buffer.alloc(width * height * 4);
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const flat = y * width + x;
    const src = indexRgb(width, x, y);
    const dst = flat * 4;
    rgba[dst] = data[src];
    rgba[dst + 1] = data[src + 1];
    rgba[dst + 2] = data[src + 2];
    rgba[dst + 3] = transparent[flat] === 1 ? 0 : 255;
  }
}

await sharp(rgba, { raw: { width, height, channels: 4 } })
  .png()
  .toFile(logoPath);

const meta = await sharp(logoPath).metadata();
console.log(
  `Updated ${logoPath} — backdrop rgb(${backdrop.join(",")}), hasAlpha=${String(meta.hasAlpha)}`
);
