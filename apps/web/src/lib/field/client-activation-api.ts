import { apiRequest, apiRequestBlob } from "@/lib/api/http-client";

export type ClientTeamSaleRow = {
  id: string;
  createdAt: string;
  user: { id: string; fullName: string; phone: string; role: string };
  items: { quantity: number; product: { id: string; name: string; sku: string | null } }[];
};

export const fetchClientTeamSales = async (token: string, activationId: string, limit = 100) =>
  apiRequest<ClientTeamSaleRow[]>(
    `/activations/${encodeURIComponent(activationId)}/team-sales?limit=${encodeURIComponent(String(limit))}`,
    { token }
  );

export const downloadClientActivationWorkbook = async (
  token: string,
  activationId: string
): Promise<void> => {
  const { blob } = await apiRequestBlob(
    `/activations/${encodeURIComponent(activationId)}/export.xlsx`,
    { token }
  );
  const headerBytes = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  if (headerBytes[0] !== 0x50 || headerBytes[1] !== 0x4b) {
    throw new Error("Downloaded file is not a valid Excel workbook.");
  }
  const xlsxBlob =
    blob.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ? blob
      : new Blob([await blob.arrayBuffer()], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });
  const url = URL.createObjectURL(xlsxBlob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `activation-${activationId}-report.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
};
