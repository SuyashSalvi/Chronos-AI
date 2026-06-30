import { NextResponse } from "next/server";
import { getHistoricalMapPage } from "../../../../src/services/map-data";
import {
  historicalMapCategories,
  historicalMapRecordTypes,
  type HistoricalMapBounds,
  type HistoricalMapCategory,
  type HistoricalMapQuery,
  type HistoricalMapRecordType,
} from "../../../../src/lib/map/types";

export const dynamic = "force-dynamic";

function parseNumber(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseRecordTypes(value: string | null): HistoricalMapRecordType[] | undefined {
  if (value === null) {
    return undefined;
  }

  const allowed = new Set(historicalMapRecordTypes);
  const recordTypes = value
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is HistoricalMapRecordType => allowed.has(item as HistoricalMapRecordType));

  return recordTypes;
}

function parseCategories(value: string | null): HistoricalMapCategory[] | undefined {
  if (value === null) {
    return undefined;
  }

  const allowed = new Set(historicalMapCategories);
  const categories = value
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is HistoricalMapCategory => allowed.has(item as HistoricalMapCategory));

  return categories;
}

function parseBounds(value: string | null): HistoricalMapBounds | undefined {
  if (!value) {
    return undefined;
  }

  const [west, south, east, north] = value.split(",").map(Number);
  if ([west, south, east, north].some((item) => !Number.isFinite(item))) {
    return undefined;
  }

  return { west, south, east, north };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query: HistoricalMapQuery = {
    scenarioId: url.searchParams.get("scenarioId") ?? url.searchParams.get("scenario") ?? undefined,
    query: url.searchParams.get("search") ?? url.searchParams.get("q") ?? undefined,
    startYear: parseNumber(url.searchParams.get("startYear")),
    endYear: parseNumber(url.searchParams.get("endYear")),
    recordTypes: parseRecordTypes(url.searchParams.get("recordTypes") ?? url.searchParams.get("recordType")),
    categories: parseCategories(url.searchParams.get("categories") ?? url.searchParams.get("category")),
    bounds: parseBounds(url.searchParams.get("bounds")),
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: parseNumber(url.searchParams.get("limit")),
  };

  return NextResponse.json(await getHistoricalMapPage(query));
}
