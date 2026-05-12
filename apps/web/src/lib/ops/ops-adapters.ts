import { z } from "zod";

import { unwrapOrvalResponseBody } from "@/lib/auth/orval-auth-adapter";

const geofenceRowSchema = z.object({
  id: z.string(),
  label: z.string(),
  centerLatitude: z.number(),
  centerLongitude: z.number(),
  radiusMeters: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type GeofenceRow = z.infer<typeof geofenceRowSchema>;

const geofenceListSchema = z.array(geofenceRowSchema);

export const parseGeofencesFromOrval = (result: unknown): GeofenceRow[] => {
  return geofenceListSchema.parse(unwrapOrvalResponseBody(result));
};

const healthSchema = z.object({
  ok: z.literal(true)
});

export type HealthPayload = z.infer<typeof healthSchema>;

export const parseHealthFromOrval = (result: unknown): HealthPayload => {
  return healthSchema.parse(unwrapOrvalResponseBody(result));
};

export const isOpsRole = (role: string): boolean => role === "supervisor" || role === "admin";

const regionRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type RegionRow = z.infer<typeof regionRowSchema>;

const regionListSchema = z.array(regionRowSchema);

export const parseRegionsFromOrval = (result: unknown): RegionRow[] => {
  return regionListSchema.parse(unwrapOrvalResponseBody(result));
};

const adminUserRowSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string().nullable(),
  phone: z.string(),
  uniqueCode: z.string(),
  role: z.enum(["promoter", "client", "supervisor", "admin"]),
  isActive: z.boolean(),
  gender: z.enum(["male", "female", "other"]).nullable(),
  regionId: z.string().nullable(),
  authProvider: z.enum(["credentials", "google"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  region: z
    .object({
      id: z.string(),
      name: z.string(),
      slug: z.string()
    })
    .nullable()
});

export type AdminUserRow = z.infer<typeof adminUserRowSchema>;

const adminUserListSchema = z.array(adminUserRowSchema);

export const parseAdminUsersFromOrval = (result: unknown): AdminUserRow[] => {
  return adminUserListSchema.parse(unwrapOrvalResponseBody(result));
};

export const parseAdminUserFromOrval = (result: unknown): AdminUserRow => {
  return adminUserRowSchema.parse(unwrapOrvalResponseBody(result));
};

const activationRegionLinkSchema = z.object({
  regionId: z.string(),
  region: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string()
  })
});

export type ActivationRegionLink = z.infer<typeof activationRegionLinkSchema>;

const activationListRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  startsAt: z.string(),
  endsAt: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  regionLinks: z.array(activationRegionLinkSchema).optional().default([]),
  _count: z.object({
    products: z.number(),
    roster: z.number()
  })
});

export type ActivationListRow = z.infer<typeof activationListRowSchema>;

const activationListSchema = z.array(activationListRowSchema);

export const parseActivationsFromOrval = (result: unknown): ActivationListRow[] => {
  return activationListSchema.parse(unwrapOrvalResponseBody(result));
};

const activationProductSchema = z.object({
  id: z.string(),
  activationId: z.string(),
  name: z.string(),
  sku: z.string().nullable(),
  monthlyTargetCases: z.number().int().nullable().optional(),
  quantity: z.number().int().min(1).optional().default(1),
  sortOrder: z.number(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type ActivationProductRow = z.infer<typeof activationProductSchema>;

export const parseActivationProductRow = (value: unknown): ActivationProductRow => {
  return activationProductSchema.parse(unwrapOrvalResponseBody(value));
};

const activationRosterEntrySchema = z.object({
  id: z.string(),
  activationId: z.string(),
  userId: z.string(),
  createdAt: z.string(),
  user: z.object({
    id: z.string(),
    fullName: z.string(),
    phone: z.string(),
    role: z.enum(["promoter", "client", "supervisor", "admin"]),
    isActive: z.boolean()
  })
});

export type ActivationRosterEntry = z.infer<typeof activationRosterEntrySchema>;

const activationGeofenceLinkSchema = z.object({
  geofenceId: z.string(),
  geofence: z.object({
    id: z.string(),
    label: z.string(),
    centerLatitude: z.number(),
    centerLongitude: z.number(),
    radiusMeters: z.number(),
    isActive: z.boolean()
  })
});

export type ActivationGeofenceLink = z.infer<typeof activationGeofenceLinkSchema>;

const activationDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  startsAt: z.string(),
  endsAt: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  regionLinks: z.array(activationRegionLinkSchema).optional().default([]),
  products: z.array(activationProductSchema),
  roster: z.array(activationRosterEntrySchema),
  geofenceLinks: z.array(activationGeofenceLinkSchema).optional().default([])
});

export type ActivationDetail = z.infer<typeof activationDetailSchema>;

export const parseActivationDetailFromOrval = (result: unknown): ActivationDetail => {
  return activationDetailSchema.parse(unwrapOrvalResponseBody(result));
};
