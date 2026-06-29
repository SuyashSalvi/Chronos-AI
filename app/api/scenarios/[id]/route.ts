import { NextResponse } from "next/server";
import { getScenarioById } from "../../../../src/services/scenario-service";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const scenario = await getScenarioById(id);

  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  return NextResponse.json({ scenario });
}
