import { NextResponse } from "next/server";
import { entityExists, getEntityPath } from "../../../../../src/services/relationship-engine";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseDepth(value: string | null): number {
  if (!value) return 6;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return 6;

  return Math.min(parsed, 10);
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const targetId = url.searchParams.get("target");

  if (!targetId) {
    return NextResponse.json({ error: "Missing target query parameter" }, { status: 400 });
  }

  const [sourceExists, targetExists] = await Promise.all([
    entityExists(id),
    entityExists(targetId),
  ]);

  if (!sourceExists) {
    return NextResponse.json({ error: "Source entity not found" }, { status: 404 });
  }

  if (!targetExists) {
    return NextResponse.json({ error: "Target entity not found" }, { status: 404 });
  }

  return NextResponse.json(await getEntityPath(id, targetId, parseDepth(url.searchParams.get("maxDepth"))));
}
