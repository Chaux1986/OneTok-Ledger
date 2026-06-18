import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

type GlobalWithPool = typeof globalThis & {
  __oneTokPool?: Pool;
};

const globalForDb = globalThis as GlobalWithPool;

export const pool =
  globalForDb.__oneTokPool ??
  new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__oneTokPool = pool;
}

export const db = drizzle(pool, { schema });

export * from "./schema";