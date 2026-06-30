import { getPool } from "../shared/db";
import { jsonResponse, methodNotAllowed, serverError } from "../shared/response";

type ApiGatewayEvent = {
  httpMethod?: string;
  path?: string;
  rawPath?: string;
  pathParameters?: Record<string, string | undefined> | null;
  queryStringParameters?: Record<string, string | undefined> | null;
  requestContext?: {
    http?: {
      method?: string;
      path?: string;
    };
  };
};

type TimelineEventType =
  | "battle"
  | "politics"
  | "empire"
  | "culture"
  | "trade"
  | "religion"
  | "other";

type TimelineEntitySummary = {
  entityId: string;
  name: string;
  entityType: string;
  role?: string;
};

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

const timelineEventTypes: TimelineEventType[] = [
  "battle",
  "politics",
  "empire",
  "culture",
  "trade",
  "religion",
  "other",
];

const eventFields = `
  event_id,
  name,
  description,
  event_type,
  start_year,
  end_year,
  latitude,
  longitude,
  source_url,
  source_metadata,
  wikipedia_description,
  wikipedia_summary,
  wikipedia_url,
  wikipedia_thumbnail,
  wikipedia_last_updated
`;

function getMethod(event: ApiGatewayEvent) {
  return event.requestContext?.http?.method ?? event.httpMethod ?? "GET";
}

function getPath(event: ApiGatewayEvent) {
  return event.requestContext?.http?.path ?? event.rawPath ?? event.path ?? "";
}

function parseNumber(value?: string | null) {
  if (!value) return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseLimit(value?: string | null, fallback = 100, max = 200) {
  const parsed = parseNumber(value);
  if (!parsed || !Number.isInteger(parsed) || parsed < 1) return fallback;

  return Math.min(parsed, max);
}

function decodeCursor(cursor?: string) {
  if (!cursor) return 0;

  const parsed = Number(Buffer.from(cursor, "base64url").toString("utf8"));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function encodeCursor(offset: number) {
  return Buffer.from(String(offset), "utf8").toString("base64url");
}

function parseEventTypes(value?: string | null): TimelineEventType[] | undefined {
  if (!value) return undefined;

  const allowed = new Set(timelineEventTypes);
  const eventTypes = value
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is TimelineEventType => allowed.has(item as TimelineEventType));

  return eventTypes.length > 0 ? eventTypes : undefined;
}

function normalizeEventType(value: string | null): TimelineEventType {
  if (value && timelineEventTypes.includes(value as TimelineEventType)) return value as TimelineEventType;
  if (value === "war" || value === "invasion") return "battle";
  if (value === "collapse" || value === "crisis") return "politics";

  return "other";
}

function timelineRowToEvent(row: TimelineEventRow) {
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

function buildYearBuckets(events: ReturnType<typeof timelineRowToEvent>[]) {
  const counts = new Map<number, number>();

  for (const event of events) {
    const bucketYear = Math.floor(event.startYear / 50) * 50;
    counts.set(bucketYear, (counts.get(bucketYear) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, count]) => ({ year, count }));
}

function buildTimelineWhere(query: Record<string, string | undefined>) {
  const conditions: string[] = [];
  const values: Array<string | number | string[]> = [];
  const scenarioId = query.scenario;
  const search = query.q;
  const startYear = parseNumber(query.startYear);
  const endYear = parseNumber(query.endYear);
  const eventTypes = parseEventTypes(query.eventType);

  if (scenarioId) {
    values.push(scenarioId);
    conditions.push(`ev.scenario_id = $${values.length}`);
  }

  if (startYear !== undefined) {
    values.push(startYear);
    conditions.push(`COALESCE(ev.end_year, ev.start_year) >= $${values.length}`);
  }

  if (endYear !== undefined) {
    values.push(endYear);
    conditions.push(`ev.start_year <= $${values.length}`);
  }

  if (search?.trim()) {
    values.push(`%${search.trim()}%`);
    conditions.push(`(ev.name ILIKE $${values.length} OR ev.description ILIKE $${values.length} OR ev.wikipedia_summary ILIKE $${values.length})`);
  }

  if (eventTypes?.length) {
    const expandedTypes = new Set<string>();
    for (const type of eventTypes) {
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

async function listEvents(query: Record<string, string | undefined>) {
  const conditions: string[] = [];
  const values: Array<string | number> = [];
  const eventType = query.type;
  const search = query.search;
  const startYear = parseNumber(query.startYear);
  const endYear = parseNumber(query.endYear);
  const limit = parseLimit(query.limit, 100, 200);

  if (eventType) {
    values.push(eventType);
    conditions.push(`event_type = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(name ILIKE $${values.length} OR description ILIKE $${values.length} OR wikipedia_summary ILIKE $${values.length})`);
  }

  if (startYear !== undefined) {
    values.push(startYear);
    conditions.push(`COALESCE(end_year, start_year) >= $${values.length}`);
  }

  if (endYear !== undefined) {
    values.push(endYear);
    conditions.push(`start_year <= $${values.length}`);
  }

  values.push(limit);

  console.log("Starting events query");
  const startedAt = Date.now();
  const result = await getPool().query(
    `
    SELECT ${eventFields}
    FROM events
    ${conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""}
    ORDER BY start_year NULLS LAST, name
    LIMIT $${values.length}
    `,
    values
  );
  console.log("Events query complete", { rowCount: result.rowCount, durationMs: Date.now() - startedAt });

  return jsonResponse(200, { events: result.rows });
}

async function getEvent(id: string) {
  const eventResult = await getPool().query(
    `
    SELECT ${eventFields}
    FROM events
    WHERE event_id = $1
    `,
    [id]
  );

  if (eventResult.rowCount === 0) return jsonResponse(404, { error: "Event not found" });

  const sourcesResult = await getPool().query(
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
    [id]
  );

  return jsonResponse(200, {
    event: {
      ...eventResult.rows[0],
      sources: sourcesResult.rows.map((source) => ({
        type: source.source_type,
        url: source.source_url,
        title: source.title,
        metadata: source.metadata_json,
      })),
    },
  });
}

async function getEventEntities(id: string) {
  const eventResult = await getPool().query("SELECT event_id FROM events WHERE event_id = $1", [id]);
  if (eventResult.rowCount === 0) return jsonResponse(404, { error: "Event not found" });

  const result = await getPool().query(
    `
    SELECT
      e.entity_id,
      e.name,
      e.entity_type,
      e.summary,
      e.wikipedia_summary,
      e.wikipedia_url,
      e.wikipedia_thumbnail,
      e.latitude,
      e.longitude,
      e.start_year,
      e.end_year,
      ee.role
    FROM event_entities ee
    JOIN entities e ON e.entity_id = ee.entity_id
    WHERE ee.event_id = $1
    ORDER BY ee.role NULLS LAST, e.name
    `,
    [id]
  );

  return jsonResponse(200, { event_id: id, entities: result.rows });
}

async function getTimelinePage(query: Record<string, string | undefined>) {
  const limit = parseLimit(query.limit, 40, 100);
  const offset = decodeCursor(query.cursor);
  const { whereClause, values } = buildTimelineWhere(query);
  const pageValues = [...values, limit, offset];

  console.log("Starting timeline query");
  const startedAt = Date.now();
  const result = await getPool().query<TimelineEventRow>(
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

  const countResult = await getPool().query<{ count: string }>(
    `
    SELECT COUNT(*) AS count
    FROM events ev
    ${whereClause}
    `,
    values
  );

  const allForBuckets = await getPool().query<TimelineEventRow>(
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

  const events = result.rows.map(timelineRowToEvent);
  const totalApprox = Number(countResult.rows[0]?.count ?? 0);
  const nextOffset = offset + events.length;
  console.log("Timeline query complete", { rowCount: result.rowCount, totalApprox, durationMs: Date.now() - startedAt });

  return jsonResponse(200, {
    events,
    nextCursor: nextOffset < totalApprox ? encodeCursor(nextOffset) : undefined,
    totalApprox,
    yearBuckets: buildYearBuckets(allForBuckets.rows.map(timelineRowToEvent)),
  });
}

function routePath(path: string) {
  const marker = "/prod";
  return path.startsWith(marker) ? path.slice(marker.length) || "/" : path;
}

export async function handler(event: ApiGatewayEvent) {
  const method = getMethod(event);
  const path = routePath(getPath(event));
  const query = event.queryStringParameters ?? {};
  const id = event.pathParameters?.id;

  if (method === "OPTIONS") return jsonResponse(200, {});
  if (method !== "GET") return methodNotAllowed();

  try {
    if (path === "/timeline") return await getTimelinePage(query);
    if (path.endsWith("/entities") && id) return await getEventEntities(id);
    if (id) return await getEvent(id);

    return await listEvents(query);
  } catch (error) {
    return serverError(error);
  }
}
