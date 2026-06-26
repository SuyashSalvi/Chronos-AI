"use client";

import {
  timelineEventTypeClasses,
  timelineEventTypeLabels,
  type TimelineEventSummary,
} from "../../lib/timeline/types";

type TimelineEventProps = {
  event: TimelineEventSummary;
  onSelect: (event: TimelineEventSummary) => void;
};

function formatYear(year: number) {
  return year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`;
}

export function TimelineEvent({ event, onSelect }: TimelineEventProps) {
  return (
    <article className="grid grid-cols-[84px_22px_1fr] gap-4">
      <p className="pt-5 text-right text-sm font-bold text-brass">{formatYear(event.startYear)}</p>
      <div className="relative flex justify-center">
        <div className="absolute bottom-0 top-0 w-px bg-white/12" />
        <button
          type="button"
          onClick={() => onSelect(event)}
          aria-label={`Open ${event.name}`}
          className="relative mt-6 h-4 w-4 border border-brass bg-ink shadow-[0_0_0_6px_rgba(196,154,84,0.12)]"
        />
      </div>
      <button
        type="button"
        onClick={() => onSelect(event)}
        className="min-w-0 border border-white/10 bg-[#171918] p-4 text-left transition hover:border-brass/50"
      >
        <span className={`border px-2 py-1 text-xs font-semibold ${timelineEventTypeClasses[event.eventType]}`}>
          {timelineEventTypeLabels[event.eventType]}
        </span>
        <h3 className="mt-3 text-base font-semibold text-bone">{event.name}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-bone/62">{event.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {event.involvedEntities.slice(0, 3).map((entity) => (
            <span key={`${event.eventId}-${entity.entityId}-${entity.role ?? "entity"}`} className="border border-white/10 bg-white/[0.035] px-2 py-1 text-xs text-bone/55">
              {entity.name}
            </span>
          ))}
        </div>
      </button>
    </article>
  );
}
