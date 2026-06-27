"use client";

type MapToolbarProps = {
  zoom: number;
  loadedMarkers: number;
  totalMarkers: number;
  hasViewportChanges: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onPan: (direction: "up" | "down" | "left" | "right") => void;
  onFitMarkers: () => void;
  onSearchViewport: () => void;
  onReset: () => void;
};

export function MapToolbar({
  zoom,
  loadedMarkers,
  totalMarkers,
  hasViewportChanges,
  onZoomIn,
  onZoomOut,
  onPan,
  onFitMarkers,
  onSearchViewport,
  onReset,
}: MapToolbarProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-white/10 bg-[#171918] p-4 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">Historical Map</p>
        <p className="mt-1 text-sm text-bone/62">
          Showing {loadedMarkers.toLocaleString()} of {totalMarkers.toLocaleString()} geo records
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onZoomOut} className="grid h-10 w-10 place-items-center border border-white/15 bg-white/[0.04] text-lg font-semibold text-bone" aria-label="Zoom out">
          -
        </button>
        <span className="grid h-10 min-w-20 place-items-center border border-white/15 text-sm font-semibold text-bone/76">
          {zoom.toFixed(1)}x
        </span>
        <button type="button" onClick={onZoomIn} className="grid h-10 w-10 place-items-center border border-white/15 bg-white/[0.04] text-lg font-semibold text-bone" aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={() => onPan("left")} className="grid h-10 w-10 place-items-center border border-white/15 bg-white/[0.04] text-bone" aria-label="Pan left">
          {"<"}
        </button>
        <button type="button" onClick={() => onPan("up")} className="grid h-10 w-10 place-items-center border border-white/15 bg-white/[0.04] text-bone" aria-label="Pan up">
          ^
        </button>
        <button type="button" onClick={() => onPan("down")} className="grid h-10 w-10 place-items-center border border-white/15 bg-white/[0.04] text-bone" aria-label="Pan down">
          v
        </button>
        <button type="button" onClick={() => onPan("right")} className="grid h-10 w-10 place-items-center border border-white/15 bg-white/[0.04] text-bone" aria-label="Pan right">
          {">"}
        </button>
        <button type="button" onClick={onFitMarkers} className="h-10 border border-white/15 bg-white/[0.04] px-4 text-sm font-semibold text-bone/70">
          Fit markers
        </button>
        <button
          type="button"
          onClick={onSearchViewport}
          disabled={!hasViewportChanges}
          className="h-10 border border-brass/60 bg-brass/10 px-4 text-sm font-semibold text-[#e3bf78] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Search visible map
        </button>
        <button type="button" onClick={onReset} className="h-10 border border-verdigris/60 bg-verdigris/10 px-4 text-sm font-semibold text-[#91d9d4]">
          Reset
        </button>
      </div>
    </header>
  );
}
