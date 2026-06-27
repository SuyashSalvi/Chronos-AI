"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HistoricalMap, MapDetailsPanel, MapFilter, MapMarkerList, MapToolbar } from "../../src/components/map";
import {
  historicalMapCategories,
  historicalMapRecordTypes,
  type HistoricalMapBounds,
  type HistoricalMapFilters,
  type HistoricalMapMarker,
  type HistoricalMapPage,
  type HistoricalMapViewport,
} from "../../src/lib/map/types";

const defaultFilters: HistoricalMapFilters = {
  query: "",
  startYear: -800,
  endYear: 500,
  recordTypes: historicalMapRecordTypes,
  categories: historicalMapCategories,
};

const defaultBounds: HistoricalMapBounds = {
  west: -12,
  south: 25,
  east: 45,
  north: 56,
};

function serializeBounds(bounds: HistoricalMapBounds) {
  return [bounds.west, bounds.south, bounds.east, bounds.north].join(",");
}

function buildMapUrl(filters: HistoricalMapFilters, bounds: HistoricalMapBounds, cursor?: string) {
  const params = new URLSearchParams({
    startYear: String(filters.startYear),
    endYear: String(filters.endYear),
    limit: "80",
    bounds: serializeBounds(bounds),
  });

  if (filters.query.trim()) {
    params.set("q", filters.query.trim());
  }

  if (filters.recordTypes.length !== historicalMapRecordTypes.length) {
    params.set("recordType", filters.recordTypes.join(","));
  }

  if (filters.categories.length !== historicalMapCategories.length) {
    params.set("category", filters.categories.join(","));
  }

  if (cursor) {
    params.set("cursor", cursor);
  }

  return `/api/map/markers?${params.toString()}`;
}

function normalizeMapPage(payload: unknown): HistoricalMapPage {
  const fallback: HistoricalMapPage = {
    markers: [],
    totalApprox: 0,
  };

  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const page = payload as Partial<HistoricalMapPage>;

  return {
    markers: Array.isArray(page.markers) ? page.markers : [],
    nextCursor: typeof page.nextCursor === "string" ? page.nextCursor : undefined,
    totalApprox: typeof page.totalApprox === "number" ? page.totalApprox : 0,
  };
}

export function MapExperience() {
  const [markers, setMarkers] = useState<HistoricalMapMarker[]>([]);
  const [filters, setFilters] = useState<HistoricalMapFilters>(defaultFilters);
  const [selectedMarker, setSelectedMarker] = useState<HistoricalMapMarker | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [totalApprox, setTotalApprox] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [appliedBounds, setAppliedBounds] = useState(defaultBounds);
  const [visibleBounds, setVisibleBounds] = useState(defaultBounds);
  const [fitRequestId, setFitRequestId] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterKey = useMemo(() => JSON.stringify({ filters, appliedBounds }), [appliedBounds, filters]);
  const hasViewportChanges = serializeBounds(appliedBounds) !== serializeBounds(visibleBounds);

  useEffect(() => {
    let active = true;

    async function loadInitialMarkers() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(buildMapUrl(filters, appliedBounds), { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Map marker request failed");
        }

        const page = normalizeMapPage(await response.json());
        if (active) {
          setMarkers(page.markers);
          setSelectedMarker(page.markers[0] ?? null);
          setNextCursor(page.nextCursor);
          setTotalApprox(page.totalApprox);
        }
      } catch {
        if (active) {
          setMarkers([]);
          setSelectedMarker(null);
          setNextCursor(undefined);
          setTotalApprox(0);
          setError("Map data is unavailable.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadInitialMarkers();

    return () => {
      active = false;
    };
  }, [appliedBounds, filterKey, filters]);

  async function loadNextWindow() {
    if (!nextCursor || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(buildMapUrl(filters, appliedBounds, nextCursor), { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Map marker request failed");
      }

      const page = normalizeMapPage(await response.json());
      setMarkers((current) => [...current, ...page.markers]);
      setNextCursor(page.nextCursor);
      setTotalApprox(page.totalApprox);
    } catch {
      setError("More map markers could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }

  function resetView() {
    setFilters(defaultFilters);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setAppliedBounds(defaultBounds);
    setVisibleBounds(defaultBounds);
    setFitRequestId((current) => current + 1);
  }

  function panMap(direction: "up" | "down" | "left" | "right") {
    const step = 42;
    setPan((current) => ({
      x: direction === "left" ? current.x - step : direction === "right" ? current.x + step : current.x,
      y: direction === "up" ? current.y - step : direction === "down" ? current.y + step : current.y,
    }));
  }

  const handleViewportChange = useCallback((viewport: HistoricalMapViewport) => {
    setVisibleBounds(viewport.bounds);
    setZoom(Number(((viewport.zoom - 4) / 1.6).toFixed(1)));
  }, []);

  function searchVisibleMap() {
    setAppliedBounds(visibleBounds);
  }

  function selectMarker(marker: HistoricalMapMarker) {
    setSelectedMarker(marker);
  }

  return (
    <main className="min-h-screen bg-ink text-bone">
      <section className="border-b border-white/10 bg-[#171918] px-6 py-8 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <a href="/" className="text-sm font-semibold uppercase tracking-[0.18em] text-brass">
              Chronos AI
            </a>
            <h1 className="mt-5 text-4xl font-semibold tracking-normal sm:text-5xl">Historical Map</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-bone/66">
              Geographic exploration for event and entity records with coordinates.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="/timeline" className="inline-flex h-10 items-center border border-white/15 bg-white/[0.04] px-4 text-sm font-semibold text-bone/70">
                Timeline
              </a>
              <a href="/" className="inline-flex h-10 items-center border border-white/15 bg-white/[0.04] px-4 text-sm font-semibold text-bone/70">
                Home
              </a>
            </div>
          </div>
          <div className="grid grid-cols-3 border border-white/10 bg-white/[0.035] text-center">
            <div className="border-r border-white/10 p-4">
              <p className="text-2xl font-semibold">{markers.length.toLocaleString()}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-bone/42">Loaded</p>
            </div>
            <div className="border-r border-white/10 p-4">
              <p className="text-2xl font-semibold">{totalApprox.toLocaleString()}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-bone/42">Matched</p>
            </div>
            <div className="p-4">
              <p className="text-2xl font-semibold">{zoom.toFixed(1)}x</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-bone/42">Zoom</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <div className="overflow-hidden border border-white/10 bg-[#101214]">
          <MapToolbar
            zoom={zoom}
            loadedMarkers={markers.length}
            totalMarkers={totalApprox}
            hasViewportChanges={hasViewportChanges}
            onZoomIn={() => setZoom((current) => Math.min(2.4, Number((current + 0.2).toFixed(1))))}
            onZoomOut={() => setZoom((current) => Math.max(0.8, Number((current - 0.2).toFixed(1))))}
            onPan={panMap}
            onFitMarkers={() => setFitRequestId((current) => current + 1)}
            onSearchViewport={searchVisibleMap}
            onReset={resetView}
          />
          <div className="grid lg:grid-cols-[300px_1fr] xl:grid-cols-[300px_1fr_320px]">
            <MapFilter filters={filters} minYear={-800} maxYear={500} onChange={setFilters} />
            <HistoricalMap
              markers={markers}
              selectedMarkerId={selectedMarker?.markerId}
              zoom={zoom}
              pan={pan}
              fitRequestId={fitRequestId}
              onSelect={selectMarker}
              onViewportChange={handleViewportChange}
            />
            <MapDetailsPanel marker={selectedMarker} />
          </div>
          <MapMarkerList markers={markers} selectedMarkerId={selectedMarker?.markerId} onSelect={selectMarker} />
          <div className="border-t border-white/10 bg-[#171918] p-4">
            {error ? <p className="mb-3 text-sm text-[#e99180]">{error}</p> : null}
            <button
              type="button"
              onClick={loadNextWindow}
              disabled={!nextCursor || isLoading}
              className="h-11 border border-verdigris/60 bg-verdigris/10 px-4 text-sm font-semibold text-[#91d9d4] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isLoading ? "Loading..." : nextCursor ? "Load next marker window" : "No more markers"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
