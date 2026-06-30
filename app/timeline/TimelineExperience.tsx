"use client";

import { useEffect, useMemo, useState } from "react";
import {
  EventDetailsModal,
  Timeline,
  TimelineFilter,
  TimelineNavigation,
  TimelinePlaybackControls,
  TimelineSpotlight,
  TimelineToolbar,
} from "../../src/components/timeline";
import {
  timelineEventTypes,
  type TimelineEventSummary,
  type TimelineFilters,
  type TimelinePage,
  type TimelineScenarioOption,
} from "../../src/lib/timeline/types";
import { apiUrl } from "../../src/lib/api";

const defaultFilters: TimelineFilters = {
  scenarioId: "",
  query: "",
  startYear: -800,
  endYear: 2020,
  eventTypes: timelineEventTypes,
};

const playbackPrefetchThreshold = 10;

function buildTimelineUrl(filters: TimelineFilters, cursor?: string) {
  const params = new URLSearchParams({
    startYear: String(filters.startYear),
    endYear: String(filters.endYear),
    limit: "40",
  });

  if (filters.query.trim()) {
    params.set("q", filters.query.trim());
  }

  if (filters.scenarioId) {
    params.set("scenario", filters.scenarioId);
  }

  if (filters.eventTypes.length !== timelineEventTypes.length) {
    params.set("eventType", filters.eventTypes.join(","));
  }

  if (cursor) {
    params.set("cursor", cursor);
  }

  return apiUrl(`/timeline?${params.toString()}`);
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
  const [scenarios, setScenarios] = useState<TimelineScenarioOption[]>([]);
  const [zoom, setZoom] = useState(2);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEventSummary | null>(null);
  const [activeEventIndex, setActiveEventIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [totalApprox, setTotalApprox] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  const activeEvent = events[activeEventIndex] ?? null;

  useEffect(() => {
    let active = true;

    async function loadScenarios() {
      try {
        const response = await fetch(apiUrl("/scenarios"), { cache: "no-store" });
        if (!response.ok) throw new Error("Scenario request failed");

        const payload = await response.json();
        const nextScenarios = Array.isArray(payload.scenarios)
          ? payload.scenarios.map((scenario: any) => ({
              scenarioId: scenario.scenario_id,
              name: scenario.name,
            }))
          : [];

        if (active) setScenarios(nextScenarios);
      } catch {
        if (active) setScenarios([]);
      }
    }

    loadScenarios();

    return () => {
      active = false;
    };
  }, []);

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
          setActiveEventIndex(0);
          setIsPlaying(false);
        }
      } catch {
        if (active) {
          setEvents([]);
          setNextCursor(undefined);
          setTotalApprox(0);
          setActiveEventIndex(0);
          setIsPlaying(false);
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

  useEffect(() => {
    if (activeEventIndex <= events.length - 1) {
      return;
    }

    setActiveEventIndex(Math.max(0, events.length - 1));
  }, [activeEventIndex, events.length]);

  useEffect(() => {
    if (!isPlaying || events.length === 0) {
      return;
    }

    if (activeEventIndex >= events.length - 1) {
      if (!nextCursor) {
        setIsPlaying(false);
      }
      return;
    }

    const activeDescriptionLength = activeEvent?.description.length ?? 0;
    const readingDelay = Math.min(1800, activeDescriptionLength * 9);
    const delay = Math.round((2600 + readingDelay) / playbackSpeed);

    const timeout = window.setTimeout(() => {
      setActiveEventIndex((current) => Math.min(current + 1, events.length - 1));
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [activeEvent?.description.length, activeEventIndex, events.length, isPlaying, nextCursor, playbackSpeed]);

  useEffect(() => {
    const remainingEvents = events.length - activeEventIndex;
    if (
      !isPlaying ||
      !nextCursor ||
      isLoading ||
      isPrefetching ||
      remainingEvents > playbackPrefetchThreshold
    ) {
      return;
    }

    loadNextWindow({ prefetch: true });
  }, [activeEventIndex, events.length, isLoading, isPlaying, isPrefetching, nextCursor]);

  async function loadNextWindow({ prefetch = false }: { prefetch?: boolean } = {}) {
    if (!nextCursor || isLoading || isPrefetching) {
      return;
    }

    if (prefetch) {
      setIsPrefetching(true);
    } else {
      setIsLoading(true);
    }

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
      if (prefetch) {
        setIsPrefetching(false);
      } else {
        setIsLoading(false);
      }
    }
  }

  function resetView() {
    setFilters(defaultFilters);
    setZoom(2);
    setActiveEventIndex(0);
    setIsPlaying(false);
  }

  function focusEvent(event: TimelineEventSummary) {
    const nextIndex = events.findIndex((item) => item.eventId === event.eventId);
    if (nextIndex >= 0) {
      setActiveEventIndex(nextIndex);
    }
    setSelectedEvent(event);
  }

  function scrubPlayback(index: number) {
    setActiveEventIndex(Math.max(0, Math.min(index, events.length - 1)));
  }

  function movePlayback(direction: -1 | 1) {
    setActiveEventIndex((current) => Math.max(0, Math.min(current + direction, events.length - 1)));
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
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="/map" className="inline-flex h-10 items-center border border-white/15 bg-white/[0.04] px-4 text-sm font-semibold text-bone/70">
                Map
              </a>
              <a href="/" className="inline-flex h-10 items-center border border-white/15 bg-white/[0.04] px-4 text-sm font-semibold text-bone/70">
                Home
              </a>
            </div>
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
          <TimelinePlaybackControls
            isPlaying={isPlaying}
            activeIndex={activeEventIndex}
            totalEvents={events.length}
            speed={playbackSpeed}
            isPrefetching={isPrefetching}
            onPlayPause={() => setIsPlaying((current) => !current)}
            onPrevious={() => movePlayback(-1)}
            onNext={() => movePlayback(1)}
            onSpeedChange={setPlaybackSpeed}
            onScrub={scrubPlayback}
          />
          <TimelineSpotlight event={activeEvent} />
          <div className="grid lg:grid-cols-[300px_1fr]">
            <TimelineFilter
              filters={filters}
              minYear={-800}
              maxYear={2020}
              scenarios={scenarios}
              onChange={setFilters}
            />
            <Timeline
              events={events}
              zoom={zoom}
              activeEventId={activeEvent?.eventId}
              activeEventIndex={activeEventIndex}
              onSelect={focusEvent}
            />
          </div>
          <div className="border-t border-white/10 bg-[#171918] p-4">
            {error ? <p className="mb-3 text-sm text-[#e99180]">{error}</p> : null}
            <button
              type="button"
              onClick={() => loadNextWindow()}
              disabled={!nextCursor || isLoading || isPrefetching}
              className="h-11 border border-verdigris/60 bg-verdigris/10 px-4 text-sm font-semibold text-[#91d9d4] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isLoading || isPrefetching ? "Loading..." : nextCursor ? "Load next window" : "No more events"}
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
