import type { PoolClient } from "pg";
import { pool } from "../lib/db/client";
import { scenarios, type ScenarioSlug } from "../scenarios";

type ValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  counts: {
    entities: number;
    events: number;
    relationships: number;
  };
};

function getScenarioDefinition(slug: string) {
  const scenario = scenarios[slug as ScenarioSlug];
  if (!scenario) {
    throw new Error(`Unknown scenario slug: ${slug}`);
  }

  return scenario;
}

async function findScenarioId(client: PoolClient, name: string): Promise<string | null> {
  const result = await client.query<{ scenario_id: string }>(
    `
    SELECT scenario_id
    FROM scenarios
    WHERE name = $1
    ORDER BY created_at
    LIMIT 1
    `,
    [name]
  );

  return result.rows[0]?.scenario_id ?? null;
}

export async function resetScenario(slug: string): Promise<{ scenarioId: string | null; deleted: boolean }> {
  const scenario = getScenarioDefinition(slug);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const scenarioId = await findScenarioId(client, scenario.name);

    if (!scenarioId) {
      await client.query("COMMIT");
      return { scenarioId: null, deleted: false };
    }

    await client.query(
      `
      DELETE FROM event_sources
      WHERE event_id IN (SELECT event_id FROM events WHERE scenario_id = $1)
      `,
      [scenarioId]
    );
    await client.query(
      `
      DELETE FROM entity_sources
      WHERE entity_id IN (SELECT entity_id FROM entities WHERE scenario_id = $1)
      `,
      [scenarioId]
    );
    await client.query(
      `
      DELETE FROM event_entities
      WHERE event_id IN (SELECT event_id FROM events WHERE scenario_id = $1)
      `,
      [scenarioId]
    );
    await client.query("DELETE FROM relationships WHERE scenario_id = $1", [scenarioId]);
    await client.query("DELETE FROM alternate_events WHERE timeline_id IN (SELECT timeline_id FROM alternate_timelines WHERE scenario_id = $1)", [scenarioId]);
    await client.query("DELETE FROM alternate_timelines WHERE scenario_id = $1", [scenarioId]);
    await client.query("DELETE FROM events WHERE scenario_id = $1", [scenarioId]);
    await client.query("DELETE FROM entities WHERE scenario_id = $1", [scenarioId]);
    await client.query("DELETE FROM scenarios WHERE scenario_id = $1", [scenarioId]);
    await client.query(
      `
      DELETE FROM sources
      WHERE source_id NOT IN (SELECT source_id FROM entity_sources)
        AND source_id NOT IN (SELECT source_id FROM event_sources)
      `
    );

    await client.query("COMMIT");
    return { scenarioId, deleted: true };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function validateScenario(slug: string): Promise<ValidationResult> {
  const scenario = getScenarioDefinition(slug);
  const client = await pool.connect();
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const scenarioId = await findScenarioId(client, scenario.name);

    if (!scenarioId) {
      return {
        ok: false,
        errors: [`Scenario not found: ${scenario.name}`],
        warnings,
        counts: { entities: 0, events: 0, relationships: 0 },
      };
    }

    const entityCount = await client.query<{ count: string }>("SELECT COUNT(*) FROM entities WHERE scenario_id = $1", [scenarioId]);
    const eventCount = await client.query<{ count: string }>("SELECT COUNT(*) FROM events WHERE scenario_id = $1", [scenarioId]);
    const relationshipCount = await client.query<{ count: string }>("SELECT COUNT(*) FROM relationships WHERE scenario_id = $1", [scenarioId]);

    const counts = {
      entities: Number(entityCount.rows[0].count),
      events: Number(eventCount.rows[0].count),
      relationships: Number(relationshipCount.rows[0].count),
    };

    const minimums = scenario.quality?.minimums;
    if (minimums) {
      if (counts.entities < minimums.entities) errors.push(`Expected at least ${minimums.entities} entities, found ${counts.entities}.`);
      if (counts.events < minimums.events) errors.push(`Expected at least ${minimums.events} events, found ${counts.events}.`);
      if (counts.relationships < minimums.relationships) errors.push(`Expected at least ${minimums.relationships} relationships, found ${counts.relationships}.`);
    }

    const entities = await client.query<{ entity_id: string; name: string; summary: string | null; wikipedia_summary: string | null; wikipedia_url: string | null }>(
      `
      SELECT entity_id, name, summary, wikipedia_summary, wikipedia_url
      FROM entities
      WHERE scenario_id = $1
      ORDER BY name
      `,
      [scenarioId]
    );

    const allowed = new Set(scenario.quality?.allowedEntities ?? []);
    if (allowed.size > 0) {
      const actualNames = new Set(entities.rows.map((entity) => entity.name));
      for (const expectedName of allowed) {
        if (!actualNames.has(expectedName)) {
          errors.push(`Expected core entity missing from ${scenario.name}: ${expectedName}`);
        }
      }
    }

    const deniedTerms = scenario.quality?.deniedTerms ?? [];
    for (const entity of entities.rows) {
      const haystack = `${entity.name} ${entity.summary ?? ""} ${entity.wikipedia_summary ?? ""}`.toLowerCase();
      for (const term of deniedTerms) {
        if (containsDeniedTerm(haystack, term)) {
          errors.push(`Denied term "${term}" found on entity: ${entity.name}`);
        }
      }

      if (!entity.wikipedia_summary || !entity.wikipedia_url) {
        errors.push(`Entity missing Wikipedia summary/url: ${entity.name}`);
      }
    }

    const missingWikidataSources = await client.query<{ name: string; record_type: string }>(
      `
      SELECT e.name, 'entity' AS record_type
      FROM entities e
      WHERE e.scenario_id = $1
        AND NOT EXISTS (
          SELECT 1
          FROM entity_sources es
          JOIN sources s ON s.source_id = es.source_id
          WHERE es.entity_id = e.entity_id
            AND s.source_type = 'wikidata'
        )
      UNION ALL
      SELECT ev.name, 'event' AS record_type
      FROM events ev
      WHERE ev.scenario_id = $1
        AND NOT EXISTS (
          SELECT 1
          FROM event_sources es
          JOIN sources s ON s.source_id = es.source_id
          WHERE es.event_id = ev.event_id
            AND s.source_type = 'wikidata'
        )
      ORDER BY record_type, name
      `,
      [scenarioId]
    );

    for (const row of missingWikidataSources.rows) {
      errors.push(`Missing Wikidata source for ${row.record_type}: ${row.name}`);
    }

    return {
      ok: errors.length === 0,
      errors,
      warnings,
      counts,
    };
  } finally {
    client.release();
  }
}

function containsDeniedTerm(haystack: string, term: string): boolean {
  const normalizedTerm = term.toLowerCase();
  if (normalizedTerm.includes(" ")) {
    return haystack.includes(normalizedTerm);
  }

  const escapedTerm = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escapedTerm}\\b`).test(haystack);
}
