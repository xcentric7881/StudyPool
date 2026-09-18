import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function scopedDatabaseUrl() {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const url = new URL(baseUrl);
  url.searchParams.set("schema", process.env.STUDYPOOL_DB_SCHEMA || "studypool");
  return url.toString();
}

export const db =
  global.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: scopedDatabaseUrl()
      }
    }
  });

if (process.env.NODE_ENV !== "production") global.prisma = db;
