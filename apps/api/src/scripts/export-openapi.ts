import "reflect-metadata";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { NestFactory } from "@nestjs/core";

import { AppModule } from "../app.module";
import { createOpenApiDocument } from "../config/swagger";

const run = async (): Promise<void> => {
  const app = await NestFactory.create(AppModule, { logger: false });

  try {
    const prefix = "/api/v1";
    const document = createOpenApiDocument(app, prefix);
    const outputDirectory = join(process.cwd(), "openapi");
    const outputPath = join(outputDirectory, "openapi.json");

    await mkdir(outputDirectory, { recursive: true });
    await writeFile(outputPath, JSON.stringify(document, null, 2), "utf8");
  } finally {
    await app.close();
  }
};

void run();
