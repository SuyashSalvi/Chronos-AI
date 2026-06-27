import {
  timelineEventTypes,
  type TimelineEventSummary,
  type TimelineEventType,
  type TimelinePage,
  type TimelineQuery,
  type TimelineYearBucket,
} from "./types";

const scenarioId = "00000000-0000-0000-0000-000000000001";
const scenarioName = "Roman Empire";
const minYear = -753;
const maxYear = 476;
const generatedStep = 5;

const anchorEvents: TimelineEventSummary[] = [
  {
    eventId: "00000000-0000-0000-0000-000000000101",
    name: "Traditional Founding of Rome",
    startYear: -753,
    description: "Roman tradition later dates the founding of the city to the mid-eighth century BCE.",
    eventType: "culture",
    scenarioId,
    scenarioName,
    location: "Rome",
    involvedEntities: [
      { entityId: "rome", name: "Rome", entityType: "city" },
      { entityId: "romulus", name: "Romulus", entityType: "person" },
    ],
  },
  {
    eventId: "00000000-0000-0000-0000-000000000102",
    name: "Roman Republic Established",
    startYear: -509,
    description: "Rome replaces monarchy with republican institutions that shape centuries of expansion.",
    eventType: "politics",
    scenarioId,
    scenarioName,
    location: "Rome",
    involvedEntities: [
      { entityId: "republic", name: "Roman Republic", entityType: "empire" },
      { entityId: "senate", name: "Senate", entityType: "institution" },
    ],
  },
  {
    eventId: "00000000-0000-0000-0000-000000000103",
    name: "First Punic War Begins",
    startYear: -264,
    description: "Rome and Carthage begin a long struggle for Sicily and western Mediterranean power.",
    eventType: "battle",
    scenarioId,
    scenarioName,
    location: "Sicily",
    involvedEntities: [
      { entityId: "rome", name: "Rome", entityType: "city" },
      { entityId: "carthage", name: "Carthage", entityType: "city" },
    ],
  },
  {
    eventId: "00000000-0000-0000-0000-000000000104",
    name: "Assassination of Julius Caesar",
    startYear: -44,
    description: "A senatorial conspiracy kills Caesar and accelerates the Republic's political collapse.",
    eventType: "politics",
    scenarioId,
    scenarioName,
    location: "Rome",
    involvedEntities: [
      { entityId: "caesar", name: "Julius Caesar", entityType: "person" },
      { entityId: "senate", name: "Senate", entityType: "institution" },
    ],
  },
  {
    eventId: "00000000-0000-0000-0000-000000000105",
    name: "Augustus Becomes Princeps",
    startYear: -27,
    description: "Octavian consolidates imperial authority while preserving republican language and offices.",
    eventType: "empire",
    scenarioId,
    scenarioName,
    location: "Rome",
    involvedEntities: [
      { entityId: "augustus", name: "Augustus", entityType: "person" },
      { entityId: "roman-empire", name: "Roman Empire", entityType: "empire" },
    ],
  },
  {
    eventId: "00000000-0000-0000-0000-000000000106",
    name: "Constantinople Dedicated",
    startYear: 330,
    description: "Constantine establishes a new eastern capital that anchors imperial power for centuries.",
    eventType: "empire",
    scenarioId,
    scenarioName,
    location: "Constantinople",
    involvedEntities: [
      { entityId: "constantine", name: "Constantine", entityType: "person" },
      { entityId: "constantinople", name: "Constantinople", entityType: "city" },
    ],
  },
  {
    eventId: "00000000-0000-0000-0000-000000000107",
    name: "Battle of Adrianople",
    startYear: 378,
    description: "Gothic forces defeat the eastern Roman army, exposing frontier and military pressure.",
    eventType: "battle",
    scenarioId,
    scenarioName,
    location: "Adrianople",
    involvedEntities: [
      { entityId: "valens", name: "Valens", entityType: "person" },
      { entityId: "goths", name: "Goths", entityType: "people" },
    ],
  },
  {
    eventId: "00000000-0000-0000-0000-000000000108",
    name: "Deposition of Romulus Augustulus",
    startYear: 476,
    description: "Odoacer deposes the western emperor, conventionally marking the Western Empire's end.",
    eventType: "empire",
    scenarioId,
    scenarioName,
    location: "Ravenna",
    involvedEntities: [
      { entityId: "romulus-augustulus", name: "Romulus Augustulus", entityType: "person" },
      { entityId: "odoacer", name: "Odoacer", entityType: "person" },
    ],
  },
];

function generatedEvent(index: number): TimelineEventSummary {
  const eventType = timelineEventTypes[index % (timelineEventTypes.length - 1)];
  const startYear = minYear + index * generatedStep;
  const labelByType: Record<TimelineEventType, string> = {
    battle: "Frontier Campaign",
    politics: "Administrative Reform",
    empire: "Province Reorganized",
    culture: "Public Monument Dedicated",
    trade: "Mediterranean Route Expanded",
    religion: "Religious Council Convened",
    other: "Historical Event",
  };

  return {
    eventId: `sample-${index.toString().padStart(5, "0")}`,
    name: `${labelByType[eventType]} ${startYear < 0 ? `${Math.abs(startYear)} BCE` : `${startYear} CE`}`,
    startYear,
    description:
      "Mock event generated on the server to exercise paginated timeline rendering without shipping a huge fixture to the client.",
    eventType,
    scenarioId,
    scenarioName,
    location: index % 2 === 0 ? "Western Mediterranean" : "Eastern Provinces",
    involvedEntities: [
      { entityId: "roman-empire", name: "Roman Empire", entityType: "empire" },
      { entityId: "legions", name: "Legions", entityType: "military" },
    ],
  };
}

function decodeCursor(cursor?: string) {
  if (!cursor) {
    return 0;
  }

  const parsed = Number(Buffer.from(cursor, "base64url").toString("utf8"));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function encodeCursor(offset: number) {
  return Buffer.from(String(offset), "utf8").toString("base64url");
}

export function getMockTimelinePage(query: TimelineQuery): TimelinePage {
  const limit = Math.min(Math.max(query.limit ?? 40, 1), 100);
  const offset = decodeCursor(query.cursor);
  const startYear = query.startYear ?? minYear;
  const endYear = query.endYear ?? maxYear;
  const eventTypes = query.eventTypes?.length ? new Set(query.eventTypes) : undefined;
  const search = query.query?.trim().toLowerCase();
  const generatedCount = Math.floor((maxYear - minYear) / generatedStep) + 1;
  const allEvents = [...anchorEvents, ...Array.from({ length: generatedCount }, (_, index) => generatedEvent(index))]
    .filter((event) => event.startYear >= startYear && event.startYear <= endYear)
    .filter((event) => !eventTypes || eventTypes.has(event.eventType))
    .filter((event) => {
      if (!search) {
        return true;
      }

      return (
        event.name.toLowerCase().includes(search) ||
        event.description.toLowerCase().includes(search) ||
        event.location?.toLowerCase().includes(search) ||
        event.involvedEntities.some((entity) => entity.name.toLowerCase().includes(search))
      );
    })
    .sort((a, b) => a.startYear - b.startYear || a.name.localeCompare(b.name));

  const events = allEvents.slice(offset, offset + limit);
  const nextOffset = offset + events.length;

  return {
    events,
    nextCursor: nextOffset < allEvents.length ? encodeCursor(nextOffset) : undefined,
    totalApprox: allEvents.length,
    yearBuckets: buildYearBuckets(allEvents),
  };
}

function buildYearBuckets(events: TimelineEventSummary[]): TimelineYearBucket[] {
  const counts = new Map<number, number>();

  for (const event of events) {
    const bucketYear = Math.floor(event.startYear / 50) * 50;
    counts.set(bucketYear, (counts.get(bucketYear) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, count]) => ({ year, count }));
}
