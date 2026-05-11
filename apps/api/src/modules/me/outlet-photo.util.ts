import { BadRequestException } from "@nestjs/common";

const MAX_OUTLET_PHOTO_BYTES = 5 * 1024 * 1024;

export type ParsedOutletPhoto = {
  mimeType: string;
  buffer: Buffer;
};

export const parseOutletPhotoBase64 = (raw: string): ParsedOutletPhoto => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new BadRequestException("Outlet photo cannot be empty");
  }

  let payload = trimmed.replace(/\s/g, "");
  let declaredMime: string | null = null;

  if (payload.startsWith("data:")) {
    const commaIdx = payload.indexOf(",");
    if (commaIdx === -1) {
      throw new BadRequestException("Invalid outlet photo data URL");
    }
    const meta = payload.slice(0, commaIdx);
    const metaMatch = /^data:([^;]+);base64$/i.exec(meta);
    if (metaMatch?.[1] === undefined) {
      throw new BadRequestException("Outlet photo must be a base64 data URL or raw base64");
    }
    declaredMime = metaMatch[1].trim().toLowerCase();
    payload = payload.slice(commaIdx + 1);
  }

  const buffer = Buffer.from(payload, "base64");
  if (buffer.length === 0) {
    throw new BadRequestException("Outlet photo is empty");
  }
  if (buffer.length > MAX_OUTLET_PHOTO_BYTES) {
    throw new BadRequestException(
      `Outlet photo must be at most ${String(MAX_OUTLET_PHOTO_BYTES)} bytes`
    );
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
    throw new BadRequestException("Outlet photo must be a JPEG or PNG image");
  }

  const detectedMime = isJpeg ? "image/jpeg" : "image/png";
  if (declaredMime !== null && declaredMime !== "image/jpeg" && declaredMime !== "image/png") {
    throw new BadRequestException("Outlet photo must use image/jpeg or image/png");
  }
  if (declaredMime !== null && declaredMime !== detectedMime) {
    throw new BadRequestException("Outlet photo content does not match declared image type");
  }

  return { mimeType: detectedMime, buffer };
};
