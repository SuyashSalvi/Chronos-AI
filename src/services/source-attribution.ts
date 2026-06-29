import { randomUUID } from "crypto";
import type { Pool, PoolClient } from "pg";

type DbExecutor = Pick<Pool | PoolClient, "query">;

export type SourceInput = {
  sourceType: string;
  sourceUrl: string;
  title?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type SourceRecord = {
  source_id: string;
  source_type: string;
  source_url: string;
  title: string | null;
  metadata_json: Record<string, unknown> | null;
};

export async function upsertSource(db: DbExecutor, input: SourceInput): Promise<string> {
  const result = await db.query<{ source_id: string }>(
    `
    INSERT INTO sources (
      source_id,
      source_type,
      source_url,
      title,
      metadata_json
    )
    VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (source_type, source_url)
    DO UPDATE SET
      title = COALESCE(EXCLUDED.title, sources.title),
      metadata_json = COALESCE(EXCLUDED.metadata_json, sources.metadata_json),
      retrieved_at = NOW()
    RETURNING source_id
    `,
    [
      randomUUID(),
      input.sourceType,
      input.sourceUrl,
      input.title ?? null,
      input.metadata ?? null,
    ]
  );

  return result.rows[0].source_id;
}

export async function linkEntitySource(db: DbExecutor, entityId: string, sourceId: string): Promise<void> {
  await db.query(
    `
    INSERT INTO entity_sources (entity_id, source_id)
    VALUES ($1,$2)
    ON CONFLICT (entity_id, source_id) DO NOTHING
    `,
    [entityId, sourceId]
  );
}

export async function linkEventSource(db: DbExecutor, eventId: string, sourceId: string): Promise<void> {
  await db.query(
    `
    INSERT INTO event_sources (event_id, source_id)
    VALUES ($1,$2)
    ON CONFLICT (event_id, source_id) DO NOTHING
    `,
    [eventId, sourceId]
  );
}

export async function getEntitySources(db: DbExecutor, entityId: string): Promise<SourceRecord[]> {
  const result = await db.query<SourceRecord>(
    `
    SELECT
      s.source_id,
      s.source_type,
      s.source_url,
      s.title,
      s.metadata_json
    FROM entity_sources es
    JOIN sources s ON s.source_id = es.source_id
    WHERE es.entity_id = $1
    ORDER BY s.source_type, s.title NULLS LAST, s.source_url
    `,
    [entityId]
  );

  return result.rows;
}

export async function getEventSources(db: DbExecutor, eventId: string): Promise<SourceRecord[]> {
  const result = await db.query<SourceRecord>(
    `
    SELECT
      s.source_id,
      s.source_type,
      s.source_url,
      s.title,
      s.metadata_json
    FROM event_sources es
    JOIN sources s ON s.source_id = es.source_id
    WHERE es.event_id = $1
    ORDER BY s.source_type, s.title NULLS LAST, s.source_url
    `,
    [eventId]
  );

  return result.rows;
}

export function formatSource(record: SourceRecord) {
  return {
    type: record.source_type,
    url: record.source_url,
    title: record.title,
    metadata: record.metadata_json,
  };
}
