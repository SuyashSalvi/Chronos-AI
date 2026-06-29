import { pool } from "../lib/db/client";
import {
  historicalMapCategories,
  historicalMapRecordTypes,
  type HistoricalMapCategory,
  type HistoricalMapMarker,
  type HistoricalMapPage,
  type HistoricalMapQuery,
  type HistoricalMapRecordType,
} from "../lib/map/types";

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

function decodeCursor(cursor?: string) {
  if (!cursor) return 0;

  const parsed = Number(Buffer.from(cursor, "base64url").toString("utf8"));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function encodeCursor(offset: number) {
  return Buffer.from(String(offset), "utf8").toString("base64url");
}

function normalizeCategory(value: string | null, recordType: HistoricalMapRecordType): HistoricalMapCategory {
  if (value && historicalMapCategories.includes(value as HistoricalMapCategory)) {
    return value as HistoricalMapCategory;
  }

  if (recordType === "event") {
    if (value === "war" || value === "invasion") return "battle";
    if (value === "collapse" || value === "crisis") return "politics";
  }

  return "other";
}

function buildWhere(query: HistoricalMapQuery) {
  const conditions: string[] = ["latitude IS NOT NULL", "longitude IS NOT NULL"];
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

  if (query.query?.trim()) {
    values.push(`%${query.query.trim()}%`);
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

function rowToMarker(row: MarkerRow): HistoricalMapMarker {
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

export async function getHistoricalMapPage(query: HistoricalMapQuery): Promise<HistoricalMapPage> {
  const limit = Math.min(Math.max(query.limit ?? 80, 1), 150);
  const offset = decodeCursor(query.cursor);
  const recordTypes = query.recordTypes?.length ? query.recordTypes : historicalMapRecordTypes;
  const { whereClause, values } = buildWhere({ ...query, recordTypes });
  const pageValues = [...values, limit, offset];

  const baseQuery = `
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

  const result = await pool.query<MarkerRow>(
    `
    ${baseQuery}
    ORDER BY start_year NULLS LAST, name
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
    `,
    pageValues
  );

  const countResult = await pool.query<{ count: string }>(
    `
    SELECT COUNT(*) AS count
    FROM (${baseQuery}) counted_markers
    `,
    values
  );

  const markers = result.rows.map(rowToMarker);
  const totalApprox = Number(countResult.rows[0]?.count ?? 0);
  const nextOffset = offset + markers.length;

  return {
    markers,
    nextCursor: nextOffset < totalApprox ? encodeCursor(nextOffset) : undefined,
    totalApprox,
  };
}
