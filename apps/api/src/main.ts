import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module.js";
import type { EnvironmentVariables } from "./config/environment.js";

const bootstrap = async (): Promise<void> => {
  const prefix = "/api/v1";
  const app = await NestFactory.create(AppModule);
  const configService = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  const host = configService.get("HOST", { infer: true });
  const port = configService.get("PORT", { infer: true });

  app.setGlobalPrefix(prefix);
  await app.listen(port, host);

  Logger.log(`API running on http://${host}:${String(port)}`, "Bootstrap");
};

await bootstrap();
