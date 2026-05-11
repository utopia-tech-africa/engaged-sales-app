import { apiRequest } from "@/lib/api/http-client";

export type SubwholesaleRegionSummary = {
  id: string;
  name: string;
  slug: string;
};

export type SubwholesaleRecord = {
  id: string;
  regionId: string;
  slug: string;
  name: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  region: SubwholesaleRegionSummary;
};

export type CreateSubwholesalePayload = {
  regionId: string;
  name: string;
  slug?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
  isActive?: boolean;
};

export type UpdateSubwholesalePayload = Partial<CreateSubwholesalePayload>;

const buildListQuery = (regionId?: string): string => {
  if (regionId === undefined || regionId.length === 0) {
    return "";
  }
  return `?regionId=${encodeURIComponent(regionId)}`;
};

export const listSubwholesales = async (token: string, regionId?: string) =>
  apiRequest<SubwholesaleRecord[]>(`/admin/subwholesales${buildListQuery(regionId)}`, { token });

export const createSubwholesale = async (token: string, payload: CreateSubwholesalePayload) =>
  apiRequest<SubwholesaleRecord>("/admin/subwholesales", {
    method: "POST",
    token,
    body: payload
  });

export const updateSubwholesale = async (
  token: string,
  id: string,
  payload: UpdateSubwholesalePayload
) =>
  apiRequest<SubwholesaleRecord>(`/admin/subwholesales/${encodeURIComponent(id)}`, {
    method: "PATCH",
    token,
    body: payload
  });
