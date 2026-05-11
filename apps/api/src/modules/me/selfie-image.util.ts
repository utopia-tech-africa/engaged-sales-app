import { BadRequestException } from "@nestjs/common";

const MAX_SELFIE_BYTES = 5 * 1024 * 1024;

export type ParsedSelfieImage = {
  mimeType: string;
  buffer: Buffer;
};

/**
 * Accepts raw base64 or a data URL (`data:image/jpeg;base64,...`).
 * Validates JPEG/PNG magic bytes and size (max 5 MiB decoded).
 */
export const parseSelfieBase64 = (raw: string): ParsedSelfieImage => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new BadRequestException("Selfie image is required for check-in");
  }

  let payload = trimmed.replace(/\s/g, "");
  let declaredMime: string | null = null;

  if (payload.startsWith("data:")) {
    const commaIdx = payload.indexOf(",");
    if (commaIdx === -1) {
      throw new BadRequestException("Invalid selfie data URL");
    }
    const meta = payload.slice(0, commaIdx);
    const metaMatch = /^data:([^;]+);base64$/i.exec(meta);
    if (metaMatch?.[1] === undefined) {
      throw new BadRequestException("Selfie must be a base64 data URL or raw base64");
    }
    declaredMime = metaMatch[1].trim().toLowerCase();
    payload = payload.slice(commaIdx + 1);
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(payload, "base64");
  } catch {
    throw new BadRequestException("Selfie could not be decoded as base64");
  }

  if (buffer.length === 0) {
    throw new BadRequestException("Selfie image is empty");
  }
  if (buffer.length > MAX_SELFIE_BYTES) {
    throw new BadRequestException(`Selfie image must be at most ${String(MAX_SELFIE_BYTES)} bytes`);
  }

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  if (!isJpeg && !isPng) {
    throw new BadRequestException("Selfie must be a JPEG or PNG photo");
  }

  const detectedMime = isJpeg ? "image/jpeg" : "image/png";
  if (declaredMime !== null && declaredMime !== "image/jpeg" && declaredMime !== "image/png") {
    throw new BadRequestException("Selfie must use image/jpeg or image/png");
  }
  if (declaredMime !== null && declaredMime !== detectedMime) {
    throw new BadRequestException("Selfie content does not match declared image type");
  }

  return { mimeType: detectedMime, buffer };
};
