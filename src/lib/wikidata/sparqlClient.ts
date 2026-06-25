const WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql";

type SparqlBinding = Record<string, { value: string }>;

type SparqlResponse = {
  results: {
    bindings: SparqlBinding[];
  };
};

export async function runSparqlQuery<T>(query: string): Promise<T[]> {
  const url = `${WIKIDATA_ENDPOINT}?query=${encodeURIComponent(query)}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": "ChronosAI/0.1 (https://github.com/SuyashSalvi/Chronos-AI)",
    },
  });

  if (!res.ok) {
    throw new Error(`Wikidata query failed: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as SparqlResponse;

  return json.results.bindings.map((row) => {
    const parsed: Record<string, string> = {};

    for (const key of Object.keys(row)) {
      parsed[key] = row[key].value;
    }

    return parsed as T;
  });
}
