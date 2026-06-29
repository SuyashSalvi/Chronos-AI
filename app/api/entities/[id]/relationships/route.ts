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

  const entityResult = await pool.query(
    `
    SELECT entity_id
    FROM entities
    WHERE entity_id = $1
    `,
    [id]
  );

  if (entityResult.rowCount === 0) {
    return NextResponse.json({ error: "Entity not found" }, { status: 404 });
  }

  const result = await pool.query(
    `
    SELECT
      r.relationship_id,
      r.relationship_type,
      r.start_year,
      r.end_year,
      r.confidence_score,
      r.source_metadata,
      source.entity_id AS source_entity_id,
      source.name AS source_name,
      source.entity_type AS source_entity_type,
      source.wikipedia_thumbnail AS source_wikipedia_thumbnail,
      target.entity_id AS target_entity_id,
      target.name AS target_name,
      target.entity_type AS target_entity_type,
      target.wikipedia_thumbnail AS target_wikipedia_thumbnail
    FROM relationships r
    JOIN entities source ON source.entity_id = r.source_entity_id
    JOIN entities target ON target.entity_id = r.target_entity_id
    WHERE r.source_entity_id = $1 OR r.target_entity_id = $1
    ORDER BY r.relationship_type, source.name, target.name
    `,
    [id]
  );

  const relationships = result.rows.map((row) => ({
    relationship_id: row.relationship_id,
    relationship_type: row.relationship_type,
    start_year: row.start_year,
    end_year: row.end_year,
    confidence_score: row.confidence_score,
    source_metadata: row.source_metadata,
    direction: row.source_entity_id === id ? "outgoing" : "incoming",
    source: {
      entity_id: row.source_entity_id,
      name: row.source_name,
      entity_type: row.source_entity_type,
      wikipedia_thumbnail: row.source_wikipedia_thumbnail,
    },
    target: {
      entity_id: row.target_entity_id,
      name: row.target_name,
      entity_type: row.target_entity_type,
      wikipedia_thumbnail: row.target_wikipedia_thumbnail,
    },
  }));

  return NextResponse.json({ entity_id: id, relationships });
}
