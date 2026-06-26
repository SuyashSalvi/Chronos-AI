export type TimelineEventType =
  | "battle"
  | "politics"
  | "empire"
  | "culture"
  | "trade"
  | "religion"
  | "other";

export type TimelineEntitySummary = {
  entityId: string;
  name: string;
  entityType: string;
  role?: string;
};

export type TimelineEventSummary = {
  eventId: string;
  name: string;
  startYear: number;
  endYear?: number;
  description: string;
  eventType: TimelineEventType;
  scenarioId: string;
  scenarioName: string;
  involvedEntities: TimelineEntitySummary[];
  location?: string;
  latitude?: number;
  longitude?: number;
  sourceUrl?: string;
};

export type TimelineFilters = {
  query: string;
  startYear: number;
  endYear: number;
  eventTypes: TimelineEventType[];
};

export const timelineEventTypes: TimelineEventType[] = [
  "battle",
  "politics",
  "empire",
  "culture",
  "trade",
  "religion",
  "other",
];

export const timelineEventTypeLabels: Record<TimelineEventType, string> = {
  battle: "Battle",
  politics: "Politics",
  empire: "Empire",
  culture: "Culture",
  trade: "Trade",
  religion: "Religion",
  other: "Other",
};

export const timelineEventTypeClasses: Record<TimelineEventType, string> = {
  battle: "border-ember/60 bg-ember/10 text-[#e99180]",
  politics: "border-brass/60 bg-brass/10 text-[#d8b56f]",
  empire: "border-verdigris/60 bg-verdigris/10 text-[#85d4cf]",
  culture: "border-[#8fa7ff]/60 bg-[#8fa7ff]/10 text-[#bcc8ff]",
  trade: "border-[#90c978]/60 bg-[#90c978]/10 text-[#bce2a2]",
  religion: "border-[#c48bdd]/60 bg-[#c48bdd]/10 text-[#ddb4ed]",
  other: "border-white/30 bg-white/[0.04] text-bone/70",
};

export type TimelineCursor = string;

export type TimelineQuery = {
  scenarioId?: string;
  query?: string;
  startYear?: number;
  endYear?: number;
  eventTypes?: TimelineEventType[];
  cursor?: TimelineCursor;
  limit?: number;
};

export type TimelineYearBucket = {
  year: number;
  count: number;
};

export type TimelinePage = {
  events: TimelineEventSummary[];
  nextCursor?: TimelineCursor;
  totalApprox: number;
  yearBuckets: TimelineYearBucket[];
};
