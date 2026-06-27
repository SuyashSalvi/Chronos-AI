import {
  historicalMapCategories,
  historicalMapRecordTypes,
  type HistoricalMapMarker,
  type HistoricalMapPage,
  type HistoricalMapQuery,
} from "./types";

const scenarioId = "00000000-0000-0000-0000-000000000001";
const scenarioName = "Roman Empire";

const anchorMarkers: HistoricalMapMarker[] = [
  {
    markerId: "map-event-rome-founded",
    recordType: "event",
    recordId: "00000000-0000-0000-0000-000000000101",
    name: "Traditional Founding of Rome",
    description: "Roman tradition later dates the founding of the city to the mid-eighth century BCE.",
    category: "culture",
    startYear: -753,
    scenarioId,
    scenarioName,
    latitude: 41.9028,
    longitude: 12.4964,
    location: "Rome",
    relatedNames: ["Rome", "Romulus"],
  },
  {
    markerId: "map-event-punic-war",
    recordType: "event",
    recordId: "00000000-0000-0000-0000-000000000103",
    name: "First Punic War Begins",
    description: "Rome and Carthage begin a long struggle for Sicily and western Mediterranean power.",
    category: "battle",
    startYear: -264,
    scenarioId,
    scenarioName,
    latitude: 37.599,
    longitude: 14.0154,
    location: "Sicily",
    relatedNames: ["Rome", "Carthage"],
  },
  {
    markerId: "map-event-caesar",
    recordType: "event",
    recordId: "00000000-0000-0000-0000-000000000104",
    name: "Assassination of Julius Caesar",
    description: "A senatorial conspiracy kills Caesar and accelerates the Republic's political collapse.",
    category: "politics",
    startYear: -44,
    scenarioId,
    scenarioName,
    latitude: 41.8955,
    longitude: 12.4769,
    location: "Theatre of Pompey, Rome",
    relatedNames: ["Julius Caesar", "Senate"],
  },
  {
    markerId: "map-event-actium",
    recordType: "event",
    recordId: "actium",
    name: "Battle of Actium",
    description: "Octavian defeats Antony and Cleopatra, clearing the path for imperial rule.",
    category: "battle",
    startYear: -31,
    scenarioId,
    scenarioName,
    latitude: 38.95,
    longitude: 20.75,
    location: "Actium",
    relatedNames: ["Octavian", "Mark Antony", "Cleopatra"],
  },
  {
    markerId: "map-event-constantinople",
    recordType: "event",
    recordId: "00000000-0000-0000-0000-000000000106",
    name: "Constantinople Dedicated",
    description: "Constantine establishes a new eastern capital that anchors imperial power for centuries.",
    category: "empire",
    startYear: 330,
    scenarioId,
    scenarioName,
    latitude: 41.0082,
    longitude: 28.9784,
    location: "Constantinople",
    relatedNames: ["Constantine", "Constantinople"],
  },
  {
    markerId: "map-event-adrianople",
    recordType: "event",
    recordId: "00000000-0000-0000-0000-000000000107",
    name: "Battle of Adrianople",
    description: "Gothic forces defeat the eastern Roman army, exposing frontier and military pressure.",
    category: "battle",
    startYear: 378,
    scenarioId,
    scenarioName,
    latitude: 41.6771,
    longitude: 26.5557,
    location: "Adrianople",
    relatedNames: ["Valens", "Goths"],
  },
  {
    markerId: "map-entity-rome",
    recordType: "entity",
    recordId: "rome",
    name: "Rome",
    description: "Capital city and symbolic center of Roman political, cultural, and imperial life.",
    category: "city",
    startYear: -753,
    scenarioId,
    scenarioName,
    latitude: 41.9028,
    longitude: 12.4964,
    location: "Italian Peninsula",
  },
  {
    markerId: "map-entity-carthage",
    recordType: "entity",
    recordId: "carthage",
    name: "Carthage",
    description: "North African maritime power and Rome's major western Mediterranean rival.",
    category: "city",
    startYear: -814,
    endYear: -146,
    scenarioId,
    scenarioName,
    latitude: 36.8529,
    longitude: 10.3231,
    location: "North Africa",
  },
  {
    markerId: "map-entity-alexandria",
    recordType: "entity",
    recordId: "alexandria",
    name: "Alexandria",
    description: "Major Mediterranean city, trade hub, and center of scholarship under Roman rule.",
    category: "city",
    startYear: -331,
    scenarioId,
    scenarioName,
    latitude: 31.2001,
    longitude: 29.9187,
    location: "Egypt",
  },
  {
    markerId: "map-entity-rhine-frontier",
    recordType: "entity",
    recordId: "rhine-frontier",
    name: "Rhine Frontier",
    description: "A major imperial military frontier linking forts, river crossings, and campaigns.",
    category: "frontier",
    startYear: -50,
    endYear: 476,
    scenarioId,
    scenarioName,
    latitude: 50.9375,
    longitude: 6.9603,
    location: "Lower Rhine",
  },
  {
    markerId: "map-entity-antioch",
    recordType: "entity",
    recordId: "antioch",
    name: "Antioch",
    description: "Eastern imperial city connecting Mediterranean administration and Near Eastern routes.",
    category: "city",
    startYear: -300,
    scenarioId,
    scenarioName,
    latitude: 36.2021,
    longitude: 36.1604,
    location: "Syria",
  },
  {
    markerId: "map-entity-hispania",
    recordType: "entity",
    recordId: "hispania",
    name: "Hispania",
    description: "Roman provinces in the Iberian Peninsula, important for mining, cities, and recruitment.",
    category: "province",
    startYear: -218,
    endYear: 476,
    scenarioId,
    scenarioName,
    latitude: 40.4168,
    longitude: -3.7038,
    location: "Iberian Peninsula",
  },
];

const generatedPlaces = [
  { name: "Lugdunum", latitude: 45.764, longitude: 4.8357, location: "Gaul" },
  { name: "Massilia", latitude: 43.2965, longitude: 5.3698, location: "Southern Gaul" },
  { name: "Eboracum", latitude: 53.959, longitude: -1.0815, location: "Britannia" },
  { name: "Tarraco", latitude: 41.1189, longitude: 1.2445, location: "Hispania" },
  { name: "Aquileia", latitude: 45.7686, longitude: 13.3678, location: "Northern Italy" },
  { name: "Sirmium", latitude: 44.9764, longitude: 19.6122, location: "Danube Frontier" },
  { name: "Nicomedia", latitude: 40.7654, longitude: 29.9408, location: "Bithynia" },
  { name: "Jerusalem", latitude: 31.7683, longitude: 35.2137, location: "Judea" },
  { name: "Leptis Magna", latitude: 32.6392, longitude: 14.2939, location: "North Africa" },
  { name: "Ravenna", latitude: 44.4184, longitude: 12.2035, location: "Italy" },
];

function generatedMarker(index: number): HistoricalMapMarker {
  const place = generatedPlaces[index % generatedPlaces.length];
  const category = historicalMapCategories[index % 7];
  const startYear = -300 + index * 12;

  return {
    markerId: `map-generated-${index.toString().padStart(4, "0")}`,
    recordType: index % 4 === 0 ? "entity" : "event",
    recordId: `generated-map-record-${index}`,
    name: `${place.name} ${category} record`,
    description:
      "Server-side mock marker used to exercise bounded map loading, filters, and cursor pagination without shipping a large client fixture.",
    category,
    startYear,
    scenarioId,
    scenarioName,
    latitude: place.latitude + ((index % 5) - 2) * 0.28,
    longitude: place.longitude + ((index % 7) - 3) * 0.34,
    location: place.location,
    relatedNames: ["Roman Empire"],
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

function isInBounds(marker: HistoricalMapMarker, query: HistoricalMapQuery) {
  if (!query.bounds) {
    return true;
  }

  const { west, south, east, north } = query.bounds;
  return marker.longitude >= west && marker.longitude <= east && marker.latitude >= south && marker.latitude <= north;
}

function isInYearRange(marker: HistoricalMapMarker, query: HistoricalMapQuery) {
  const startYear = query.startYear ?? -800;
  const endYear = query.endYear ?? 500;
  const markerStart = marker.startYear ?? startYear;
  const markerEnd = marker.endYear ?? markerStart;

  return markerStart <= endYear && markerEnd >= startYear;
}

export function getMockHistoricalMapPage(query: HistoricalMapQuery): HistoricalMapPage {
  const limit = Math.min(Math.max(query.limit ?? 80, 1), 150);
  const offset = decodeCursor(query.cursor);
  const recordTypes = query.recordTypes?.length ? new Set(query.recordTypes) : new Set(historicalMapRecordTypes);
  const categories = query.categories?.length ? new Set(query.categories) : undefined;
  const search = query.query?.trim().toLowerCase();
  const generatedCount = 140;

  const allMarkers = [
    ...anchorMarkers,
    ...Array.from({ length: generatedCount }, (_, index) => generatedMarker(index)),
  ]
    .filter((marker) => recordTypes.has(marker.recordType))
    .filter((marker) => !categories || categories.has(marker.category))
    .filter((marker) => isInYearRange(marker, query))
    .filter((marker) => isInBounds(marker, query))
    .filter((marker) => {
      if (!search) {
        return true;
      }

      return (
        marker.name.toLowerCase().includes(search) ||
        marker.description.toLowerCase().includes(search) ||
        marker.location?.toLowerCase().includes(search) ||
        marker.relatedNames?.some((name) => name.toLowerCase().includes(search))
      );
    })
    .sort((a, b) => (a.startYear ?? 0) - (b.startYear ?? 0) || a.name.localeCompare(b.name));

  const markers = allMarkers.slice(offset, offset + limit);
  const nextOffset = offset + markers.length;

  return {
    markers,
    nextCursor: nextOffset < allMarkers.length ? encodeCursor(nextOffset) : undefined,
    totalApprox: allMarkers.length,
  };
}
