import { NextResponse } from "next/server";
import { pool } from "../../../../../src/lib/db/client";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const eventResult = await pool.query(
    `
    SELECT event_id
    FROM events
    WHERE event_id = $1
    `,
    [id]
  );

  if (eventResult.rowCount === 0) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const result = await pool.query(
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

  return NextResponse.json({ event_id: id, entities: result.rows });
}
