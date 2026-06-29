import { NextResponse } from "next/server";
import { entityExists, getEntityGraph } from "../../../../../src/services/relationship-engine";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseDepth(value: string | null): number {
  if (!value) return 2;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return 2;

  return Math.min(parsed, 4);
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const url = new URL(request.url);

  if (!(await entityExists(id))) {
    return NextResponse.json({ error: "Entity not found" }, { status: 404 });
  }

  return NextResponse.json(await getEntityGraph(id, parseDepth(url.searchParams.get("depth"))));
}
