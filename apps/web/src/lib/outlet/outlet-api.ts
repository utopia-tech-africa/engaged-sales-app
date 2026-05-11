import { apiRequest } from "@/lib/api/http-client";

export type OutletRecord = {
  id: string;
  name: string;
  category: string;
  distributorName: string;
  locationArea: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  isActive: boolean;
};

export type CreateOutletPayload = {
  name: string;
  category: string;
  distributorName: string;
  locationArea: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  isActive?: boolean;
};

export type UpdateOutletPayload = Partial<CreateOutletPayload>;

export type CreateOutletVisitPayload = {
  outletId: string;
  latitude: number;
  longitude: number;
  outletPhotoBase64?: string;
  stockAvailabilityNotes?: string;
  salesMadeNotes?: string;
  consumerEngagementNotes?: string;
  visibilityExecutionNotes?: string;
};

export type OutletVisitRecord = {
  id: string;
  outletId: string;
  userId: string;
  latitude: number;
  longitude: number;
  hasOutletPhoto: boolean;
  stockAvailabilityNotes: string | null;
  salesMadeNotes: string | null;
  consumerEngagementNotes: string | null;
  visibilityExecutionNotes: string | null;
  checkedInAt: string;
  outlet?: {
    id: string;
    name: string;
    category: string;
    distributorName: string;
    locationArea: string;
  };
  user?: {
    id: string;
    fullName: string;
    phone: string;
    role: string;
  };
};

export const listOutlets = async (token: string): Promise<OutletRecord[]> =>
  apiRequest<OutletRecord[]>("/admin/outlets", { token });

export const createOutlet = async (
  token: string,
  payload: CreateOutletPayload
): Promise<OutletRecord> =>
  apiRequest<OutletRecord>("/admin/outlets", { method: "POST", token, body: payload });

export const updateOutlet = async (
  token: string,
  outletId: string,
  payload: UpdateOutletPayload
): Promise<OutletRecord> =>
  apiRequest<OutletRecord>(`/admin/outlets/${outletId}`, { method: "PATCH", token, body: payload });

export const createOutletVisit = async (
  token: string,
  payload: CreateOutletVisitPayload
): Promise<OutletVisitRecord> =>
  apiRequest<OutletVisitRecord>("/me/outlet-visits", { method: "POST", token, body: payload });

export const listMyOutletVisits = async (token: string, limit = 50): Promise<OutletVisitRecord[]> =>
  apiRequest<OutletVisitRecord[]>(`/me/outlet-visits?limit=${String(limit)}`, { token });

export const listOutletVisitReports = async (
  token: string,
  params: {
    limit?: number;
    outletId?: string;
    userId?: string;
    from?: string;
    to?: string;
  }
): Promise<OutletVisitRecord[]> => {
  const query = new URLSearchParams();
  query.set("limit", String(params.limit ?? 100));
  if (params.outletId !== undefined && params.outletId.trim().length > 0) {
    query.set("outletId", params.outletId.trim());
  }
  if (params.userId !== undefined && params.userId.trim().length > 0) {
    query.set("userId", params.userId.trim());
  }
  if (params.from !== undefined && params.from.trim().length > 0) {
    query.set("from", params.from.trim());
  }
  if (params.to !== undefined && params.to.trim().length > 0) {
    query.set("to", params.to.trim());
  }
  return apiRequest<OutletVisitRecord[]>(`/admin/outlets/visits?${query.toString()}`, { token });
};
