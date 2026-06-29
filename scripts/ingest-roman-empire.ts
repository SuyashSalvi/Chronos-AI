import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { pool } = await import("../src/lib/db/client");
  const { loadScenario } = await import("../src/scenarios");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await loadScenario("roman", client);
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
