"use client";

import {
  timelineEventTypeClasses,
  timelineEventTypeLabels,
  type TimelineEventSummary,
} from "../../lib/timeline/types";

type EventDetailsModalProps = {
  event: TimelineEventSummary | null;
  onClose: () => void;
};

function formatYear(year: number) {
  return year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`;
}

export function EventDetailsModal({ event, onClose }: EventDetailsModalProps) {
  if (!event) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-8 backdrop-blur-sm">
      <section className="max-h-[88vh] w-full max-w-2xl overflow-auto border border-white/14 bg-[#171918] text-bone shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div>
            <p className="text-sm font-bold text-brass">{formatYear(event.startYear)}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">{event.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center border border-white/15 bg-white/[0.04] text-xl text-bone/70"
            aria-label="Close event details"
          >
            x
          </button>
        </div>
        <div className="grid gap-6 p-5">
          <div className="flex flex-wrap gap-2">
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
          <p className="text-base leading-8 text-bone/72">{event.description}</p>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bone/42">
              Involved entities
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {event.involvedEntities.map((entity) => (
                <span key={`${event.eventId}-${entity.entityId}-${entity.role ?? "entity"}`} className="border border-verdigris/35 bg-verdigris/10 px-3 py-2 text-sm text-[#8bd4cf]">
                  {entity.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
