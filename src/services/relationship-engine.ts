import { pool } from "../lib/db/client";

export type GraphNode = {
  id: string;
  entity_id: string;
  name: string;
  entity_type: string;
  summary: string | null;
  wikipedia_summary: string | null;
  wikipedia_url: string | null;
  wikipedia_thumbnail: string | null;
};

export type GraphEdge = {
  id: string;
  relationship_id: string;
  source: string;
  target: string;
  relationship_type: string;
  start_year: number | null;
  end_year: number | null;
  confidence_score: string | null;
  source_metadata: unknown;
};

type RelationshipRow = {
  relationship_id: string;
  relationship_type: string;
  start_year: number | null;
  end_year: number | null;
  confidence_score: string | null;
  source_metadata: unknown;
  source_entity_id: string;
  source_name: string;
  source_entity_type: string;
  source_summary: string | null;
  source_wikipedia_summary: string | null;
  source_wikipedia_url: string | null;
  source_wikipedia_thumbnail: string | null;
  target_entity_id: string;
  target_name: string;
  target_entity_type: string;
  target_summary: string | null;
  target_wikipedia_summary: string | null;
  target_wikipedia_url: string | null;
  target_wikipedia_thumbnail: string | null;
};

export async function entityExists(entityId: string): Promise<boolean> {
  const result = await pool.query(
    `
    SELECT 1
    FROM entities
    WHERE entity_id = $1
    `,
    [entityId]
  );

  return (result.rowCount ?? 0) > 0;
}

function nodeFromSource(row: RelationshipRow): GraphNode {
  return {
    id: row.source_entity_id,
    entity_id: row.source_entity_id,
    name: row.source_name,
    entity_type: row.source_entity_type,
    summary: row.source_summary,
    wikipedia_summary: row.source_wikipedia_summary,
    wikipedia_url: row.source_wikipedia_url,
    wikipedia_thumbnail: row.source_wikipedia_thumbnail,
  };
}

function nodeFromTarget(row: RelationshipRow): GraphNode {
  return {
    id: row.target_entity_id,
    entity_id: row.target_entity_id,
    name: row.target_name,
    entity_type: row.target_entity_type,
    summary: row.target_summary,
    wikipedia_summary: row.target_wikipedia_summary,
    wikipedia_url: row.target_wikipedia_url,
    wikipedia_thumbnail: row.target_wikipedia_thumbnail,
  };
}

function edgeFromRow(row: RelationshipRow): GraphEdge {
  return {
    id: row.relationship_id,
    relationship_id: row.relationship_id,
    source: row.source_entity_id,
    target: row.target_entity_id,
    relationship_type: row.relationship_type,
    start_year: row.start_year,
    end_year: row.end_year,
    confidence_score: row.confidence_score,
    source_metadata: row.source_metadata,
  };
}

function graphFromRows(rows: RelationshipRow[]) {
  const nodesById = new Map<string, GraphNode>();
  const edgesById = new Map<string, GraphEdge>();

  for (const row of rows) {
    nodesById.set(row.source_entity_id, nodeFromSource(row));
    nodesById.set(row.target_entity_id, nodeFromTarget(row));
    edgesById.set(row.relationship_id, edgeFromRow(row));
  }

  return {
    nodes: [...nodesById.values()],
    edges: [...edgesById.values()],
  };
}

async function queryRelationshipRows(whereClause = "", values: Array<string | number> = []): Promise<RelationshipRow[]> {
  const result = await pool.query<RelationshipRow>(
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
      source.summary AS source_summary,
      source.wikipedia_summary AS source_wikipedia_summary,
      source.wikipedia_url AS source_wikipedia_url,
      source.wikipedia_thumbnail AS source_wikipedia_thumbnail,
      target.entity_id AS target_entity_id,
      target.name AS target_name,
      target.entity_type AS target_entity_type,
      target.summary AS target_summary,
      target.wikipedia_summary AS target_wikipedia_summary,
      target.wikipedia_url AS target_wikipedia_url,
      target.wikipedia_thumbnail AS target_wikipedia_thumbnail
    FROM relationships r
    JOIN entities source ON source.entity_id = r.source_entity_id
    JOIN entities target ON target.entity_id = r.target_entity_id
    ${whereClause}
    ORDER BY r.relationship_type, source.name, target.name
    `,
    values
  );

  return result.rows;
}

export async function getRelationshipGraph(limit = 500) {
  const rows = await queryRelationshipRows("LIMIT $1", [limit]);
  return graphFromRows(rows);
}

export async function getEntityNeighborGraph(entityId: string) {
  const rows = await queryRelationshipRows(
    "WHERE r.source_entity_id = $1 OR r.target_entity_id = $1",
    [entityId]
  );

  return graphFromRows(rows);
}

export async function getEntityGraph(entityId: string, depth: number) {
  const rows = await queryRelationshipRows();
  const adjacency = buildAdjacency(rows);
  const visited = new Set([entityId]);
  const queue: Array<{ id: string; depth: number }> = [{ id: entityId, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.depth >= depth) continue;

    for (const edge of adjacency.get(current.id) ?? []) {
      const nextId = edge.source_entity_id === current.id ? edge.target_entity_id : edge.source_entity_id;
      if (visited.has(nextId)) continue;

      visited.add(nextId);
      queue.push({ id: nextId, depth: current.depth + 1 });
    }
  }

  return graphFromRows(
    rows.filter((row) => visited.has(row.source_entity_id) && visited.has(row.target_entity_id))
  );
}

export async function getEntityPath(sourceId: string, targetId: string, maxDepth = 6) {
  const rows = await queryRelationshipRows();
  const adjacency = buildAdjacency(rows);
  const visited = new Set([sourceId]);
  const previous = new Map<string, { entityId: string; relationshipId: string }>();
  const rowsById = new Map(rows.map((row) => [row.relationship_id, row]));
  const queue: Array<{ id: string; depth: number }> = [{ id: sourceId, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.depth >= maxDepth) continue;

    for (const edge of adjacency.get(current.id) ?? []) {
      const nextId = edge.source_entity_id === current.id ? edge.target_entity_id : edge.source_entity_id;
      if (visited.has(nextId)) continue;

      visited.add(nextId);
      previous.set(nextId, { entityId: current.id, relationshipId: edge.relationship_id });

      if (nextId === targetId) {
        return graphFromRows(buildPathRows(sourceId, targetId, previous, rowsById));
      }

      queue.push({ id: nextId, depth: current.depth + 1 });
    }
  }

  return { nodes: [], edges: [] };
}

function buildAdjacency(rows: RelationshipRow[]) {
  const adjacency = new Map<string, RelationshipRow[]>();

  for (const row of rows) {
    adjacency.set(row.source_entity_id, [...(adjacency.get(row.source_entity_id) ?? []), row]);
    adjacency.set(row.target_entity_id, [...(adjacency.get(row.target_entity_id) ?? []), row]);
  }

  return adjacency;
}

function buildPathRows(
  sourceId: string,
  targetId: string,
  previous: Map<string, { entityId: string; relationshipId: string }>,
  rowsById: Map<string, RelationshipRow>
) {
  const pathRows: RelationshipRow[] = [];
  let currentId = targetId;

  while (currentId !== sourceId) {
    const step = previous.get(currentId);
    if (!step) break;

    const row = rowsById.get(step.relationshipId);
    if (row) pathRows.push(row);

    currentId = step.entityId;
  }

  return pathRows.reverse();
}
