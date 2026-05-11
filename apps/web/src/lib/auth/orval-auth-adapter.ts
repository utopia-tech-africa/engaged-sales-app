import { z } from "zod";

import type { AuthResponse } from "./auth-types";

const authUserSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string().nullable(),
  phone: z.string(),
  uniqueCode: z.string(),
  role: z.enum(["promoter", "merchandizer", "supervisor", "admin"]),
  isActive: z.boolean().optional().default(true),
  gender: z.enum(["male", "female", "other"]).nullable(),
  regionId: z.string().nullable(),
  authProvider: z.enum(["credentials", "google"]),
  requiresProfileCompletion: z.boolean(),
  missingProfileFields: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string()
});

const authResponseSchema = z.object({
  user: authUserSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number()
});

const meProfileSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  phone: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
  role: z.string(),
  /** Zod v4: `.nullable()` alone rejects a missing key; API may omit null fields. */
  gender: z.enum(["male", "female", "other"]).nullish(),
  regionId: z
    .string()
    .nullish()
    .transform((v) => v ?? null)
});

const sessionsSchema = z.object({
  sessions: z.array(
    z.object({
      id: z.string(),
      userId: z.string(),
      userAgent: z.string().nullable(),
      ipAddress: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      expiresAt: z.string(),
      revokedAt: z.string().nullable(),
      replacedById: z.string().nullable(),
      isCurrent: z.boolean(),
      isActive: z.boolean()
    })
  )
});

export type MeProfile = z.infer<typeof meProfileSchema>;
export type SessionsPayload = z.infer<typeof sessionsSchema>;

/**
 * Orval client types assume `{ data, status, headers }`; our `apiRequest` mutator returns the JSON body only.
 * Only unwrap when the value looks like that HTTP envelope (numeric `status`), not API payloads that use a
 * `data` field for their primary body (e.g. paged `{ data, total, limit, offset }`).
 */
export const unwrapOrvalResponseBody = (result: unknown): unknown => {
  if (result !== null && typeof result === "object" && "data" in result && "status" in result) {
    const record = result;
    if (typeof record.status === "number" && record.data !== undefined) {
      return record.data;
    }
  }
  return result;
};

export const parseAuthResponse = (value: unknown): AuthResponse => {
  return authResponseSchema.parse(value);
};

export const parseAuthResponseFromOrval = (result: unknown): AuthResponse => {
  return parseAuthResponse(unwrapOrvalResponseBody(result));
};

export const parseMeProfile = (value: unknown): MeProfile => {
  return meProfileSchema.parse(value);
};

export const parseMeProfileFromOrval = (result: unknown): MeProfile => {
  return parseMeProfile(unwrapOrvalResponseBody(result));
};

export const parseSessions = (value: unknown): SessionsPayload => {
  return sessionsSchema.parse(value);
};

export const parseSessionsFromOrval = (result: unknown): SessionsPayload => {
  return parseSessions(unwrapOrvalResponseBody(result));
};

const locationPingSchema = z.object({
  userId: z.string(),
  attendanceKind: z.enum(["clock_in", "clock_out"]).optional().default("clock_in"),
  latitude: z.number(),
  longitude: z.number(),
  placeLabel: z.string().nullable().optional(),
  hasSelfieVerification: z.boolean().optional().default(false),
  recordedAt: z.string()
});

export type LocationPing = z.infer<typeof locationPingSchema>;

export const parseLocationPingFromOrval = (result: unknown): LocationPing => {
  return locationPingSchema.parse(unwrapOrvalResponseBody(result));
};

const locationHistoryPingSchema = z.object({
  id: z.string(),
  attendanceKind: z.enum(["clock_in", "clock_out"]).optional().default("clock_in"),
  latitude: z.number(),
  longitude: z.number(),
  placeLabel: z.string().nullable().optional(),
  hasSelfieVerification: z.boolean().optional().default(false),
  recordedAt: z.string()
});

const locationHistorySchema = z.array(locationHistoryPingSchema);

export type LocationHistoryPing = z.infer<typeof locationHistoryPingSchema>;

export const parseLocationHistoryFromOrval = (result: unknown): LocationHistoryPing[] => {
  return locationHistorySchema.parse(unwrapOrvalResponseBody(result));
};
