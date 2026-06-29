import type { PoolClient } from "pg";

export type ScenarioSlug = "roman" | "mongol" | "ww1";

export type ScenarioDefinition = {
  slug: ScenarioSlug;
  name: string;
  load: (client: PoolClient) => Promise<void>;
};
