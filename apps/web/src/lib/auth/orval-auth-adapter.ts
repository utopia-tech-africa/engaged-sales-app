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
  phone: z.string(),
  role: z.string(),
  gender: z.enum(["male", "female", "other"]).nullable(),
  regionId: z.string().nullable()
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
 * Orval types assume `{ data, status, headers }`; our `apiRequest` mutator returns the JSON body only.
 * Unwrap so parsers work for both shapes.
 */
export const unwrapOrvalResponseBody = (result: unknown): unknown => {
  if (result !== null && typeof result === "object" && "data" in result) {
    const { data } = result;
    if (data !== undefined) {
      return data;
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
  latitude: z.number(),
  longitude: z.number(),
  recordedAt: z.string()
});

export type LocationPing = z.infer<typeof locationPingSchema>;

export const parseLocationPingFromOrval = (result: unknown): LocationPing => {
  return locationPingSchema.parse(unwrapOrvalResponseBody(result));
};
