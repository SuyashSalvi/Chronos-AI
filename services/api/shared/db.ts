import { Pool } from "pg";

let pool: Pool | undefined;

export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required");
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
      max: Number(process.env.DB_POOL_MAX ?? 2),
    });
  }

  return pool;
}
