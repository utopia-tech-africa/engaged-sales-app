import { plainToInstance, Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync
} from "class-validator";

const parseEnvBool = (value: unknown, defaultValue: boolean): boolean => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
    return defaultValue;
  }
  if (typeof value !== "string") {
    return defaultValue;
  }
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return defaultValue;
};

const parseDigestDateMode = (value: unknown): "yesterday" | "today" => {
  if (value === "today") {
    return "today";
  }
  return "yesterday";
};

/** Trim, strip BOM, strip one pair of surrounding quotes (common .env mistakes). */
const stripEnvSecretArtifacts = (raw: string): string => {
  let s = raw.replace(/^\uFEFF/, "").trim();
  if (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
};

/** Prefer `MNOTIFY_SMS_API_KEY`; fall back to `MNOTIFY_KEY` (Laravel / mNotify docs). */
const pickMnotifySmsApiKey = (config: Record<string, unknown>): string => {
  const primary =
    typeof config["MNOTIFY_SMS_API_KEY"] === "string"
      ? stripEnvSecretArtifacts(config["MNOTIFY_SMS_API_KEY"])
      : "";
  if (primary.length > 0) {
    return primary;
  }
  return typeof config["MNOTIFY_KEY"] === "string"
    ? stripEnvSecretArtifacts(config["MNOTIFY_KEY"])
    : "";
};

const parseMnotifyApiVersion = (value: unknown): "v2" | "legacy" => {
  if (typeof value === "string" && value.trim().toLowerCase() === "legacy") {
    return "legacy";
  }
  return "v2";
};

class EnvironmentVariablesDto {
  @IsString()
  public HOST = "127.0.0.1";

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  public PORT = 3001;

  @IsString()
  @MinLength(1)
  public DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/engaged_sales_app";

  @IsString()
  @MinLength(16)
  public JWT_ACCESS_SECRET = "dev-access-secret-change-me";

  @IsString()
  @MinLength(16)
  public JWT_REFRESH_SECRET = "dev-refresh-secret-change-me";

  @Type(() => Number)
  @IsInt()
  @Min(60)
  public JWT_ACCESS_TTL_SECONDS = 900;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  public JWT_REFRESH_TTL_DAYS = 30;

  @IsString()
  @MinLength(1)
  public GOOGLE_CLIENT_ID = "google-client-id";

  @IsString()
  @MinLength(1)
  public GOOGLE_CLIENT_SECRET = "google-client-secret";

  @IsString()
  @MinLength(1)
  public REDIS_URL = "redis://127.0.0.1:6379";

  @IsString()
  @MinLength(1)
  public CORS_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000";

  /** When empty, operational emails (digest, reports) are skipped (logged). */
  @IsString()
  public RESEND_API_KEY = "";

  /** e.g. `Engaged Sales <notifications@yourdomain.com>`. When empty, Resend test sender may be used. */
  @IsString()
  public RESEND_FROM_EMAIL = "";

  /** Public web origin for sign-in links in SMS (no trailing slash). */
  @IsString()
  public APP_PUBLIC_URL = "http://localhost:3000";

  /** API key for invite SMS. Also reads `MNOTIFY_KEY` if this is empty. Stripped of stray quotes/BOM. */
  @IsString()
  public MNOTIFY_SMS_API_KEY = "";

  /** Registered mNotify sender ID (max 11 characters). */
  @IsString()
  @Length(1, 11)
  public MNOTIFY_SENDER_ID = "Engaged";

  /**
   * `v2` = current mNotify HTTP API (`api.mnotify.com`, keys from apps dashboard).
   * `legacy` = older GET `apps.mnotify.net/smsapi` (old-style keys only).
   */
  @IsIn(["v2", "legacy"])
  public MNOTIFY_API_VERSION: "v2" | "legacy" = "v2";

  /** IANA timezone for daily attendance boundaries and late checks (e.g. `Africa/Nairobi`). */
  @IsOptional()
  @IsString()
  public ATTENDANCE_TIMEZONE = "UTC";

  /** Local expected clock-in time (`HH:mm`) in `ATTENDANCE_TIMEZONE` for late detection. */
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  public ATTENDANCE_EXPECTED_CHECK_IN_HHMM = "09:00";

  /** Enforce outlet/geofence proximity for check-ins when active geofences exist. */
  @IsBoolean()
  public ATTENDANCE_ENFORCE_GEOFENCE_DISTANCE = true;

  /** Maximum allowed meters from nearest active geofence center for a valid visit/check-in. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public ATTENDANCE_MIN_DISTANCE_TO_OUTLET_METERS = 120;

  @IsBoolean()
  public ATTENDANCE_DIGEST_ENABLED = false;

  /** Six-field cron (sec min hour dom month dow), e.g. `0 30 19 * * *` for 19:30 in ATTENDANCE_DIGEST_TIMEZONE. */
  @IsString()
  @MinLength(9)
  public ATTENDANCE_DIGEST_CRON = "0 30 19 * * *";

  /** IANA zone used to interpret ATTENDANCE_DIGEST_CRON fire times. */
  @IsString()
  public ATTENDANCE_DIGEST_TIMEZONE = "UTC";

  @IsIn(["yesterday", "today"])
  public ATTENDANCE_DIGEST_DATE_MODE: "yesterday" | "today" = "yesterday";

  /** When true, send a digest even if there are no missed/late/missing clock-out rows. */
  @IsBoolean()
  public ATTENDANCE_DIGEST_ALWAYS_SEND = false;
}

export type EnvironmentVariables = {
  HOST: string;
  PORT: number;
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_TTL_SECONDS: number;
  JWT_REFRESH_TTL_DAYS: number;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  REDIS_URL: string;
  CORS_ORIGINS: string;
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;
  APP_PUBLIC_URL: string;
  MNOTIFY_SMS_API_KEY: string;
  MNOTIFY_SENDER_ID: string;
  MNOTIFY_API_VERSION: "v2" | "legacy";
  ATTENDANCE_TIMEZONE: string;
  ATTENDANCE_EXPECTED_CHECK_IN_HHMM: string;
  ATTENDANCE_ENFORCE_GEOFENCE_DISTANCE: boolean;
  ATTENDANCE_MIN_DISTANCE_TO_OUTLET_METERS: number;
  ATTENDANCE_DIGEST_ENABLED: boolean;
  ATTENDANCE_DIGEST_CRON: string;
  ATTENDANCE_DIGEST_TIMEZONE: string;
  ATTENDANCE_DIGEST_DATE_MODE: "yesterday" | "today";
  ATTENDANCE_DIGEST_ALWAYS_SEND: boolean;
};

export const validateEnvironment = (config: Record<string, unknown>): EnvironmentVariables => {
  const nodeEnv =
    typeof config["NODE_ENV"] === "string" && config["NODE_ENV"].trim().length > 0
      ? config["NODE_ENV"].trim()
      : undefined;
  const defaultHost = nodeEnv === "production" ? "0.0.0.0" : "127.0.0.1";

  const rawEnvironment: Record<string, unknown> = {
    HOST: config["HOST"] ?? defaultHost,
    PORT: config["PORT"] ?? 3001,
    DATABASE_URL:
      config["DATABASE_URL"] ?? "postgresql://postgres:postgres@localhost:5432/engaged_sales_app",
    JWT_ACCESS_SECRET: config["JWT_ACCESS_SECRET"] ?? "dev-access-secret-change-me",
    JWT_REFRESH_SECRET: config["JWT_REFRESH_SECRET"] ?? "dev-refresh-secret-change-me",
    JWT_ACCESS_TTL_SECONDS: config["JWT_ACCESS_TTL_SECONDS"] ?? 900,
    JWT_REFRESH_TTL_DAYS: config["JWT_REFRESH_TTL_DAYS"] ?? 30,
    GOOGLE_CLIENT_ID: config["GOOGLE_CLIENT_ID"] ?? "google-client-id",
    GOOGLE_CLIENT_SECRET: config["GOOGLE_CLIENT_SECRET"] ?? "google-client-secret",
    REDIS_URL: config["REDIS_URL"] ?? "redis://127.0.0.1:6379",
    CORS_ORIGINS: config["CORS_ORIGINS"] ?? "http://localhost:3000,http://127.0.0.1:3000",
    RESEND_API_KEY: config["RESEND_API_KEY"] ?? "",
    RESEND_FROM_EMAIL: config["RESEND_FROM_EMAIL"] ?? "",
    APP_PUBLIC_URL: config["APP_PUBLIC_URL"] ?? "http://localhost:3000",
    MNOTIFY_SMS_API_KEY: pickMnotifySmsApiKey(config),
    MNOTIFY_SENDER_ID: (() => {
      if (typeof config["MNOTIFY_SENDER_ID"] !== "string") {
        return "Engaged";
      }
      const t = stripEnvSecretArtifacts(config["MNOTIFY_SENDER_ID"]).slice(0, 11);
      return t.length > 0 ? t : "Engaged";
    })(),
    MNOTIFY_API_VERSION: parseMnotifyApiVersion(config["MNOTIFY_API_VERSION"]),
    ATTENDANCE_TIMEZONE:
      (typeof config["ATTENDANCE_TIMEZONE"] === "string" &&
      config["ATTENDANCE_TIMEZONE"].trim().length > 0
        ? config["ATTENDANCE_TIMEZONE"].trim()
        : undefined) ?? "UTC",
    ATTENDANCE_EXPECTED_CHECK_IN_HHMM:
      (typeof config["ATTENDANCE_EXPECTED_CHECK_IN_HHMM"] === "string" &&
      config["ATTENDANCE_EXPECTED_CHECK_IN_HHMM"].trim().length > 0
        ? config["ATTENDANCE_EXPECTED_CHECK_IN_HHMM"].trim()
        : undefined) ?? "09:00",
    ATTENDANCE_ENFORCE_GEOFENCE_DISTANCE: parseEnvBool(
      config["ATTENDANCE_ENFORCE_GEOFENCE_DISTANCE"],
      true
    ),
    ATTENDANCE_MIN_DISTANCE_TO_OUTLET_METERS:
      typeof config["ATTENDANCE_MIN_DISTANCE_TO_OUTLET_METERS"] === "number"
        ? config["ATTENDANCE_MIN_DISTANCE_TO_OUTLET_METERS"]
        : typeof config["ATTENDANCE_MIN_DISTANCE_TO_OUTLET_METERS"] === "string" &&
            config["ATTENDANCE_MIN_DISTANCE_TO_OUTLET_METERS"].trim().length > 0
          ? Number(config["ATTENDANCE_MIN_DISTANCE_TO_OUTLET_METERS"])
          : 120,
    ATTENDANCE_DIGEST_ENABLED: parseEnvBool(config["ATTENDANCE_DIGEST_ENABLED"], false),
    ATTENDANCE_DIGEST_CRON:
      typeof config["ATTENDANCE_DIGEST_CRON"] === "string" &&
      config["ATTENDANCE_DIGEST_CRON"].trim().length > 0
        ? config["ATTENDANCE_DIGEST_CRON"].trim()
        : "0 30 19 * * *",
    ATTENDANCE_DIGEST_TIMEZONE:
      typeof config["ATTENDANCE_DIGEST_TIMEZONE"] === "string" &&
      config["ATTENDANCE_DIGEST_TIMEZONE"].trim().length > 0
        ? config["ATTENDANCE_DIGEST_TIMEZONE"].trim()
        : "UTC",
    ATTENDANCE_DIGEST_DATE_MODE: parseDigestDateMode(config["ATTENDANCE_DIGEST_DATE_MODE"]),
    ATTENDANCE_DIGEST_ALWAYS_SEND: parseEnvBool(config["ATTENDANCE_DIGEST_ALWAYS_SEND"], false)
  };

  const validatedEnvironment = plainToInstance(EnvironmentVariablesDto, rawEnvironment, {
    enableImplicitConversion: true
  });

  const errors = validateSync(validatedEnvironment, {
    skipMissingProperties: false
  });

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration: ${JSON.stringify(errors)}`);
  }

  return {
    HOST: validatedEnvironment.HOST,
    PORT: validatedEnvironment.PORT,
    DATABASE_URL: validatedEnvironment.DATABASE_URL,
    JWT_ACCESS_SECRET: validatedEnvironment.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: validatedEnvironment.JWT_REFRESH_SECRET,
    JWT_ACCESS_TTL_SECONDS: validatedEnvironment.JWT_ACCESS_TTL_SECONDS,
    JWT_REFRESH_TTL_DAYS: validatedEnvironment.JWT_REFRESH_TTL_DAYS,
    GOOGLE_CLIENT_ID: validatedEnvironment.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: validatedEnvironment.GOOGLE_CLIENT_SECRET,
    REDIS_URL: validatedEnvironment.REDIS_URL,
    CORS_ORIGINS: validatedEnvironment.CORS_ORIGINS,
    RESEND_API_KEY: validatedEnvironment.RESEND_API_KEY,
    RESEND_FROM_EMAIL: validatedEnvironment.RESEND_FROM_EMAIL,
    APP_PUBLIC_URL: validatedEnvironment.APP_PUBLIC_URL,
    MNOTIFY_SMS_API_KEY: validatedEnvironment.MNOTIFY_SMS_API_KEY,
    MNOTIFY_SENDER_ID: validatedEnvironment.MNOTIFY_SENDER_ID,
    MNOTIFY_API_VERSION: validatedEnvironment.MNOTIFY_API_VERSION,
    ATTENDANCE_TIMEZONE: validatedEnvironment.ATTENDANCE_TIMEZONE,
    ATTENDANCE_EXPECTED_CHECK_IN_HHMM: validatedEnvironment.ATTENDANCE_EXPECTED_CHECK_IN_HHMM,
    ATTENDANCE_ENFORCE_GEOFENCE_DISTANCE: validatedEnvironment.ATTENDANCE_ENFORCE_GEOFENCE_DISTANCE,
    ATTENDANCE_MIN_DISTANCE_TO_OUTLET_METERS:
      validatedEnvironment.ATTENDANCE_MIN_DISTANCE_TO_OUTLET_METERS,
    ATTENDANCE_DIGEST_ENABLED: validatedEnvironment.ATTENDANCE_DIGEST_ENABLED,
    ATTENDANCE_DIGEST_CRON: validatedEnvironment.ATTENDANCE_DIGEST_CRON,
    ATTENDANCE_DIGEST_TIMEZONE: validatedEnvironment.ATTENDANCE_DIGEST_TIMEZONE,
    ATTENDANCE_DIGEST_DATE_MODE: validatedEnvironment.ATTENDANCE_DIGEST_DATE_MODE,
    ATTENDANCE_DIGEST_ALWAYS_SEND: validatedEnvironment.ATTENDANCE_DIGEST_ALWAYS_SEND
  };
};
