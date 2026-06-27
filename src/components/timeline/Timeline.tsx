"use client";

import { useEffect, useRef, useState } from "react";
import type { TimelineEventSummary } from "../../lib/timeline/types";
import { TimelineEvent } from "./TimelineEvent";

type TimelineProps = {
  events: TimelineEventSummary[];
  zoom: number;
  activeEventId?: string;
  activeEventIndex?: number;
  onSelect: (event: TimelineEventSummary) => void;
};

const viewportHeight = 680;
const overscan = 8;

export function Timeline({ events, zoom, activeEventId, activeEventIndex, onSelect }: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const itemHeight = Math.max(124, 210 - zoom * 22);
  const visibleCount = Math.ceil(viewportHeight / itemHeight) + overscan * 2;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(events.length, startIndex + visibleCount);
  const visibleEvents = events.slice(startIndex, endIndex);
  const totalHeight = events.length * itemHeight;
  const topSpacer = startIndex * itemHeight;

  useEffect(() => {
    if (typeof activeEventIndex !== "number" || !scrollRef.current) {
      return;
    }

    const nextScrollTop = Math.max(0, activeEventIndex * itemHeight - viewportHeight * 0.36);
    scrollRef.current.scrollTo({ top: nextScrollTop, behavior: "smooth" });
  }, [activeEventIndex, itemHeight]);

  return (
    <section className="relative bg-[#101214]">
      <div
        ref={scrollRef}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        className="h-[680px] overflow-y-auto scroll-smooth px-4 py-8 md:px-8"
      >
        {events.length === 0 ? (
          <div className="grid min-h-[520px] place-items-center border border-white/10 bg-white/[0.03] text-center">
            <div>
              <p className="text-xl font-semibold text-bone">No events match the current filters.</p>
              <p className="mt-2 text-sm text-bone/58">Adjust event types, years, or search terms.</p>
            </div>
          </div>
        ) : (
          <div style={{ height: totalHeight }}>
            <div style={{ transform: `translateY(${topSpacer}px)` }} className="space-y-5">
              {visibleEvents.map((event, index) => {
                const eventIndex = startIndex + index;
                const isActive = activeEventId === event.eventId;
                const isPast = typeof activeEventIndex === "number" && eventIndex < activeEventIndex;

                return (
                  <div key={event.eventId} style={{ minHeight: itemHeight - 20 }}>
                    <TimelineEvent
                      event={event}
                      isActive={isActive}
                      isPast={isPast}
                      onSelect={onSelect}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-ink to-transparent" />
    </section>
  );
}
