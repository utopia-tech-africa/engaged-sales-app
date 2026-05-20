export type BinaryFileResponse = {
  setHeader: (name: string, value: string) => void;
  end: (body: Buffer) => void;
};

/** Sends a raw file body without JSON serialization (Nest `return buffer` breaks Excel/PDF). */
export const sendBinaryFile = (
  response: BinaryFileResponse,
  buffer: Buffer,
  contentType: string,
  filename: string
): void => {
  response.setHeader("Content-Type", contentType);
  response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  response.setHeader("Content-Length", String(buffer.length));
  response.end(buffer);
};
