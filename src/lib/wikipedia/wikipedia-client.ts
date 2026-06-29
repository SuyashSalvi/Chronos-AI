const WIKIPEDIA_SUMMARY_ENDPOINT = "https://en.wikipedia.org/api/rest_v1/page/summary";
const USER_AGENT = "ChronosAI/0.1 (https://github.com/SuyashSalvi/Chronos-AI)";

export type WikipediaArticle = {
  title: string;
  description?: string;
  extract?: string;
  content_urls?: {
    desktop?: {
      page?: string;
    };
  };
  thumbnail?: {
    source?: string;
  };
};

export class WikipediaNotFoundError extends Error {
  constructor(title: string) {
    super(`Wikipedia article not found: ${title}`);
    this.name = "WikipediaNotFoundError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getArticleUrl(title: string): string {
  const normalizedTitle = title.trim().replace(/\s+/g, "_");
  return `${WIKIPEDIA_SUMMARY_ENDPOINT}/${encodeURIComponent(normalizedTitle)}`;
}

async function fetchWithRetry(url: string, title: string, attempt = 1): Promise<Response> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
  });

  if (response.status === 404) {
    throw new WikipediaNotFoundError(title);
  }

  if ((response.status === 429 || response.status >= 500) && attempt < 4) {
    await sleep(250 * attempt);
    return fetchWithRetry(url, title, attempt + 1);
  }

  if (!response.ok) {
    throw new Error(`Wikipedia request failed for "${title}": ${response.status} ${response.statusText}`);
  }

  return response;
}

export async function getArticle(title: string): Promise<WikipediaArticle | null> {
  try {
    const response = await fetchWithRetry(getArticleUrl(title), title);
    return (await response.json()) as WikipediaArticle;
  } catch (err) {
    if (err instanceof WikipediaNotFoundError) {
      return null;
    }

    throw err;
  }
}

export async function getSummary(title: string): Promise<string | null> {
  const article = await getArticle(title);
  return article?.extract ?? null;
}

export async function getThumbnail(title: string): Promise<string | null> {
  const article = await getArticle(title);
  return article?.thumbnail?.source ?? null;
}
