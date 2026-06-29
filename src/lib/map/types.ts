import type { TimelineEventType } from "../timeline/types";

export type HistoricalMapRecordType = "event" | "entity";

export type HistoricalMapCategory =
  | TimelineEventType
  | "city"
  | "empire"
  | "person"
  | "institution"
  | "frontier"
  | "province";

export type HistoricalMapMarker = {
  markerId: string;
  recordType: HistoricalMapRecordType;
  recordId: string;
  name: string;
  description: string;
  category: HistoricalMapCategory;
  startYear?: number;
  endYear?: number;
  scenarioId: string;
  scenarioName: string;
  latitude: number;
  longitude: number;
  location?: string;
  sourceUrl?: string;
  relatedNames?: string[];
};

export type HistoricalMapBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type HistoricalMapQuery = {
  scenarioId?: string;
  query?: string;
  startYear?: number;
  endYear?: number;
  recordTypes?: HistoricalMapRecordType[];
  categories?: HistoricalMapCategory[];
  bounds?: HistoricalMapBounds;
  cursor?: string;
  limit?: number;
};

export type HistoricalMapPage = {
  markers: HistoricalMapMarker[];
  nextCursor?: string;
  totalApprox: number;
};

export type HistoricalMapFilters = {
  scenarioId: string;
  query: string;
  startYear: number;
  endYear: number;
  recordTypes: HistoricalMapRecordType[];
  categories: HistoricalMapCategory[];
};

export type HistoricalMapScenarioOption = {
  scenarioId: string;
  name: string;
};

export type HistoricalMapViewport = {
  bounds: HistoricalMapBounds;
  zoom: number;
};

export const historicalMapRecordTypes: HistoricalMapRecordType[] = ["event", "entity"];

export const historicalMapCategories: HistoricalMapCategory[] = [
  "battle",
  "politics",
  "empire",
  "culture",
  "trade",
  "religion",
  "city",
  "person",
  "institution",
  "frontier",
  "province",
  "other",
];

export const historicalMapCategoryLabels: Record<HistoricalMapCategory, string> = {
  battle: "Battle",
  politics: "Politics",
  empire: "Empire",
  culture: "Culture",
  trade: "Trade",
  religion: "Religion",
  other: "Other",
  city: "City",
  person: "Person",
  institution: "Institution",
  frontier: "Frontier",
  province: "Province",
};

export const historicalMapCategoryClasses: Record<HistoricalMapCategory, string> = {
  battle: "border-ember/70 bg-ember text-white",
  politics: "border-brass/70 bg-brass text-ink",
  empire: "border-verdigris/70 bg-verdigris text-white",
  culture: "border-[#8fa7ff]/70 bg-[#8fa7ff] text-ink",
  trade: "border-[#90c978]/70 bg-[#90c978] text-ink",
  religion: "border-[#c48bdd]/70 bg-[#c48bdd] text-ink",
  other: "border-bone/70 bg-bone text-ink",
  city: "border-[#e6d0a0]/80 bg-[#e6d0a0] text-ink",
  person: "border-[#f3a889]/80 bg-[#f3a889] text-ink",
  institution: "border-[#b8c0d8]/80 bg-[#b8c0d8] text-ink",
  frontier: "border-[#76b7a8]/80 bg-[#76b7a8] text-ink",
  province: "border-[#d5a86d]/80 bg-[#d5a86d] text-ink",
};
