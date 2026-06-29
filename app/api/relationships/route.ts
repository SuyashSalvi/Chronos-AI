import { NextResponse } from "next/server";
import { getRelationshipGraph } from "../../../src/services/relationship-engine";

export const dynamic = "force-dynamic";

function parseLimit(value: string | null): number {
  if (!value) return 500;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return 500;

  return Math.min(parsed, 1000);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const graph = await getRelationshipGraph(parseLimit(url.searchParams.get("limit")));

  return NextResponse.json(graph);
}
