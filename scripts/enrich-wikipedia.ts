import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { enrichWikipediaProfiles } = await import("../src/services/wikipedia-enrichment");
  const { pool } = await import("../src/lib/db/client");

  try {
    await enrichWikipediaProfiles();
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
