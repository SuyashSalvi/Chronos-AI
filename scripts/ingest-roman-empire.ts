import { randomUUID } from "crypto";
import { config } from "dotenv";
import type { PoolClient } from "pg";
import { runSparqlQuery } from "../src/lib/wikidata/sparqlClient";
import { ROMAN_ENTITIES_QUERY, ROMAN_EVENTS_QUERY } from "../src/lib/wikidata/romanEmpireQueries";
import { getWikidataId, inferEntityType, inferEventType, parsePoint, parseYear } from "../src/lib/wikidata/mappers";

config({ path: ".env.local" });

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

async function main() {
  const { pool } = await import("../src/lib/db/client");
  let client: PoolClient | undefined;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

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

    const entities = await runSparqlQuery<EntityRow>(ROMAN_ENTITIES_QUERY);
    const events = await runSparqlQuery<EventRow>(ROMAN_EVENTS_QUERY);
    const entityIdByWikidataId = new Map<string, string>();
    const entityNameToId = new Map<string, string>();

    for (const row of entities) {
      const entityId = randomUUID();
      const wikidataId = getWikidataId(row.entity);
      const { latitude, longitude } = parsePoint(row.coord);

      const result = await client.query(
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
          row.entityLabel,
          inferEntityType(row.entityLabel),
          row.description ?? null,
          latitude,
          longitude,
          {
            source: "wikidata",
            raw_uri: row.entity,
          },
        ]
      );

      const dbEntityId = result.rows[0].entity_id;

      entityIdByWikidataId.set(wikidataId, dbEntityId);
      entityNameToId.set(row.entityLabel, dbEntityId);
    }

    for (const row of events) {
      const eventId = randomUUID();
      const wikidataId = getWikidataId(row.event);
      const { latitude, longitude } = parsePoint(row.coord);
      const year = parseYear(row.date);

      await client.query(
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
        ON CONFLICT (wikidata_id) DO NOTHING
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
    }

    const relationships = [
      ["Roman Empire", "Western Roman Empire", "split_into"],
      ["Roman Empire", "Byzantine Empire", "split_into"],
      ["Augustus", "Roman Empire", "ruled"],
      ["Constantine the Great", "Roman Empire", "ruled"],
      ["Constantine the Great", "Constantinople", "founded"],
    ];

    for (const [sourceName, targetName, relationshipType] of relationships) {
      const sourceId = getEntityIdByName(entityNameToId, sourceName);
      const targetId = getEntityIdByName(entityNameToId, targetName);

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
          { source: "manual_wikidata_seed" },
        ]
      );
    }

    await client.query("COMMIT");

    console.log("Roman Empire ingestion complete.");
    console.log(`Entities fetched: ${entities.length}`);
    console.log(`Events fetched: ${events.length}`);
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }

    console.error(err);
    process.exit(1);
  } finally {
    client?.release();
    await pool.end();
  }
}

main();
