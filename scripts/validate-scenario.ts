import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    throw new Error("Usage: npm run validate:scenario <scenario-slug>");
  }

  const { pool } = await import("../src/lib/db/client");
  const { validateScenario } = await import("../src/services/scenario-maintenance");

  try {
    const result = await validateScenario(slug);

    console.log(`Scenario validation: ${slug}`);
    console.log(`Entities: ${result.counts.entities}`);
    console.log(`Events: ${result.counts.events}`);
    console.log(`Relationships: ${result.counts.relationships}`);

    for (const warning of result.warnings) {
      console.warn(`Warning: ${warning}`);
    }

    if (!result.ok) {
      for (const error of result.errors) {
        console.error(`Error: ${error}`);
      }

      process.exit(1);
    }

    console.log("Scenario validation passed.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
