"use client";

import { useState } from "react";
import type { TimelineEventSummary } from "../../lib/timeline/types";
import { TimelineEvent } from "./TimelineEvent";

type TimelineProps = {
  events: TimelineEventSummary[];
  zoom: number;
  onSelect: (event: TimelineEventSummary) => void;
};

const viewportHeight = 680;
const overscan = 8;

export function Timeline({ events, zoom, onSelect }: TimelineProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const itemHeight = Math.max(124, 210 - zoom * 22);
  const visibleCount = Math.ceil(viewportHeight / itemHeight) + overscan * 2;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(events.length, startIndex + visibleCount);
  const visibleEvents = events.slice(startIndex, endIndex);
  const totalHeight = events.length * itemHeight;
  const topSpacer = startIndex * itemHeight;

  return (
    <section className="relative bg-[#101214]">
      <div
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
              {visibleEvents.map((event) => (
                <div key={event.id} style={{ minHeight: itemHeight - 20 }}>
                  <TimelineEvent event={event} onSelect={onSelect} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-ink to-transparent" />
    </section>
  );
}
