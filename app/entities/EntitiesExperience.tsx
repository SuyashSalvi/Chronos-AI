"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../../src/lib/api";

type EntitySummary = {
  entity_id: string;
  name: string;
  entity_type: string;
  wikipedia_summary?: string | null;
  wikipedia_url?: string | null;
};

export function EntitiesExperience() {
  const [entities, setEntities] = useState<EntitySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadEntities() {
      try {
        const response = await fetch(apiUrl("/entities"), { cache: "no-store" });
        if (!response.ok) throw new Error("Entity request failed");

        const payload = await response.json();
        if (!isMounted) return;

        setEntities(Array.isArray(payload.entities) ? payload.entities : []);
      } catch {
        if (isMounted) {
          setError("Entities are unavailable.");
          setEntities([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadEntities();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-ink text-bone">
      <section className="border-b border-white/10 bg-[#171918] px-6 py-8 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <a href="/" className="text-sm font-semibold uppercase tracking-[0.18em] text-brass">
            Chronos AI
          </a>
          <h1 className="mt-5 text-4xl font-semibold tracking-normal sm:text-5xl">Entities</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-bone/66">
            Live historical entity records from the API layer.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-8 lg:px-8">
        <div className="mb-5 text-sm text-bone/52">
          {isLoading ? "Loading..." : `${entities.length} entities`}
        </div>

        {error ? <p className="border border-ember/40 bg-ember/10 p-4 text-[#e99180]">{error}</p> : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {entities.map((entity) => (
            <a
              key={entity.entity_id}
              href={`/entities/${entity.entity_id}`}
              className="min-h-44 border border-white/10 bg-white/[0.035] p-4 transition hover:border-verdigris/45"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold leading-6">{entity.name}</h2>
                <span className="shrink-0 border border-verdigris/45 bg-verdigris/10 px-2 py-1 text-xs uppercase tracking-[0.14em] text-[#8bd4cf]">
                  {entity.entity_type}
                </span>
              </div>
              <p className="mt-3 line-clamp-4 text-sm leading-6 text-bone/64">
                {entity.wikipedia_summary ?? "No summary available yet."}
              </p>
              {entity.wikipedia_url ? (
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-brass">
                  Wikipedia linked
                </p>
              ) : null}
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
