"use client";

import {
  timelineEventTypeClasses,
  timelineEventTypeLabels,
  type TimelineEventSummary,
} from "../../lib/timeline/types";

type TimelineSpotlightProps = {
  event: TimelineEventSummary | null;
};

function formatYear(year: number) {
  return year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`;
}

export function TimelineSpotlight({ event }: TimelineSpotlightProps) {
  if (!event) {
    return (
      <section className="border-b border-white/10 bg-[#171918] p-5">
        <p className="text-sm text-bone/58">Select an event or press play to focus the timeline.</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden border-b border-white/10 bg-[#171918]">
      <div key={event.eventId} className="grid gap-5 p-5 animate-[fadeIn_420ms_ease-out] lg:grid-cols-[1fr_280px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`border px-2 py-1 text-xs font-semibold ${timelineEventTypeClasses[event.eventType]}`}>
              {timelineEventTypeLabels[event.eventType]}
            </span>
            <span className="border border-white/10 bg-white/[0.035] px-2 py-1 text-xs text-bone/58">
              {event.scenarioName}
            </span>
            {event.location ? (
              <span className="border border-white/10 bg-white/[0.035] px-2 py-1 text-xs text-bone/58">
                {event.location}
              </span>
            ) : null}
          </div>
          <p className="mt-5 text-sm font-bold text-brass">{formatYear(event.startYear)}</p>
          <h2 className="mt-2 max-w-3xl text-2xl font-semibold tracking-normal text-bone sm:text-3xl">
            {event.name}
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-bone/70">{event.description}</p>
        </div>

        <div className="border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bone/42">Entities</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {event.involvedEntities.length > 0 ? (
              event.involvedEntities.slice(0, 5).map((entity) => (
                <span
                  key={`${event.eventId}-${entity.entityId}-${entity.role ?? "entity"}`}
                  className="border border-verdigris/35 bg-verdigris/10 px-3 py-2 text-sm text-[#8bd4cf]"
                >
                  {entity.name}
                </span>
              ))
            ) : (
              <span className="text-sm text-bone/50">No linked entities</span>
            )}
          </div>
          {event.sourceUrl ? (
            <a
              href={event.sourceUrl}
              className="mt-4 inline-flex h-9 items-center border border-white/15 px-3 text-sm font-semibold text-bone/70"
            >
              Source
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
