import { pool } from "../lib/db/client";
import { getArticle, type WikipediaArticle } from "../lib/wikipedia/wikipedia-client";
import { linkEntitySource, linkEventSource, upsertSource } from "./source-attribution";

type EnrichmentTarget = {
  id: string;
  name: string;
  wikipediaTitle?: string | null;
  tableName: "entities" | "events";
  idColumn: "entity_id" | "event_id";
};

type EnrichmentData = {
  wikipediaUrl: string | null;
  wikipediaDescription: string | null;
  wikipediaSummary: string | null;
  wikipediaThumbnail: string | null;
};

const REQUEST_DELAY_MS = 100;
const SUMMARY_MAX_LENGTH = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function normalizeWikipediaText(text?: string): string | null {
  if (!text) return null;

  const normalized = text
    .replace(/\[\d+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return null;

  return normalized.length > SUMMARY_MAX_LENGTH
    ? normalized.slice(0, SUMMARY_MAX_LENGTH).trim()
    : normalized;
}

function normalizeArticle(article: WikipediaArticle | null): EnrichmentData | null {
  if (!article) return null;

  return {
    wikipediaUrl: article.content_urls?.desktop?.page ?? null,
    wikipediaDescription: normalizeWikipediaText(article.description),
    wikipediaSummary: normalizeWikipediaText(article.extract),
    wikipediaThumbnail: article.thumbnail?.source ?? null,
  };
}

async function loadTargets(): Promise<EnrichmentTarget[]> {
  const entityResult = await pool.query<Pick<EnrichmentTarget, "id" | "name" | "wikipediaTitle">>(
    `
    SELECT
      entity_id AS id,
      name,
      metadata_json ->> 'wikipedia_title' AS "wikipediaTitle"
    FROM entities
    WHERE wikipedia_summary IS NULL
    ORDER BY name
    `
  );

  const eventResult = await pool.query<Pick<EnrichmentTarget, "id" | "name" | "wikipediaTitle">>(
    `
    SELECT
      event_id AS id,
      name,
      NULL::text AS "wikipediaTitle"
    FROM events
    WHERE wikipedia_summary IS NULL
    ORDER BY name
    `
  );

  return [
    ...entityResult.rows.map((row) => ({
      ...row,
      tableName: "entities" as const,
      idColumn: "entity_id" as const,
    })),
    ...eventResult.rows.map((row) => ({
      ...row,
      tableName: "events" as const,
      idColumn: "event_id" as const,
    })),
  ];
}

async function updateTarget(target: EnrichmentTarget, data: EnrichmentData): Promise<void> {
  await pool.query(
    `
    UPDATE ${target.tableName}
    SET
      wikipedia_url = $1,
      wikipedia_description = $2,
      wikipedia_summary = $3,
      wikipedia_thumbnail = $4,
      wikipedia_last_updated = NOW()
    WHERE ${target.idColumn} = $5
    `,
    [
      data.wikipediaUrl,
      data.wikipediaDescription,
      data.wikipediaSummary,
      data.wikipediaThumbnail,
      target.id,
    ]
  );

  if (!data.wikipediaUrl) return;

  const sourceId = await upsertSource(pool, {
    sourceType: "wikipedia",
    sourceUrl: data.wikipediaUrl,
    title: target.name,
    metadata: {
      thumbnail: data.wikipediaThumbnail,
      description: data.wikipediaDescription,
    },
  });

  if (target.tableName === "entities") {
    await linkEntitySource(pool, target.id, sourceId);
  } else {
    await linkEventSource(pool, target.id, sourceId);
  }
}

export async function enrichWikipediaProfiles(): Promise<void> {
  const targets = await loadTargets();
  let enrichedCount = 0;
  let skippedCount = 0;

  console.log(`Wikipedia enrichment targets: ${targets.length}`);

  for (const target of targets) {
    await sleep(REQUEST_DELAY_MS);

    try {
      const data = normalizeArticle(await getArticle(target.wikipediaTitle ?? target.name));

      if (!data?.wikipediaSummary) {
        skippedCount += 1;
        console.log(`Skipped: ${target.name}`);
        continue;
      }

      await updateTarget(target, data);
      enrichedCount += 1;
      console.log(`Enriched: ${target.name} ✓`);
    } catch (err) {
      skippedCount += 1;
      console.error(`Failed: ${target.name}`);
      console.error(err);
    }
  }

  console.log(`Wikipedia enrichment complete. Enriched: ${enrichedCount}. Skipped: ${skippedCount}.`);
}
