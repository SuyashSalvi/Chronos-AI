import { NextResponse } from "next/server";
import { listScenarios } from "../../../src/services/scenario-service";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ scenarios: await listScenarios() });
}
