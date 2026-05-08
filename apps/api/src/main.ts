import "reflect-metadata";

import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import type { EnvironmentVariables } from "./config/environment";

const bootstrap = async (): Promise<void> => {
  const prefix = "/api/v1";
  const app = await NestFactory.create(AppModule);
  const configService = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  const host = configService.get<string>("HOST", { infer: true });
  const port = configService.get<string>("PORT", { infer: true });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true
      }
    })
  );

  app.setGlobalPrefix(prefix);
  await app.listen(port, host);

  Logger.log(`API running on http://${host}:${port}`, "Bootstrap");
};

void bootstrap();
