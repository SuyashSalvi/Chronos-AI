import { pool } from "../lib/db/client";

const scenarioFields = `
  scenario_id,
  name,
  description,
  start_year,
  end_year,
  created_at
`;

const entityFields = `
  entity_id,
  scenario_id,
  name,
  entity_type,
  summary,
  wikipedia_summary,
  wikipedia_url,
  wikipedia_thumbnail,
  latitude,
  longitude,
  start_year,
  end_year
`;

const eventFields = `
  event_id,
  scenario_id,
  name,
  description,
  event_type,
  start_year,
  end_year,
  latitude,
  longitude,
  source_url,
  wikipedia_summary,
  wikipedia_url,
  wikipedia_thumbnail
`;

export async function listScenarios() {
  const result = await pool.query(
    `
    SELECT ${scenarioFields}
    FROM scenarios
    ORDER BY name
    `
  );

  return result.rows;
}

export async function getScenarioById(scenarioId: string) {
  const result = await pool.query(
    `
    SELECT ${scenarioFields}
    FROM scenarios
    WHERE scenario_id = $1
    `,
    [scenarioId]
  );

  return result.rows[0] ?? null;
}

export async function getScenarioByName(name: string) {
  const result = await pool.query(
    `
    SELECT ${scenarioFields}
    FROM scenarios
    WHERE name ILIKE $1
    ORDER BY name
    LIMIT 1
    `,
    [name]
  );

  return result.rows[0] ?? null;
}

export async function loadScenarioData(scenarioId: string) {
  const [scenario, entities, events, relationships] = await Promise.all([
    getScenarioById(scenarioId),
    pool.query(
      `
      SELECT ${entityFields}
      FROM entities
      WHERE scenario_id = $1
      ORDER BY name
      `,
      [scenarioId]
    ),
    pool.query(
      `
      SELECT ${eventFields}
      FROM events
      WHERE scenario_id = $1
      ORDER BY start_year NULLS LAST, name
      `,
      [scenarioId]
    ),
    pool.query(
      `
      SELECT
        r.relationship_id,
        r.scenario_id,
        r.source_entity_id,
        source.name AS source_name,
        r.target_entity_id,
        target.name AS target_name,
        r.relationship_type,
        r.start_year,
        r.end_year,
        r.confidence_score,
        r.source_metadata
      FROM relationships r
      JOIN entities source ON source.entity_id = r.source_entity_id
      JOIN entities target ON target.entity_id = r.target_entity_id
      WHERE r.scenario_id = $1
      ORDER BY r.relationship_type, source.name, target.name
      `,
      [scenarioId]
    ),
  ]);

  if (!scenario) return null;

  return {
    scenario,
    entities: entities.rows,
    events: events.rows,
    relationships: relationships.rows,
  };
}
