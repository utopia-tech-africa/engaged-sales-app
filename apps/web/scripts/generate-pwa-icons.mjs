/**
 * Generates static PWA icons (solid brand color). Run after changing brand color:
 *   pnpm exec node ./scripts/generate-pwa-icons.mjs
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, "..", "public", "icons");

/** Matches `:root` `--primary` (#d87943). */
const primary = { r: 216, g: 121, b: 67, alpha: 1 };

await mkdir(iconsDir, { recursive: true });

for (const size of [192, 512]) {
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: primary
    }
  })
    .png()
    .toFile(path.join(iconsDir, `icon-${String(size)}.png`));
}

console.log(`Wrote ${path.join(iconsDir, "icon-192.png")} and icon-512.png`);
