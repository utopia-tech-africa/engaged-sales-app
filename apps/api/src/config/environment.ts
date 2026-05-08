import { z } from "zod";

const environmentSchema = z.object({
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().positive().default(3001)
});

export type EnvironmentVariables = z.infer<typeof environmentSchema>;

export const validateEnvironment = (config: Record<string, unknown>): EnvironmentVariables => {
  const parsedEnvironment = environmentSchema.safeParse(config);

  if (!parsedEnvironment.success) {
    const flattenedErrors = parsedEnvironment.error.flatten().fieldErrors;
    throw new Error(`Invalid environment configuration: ${JSON.stringify(flattenedErrors)}`);
  }

  return parsedEnvironment.data;
};
