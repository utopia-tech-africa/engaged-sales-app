import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from "@nestjs/swagger";

const API_VERSION = "1.0.0";

export const createOpenApiDocument = (app: INestApplication, prefix: string): OpenAPIObject => {
  const config = new DocumentBuilder()
    .setTitle("Engaged Sales API")
    .setDescription("API documentation for Engaged Sales backend")
    .setVersion(API_VERSION)
    .addServer(prefix)
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      },
      "bearer"
    )
    .build();

  return SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey.replace(/Controller$/, "")}_${methodKey}`,
    ignoreGlobalPrefix: false
  });
};

export const setupSwagger = (app: INestApplication, prefix: string): void => {
  const document = createOpenApiDocument(app, prefix);

  SwaggerModule.setup(`${prefix}/docs`, app, document, {
    jsonDocumentUrl: `${prefix}/docs-json`,
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: "alpha",
      operationsSorter: "alpha"
    }
  });
};
