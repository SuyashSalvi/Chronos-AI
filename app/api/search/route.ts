import { NextResponse } from "next/server";
import { pool } from "../../../src/lib/db/client";

export const dynamic = "force-dynamic";

type SearchType = "entity" | "event" | "person";

function parseLimit(value: string | null): number {
  if (!value) return 20;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return 20;

  return Math.min(parsed, 50);
}

function parseType(value: string | null): SearchType | undefined {
  if (value === "entity" || value === "event" || value === "person") {
    return value;
  }

  return undefined;
}

function searchTerm(value: string): string {
  return `%${value}%`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const type = parseType(url.searchParams.get("type"));
  const limit = parseLimit(url.searchParams.get("limit"));

  if (!q) {
    return NextResponse.json({ error: "Missing q query parameter" }, { status: 400 });
  }

  const values = [searchTerm(q), limit];
  const includeEntities = type !== "event";
  const includeEvents = type !== "entity" && type !== "person";
  const entityTypeFilter = type === "person" ? "AND entity_type = 'person'" : "";

  const entityQuery = includeEntities
    ? `
      SELECT
        'entity' AS type,
        entity_id AS id,
        name AS title,
        COALESCE(wikipedia_summary, summary) AS summary,
        wikipedia_thumbnail AS thumbnail,
        CASE
          WHEN name ILIKE $1 THEN 1.0
          WHEN COALESCE(wikipedia_summary, summary, '') ILIKE $1 THEN 0.6
          ELSE 0.2
        END::float AS score
      FROM entities
      WHERE (name ILIKE $1 OR summary ILIKE $1 OR wikipedia_summary ILIKE $1)
      ${entityTypeFilter}
    `
    : "";

  const eventQuery = includeEvents
    ? `
      SELECT
        'event' AS type,
        event_id AS id,
        name AS title,
        COALESCE(wikipedia_summary, description) AS summary,
        wikipedia_thumbnail AS thumbnail,
        CASE
          WHEN name ILIKE $1 THEN 1.0
          WHEN COALESCE(wikipedia_summary, description, '') ILIKE $1 THEN 0.6
          ELSE 0.2
        END::float AS score
      FROM events
      WHERE name ILIKE $1 OR description ILIKE $1 OR wikipedia_summary ILIKE $1
    `
    : "";

  const queryParts = [entityQuery, eventQuery].filter(Boolean);
  const result = await pool.query(
    `
    SELECT *
    FROM (
      ${queryParts.join("\nUNION ALL\n")}
    ) results
    ORDER BY score DESC, title
    LIMIT $2
    `,
    values
  );

  return NextResponse.json({ results: result.rows });
}
