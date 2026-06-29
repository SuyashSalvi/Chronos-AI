import { NextResponse } from "next/server";
import { pool } from "../../../src/lib/db/client";

export const dynamic = "force-dynamic";

const entityFields = `
  entity_id,
  name,
  entity_type,
  summary,
  wikipedia_summary,
  wikipedia_url,
  wikipedia_thumbnail,
  latitude,
  longitude,
  start_year,
  end_year
`;

function parseLimit(value: string | null): number {
  if (!value) return 100;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return 100;

  return Math.min(parsed, 200);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const entityType = url.searchParams.get("type");
  const search = url.searchParams.get("search");
  const limit = parseLimit(url.searchParams.get("limit"));

  const conditions: string[] = [];
  const values: Array<string | number> = [];

  if (entityType) {
    values.push(entityType);
    conditions.push(`entity_type = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(name ILIKE $${values.length} OR summary ILIKE $${values.length} OR wikipedia_summary ILIKE $${values.length})`);
  }

  values.push(limit);

  const result = await pool.query(
    `
    SELECT ${entityFields}
    FROM entities
    ${conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""}
    ORDER BY name
    LIMIT $${values.length}
    `,
    values
  );

  return NextResponse.json({ entities: result.rows });
}
