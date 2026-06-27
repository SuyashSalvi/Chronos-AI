"use client";

import {
  historicalMapCategoryLabels,
  type HistoricalMapMarker,
} from "../../lib/map/types";

type MapMarkerListProps = {
  markers: HistoricalMapMarker[];
  selectedMarkerId?: string;
  onSelect: (marker: HistoricalMapMarker) => void;
};

function formatYear(year?: number) {
  if (typeof year !== "number") {
    return "Unknown";
  }

  return year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`;
}

export function MapMarkerList({ markers, selectedMarkerId, onSelect }: MapMarkerListProps) {
  return (
    <section className="border-t border-white/10 bg-[#171918]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bone/42">Loaded records</p>
        <p className="text-xs font-semibold text-bone/42">{markers.length.toLocaleString()}</p>
      </div>
      <div className="grid max-h-72 gap-2 overflow-auto p-3 md:grid-cols-2 xl:grid-cols-3">
        {markers.slice(0, 60).map((marker) => {
          const selected = selectedMarkerId === marker.markerId;

          return (
            <button
              key={marker.markerId}
              type="button"
              onClick={() => onSelect(marker)}
              className={`min-w-0 border p-3 text-left transition ${
                selected ? "border-brass/70 bg-brass/10" : "border-white/10 bg-white/[0.03] hover:border-white/25"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-bone">{marker.name}</span>
                <span className="shrink-0 text-xs text-brass">{formatYear(marker.startYear)}</span>
              </div>
              <p className="mt-2 truncate text-xs capitalize text-bone/48">
                {marker.recordType} · {historicalMapCategoryLabels[marker.category]}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
