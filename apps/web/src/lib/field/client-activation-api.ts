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
  const blob = await apiRequestBlob(
    `/activations/${encodeURIComponent(activationId)}/export.xlsx`,
    { token }
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `activation-${activationId}-report.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
};
