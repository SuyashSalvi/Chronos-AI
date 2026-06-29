"use client";

import { useEffect, useState } from "react";

type SearchResult = {
  type: "entity" | "event";
  id: string;
  title: string;
  summary?: string | null;
  thumbnail?: string | null;
  score: number;
};

export function SearchExperience() {
  const [query, setQuery] = useState("rome");
  const [type, setType] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ q: trimmed });
        if (type) params.set("type", type);

        const response = await fetch(`/api/search?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Search request failed");

        const payload = await response.json();
        setResults(Array.isArray(payload.results) ? payload.results : []);
      } catch {
        setResults([]);
        setError("Search is unavailable.");
      } finally {
        setIsLoading(false);
      }
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [query, type]);

  return (
    <main className="min-h-screen bg-ink text-bone">
      <section className="border-b border-white/10 bg-[#171918] px-6 py-8 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <a href="/" className="text-sm font-semibold uppercase tracking-[0.18em] text-brass">
            Chronos AI
          </a>
          <h1 className="mt-5 text-4xl font-semibold tracking-normal sm:text-5xl">Historical Search</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-bone/66">
            Search live entity and event records from Aurora.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-8 lg:px-8">
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Rome, Caesar, battle..."
            className="h-12 border border-white/12 bg-white/[0.04] px-4 text-bone outline-none transition placeholder:text-bone/35 focus:border-verdigris/60"
          />
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="h-12 border border-white/12 bg-[#171918] px-4 text-bone outline-none focus:border-verdigris/60"
          >
            <option value="">All</option>
            <option value="entity">Entities</option>
            <option value="person">People</option>
            <option value="event">Events</option>
          </select>
        </div>

        <div className="mt-6 text-sm text-bone/52">
          {isLoading ? "Searching..." : `${results.length} result${results.length === 1 ? "" : "s"}`}
        </div>
        {error ? <p className="mt-4 border border-ember/40 bg-ember/10 p-4 text-[#e99180]">{error}</p> : null}

        <div className="mt-6 grid gap-4">
          {results.map((result) => (
            <a
              key={`${result.type}-${result.id}`}
              href={result.type === "entity" ? `/entities/${result.id}` : `/timeline`}
              className="grid gap-4 border border-white/10 bg-white/[0.035] p-4 transition hover:border-verdigris/40 md:grid-cols-[96px_1fr]"
            >
              <div className="h-24 bg-white/[0.04]">
                {result.thumbnail ? <img src={result.thumbnail} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="border border-verdigris/45 bg-verdigris/10 px-2 py-1 text-xs uppercase tracking-[0.14em] text-[#8bd4cf]">
                    {result.type}
                  </span>
                  <span className="border border-white/10 bg-white/[0.035] px-2 py-1 text-xs text-bone/50">
                    score {Number(result.score).toFixed(1)}
                  </span>
                </div>
                <h2 className="mt-3 text-xl font-semibold">{result.title}</h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-bone/64">
                  {result.summary ?? "No summary available yet."}
                </p>
              </div>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
