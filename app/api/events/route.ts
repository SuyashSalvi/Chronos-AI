import { NextResponse } from "next/server";
import { pool } from "../../../src/lib/db/client";

export const dynamic = "force-dynamic";

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
  wikipedia_summary,
  wikipedia_url,
  wikipedia_thumbnail
`;

function parseNumber(value: string | null): number | undefined {
  if (!value) return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseLimit(value: string | null): number {
  const parsed = parseNumber(value);
  if (!parsed || !Number.isInteger(parsed) || parsed < 1) return 100;

  return Math.min(parsed, 200);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const eventType = url.searchParams.get("type");
  const search = url.searchParams.get("search");
  const startYear = parseNumber(url.searchParams.get("startYear"));
  const endYear = parseNumber(url.searchParams.get("endYear"));
  const limit = parseLimit(url.searchParams.get("limit"));

  const conditions: string[] = [];
  const values: Array<string | number> = [];

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

  const result = await pool.query(
    `
    SELECT ${eventFields}
    FROM events
    ${conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""}
    ORDER BY start_year NULLS LAST, name
    LIMIT $${values.length}
    `,
    values
  );

  return NextResponse.json({ events: result.rows });
}
