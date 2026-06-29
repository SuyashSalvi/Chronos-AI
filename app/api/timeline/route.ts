import { NextResponse } from "next/server";
import { getTimelinePage } from "../../../src/services/timeline-data";
import { timelineEventTypes, type TimelineEventType, type TimelineQuery } from "../../../src/lib/timeline/types";

export const dynamic = "force-dynamic";

function parseNumber(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseEventTypes(value: string | null): TimelineEventType[] | undefined {
  if (!value) {
    return undefined;
  }

  const allowed = new Set(timelineEventTypes);
  const eventTypes = value
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is TimelineEventType => allowed.has(item as TimelineEventType));

  return eventTypes.length > 0 ? eventTypes : undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query: TimelineQuery = {
    scenarioId: url.searchParams.get("scenario") ?? undefined,
    query: url.searchParams.get("q") ?? undefined,
    startYear: parseNumber(url.searchParams.get("startYear")),
    endYear: parseNumber(url.searchParams.get("endYear")),
    eventTypes: parseEventTypes(url.searchParams.get("eventType")),
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: parseNumber(url.searchParams.get("limit")),
  };

  return NextResponse.json(await getTimelinePage(query));
}
