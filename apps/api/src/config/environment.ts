import { plainToInstance, Type } from "class-transformer";
import { IsInt, IsString, Max, Min, MinLength, validateSync } from "class-validator";

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
}

export type EnvironmentVariables = {
  HOST: string;
  PORT: number;
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_TTL_SECONDS: number;
  JWT_REFRESH_TTL_DAYS: number;
};

export const validateEnvironment = (config: Record<string, unknown>): EnvironmentVariables => {
  const rawEnvironment: Record<string, unknown> = {
    HOST: config["HOST"] ?? "127.0.0.1",
    PORT: config["PORT"] ?? 3001,
    DATABASE_URL:
      config["DATABASE_URL"] ?? "postgresql://postgres:postgres@localhost:5432/engaged_sales_app",
    JWT_ACCESS_SECRET: config["JWT_ACCESS_SECRET"] ?? "dev-access-secret-change-me",
    JWT_REFRESH_SECRET: config["JWT_REFRESH_SECRET"] ?? "dev-refresh-secret-change-me",
    JWT_ACCESS_TTL_SECONDS: config["JWT_ACCESS_TTL_SECONDS"] ?? 900,
    JWT_REFRESH_TTL_DAYS: config["JWT_REFRESH_TTL_DAYS"] ?? 30
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
    JWT_REFRESH_TTL_DAYS: validatedEnvironment.JWT_REFRESH_TTL_DAYS
  };
};
