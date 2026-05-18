/**
 * Generates favicon and PWA launcher icons from `public/icons/ors-logo.png`.
 * Run after updating the brand mark:
 *   pnpm exec node ./scripts/ensure-logo-transparency.mjs
 *   pnpm exec node ./scripts/generate-pwa-icons.mjs
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");
const iconsDir = path.join(webRoot, "public", "icons");
const appDir = path.join(webRoot, "src", "app");
const logoPath = path.join(iconsDir, "ors-logo.png");

const composeSquareIcon = async (logo, size) => {
  const mark = await logo
    .clone()
    .resize(Math.round(size * 0.72), Math.round(size * 0.72), {
      fit: "inside",
      withoutEnlargement: false
    })
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: mark, gravity: "center" }])
    .png();
};

await mkdir(iconsDir, { recursive: true });

const logo = sharp(logoPath).ensureAlpha();

for (const size of [16, 32, 192, 512]) {
  const outName = size <= 32 ? `favicon-${String(size)}.png` : `icon-${String(size)}.png`;
  await (await composeSquareIcon(logo, size)).toFile(path.join(iconsDir, outName));
}

await (await composeSquareIcon(logo, 32)).toFile(path.join(appDir, "icon.png"));

console.log(
  "Wrote favicon-16.png, favicon-32.png, icon-192.png, icon-512.png, and src/app/icon.png"
);
