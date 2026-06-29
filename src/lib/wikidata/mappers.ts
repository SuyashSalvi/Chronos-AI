export function getWikidataId(uri: string): string {
  return uri.split("/").pop() ?? uri;
}

export function parseYear(date?: string): number | null {
  if (!date) return null;

  const match = date.match(/^(-?\d+)/);
  if (!match) return null;

  return Number(match[1]);
}

export function parsePoint(coord?: string): { latitude: number | null; longitude: number | null } {
  if (!coord) return { latitude: null, longitude: null };

  const match = coord.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
  if (!match) return { latitude: null, longitude: null };

  return {
    longitude: Number(match[1]),
    latitude: Number(match[2]),
  };
}

export function inferEntityType(name: string, description?: string): string {
  const lower = name.toLowerCase();
  const lowerDescription = description?.toLowerCase() ?? "";

  if (lower.includes("empire")) return "empire";
  if (lower.includes("dynasty")) return "dynasty";
  if (
    lower.includes("province") ||
    ["roman britain", "roman gaul", "hispania", "roman egypt", "judaea", "macedonia", "asia"].includes(lower)
  ) {
    return "province";
  }
  if (
    lower.includes("rome") ||
    lower.includes("constantinople") ||
    lower.includes("carthage") ||
    lowerDescription.includes("city")
  ) {
    return "city";
  }
  if (
    lowerDescription.includes("roman emperor") ||
    lowerDescription.includes("emperor of the roman") ||
    ["julius caesar", "augustus", "constantine the great", "romulus augustus", "romulus augustulus"].includes(lower)
  ) {
    return "person";
  }

  return "group";
}

export function inferEventType(name: string): string {
  const lower = name.toLowerCase();

  if (lower.includes("battle")) return "battle";
  if (lower.includes("war")) return "war";
  if (lower.includes("sack")) return "invasion";
  if (lower.includes("fall")) return "collapse";
  if (lower.includes("crisis")) return "crisis";

  return "event";
}
