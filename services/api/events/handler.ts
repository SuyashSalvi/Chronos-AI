import { jsonResponse } from "../shared/response";

export async function handler() {
  return jsonResponse(501, {
    error: "Events Lambda is not implemented yet. Use the Next.js API route during migration.",
  });
}
