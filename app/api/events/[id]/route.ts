import { NextResponse } from "next/server";
import { pool } from "../../../../src/lib/db/client";
import { formatSource, getEventSources } from "../../../../src/services/source-attribution";

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
  source_metadata,
  wikipedia_description,
  wikipedia_summary,
  wikipedia_url,
  wikipedia_thumbnail,
  wikipedia_last_updated
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
    SELECT ${eventFields}
    FROM events
    WHERE event_id = $1
    `,
    [id]
  );

  if (result.rowCount === 0) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const sources = await getEventSources(pool, id);

  return NextResponse.json({
    event: {
      ...result.rows[0],
      sources: sources.map(formatSource),
    },
  });
}
