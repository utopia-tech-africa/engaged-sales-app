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
  role: z.enum(["promoter", "merchandizer", "supervisor", "admin"]),
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
