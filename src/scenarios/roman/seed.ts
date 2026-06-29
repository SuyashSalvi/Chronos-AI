import { randomUUID } from "crypto";
import type { PoolClient } from "pg";
import { runSparqlQuery } from "../../lib/wikidata/sparqlClient";
import { getWikidataId, inferEntityType, inferEventType, parsePoint, parseYear } from "../../lib/wikidata/mappers";
import { linkEntitySource, linkEventSource, upsertSource } from "../../services/source-attribution";
import { ROMAN_ENTITIES_QUERY, ROMAN_EVENTS_QUERY } from "./wikidata";
import { ROMAN_ENTITY_OVERRIDES } from "./wikipedia";

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

function getEntityIdByName(
  entityNameToId: Map<string, string>,
  name: string
): string {
  const id = entityNameToId.get(name);
  if (!id) {
    throw new Error(`Missing entity for relationship: ${name}`);
  }
  return id;
}

async function upsertRomanScenario(client: PoolClient): Promise<string> {
  const existing = await client.query<{ scenario_id: string }>(
    `
    SELECT scenario_id
    FROM scenarios
    WHERE name = $1
    ORDER BY created_at
    LIMIT 1
    `,
    ["Roman Empire"]
  );

  if (existing.rows[0]) {
    await client.query(
      `
      UPDATE scenarios
      SET description = $2, start_year = $3, end_year = $4
      WHERE scenario_id = $1
      `,
      [
        existing.rows[0].scenario_id,
        "Historical scenario centered on the Roman Empire and its major entities/events.",
        -27,
        476,
      ]
    );

    return existing.rows[0].scenario_id;
  }

  const scenarioId = randomUUID();

  await client.query(
    `
    INSERT INTO scenarios (scenario_id, name, description, start_year, end_year)
    VALUES ($1, $2, $3, $4, $5)
    `,
    [
      scenarioId,
      "Roman Empire",
      "Historical scenario centered on the Roman Empire and its major entities/events.",
      -27,
      476,
    ]
  );

  return scenarioId;
}

export async function loadRomanScenario(client: PoolClient): Promise<void> {
  const scenarioId = await upsertRomanScenario(client);
  const entities = await runSparqlQuery<EntityRow>(ROMAN_ENTITIES_QUERY);
  const events = await runSparqlQuery<EventRow>(ROMAN_EVENTS_QUERY);
  const entityNameToId = new Map<string, string>();

  for (const row of entities) {
    const entityId = randomUUID();
    const wikidataId = getWikidataId(row.entity);
    const override = ROMAN_ENTITY_OVERRIDES[wikidataId];
    const entityName = override?.name ?? row.entityLabel;
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
        entityName,
        inferEntityType(entityName, row.description),
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

    const dbEntityId = result.rows[0].entity_id;
    const wikidataSourceId = await upsertSource(client, {
      sourceType: "wikidata",
      sourceUrl: row.entity,
      title: entityName,
      metadata: { wikidata_id: wikidataId },
    });

    await linkEntitySource(client, dbEntityId, wikidataSourceId);
    entityNameToId.set(entityName, dbEntityId);
  }

  for (const row of events) {
    const eventId = randomUUID();
    const wikidataId = getWikidataId(row.event);
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
        row.eventLabel,
        row.description ?? null,
        inferEventType(row.eventLabel),
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

    const dbEventId = result.rows[0].event_id;
    const wikidataSourceId = await upsertSource(client, {
      sourceType: "wikidata",
      sourceUrl: row.event,
      title: row.eventLabel,
      metadata: {
        wikidata_id: wikidataId,
        raw_date: row.date ?? null,
      },
    });

    await linkEventSource(client, dbEventId, wikidataSourceId);
  }

  const relationships = [
    ["Roman Empire", "Western Roman Empire", "split_into"],
    ["Roman Empire", "Byzantine Empire", "split_into"],
    ["Augustus", "Roman Empire", "ruled"],
    ["Constantine the Great", "Roman Empire", "ruled"],
    ["Constantine the Great", "Constantinople", "founded"],
  ];

  for (const [sourceName, targetName, relationshipType] of relationships) {
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
        getEntityIdByName(entityNameToId, sourceName),
        getEntityIdByName(entityNameToId, targetName),
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

  console.log("Roman Empire ingestion complete.");
  console.log(`Entities fetched: ${entities.length}`);
  console.log(`Events fetched: ${events.length}`);
}
