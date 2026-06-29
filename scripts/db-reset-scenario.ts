import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    throw new Error("Usage: npm run db:reset:scenario <scenario-slug>");
  }

  const { pool } = await import("../src/lib/db/client");
  const { resetScenario } = await import("../src/services/scenario-maintenance");

  try {
    const result = await resetScenario(slug);

    if (!result.deleted) {
      console.log(`No scenario found for slug: ${slug}`);
      return;
    }

    console.log(`Reset scenario ${slug}: ${result.scenarioId}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
