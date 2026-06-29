import { NextResponse } from "next/server";
import { getScenarioByName, listScenarios, loadScenarioData } from "../../../../src/services/scenario-service";

export const dynamic = "force-dynamic";

type LoadScenarioBody = {
  scenarioId?: string;
  scenario_id?: string;
  name?: string;
};

async function readBody(request: Request): Promise<LoadScenarioBody> {
  try {
    return (await request.json()) as LoadScenarioBody;
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const body = await readBody(request);
  let scenarioId = body.scenarioId ?? body.scenario_id;

  if (!scenarioId && body.name) {
    const scenario = await getScenarioByName(body.name);
    scenarioId = scenario?.scenario_id;
  }

  if (!scenarioId) {
    const [firstScenario] = await listScenarios();
    scenarioId = firstScenario?.scenario_id;
  }

  if (!scenarioId) {
    return NextResponse.json({ error: "No scenarios available" }, { status: 404 });
  }

  const data = await loadScenarioData(scenarioId);

  if (!data) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
