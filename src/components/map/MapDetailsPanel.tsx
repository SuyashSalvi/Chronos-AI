"use client";

import {
  historicalMapCategoryClasses,
  historicalMapCategoryLabels,
  type HistoricalMapMarker,
} from "../../lib/map/types";

type MapDetailsPanelProps = {
  marker: HistoricalMapMarker | null;
};

function formatYearRange(marker: HistoricalMapMarker) {
  if (typeof marker.startYear !== "number") {
    return "Date unknown";
  }

  const start = marker.startYear < 0 ? `${Math.abs(marker.startYear)} BCE` : `${marker.startYear} CE`;
  if (typeof marker.endYear !== "number" || marker.endYear === marker.startYear) {
    return start;
  }

  const end = marker.endYear < 0 ? `${Math.abs(marker.endYear)} BCE` : `${marker.endYear} CE`;
  return `${start} - ${end}`;
}

export function MapDetailsPanel({ marker }: MapDetailsPanelProps) {
  if (!marker) {
    return (
      <aside className="border-t border-white/10 bg-[#171918] p-5 xl:border-l xl:border-t-0">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bone/42">Selected Marker</p>
        <p className="mt-3 text-sm leading-6 text-bone/62">Select a marker to inspect its historical record.</p>
      </aside>
    );
  }

  return (
    <aside className="border-t border-white/10 bg-[#171918] p-5 xl:border-l xl:border-t-0">
      <div className="flex flex-wrap gap-2">
        <span className={`border px-2 py-1 text-xs font-semibold ${historicalMapCategoryClasses[marker.category]}`}>
          {historicalMapCategoryLabels[marker.category]}
        </span>
        <span className="border border-white/10 bg-white/[0.035] px-2 py-1 text-xs capitalize text-bone/58">
          {marker.recordType}
        </span>
      </div>
      <p className="mt-5 text-sm font-bold text-brass">{formatYearRange(marker)}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-normal text-bone">{marker.name}</h2>
      {marker.location ? <p className="mt-2 text-sm text-bone/50">{marker.location}</p> : null}
      <p className="mt-5 text-sm leading-7 text-bone/70">{marker.description}</p>
      {marker.relatedNames?.length ? (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bone/42">Related</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {marker.relatedNames.map((name) => (
              <span key={name} className="border border-verdigris/35 bg-verdigris/10 px-3 py-2 text-sm text-[#8bd4cf]">
                {name}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-6 border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-bone/52">
        {marker.latitude.toFixed(3)}, {marker.longitude.toFixed(3)}
      </div>
    </aside>
  );
}
