import { NextResponse } from "next/server";
import { pool } from "../../../../src/lib/db/client";

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

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await pool.query(
    `
    SELECT ${entityFields}
    FROM entities
    WHERE entity_id = $1
    `,
    [id]
  );

  if (result.rowCount === 0) {
    return NextResponse.json({ error: "Entity not found" }, { status: 404 });
  }

  return NextResponse.json({ entity: result.rows[0] });
}
