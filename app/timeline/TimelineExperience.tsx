"use client";

import { useEffect, useMemo, useState } from "react";
import {
  EventDetailsModal,
  Timeline,
  TimelineFilter,
  TimelineNavigation,
  TimelineToolbar,
} from "../../src/components/timeline";
import {
  timelineEventTypes,
  type TimelineEventSummary,
  type TimelineFilters,
  type TimelinePage,
} from "../../src/lib/timeline/types";

const defaultFilters: TimelineFilters = {
  query: "",
  startYear: -800,
  endYear: 500,
  eventTypes: timelineEventTypes,
};

function buildTimelineUrl(filters: TimelineFilters, cursor?: string) {
  const params = new URLSearchParams({
    startYear: String(filters.startYear),
    endYear: String(filters.endYear),
    limit: "40",
  });

  if (filters.query.trim()) {
    params.set("q", filters.query.trim());
  }

  if (filters.eventTypes.length !== timelineEventTypes.length) {
    params.set("eventType", filters.eventTypes.join(","));
  }

  if (cursor) {
    params.set("cursor", cursor);
  }

  return `/api/timeline?${params.toString()}`;
}

function normalizeTimelinePage(payload: unknown): TimelinePage {
  const fallback: TimelinePage = {
    events: [],
    totalApprox: 0,
    yearBuckets: [],
  };

  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const page = payload as Partial<TimelinePage>;

  return {
    events: Array.isArray(page.events) ? page.events : [],
    nextCursor: typeof page.nextCursor === "string" ? page.nextCursor : undefined,
    totalApprox: typeof page.totalApprox === "number" ? page.totalApprox : 0,
    yearBuckets: Array.isArray(page.yearBuckets) ? page.yearBuckets : [],
  };
}

export function TimelineExperience() {
  const [events, setEvents] = useState<TimelineEventSummary[]>([]);
  const [filters, setFilters] = useState<TimelineFilters>(defaultFilters);
  const [zoom, setZoom] = useState(2);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEventSummary | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [totalApprox, setTotalApprox] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  useEffect(() => {
    let active = true;

    async function loadInitialPage() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(buildTimelineUrl(filters), { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Timeline request failed");
        }

        const page = normalizeTimelinePage(await response.json());
        if (active) {
          setEvents(page.events);
          setNextCursor(page.nextCursor);
          setTotalApprox(page.totalApprox);
        }
      } catch {
        if (active) {
          setEvents([]);
          setNextCursor(undefined);
          setTotalApprox(0);
          setError("Timeline data is unavailable.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadInitialPage();

    return () => {
      active = false;
    };
  }, [filterKey]);

  async function loadMore() {
    if (!nextCursor || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(buildTimelineUrl(filters, nextCursor), { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Timeline request failed");
      }

      const page = normalizeTimelinePage(await response.json());
      setEvents((current) => [...current, ...page.events]);
      setNextCursor(page.nextCursor);
      setTotalApprox(page.totalApprox);
    } catch {
      setError("More timeline events could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }

  function resetView() {
    setFilters(defaultFilters);
    setZoom(2);
  }

  return (
    <main className="min-h-screen bg-ink text-bone">
      <section className="border-b border-white/10 bg-[#171918] px-6 py-8 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <a href="/" className="text-sm font-semibold uppercase tracking-[0.18em] text-brass">
              Chronos AI
            </a>
            <h1 className="mt-5 text-4xl font-semibold tracking-normal sm:text-5xl">
              Historical Timeline
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-bone/66">
              Windowed timeline exploration built for Aurora-backed event volumes.
            </p>
          </div>
          <div className="grid grid-cols-3 border border-white/10 bg-white/[0.035] text-center">
            <div className="border-r border-white/10 p-4">
              <p className="text-2xl font-semibold">{events.length.toLocaleString()}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-bone/42">Loaded</p>
            </div>
            <div className="border-r border-white/10 p-4">
              <p className="text-2xl font-semibold">{totalApprox.toLocaleString()}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-bone/42">Matched</p>
            </div>
            <div className="p-4">
              <p className="text-2xl font-semibold">{zoom}x</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-bone/42">Zoom</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <div className="overflow-hidden border border-white/10 bg-[#101214]">
          <TimelineToolbar
            zoom={zoom}
            totalEvents={totalApprox}
            visibleEvents={events.length}
            onZoomIn={() => setZoom((current) => Math.min(4, current + 1))}
            onZoomOut={() => setZoom((current) => Math.max(1, current - 1))}
            onReset={resetView}
          />
          <div className="grid lg:grid-cols-[300px_1fr]">
            <TimelineFilter filters={filters} minYear={-800} maxYear={500} onChange={setFilters} />
            <Timeline events={events} zoom={zoom} onSelect={setSelectedEvent} />
          </div>
          <div className="border-t border-white/10 bg-[#171918] p-4">
            {error ? <p className="mb-3 text-sm text-[#e99180]">{error}</p> : null}
            <button
              type="button"
              onClick={loadMore}
              disabled={!nextCursor || isLoading}
              className="h-11 border border-verdigris/60 bg-verdigris/10 px-4 text-sm font-semibold text-[#91d9d4] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isLoading ? "Loading..." : nextCursor ? "Load next window" : "No more events"}
            </button>
          </div>
          <TimelineNavigation
            firstYear={events[0]?.startYear}
            lastYear={events[events.length - 1]?.startYear}
            onJumpStart={() => setFilters((current) => ({ ...current, startYear: -800, endYear: -500 }))}
            onJumpEnd={() => setFilters((current) => ({ ...current, startYear: 250, endYear: 500 }))}
          />
        </div>
      </section>

      <EventDetailsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </main>
  );
}
