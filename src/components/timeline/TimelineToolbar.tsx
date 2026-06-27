"use client";

type TimelineToolbarProps = {
  zoom: number;
  totalEvents: number;
  visibleEvents: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
};

export function TimelineToolbar({
  zoom,
  totalEvents,
  visibleEvents,
  onZoomIn,
  onZoomOut,
  onReset,
}: TimelineToolbarProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-white/10 bg-[#171918] p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">Timeline</p>
        <p className="mt-1 text-sm text-bone/62">
          Showing {visibleEvents.toLocaleString()} of {totalEvents.toLocaleString()} events
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onZoomOut}
          className="grid h-10 w-10 place-items-center border border-white/15 bg-white/[0.04] text-lg font-semibold text-bone"
          aria-label="Zoom out"
        >
          -
        </button>
        <span className="grid h-10 min-w-20 place-items-center border border-white/15 text-sm font-semibold text-bone/76">
          {zoom}x
        </span>
        <button
          type="button"
          onClick={onZoomIn}
          className="grid h-10 w-10 place-items-center border border-white/15 bg-white/[0.04] text-lg font-semibold text-bone"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={onReset}
          className="h-10 border border-verdigris/60 bg-verdigris/10 px-4 text-sm font-semibold text-[#91d9d4]"
        >
          Reset
        </button>
      </div>
    </header>
  );
}
