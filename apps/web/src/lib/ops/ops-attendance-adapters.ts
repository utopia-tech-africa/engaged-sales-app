import { z } from "zod";

import { unwrapOrvalResponseBody } from "@/lib/auth/orval-auth-adapter";

const adminAttendanceDailySummarySchema = z.object({
  date: z.string(),
  timezone: z.string(),
  expectedCheckInLocal: z.string(),
  rows: z.array(
    z.object({
      userId: z.string(),
      fullName: z.string(),
      phone: z.string(),
      role: z.string(),
      regionId: z.string().nullable(),
      regionName: z.string().nullable(),
      firstClockInAt: z.string().nullable(),
      lastClockOutAt: z.string().nullable(),
      missed: z.boolean(),
      late: z.boolean(),
      missingClockOut: z.boolean()
    })
  ),
  summary: z.object({
    total: z.number(),
    present: z.number(),
    missed: z.number(),
    late: z.number(),
    missingClockOut: z.number()
  })
});

export type AdminAttendanceDailySummary = z.infer<typeof adminAttendanceDailySummarySchema>;

export const parseAdminAttendanceDailySummaryFromOrval = (
  result: unknown
): AdminAttendanceDailySummary => {
  return adminAttendanceDailySummarySchema.parse(unwrapOrvalResponseBody(result));
};
