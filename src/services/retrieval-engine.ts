import { pool } from "../lib/db/client";

type RetrievalResult = {
  entities: unknown[];
  events: unknown[];
  relationships: unknown[];
  sources: unknown[];
  evidence: Array<{
    type: "entity" | "event" | "relationship";
    id: string;
    title: string;
    year?: number | null;
    summary?: string | null;
  }>;
};

function likeTerm(input: string): string {
  return `%${input.trim()}%`;
}

function questionTerms(question: string): string[] {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length >= 4)
    .slice(0, 8);
}

async function getSourcesForRecords(entityIds: string[], eventIds: string[]) {
  const [entitySources, eventSources] = await Promise.all([
    entityIds.length > 0
      ? pool.query(
          `
          SELECT DISTINCT
            s.source_type AS type,
            s.source_url AS url,
            s.title,
            s.metadata_json AS metadata
          FROM entity_sources es
          JOIN sources s ON s.source_id = es.source_id
          WHERE es.entity_id = ANY($1::uuid[])
          ORDER BY s.source_type, s.title NULLS LAST, s.source_url
          `,
          [entityIds]
        )
      : Promise.resolve({ rows: [] }),
    eventIds.length > 0
      ? pool.query(
          `
          SELECT DISTINCT
            s.source_type AS type,
            s.source_url AS url,
            s.title,
            s.metadata_json AS metadata
          FROM event_sources es
          JOIN sources s ON s.source_id = es.source_id
          WHERE es.event_id = ANY($1::uuid[])
          ORDER BY s.source_type, s.title NULLS LAST, s.source_url
          `,
          [eventIds]
        )
      : Promise.resolve({ rows: [] }),
  ]);

  const sourcesByUrl = new Map<string, unknown>();
  for (const source of [...entitySources.rows, ...eventSources.rows]) {
    const key = `${source.type}:${source.url}`;
    sourcesByUrl.set(key, source);
  }

  return [...sourcesByUrl.values()];
}

function buildEvidence(entities: any[], events: any[], relationships: any[]): RetrievalResult["evidence"] {
  return [
    ...entities.map((entity) => ({
      type: "entity" as const,
      id: entity.entity_id,
      title: entity.name,
      year: entity.start_year,
      summary: entity.wikipedia_summary ?? entity.summary,
    })),
    ...events.map((event) => ({
      type: "event" as const,
      id: event.event_id,
      title: event.name,
      year: event.start_year,
      summary: event.wikipedia_summary ?? event.description,
    })),
    ...relationships.map((relationship) => ({
      type: "relationship" as const,
      id: relationship.relationship_id,
      title: `${relationship.source_name} ${relationship.relationship_type} ${relationship.target_name}`,
      year: relationship.start_year,
      summary: relationship.source_metadata ? JSON.stringify(relationship.source_metadata) : null,
    })),
  ];
}

async function assembleResult(entities: any[], events: any[], relationships: any[]): Promise<RetrievalResult> {
  const entityIds = entities.map((entity) => entity.entity_id);
  const eventIds = events.map((event) => event.event_id);
  const sources = await getSourcesForRecords(entityIds, eventIds);

  return {
    entities,
    events,
    relationships,
    sources,
    evidence: buildEvidence(entities, events, relationships),
  };
}

export async function retrieveForQuestion(question: string, scenarioId: string): Promise<RetrievalResult> {
  const terms = questionTerms(question);
  const search = terms.length > 0 ? `%${terms.join("%")}%` : likeTerm(question);

  const [entities, events] = await Promise.all([
    pool.query(
      `
      SELECT
        entity_id,
        name,
        entity_type,
        summary,
        wikipedia_summary,
        wikipedia_url,
        wikipedia_thumbnail,
        start_year,
        end_year
      FROM entities
      WHERE scenario_id = $1
        AND (name ILIKE $2 OR summary ILIKE $2 OR wikipedia_summary ILIKE $2)
      ORDER BY
        CASE WHEN name ILIKE $2 THEN 0 ELSE 1 END,
        name
      LIMIT 10
      `,
      [scenarioId, search]
    ),
    pool.query(
      `
      SELECT
        event_id,
        name,
        description,
        event_type,
        start_year,
        end_year,
        wikipedia_summary,
        wikipedia_url,
        wikipedia_thumbnail
      FROM events
      WHERE scenario_id = $1
        AND (name ILIKE $2 OR description ILIKE $2 OR wikipedia_summary ILIKE $2)
      ORDER BY
        CASE WHEN name ILIKE $2 THEN 0 ELSE 1 END,
        start_year NULLS LAST,
        name
      LIMIT 10
      `,
      [scenarioId, search]
    ),
  ]);

  const entityIds = entities.rows.map((entity) => entity.entity_id);
  const relationships = entityIds.length > 0
    ? await pool.query(
        `
        SELECT
          r.relationship_id,
          r.relationship_type,
          r.start_year,
          r.end_year,
          r.source_metadata,
          source.entity_id AS source_entity_id,
          source.name AS source_name,
          target.entity_id AS target_entity_id,
          target.name AS target_name
        FROM relationships r
        JOIN entities source ON source.entity_id = r.source_entity_id
        JOIN entities target ON target.entity_id = r.target_entity_id
        WHERE r.scenario_id = $1
          AND (r.source_entity_id = ANY($2::uuid[]) OR r.target_entity_id = ANY($2::uuid[]))
        ORDER BY source.name, r.relationship_type, target.name
        LIMIT 20
        `,
        [scenarioId, entityIds]
      )
    : { rows: [] };

  return assembleResult(entities.rows, events.rows, relationships.rows);
}

export async function retrieveEntityContext(entityId: string): Promise<RetrievalResult> {
  const [entity, events, relationships] = await Promise.all([
    pool.query("SELECT * FROM entities WHERE entity_id = $1", [entityId]),
    pool.query(
      `
      SELECT ev.*
      FROM event_entities ee
      JOIN events ev ON ev.event_id = ee.event_id
      WHERE ee.entity_id = $1
      ORDER BY ev.start_year NULLS LAST, ev.name
      LIMIT 20
      `,
      [entityId]
    ),
    retrieveRelationshipRows(entityId),
  ]);

  return assembleResult(entity.rows, events.rows, relationships.rows);
}

export async function retrieveEventContext(eventId: string): Promise<RetrievalResult> {
  const [event, entities] = await Promise.all([
    pool.query("SELECT * FROM events WHERE event_id = $1", [eventId]),
    pool.query(
      `
      SELECT e.*
      FROM event_entities ee
      JOIN entities e ON e.entity_id = ee.entity_id
      WHERE ee.event_id = $1
      ORDER BY e.name
      `,
      [eventId]
    ),
  ]);

  return assembleResult(entities.rows, event.rows, []);
}

export async function retrieveCollapseContext(entityId: string): Promise<RetrievalResult> {
  const entity = await pool.query<{ scenario_id: string }>("SELECT scenario_id FROM entities WHERE entity_id = $1", [entityId]);
  const scenarioId = entity.rows[0]?.scenario_id;

  if (!scenarioId) return assembleResult([], [], []);

  const events = await pool.query(
    `
    SELECT *
    FROM events
    WHERE scenario_id = $1
      AND (
        event_type IN ('collapse', 'crisis', 'invasion', 'war', 'battle')
        OR name ILIKE '%fall%'
        OR name ILIKE '%crisis%'
        OR description ILIKE '%collapse%'
      )
    ORDER BY start_year NULLS LAST, name
    LIMIT 20
    `,
    [scenarioId]
  );

  const relationships = await retrieveRelationshipRows(entityId);
  return assembleResult([], events.rows, relationships.rows);
}

export async function retrieveRelationshipContext(entityId: string): Promise<RetrievalResult> {
  const relationships = await retrieveRelationshipRows(entityId);
  const entityIds = new Set<string>();

  for (const relationship of relationships.rows) {
    entityIds.add(relationship.source_entity_id);
    entityIds.add(relationship.target_entity_id);
  }

  const entities = entityIds.size > 0
    ? await pool.query("SELECT * FROM entities WHERE entity_id = ANY($1::uuid[]) ORDER BY name", [[...entityIds]])
    : { rows: [] };

  return assembleResult(entities.rows, [], relationships.rows);
}

function retrieveRelationshipRows(entityId: string) {
  return pool.query(
    `
    SELECT
      r.relationship_id,
      r.relationship_type,
      r.start_year,
      r.end_year,
      r.source_metadata,
      source.entity_id AS source_entity_id,
      source.name AS source_name,
      target.entity_id AS target_entity_id,
      target.name AS target_name
    FROM relationships r
    JOIN entities source ON source.entity_id = r.source_entity_id
    JOIN entities target ON target.entity_id = r.target_entity_id
    WHERE r.source_entity_id = $1 OR r.target_entity_id = $1
    ORDER BY source.name, r.relationship_type, target.name
    `,
    [entityId]
  );
}
