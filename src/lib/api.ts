export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!API_BASE_URL) {
    return `/api${normalizedPath}`;
  }

  return `${API_BASE_URL.replace(/\/$/, "")}${normalizedPath}`;
}
