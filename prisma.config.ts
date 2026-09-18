import "dotenv/config";
import { defineConfig } from "prisma/config";

const baseUrl = process.env.DATABASE_URL;
if (!baseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const url = new URL(baseUrl);
url.searchParams.set("schema", process.env.STUDYPOOL_DB_SCHEMA || "studypool");

export default defineConfig({
  engine: "classic",
  schema: "prisma/schema.prisma",
  datasource: {
    url: url.toString()
  }
});
