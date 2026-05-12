/** Body returned by `GET /me/field-attendance` (matches API JSON). */
export type FieldAttendancePayload = {
  applicable: boolean;
  timezone: string;
  localDate: string;
  needsDailyClockIn: boolean;
  suggestedNextAttendanceKind: "clock_in" | "clock_out";
};
