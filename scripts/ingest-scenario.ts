import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    throw new Error("Usage: npm run ingest:scenario <roman|mongol|ww1>");
  }

  const { pool } = await import("../src/lib/db/client");
  const { loadScenario, scenarios } = await import("../src/scenarios");
  if (!(slug in scenarios)) {
    throw new Error(`Unknown scenario slug: ${slug}`);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await loadScenario(slug as keyof typeof scenarios, client);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
