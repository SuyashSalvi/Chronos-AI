"use client";

import {
  historicalMapCategories,
  historicalMapCategoryLabels,
  historicalMapRecordTypes,
  type HistoricalMapCategory,
  type HistoricalMapFilters,
  type HistoricalMapRecordType,
  type HistoricalMapScenarioOption,
} from "../../lib/map/types";

type MapFilterProps = {
  filters: HistoricalMapFilters;
  minYear: number;
  maxYear: number;
  scenarios: HistoricalMapScenarioOption[];
  onChange: (filters: HistoricalMapFilters) => void;
};

export function MapFilter({ filters, minYear, maxYear, scenarios, onChange }: MapFilterProps) {
  function updateYear(field: "startYear" | "endYear", value: string) {
    const year = Number(value);
    if (Number.isNaN(year)) {
      return;
    }

    onChange({ ...filters, [field]: year });
  }

  function toggleRecordType(type: HistoricalMapRecordType) {
    const nextRecordTypes = filters.recordTypes.includes(type)
      ? filters.recordTypes.filter((item) => item !== type)
      : [...filters.recordTypes, type];

    onChange({ ...filters, recordTypes: nextRecordTypes });
  }

  function toggleCategory(category: HistoricalMapCategory) {
    const nextCategories = filters.categories.includes(category)
      ? filters.categories.filter((item) => item !== category)
      : [...filters.categories, category];

    onChange({ ...filters, categories: nextCategories });
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
            placeholder="Place, event, entity"
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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bone/45">Records</p>
          {historicalMapRecordTypes.map((type) => (
            <label key={type} className="flex cursor-pointer items-center justify-between border border-white/10 bg-white/[0.03] px-3 py-3 text-sm">
              <span className="capitalize text-bone/76">{type}s</span>
              <input
                type="checkbox"
                checked={filters.recordTypes.includes(type)}
                onChange={() => toggleRecordType(type)}
                className="h-4 w-4 accent-[#3f8f8c]"
              />
            </label>
          ))}
        </div>

        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bone/45">Categories</p>
          <div className="grid max-h-80 gap-2 overflow-auto pr-1">
            {historicalMapCategories.map((category) => (
              <label key={category} className="flex cursor-pointer items-center justify-between border border-white/10 bg-white/[0.03] px-3 py-3 text-sm">
                <span className="text-bone/76">{historicalMapCategoryLabels[category]}</span>
                <input
                  type="checkbox"
                  checked={filters.categories.includes(category)}
                  onChange={() => toggleCategory(category)}
                  className="h-4 w-4 accent-[#3f8f8c]"
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
