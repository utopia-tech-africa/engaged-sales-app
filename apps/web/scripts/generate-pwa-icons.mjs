/**
 * Generates PWA launcher icons from `public/icons/logo.png` (transparent backdrop).
 * Run after updating the brand mark:
 *   pnpm exec node ./scripts/ensure-logo-transparency.mjs
 *   pnpm exec node ./scripts/generate-pwa-icons.mjs
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, "..", "public", "icons");
const logoPath = path.join(iconsDir, "logo.png");

await mkdir(iconsDir, { recursive: true });

const logo = sharp(logoPath).ensureAlpha();

for (const size of [192, 512]) {
  const mark = await logo
    .clone()
    .resize(Math.round(size * 0.72), Math.round(size * 0.72), {
      fit: "inside",
      withoutEnlargement: false
    })
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toFile(path.join(iconsDir, `icon-${String(size)}.png`));
}

console.log(`Wrote ${path.join(iconsDir, "icon-192.png")} and icon-512.png (transparent canvas)`);
