"use client";

import { useEffect, useState } from "react";

type Source = {
  type: string;
  url: string;
  title?: string | null;
};

type Entity = {
  entity_id: string;
  name: string;
  entity_type: string;
  summary?: string | null;
  wikipedia_summary?: string | null;
  wikipedia_url?: string | null;
  wikipedia_thumbnail?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  start_year?: number | null;
  end_year?: number | null;
  sources?: Source[];
};

type Relationship = {
  relationship_id: string;
  relationship_type: string;
  direction: "incoming" | "outgoing";
  source: { entity_id: string; name: string; entity_type: string };
  target: { entity_id: string; name: string; entity_type: string };
};

type EntityProfileExperienceProps = {
  entityId: string;
};

function formatYear(year?: number | null) {
  if (typeof year !== "number") return null;
  return year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`;
}

export function EntityProfileExperience({ entityId }: EntityProfileExperienceProps) {
  const [entity, setEntity] = useState<Entity | null>(null);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadEntity() {
      setIsLoading(true);
      setError(null);

      try {
        const [entityResponse, relationshipResponse] = await Promise.all([
          fetch(`/api/entities/${entityId}`, { cache: "no-store" }),
          fetch(`/api/entities/${entityId}/relationships`, { cache: "no-store" }),
        ]);

        if (!entityResponse.ok) throw new Error("Entity request failed");
        if (!relationshipResponse.ok) throw new Error("Relationship request failed");

        const entityPayload = await entityResponse.json();
        const relationshipPayload = await relationshipResponse.json();

        if (active) {
          setEntity(entityPayload.entity ?? null);
          setRelationships(Array.isArray(relationshipPayload.relationships) ? relationshipPayload.relationships : []);
        }
      } catch {
        if (active) {
          setEntity(null);
          setRelationships([]);
          setError("Entity data is unavailable.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadEntity();

    return () => {
      active = false;
    };
  }, [entityId]);

  const dateRange = entity ? [formatYear(entity.start_year), formatYear(entity.end_year)].filter(Boolean).join(" - ") : "";

  return (
    <main className="min-h-screen bg-ink text-bone">
      <section className="border-b border-white/10 bg-[#171918] px-6 py-8 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <a href="/search" className="text-sm font-semibold uppercase tracking-[0.18em] text-brass">
            Search
          </a>
          <h1 className="mt-5 text-4xl font-semibold tracking-normal sm:text-5xl">
            {entity?.name ?? "Entity Profile"}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-bone/66">
            Live profile data from the Chronos entity API.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[0.72fr_0.28fr] lg:px-8">
        {isLoading ? (
          <p className="text-bone/62">Loading entity...</p>
        ) : error || !entity ? (
          <p className="border border-ember/40 bg-ember/10 p-4 text-[#e99180]">{error ?? "Entity not found."}</p>
        ) : (
          <>
            <article>
              <div className="flex flex-wrap gap-2">
                <span className="border border-verdigris/50 bg-verdigris/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#8bd4cf]">
                  {entity.entity_type}
                </span>
                {dateRange ? (
                  <span className="border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-bone/58">
                    {dateRange}
                  </span>
                ) : null}
              </div>

              {entity.wikipedia_thumbnail ? (
                <img
                  src={entity.wikipedia_thumbnail}
                  alt=""
                  className="mt-6 max-h-72 w-full object-cover"
                />
              ) : null}

              <p className="mt-6 text-lg leading-8 text-bone/76">
                {entity.wikipedia_summary ?? entity.summary ?? "No summary available yet."}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {entity.wikipedia_url ? (
                  <a
                    href={entity.wikipedia_url}
                    className="inline-flex h-10 items-center border border-brass/70 bg-brass/10 px-4 text-sm font-semibold text-brass"
                  >
                    Wikipedia
                  </a>
                ) : null}
                <a
                  href={`/entities/${entity.entity_id}/graph`}
                  className="inline-flex h-10 items-center border border-verdigris/55 bg-verdigris/10 px-4 text-sm font-semibold text-[#8bd4cf]"
                >
                  Relationship graph
                </a>
              </div>

              <section className="mt-10">
                <h2 className="text-xl font-semibold">Relationships</h2>
                <div className="mt-4 grid gap-3">
                  {relationships.length === 0 ? (
                    <p className="text-sm text-bone/58">No relationships found.</p>
                  ) : (
                    relationships.map((relationship) => {
                      const other = relationship.direction === "outgoing" ? relationship.target : relationship.source;
                      return (
                        <a
                          key={relationship.relationship_id}
                          href={`/entities/${other.entity_id}`}
                          className="border border-white/10 bg-white/[0.035] p-4 transition hover:border-verdigris/40"
                        >
                          <p className="text-xs uppercase tracking-[0.16em] text-bone/42">
                            {relationship.direction} / {relationship.relationship_type}
                          </p>
                          <p className="mt-2 font-semibold text-bone">{other.name}</p>
                          <p className="mt-1 text-sm text-bone/52">{other.entity_type}</p>
                        </a>
                      );
                    })
                  )}
                </div>
              </section>
            </article>

            <aside>
              <div className="border border-white/10 bg-[#171918] p-5">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-bone/42">Sources</h2>
                <div className="mt-4 grid gap-3">
                  {entity.sources?.length ? (
                    entity.sources.map((source) => (
                      <a key={`${source.type}-${source.url}`} href={source.url} className="text-sm text-brass hover:text-[#d6ad67]">
                        {source.title ?? source.type}
                      </a>
                    ))
                  ) : (
                    <p className="text-sm text-bone/58">No sources linked yet.</p>
                  )}
                </div>
              </div>
              {typeof entity.latitude === "number" && typeof entity.longitude === "number" ? (
                <div className="mt-4 border border-white/10 bg-white/[0.03] p-5 text-sm text-bone/62">
                  {entity.latitude.toFixed(3)}, {entity.longitude.toFixed(3)}
                </div>
              ) : null}
            </aside>
          </>
        )}
      </section>
    </main>
  );
}
