import { z } from "zod";

import { unwrapOrvalResponseBody } from "@/lib/auth/orval-auth-adapter";

const userBriefSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  phone: z.string(),
  role: z.string()
});

const saleItemSchema = z.object({
  id: z.string(),
  saleId: z.string(),
  productId: z.string(),
  quantity: z.number(),
  unitPrice: z.number().nullable().optional(),
  product: z.object({
    id: z.string(),
    name: z.string(),
    sku: z.string().nullable().optional()
  })
});

export const adminFieldActivitySaleSchema = z.object({
  id: z.string(),
  userId: z.string(),
  activationId: z.string(),
  idempotencyKey: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  createdAt: z.string(),
  user: userBriefSchema,
  items: z.array(saleItemSchema)
});

export type AdminFieldActivitySale = z.infer<typeof adminFieldActivitySaleSchema>;

export const parseAdminFieldActivitySalesFromOrval = (
  result: unknown
): AdminFieldActivitySale[] => {
  return z.array(adminFieldActivitySaleSchema).parse(unwrapOrvalResponseBody(result));
};

const locationPingSchema = z.object({
  id: z.string(),
  userId: z.string(),
  attendanceKind: z.enum(["clock_in", "clock_out"]).optional().default("clock_in"),
  geofenceId: z.string().nullable().optional(),
  distanceToGeofenceMeters: z.number().nullable().optional(),
  dwellSecondsAtGeofence: z.number().nullable().optional(),
  latitude: z.number(),
  longitude: z.number(),
  placeLabel: z.string().nullable().optional(),
  hasSelfieVerification: z.boolean().optional().default(false),
  recordedAt: z.string()
});

export type AdminFieldActivityLocationPing = z.infer<typeof locationPingSchema>;

export const parseAdminFieldActivityLocationsFromOrval = (
  result: unknown
): AdminFieldActivityLocationPing[] => {
  return z.array(locationPingSchema).parse(unwrapOrvalResponseBody(result));
};

const fieldActivityCheckInDetailSchema = z.object({
  id: z.string(),
  userId: z.string(),
  attendanceKind: z.enum(["clock_in", "clock_out"]).optional().default("clock_in"),
  geofenceId: z.string().nullable().optional(),
  distanceToGeofenceMeters: z.number().nullable().optional(),
  dwellSecondsAtGeofence: z.number().nullable().optional(),
  latitude: z.number(),
  longitude: z.number(),
  placeLabel: z.string().nullable().optional(),
  recordedAt: z.string(),
  hasSelfieVerification: z.boolean(),
  selfieDataUrl: z.string().nullable(),
  user: z.object({
    id: z.string(),
    fullName: z.string(),
    phone: z.string(),
    role: z.string()
  })
});

export type AdminFieldActivityCheckInDetail = z.infer<typeof fieldActivityCheckInDetailSchema>;

export const parseAdminFieldActivityCheckInFromOrval = (
  result: unknown
): AdminFieldActivityCheckInDetail => {
  return fieldActivityCheckInDetailSchema.parse(unwrapOrvalResponseBody(result));
};
