import { applyDecorators } from "@nestjs/common";
import { Transform } from "class-transformer";
import { Matches } from "class-validator";

/** Optional leading +, then 8–17 digits (allows national numbers starting with 0). */
export const PHONE_VALIDATION_PATTERN = /^\+?\d{8,17}$/;

export const normalizePhoneString = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }
  const compact = value.trim().replace(/[\s().-]/g, "");
  return compact.length === 0 ? undefined : compact;
};

/** Strips spaces/hyphens/parentheses; validates 8–17 digits with optional leading +. */
export const PhoneNumberField = (): PropertyDecorator =>
  applyDecorators(
    Transform(({ value }) => normalizePhoneString(value)),
    Matches(PHONE_VALIDATION_PATTERN, {
      message:
        "phone must be 8–17 digits, optionally starting with +; leading 0 is allowed (spaces and hyphens are removed)"
    })
  );
