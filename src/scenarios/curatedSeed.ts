import { randomUUID } from "crypto";
import type { PoolClient } from "pg";
import { getWikidataId, inferEntityType, inferEventType, parsePoint, parseYear } from "../lib/wikidata/mappers";
import { runSparqlQuery } from "../lib/wikidata/sparqlClient";
import { linkEntitySource, linkEventSource, upsertSource } from "../services/source-attribution";

type CuratedScenarioConfig = {
  name: string;
  description: string;
  startYear: number;
  endYear: number;
  entityQids: string[];
  eventQids: string[];
  entityOverrides?: Record<string, { name?: string; wikipediaTitle?: string; entityType?: string }>;
  eventOverrides?: Record<string, { name?: string; eventType?: string }>;
  relationships?: Array<[string, string, string]>;
};

type EntityRow = {
  entity: string;
  entityLabel: string;
  description?: string;
  coord?: string;
};

type EventRow = {
  event: string;
  eventLabel: string;
  description?: string;
  date?: string;
  coord?: string;
};

function wikidataValues(qids: string[]) {
  return qids.map((qid) => `wd:${qid}`).join("\n    ");
}

function buildEntityQuery(qids: string[]) {
  return `
SELECT ?entity ?entityLabel ?description ?coord WHERE {
  VALUES ?entity {
    ${wikidataValues(qids)}
  }

  OPTIONAL { ?entity schema:description ?description FILTER(LANG(?description) = "en") }
  OPTIONAL { ?entity wdt:P625 ?coord }

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en".
  }
}
`;
}

function buildEventQuery(qids: string[]) {
  return `
SELECT ?event ?eventLabel ?description ?date ?coord WHERE {
  VALUES ?event {
    ${wikidataValues(qids)}
  }

  OPTIONAL { ?event schema:description ?description FILTER(LANG(?description) = "en") }
  OPTIONAL { ?event wdt:P585 ?pointInTime }
  OPTIONAL { ?event wdt:P580 ?startTime }
  OPTIONAL { ?event wdt:P571 ?inception }
  BIND(COALESCE(?pointInTime, ?startTime, ?inception) AS ?date)
  OPTIONAL { ?event wdt:P625 ?coord }

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en".
  }
}
`;
}

async function upsertScenario(client: PoolClient, config: CuratedScenarioConfig): Promise<string> {
  const existing = await client.query<{ scenario_id: string }>(
    `
    SELECT scenario_id
    FROM scenarios
    WHERE name = $1
    ORDER BY created_at
    LIMIT 1
    `,
    [config.name]
  );

  if (existing.rows[0]) {
    await client.query(
      `
      UPDATE scenarios
      SET description = $2, start_year = $3, end_year = $4
      WHERE scenario_id = $1
      `,
      [existing.rows[0].scenario_id, config.description, config.startYear, config.endYear]
    );

    return existing.rows[0].scenario_id;
  }

  const scenarioId = randomUUID();
  await client.query(
    `
    INSERT INTO scenarios (scenario_id, name, description, start_year, end_year)
    VALUES ($1,$2,$3,$4,$5)
    `,
    [scenarioId, config.name, config.description, config.startYear, config.endYear]
  );

  return scenarioId;
}

export async function loadCuratedScenario(client: PoolClient, config: CuratedScenarioConfig): Promise<void> {
  const scenarioId = await upsertScenario(client, config);
  const entities = await runSparqlQuery<EntityRow>(buildEntityQuery(config.entityQids));
  const events = await runSparqlQuery<EventRow>(buildEventQuery(config.eventQids));
  const entityNameToId = new Map<string, string>();

  for (const row of entities) {
    const entityId = randomUUID();
    const wikidataId = getWikidataId(row.entity);
    const override = config.entityOverrides?.[wikidataId];
    const name = override?.name ?? row.entityLabel;
    const { latitude, longitude } = parsePoint(row.coord);

    const result = await client.query<{ entity_id: string }>(
      `
      INSERT INTO entities (
        entity_id,
        scenario_id,
        wikidata_id,
        name,
        entity_type,
        summary,
        latitude,
        longitude,
        metadata_json
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (wikidata_id)
      DO UPDATE SET
        scenario_id = EXCLUDED.scenario_id,
        name = EXCLUDED.name,
        entity_type = EXCLUDED.entity_type,
        summary = EXCLUDED.summary,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        metadata_json = EXCLUDED.metadata_json
      RETURNING entity_id
      `,
      [
        entityId,
        scenarioId,
        wikidataId,
        name,
        override?.entityType ?? inferEntityType(name, row.description),
        row.description ?? null,
        latitude,
        longitude,
        {
          source: "wikidata",
          raw_uri: row.entity,
          wikipedia_title: override?.wikipediaTitle ?? null,
        },
      ]
    );

    const sourceId = await upsertSource(client, {
      sourceType: "wikidata",
      sourceUrl: row.entity,
      title: name,
      metadata: { wikidata_id: wikidataId },
    });

    await linkEntitySource(client, result.rows[0].entity_id, sourceId);
    entityNameToId.set(name, result.rows[0].entity_id);
  }

  for (const row of events) {
    const eventId = randomUUID();
    const wikidataId = getWikidataId(row.event);
    const override = config.eventOverrides?.[wikidataId];
    const name = override?.name ?? row.eventLabel;
    const { latitude, longitude } = parsePoint(row.coord);
    const year = parseYear(row.date);

    const result = await client.query<{ event_id: string }>(
      `
      INSERT INTO events (
        event_id,
        scenario_id,
        wikidata_id,
        name,
        description,
        event_type,
        start_year,
        latitude,
        longitude,
        source_url,
        source_metadata
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (wikidata_id)
      DO UPDATE SET
        scenario_id = EXCLUDED.scenario_id,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        event_type = EXCLUDED.event_type,
        start_year = EXCLUDED.start_year,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        source_url = EXCLUDED.source_url,
        source_metadata = EXCLUDED.source_metadata
      RETURNING event_id
      `,
      [
        eventId,
        scenarioId,
        wikidataId,
        name,
        row.description ?? null,
        override?.eventType ?? inferEventType(name),
        year,
        latitude,
        longitude,
        row.event,
        {
          source: "wikidata",
          raw_uri: row.event,
          raw_date: row.date ?? null,
        },
      ]
    );

    const sourceId = await upsertSource(client, {
      sourceType: "wikidata",
      sourceUrl: row.event,
      title: name,
      metadata: {
        wikidata_id: wikidataId,
        raw_date: row.date ?? null,
      },
    });

    await linkEventSource(client, result.rows[0].event_id, sourceId);
  }

  for (const [sourceName, targetName, relationshipType] of config.relationships ?? []) {
    const sourceId = entityNameToId.get(sourceName);
    const targetId = entityNameToId.get(targetName);

    if (!sourceId || !targetId) {
      throw new Error(`Missing entity for relationship: ${sourceName} -> ${targetName}`);
    }

    await client.query(
      `
      INSERT INTO relationships (
        relationship_id,
        scenario_id,
        source_entity_id,
        target_entity_id,
        relationship_type,
        confidence_score,
        source_metadata
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (scenario_id, source_entity_id, target_entity_id, relationship_type)
      DO UPDATE SET
        confidence_score = EXCLUDED.confidence_score,
        source_metadata = EXCLUDED.source_metadata
      `,
      [
        randomUUID(),
        scenarioId,
        sourceId,
        targetId,
        relationshipType,
        0.8,
        {
          sources: [
            {
              type: "manual_wikidata_seed",
              url: "https://www.wikidata.org/",
            },
          ],
        },
      ]
    );
  }

  console.log(`${config.name} ingestion complete.`);
  console.log(`Entities fetched: ${entities.length}`);
  console.log(`Events fetched: ${events.length}`);
}
