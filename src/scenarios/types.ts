import type { PoolClient } from "pg";

export type ScenarioSlug = string;

export type ScenarioDefinition = {
  slug: ScenarioSlug;
  name: string;
  load: (client: PoolClient) => Promise<void>;
  quality?: {
    allowedEntities: string[];
    deniedTerms: string[];
    minimums: {
      entities: number;
      events: number;
      relationships: number;
    };
  };
};
