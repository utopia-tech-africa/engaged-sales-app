import "dotenv/config";

import { defineConfig } from "prisma/config";

const DATABASE_URL_FALLBACK = "postgresql://postgres:postgres@127.0.0.1:5432/postgres";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // `prisma generate` during CI/build does not need a live DB connection.
    // Provide a safe fallback so builds don't fail when DATABASE_URL isn't set yet.
    url: process.env.DATABASE_URL ?? DATABASE_URL_FALLBACK
  }
});
