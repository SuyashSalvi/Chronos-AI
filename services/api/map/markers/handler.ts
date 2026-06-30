import { getPool } from "../../shared/db";
import { jsonResponse, methodNotAllowed, serverError } from "../../shared/response";

type ApiGatewayEvent = {
  httpMethod?: string;
  queryStringParameters?: Record<string, string | undefined> | null;
  requestContext?: {
    http?: {
      method?: string;
    };
  };
};

type HistoricalMapRecordType = "event" | "entity";

type HistoricalMapCategory =
  | "battle"
  | "politics"
  | "empire"
  | "culture"
  | "trade"
  | "religion"
  | "city"
  | "person"
  | "institution"
  | "frontier"
  | "province"
  | "other";

type HistoricalMapBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

type MarkerRow = {
  marker_id: string;
  record_type: HistoricalMapRecordType;
  record_id: string;
  name: string;
  description: string | null;
  category: string | null;
  start_year: number | null;
  end_year: number | null;
  scenario_id: string;
  scenario_name: string;
  latitude: number;
  longitude: number;
  source_url: string | null;
  related_names: string[] | null;
};

const historicalMapRecordTypes: HistoricalMapRecordType[] = ["event", "entity"];

const historicalMapCategories: HistoricalMapCategory[] = [
  "battle",
  "politics",
  "empire",
  "culture",
  "trade",
  "religion",
  "city",
  "person",
  "institution",
  "frontier",
  "province",
  "other",
];

function getMethod(event: ApiGatewayEvent) {
  return event.requestContext?.http?.method ?? event.httpMethod ?? "GET";
}

function parseNumber(value?: string | null) {
  if (!value) return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseLimit(value?: string | null) {
  const parsed = parseNumber(value);
  if (!parsed || !Number.isInteger(parsed) || parsed < 1) return 80;

  return Math.min(parsed, 500);
}

function parseList<T extends string>(value: string | undefined, allowed: readonly T[]) {
  if (value === undefined) return undefined;

  const allowedSet = new Set(allowed);
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is T => allowedSet.has(item as T));
}

function parseBounds(value?: string) {
  if (!value) return undefined;

  const [west, south, east, north] = value.split(",").map(Number);
  if ([west, south, east, north].some((item) => !Number.isFinite(item))) return undefined;

  return { west, south, east, north };
}

function decodeCursor(cursor?: string) {
  if (!cursor) return 0;

  const parsed = Number(Buffer.from(cursor, "base64url").toString("utf8"));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function encodeCursor(offset: number) {
  return Buffer.from(String(offset), "utf8").toString("base64url");
}

function normalizeCategory(value: string | null, recordType: HistoricalMapRecordType): HistoricalMapCategory {
  if (value && historicalMapCategories.includes(value as HistoricalMapCategory)) return value as HistoricalMapCategory;

  if (recordType === "event") {
    if (value === "war" || value === "invasion") return "battle";
    if (value === "collapse" || value === "crisis") return "politics";
  }

  return "other";
}

function rowToMarker(row: MarkerRow) {
  return {
    markerId: row.marker_id,
    recordType: row.record_type,
    recordId: row.record_id,
    name: row.name,
    description: row.description ?? "No description available yet.",
    category: normalizeCategory(row.category, row.record_type),
    startYear: row.start_year ?? undefined,
    endYear: row.end_year ?? undefined,
    scenarioId: row.scenario_id,
    scenarioName: row.scenario_name,
    latitude: row.latitude,
    longitude: row.longitude,
    sourceUrl: row.source_url ?? undefined,
    relatedNames: row.related_names ?? undefined,
  };
}

function buildWhere(query: {
  scenarioId?: string;
  search?: string;
  startYear?: number;
  endYear?: number;
  recordTypes?: HistoricalMapRecordType[];
  categories?: HistoricalMapCategory[];
  bounds?: HistoricalMapBounds;
}) {
  const conditions = ["latitude IS NOT NULL", "longitude IS NOT NULL"];
  const values: Array<string | number | string[]> = [];

  if (query.scenarioId) {
    values.push(query.scenarioId);
    conditions.push(`scenario_id = $${values.length}`);
  }

  if (query.recordTypes?.length) {
    values.push(query.recordTypes);
    conditions.push(`record_type = ANY($${values.length}::text[])`);
  }

  if (query.startYear !== undefined) {
    values.push(query.startYear);
    conditions.push(`COALESCE(end_year, start_year) >= $${values.length}`);
  }

  if (query.endYear !== undefined) {
    values.push(query.endYear);
    conditions.push(`start_year <= $${values.length}`);
  }

  if (query.bounds) {
    values.push(query.bounds.west);
    conditions.push(`longitude >= $${values.length}`);
    values.push(query.bounds.east);
    conditions.push(`longitude <= $${values.length}`);
    values.push(query.bounds.south);
    conditions.push(`latitude >= $${values.length}`);
    values.push(query.bounds.north);
    conditions.push(`latitude <= $${values.length}`);
  }

  if (query.search?.trim()) {
    values.push(`%${query.search.trim()}%`);
    conditions.push(`(name ILIKE $${values.length} OR description ILIKE $${values.length})`);
  }

  if (query.categories?.length) {
    const expandedCategories = new Set<string>();
    for (const category of query.categories) {
      expandedCategories.add(category);
      if (category === "battle") {
        expandedCategories.add("war");
        expandedCategories.add("invasion");
      }
      if (category === "politics") {
        expandedCategories.add("collapse");
        expandedCategories.add("crisis");
      }
    }

    values.push([...expandedCategories]);
    conditions.push(`COALESCE(category, 'other') = ANY($${values.length}::text[])`);
  }

  return {
    whereClause: `WHERE ${conditions.join(" AND ")}`,
    values,
  };
}

function buildBaseQuery(whereClause: string) {
  return `
    SELECT *
    FROM (
      SELECT
        'map-event-' || ev.event_id AS marker_id,
        'event' AS record_type,
        ev.event_id AS record_id,
        ev.name,
        COALESCE(ev.wikipedia_summary, ev.description) AS description,
        ev.event_type AS category,
        ev.start_year,
        ev.end_year,
        ev.scenario_id,
        s.name AS scenario_name,
        ev.latitude,
        ev.longitude,
        ev.source_url,
        ARRAY_REMOVE(ARRAY_AGG(e.name ORDER BY e.name), NULL) AS related_names
      FROM events ev
      JOIN scenarios s ON s.scenario_id = ev.scenario_id
      LEFT JOIN event_entities ee ON ee.event_id = ev.event_id
      LEFT JOIN entities e ON e.entity_id = ee.entity_id
      WHERE ev.latitude IS NOT NULL AND ev.longitude IS NOT NULL
      GROUP BY ev.event_id, s.name
      UNION ALL
      SELECT
        'map-entity-' || en.entity_id AS marker_id,
        'entity' AS record_type,
        en.entity_id AS record_id,
        en.name,
        COALESCE(en.wikipedia_summary, en.summary) AS description,
        en.entity_type AS category,
        en.start_year,
        en.end_year,
        en.scenario_id,
        s.name AS scenario_name,
        en.latitude,
        en.longitude,
        en.wikipedia_url AS source_url,
        ARRAY[]::text[] AS related_names
      FROM entities en
      JOIN scenarios s ON s.scenario_id = en.scenario_id
      WHERE en.latitude IS NOT NULL AND en.longitude IS NOT NULL
    ) markers
    ${whereClause}
  `;
}

async function getMapMarkers(queryStringParameters: Record<string, string | undefined>) {
  const scenarioId = queryStringParameters.scenarioId ?? queryStringParameters.scenario;
  const search = queryStringParameters.search ?? queryStringParameters.q;
  const startYear = parseNumber(queryStringParameters.startYear);
  const endYear = parseNumber(queryStringParameters.endYear);
  const recordTypes =
    parseList(queryStringParameters.recordTypes ?? queryStringParameters.recordType, historicalMapRecordTypes) ??
    historicalMapRecordTypes;
  const categories = parseList(queryStringParameters.categories ?? queryStringParameters.category, historicalMapCategories);
  const bounds = parseBounds(queryStringParameters.bounds);
  const limit = parseLimit(queryStringParameters.limit);
  const offset = decodeCursor(queryStringParameters.cursor);
  const { whereClause, values } = buildWhere({ scenarioId, search, startYear, endYear, recordTypes, categories, bounds });
  const baseQuery = buildBaseQuery(whereClause);
  const pageValues = [...values, limit, offset];

  console.log("Starting map markers query");
  const startedAt = Date.now();
  const result = await getPool().query<MarkerRow>(
    `
    ${baseQuery}
    ORDER BY start_year NULLS LAST, name
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
    `,
    pageValues
  );

  const countResult = await getPool().query<{ count: string }>(
    `
    SELECT COUNT(*) AS count
    FROM (${baseQuery}) counted_markers
    `,
    values
  );

  const markers = result.rows.map(rowToMarker);
  const totalApprox = Number(countResult.rows[0]?.count ?? 0);
  const nextOffset = offset + markers.length;
  console.log("Map markers query complete", {
    rowCount: result.rowCount,
    totalApprox,
    durationMs: Date.now() - startedAt,
  });

  return jsonResponse(200, {
    markers,
    nextCursor: nextOffset < totalApprox ? encodeCursor(nextOffset) : undefined,
    totalApprox,
  });
}

export async function handler(event: ApiGatewayEvent) {
  const method = getMethod(event);

  if (method === "OPTIONS") return jsonResponse(200, {});
  if (method !== "GET") return methodNotAllowed();

  try {
    return await getMapMarkers(event.queryStringParameters ?? {});
  } catch (error) {
    return serverError(error);
  }
}
