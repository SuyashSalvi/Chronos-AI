"use client";

import {
  timelineEventTypeLabels,
  timelineEventTypes,
  type TimelineEventType,
  type TimelineFilters,
  type TimelineScenarioOption,
} from "../../lib/timeline/types";

type TimelineFilterProps = {
  filters: TimelineFilters;
  minYear: number;
  maxYear: number;
  scenarios: TimelineScenarioOption[];
  onChange: (filters: TimelineFilters) => void;
};

export function TimelineFilter({ filters, minYear, maxYear, scenarios, onChange }: TimelineFilterProps) {
  function toggleType(type: TimelineEventType) {
    const nextTypes = filters.eventTypes.includes(type)
      ? filters.eventTypes.filter((item) => item !== type)
      : [...filters.eventTypes, type];

    onChange({ ...filters, eventTypes: nextTypes });
  }

  function updateYear(field: "startYear" | "endYear", value: string) {
    const year = Number(value);
    if (Number.isNaN(year)) {
      return;
    }

    onChange({ ...filters, [field]: year });
  }

  return (
    <aside className="border-b border-white/10 bg-ink p-4 lg:border-b-0 lg:border-r">
      <div className="grid gap-5">
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-bone/45">Scenario</span>
          <select
            value={filters.scenarioId}
            onChange={(event) => onChange({ ...filters, scenarioId: event.target.value })}
            className="h-11 border border-white/12 bg-[#101214] px-3 text-sm text-bone outline-none focus:border-verdigris/70"
          >
            <option value="">All histories</option>
            {scenarios.map((scenario) => (
              <option key={scenario.scenarioId} value={scenario.scenarioId}>
                {scenario.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-bone/45">Search</span>
          <input
            value={filters.query}
            onChange={(event) => onChange({ ...filters, query: event.target.value })}
            placeholder="Event, entity, location"
            className="h-11 border border-white/12 bg-white/[0.04] px-3 text-sm text-bone outline-none placeholder:text-bone/35 focus:border-verdigris/70"
          />
        </label>

        <div className="grid gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bone/45">Years</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2">
              <span className="text-xs text-bone/55">From</span>
              <input
                type="number"
                min={minYear}
                max={maxYear}
                value={filters.startYear}
                onChange={(event) => updateYear("startYear", event.target.value)}
                className="h-10 border border-white/12 bg-white/[0.04] px-3 text-sm text-bone outline-none focus:border-verdigris/70"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs text-bone/55">To</span>
              <input
                type="number"
                min={minYear}
                max={maxYear}
                value={filters.endYear}
                onChange={(event) => updateYear("endYear", event.target.value)}
                className="h-10 border border-white/12 bg-white/[0.04] px-3 text-sm text-bone outline-none focus:border-verdigris/70"
              />
            </label>
          </div>
        </div>

        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bone/45">Event Types</p>
          {timelineEventTypes.map((type) => (
            <label
              key={type}
              className="flex cursor-pointer items-center justify-between border border-white/10 bg-white/[0.03] px-3 py-3 text-sm"
            >
              <span className="text-bone/76">{timelineEventTypeLabels[type]}</span>
              <input
                type="checkbox"
                checked={filters.eventTypes.includes(type)}
                onChange={() => toggleType(type)}
                className="h-4 w-4 accent-[#3f8f8c]"
              />
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
}
