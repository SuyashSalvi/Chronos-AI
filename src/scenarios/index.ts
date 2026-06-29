import type { PoolClient } from "pg";
import type { ScenarioDefinition, ScenarioSlug } from "./types";
import { loadRomanScenario } from "./roman/seed";
import { loadMongolScenario } from "./mongol/seed";
import { loadWw1Scenario } from "./ww1/seed";

export const scenarios: Record<ScenarioSlug, ScenarioDefinition> = {
  roman: {
    slug: "roman",
    name: "Roman Empire",
    load: loadRomanScenario,
  },
  mongol: {
    slug: "mongol",
    name: "Mongol Empire",
    load: loadMongolScenario,
  },
  ww1: {
    slug: "ww1",
    name: "World War I",
    load: loadWw1Scenario,
  },
};

export async function loadScenario(slug: ScenarioSlug, client: PoolClient): Promise<void> {
  const scenario = scenarios[slug];
  if (!scenario) {
    throw new Error(`Unknown scenario: ${slug}`);
  }

  await scenario.load(client);
}
