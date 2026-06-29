import { pool } from "../lib/db/client";
import {
  timelineEventTypes,
  type TimelineEntitySummary,
  type TimelineEventSummary,
  type TimelineEventType,
  type TimelinePage,
  type TimelineQuery,
  type TimelineYearBucket,
} from "../lib/timeline/types";

type TimelineEventRow = {
  event_id: string;
  name: string;
  description: string | null;
  event_type: string | null;
  start_year: number | null;
  end_year: number | null;
  scenario_id: string;
  scenario_name: string;
  latitude: number | null;
  longitude: number | null;
  source_url: string | null;
  involved_entities: TimelineEntitySummary[] | null;
};

function decodeCursor(cursor?: string) {
  if (!cursor) return 0;

  const parsed = Number(Buffer.from(cursor, "base64url").toString("utf8"));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function encodeCursor(offset: number) {
  return Buffer.from(String(offset), "utf8").toString("base64url");
}

function normalizeEventType(value: string | null): TimelineEventType {
  if (value && timelineEventTypes.includes(value as TimelineEventType)) {
    return value as TimelineEventType;
  }

  if (value === "war" || value === "invasion") return "battle";
  if (value === "collapse" || value === "crisis") return "politics";

  return "other";
}

function buildWhere(query: TimelineQuery) {
  const conditions: string[] = [];
  const values: Array<string | number | string[]> = [];

  if (query.scenarioId) {
    values.push(query.scenarioId);
    conditions.push(`ev.scenario_id = $${values.length}`);
  }

  if (query.startYear !== undefined) {
    values.push(query.startYear);
    conditions.push(`COALESCE(ev.end_year, ev.start_year) >= $${values.length}`);
  }

  if (query.endYear !== undefined) {
    values.push(query.endYear);
    conditions.push(`ev.start_year <= $${values.length}`);
  }

  if (query.query?.trim()) {
    values.push(`%${query.query.trim()}%`);
    conditions.push(`(ev.name ILIKE $${values.length} OR ev.description ILIKE $${values.length} OR ev.wikipedia_summary ILIKE $${values.length})`);
  }

  if (query.eventTypes?.length) {
    const expandedTypes = new Set<string>();
    for (const type of query.eventTypes) {
      expandedTypes.add(type);
      if (type === "battle") {
        expandedTypes.add("war");
        expandedTypes.add("invasion");
      }
      if (type === "politics") {
        expandedTypes.add("collapse");
        expandedTypes.add("crisis");
      }
    }

    values.push([...expandedTypes]);
    conditions.push(`COALESCE(ev.event_type, 'other') = ANY($${values.length}::text[])`);
  }

  return {
    whereClause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    values,
  };
}

function rowToEvent(row: TimelineEventRow): TimelineEventSummary {
  return {
    eventId: row.event_id,
    name: row.name,
    startYear: row.start_year ?? 0,
    endYear: row.end_year ?? undefined,
    description: row.description ?? "No event description available yet.",
    eventType: normalizeEventType(row.event_type),
    scenarioId: row.scenario_id,
    scenarioName: row.scenario_name,
    involvedEntities: row.involved_entities ?? [],
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    sourceUrl: row.source_url ?? undefined,
  };
}

function buildYearBuckets(events: TimelineEventSummary[]): TimelineYearBucket[] {
  const counts = new Map<number, number>();

  for (const event of events) {
    const bucketYear = Math.floor(event.startYear / 50) * 50;
    counts.set(bucketYear, (counts.get(bucketYear) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, count]) => ({ year, count }));
}

export async function getTimelinePage(query: TimelineQuery): Promise<TimelinePage> {
  const limit = Math.min(Math.max(query.limit ?? 40, 1), 100);
  const offset = decodeCursor(query.cursor);
  const { whereClause, values } = buildWhere(query);
  const pageValues = [...values, limit, offset];

  const result = await pool.query<TimelineEventRow>(
    `
    SELECT
      ev.event_id,
      ev.name,
      COALESCE(ev.wikipedia_summary, ev.description) AS description,
      ev.event_type,
      ev.start_year,
      ev.end_year,
      ev.scenario_id,
      s.name AS scenario_name,
      ev.latitude,
      ev.longitude,
      ev.source_url,
      COALESCE(
        json_agg(
          json_build_object(
            'entityId', e.entity_id,
            'name', e.name,
            'entityType', e.entity_type,
            'role', ee.role
          )
          ORDER BY e.name
        ) FILTER (WHERE e.entity_id IS NOT NULL),
        '[]'
      ) AS involved_entities
    FROM events ev
    JOIN scenarios s ON s.scenario_id = ev.scenario_id
    LEFT JOIN event_entities ee ON ee.event_id = ev.event_id
    LEFT JOIN entities e ON e.entity_id = ee.entity_id
    ${whereClause}
    GROUP BY ev.event_id, s.name
    ORDER BY ev.start_year NULLS LAST, ev.name
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
    `,
    pageValues
  );

  const countResult = await pool.query<{ count: string }>(
    `
    SELECT COUNT(*) AS count
    FROM events ev
    ${whereClause}
    `,
    values
  );

  const allForBuckets = await pool.query<TimelineEventRow>(
    `
    SELECT
      ev.event_id,
      ev.name,
      COALESCE(ev.wikipedia_summary, ev.description) AS description,
      ev.event_type,
      ev.start_year,
      ev.end_year,
      ev.scenario_id,
      s.name AS scenario_name,
      ev.latitude,
      ev.longitude,
      ev.source_url,
      '[]'::json AS involved_entities
    FROM events ev
    JOIN scenarios s ON s.scenario_id = ev.scenario_id
    ${whereClause}
    ORDER BY ev.start_year NULLS LAST, ev.name
    `,
    values
  );

  const events = result.rows.map(rowToEvent);
  const totalApprox = Number(countResult.rows[0]?.count ?? 0);
  const nextOffset = offset + events.length;

  return {
    events,
    nextCursor: nextOffset < totalApprox ? encodeCursor(nextOffset) : undefined,
    totalApprox,
    yearBuckets: buildYearBuckets(allForBuckets.rows.map(rowToEvent)),
  };
}
