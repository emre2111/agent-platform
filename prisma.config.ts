import path from "node:path";
import { defineConfig } from "prisma/config";
import { config } from "dotenv";

config({ path: path.resolve(__dirname, ".env") });

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/postgres?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Keep generate/build working in environments where DATABASE_URL is not set yet.
    url: databaseUrl,
  },
});
