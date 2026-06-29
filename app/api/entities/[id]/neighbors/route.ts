import { NextResponse } from "next/server";
import { entityExists, getEntityNeighborGraph } from "../../../../../src/services/relationship-engine";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!(await entityExists(id))) {
    return NextResponse.json({ error: "Entity not found" }, { status: 404 });
  }

  return NextResponse.json(await getEntityNeighborGraph(id));
}
