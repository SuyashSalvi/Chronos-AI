import { getPool } from "../shared/db";
import { jsonResponse, methodNotAllowed, serverError } from "../shared/response";

type ApiGatewayEvent = {
  httpMethod?: string;
  requestContext?: {
    http?: {
      method?: string;
    };
  };
};

function getMethod(event: ApiGatewayEvent) {
  return event.requestContext?.http?.method ?? event.httpMethod ?? "GET";
}

export async function handler(event: ApiGatewayEvent) {
  const method = getMethod(event);

  if (method === "OPTIONS") {
    return jsonResponse(200, {});
  }

  if (method !== "GET") {
    return methodNotAllowed();
  }

  try {
    console.log("Starting entities query");
    const startedAt = Date.now();
    const result = await getPool().query(
      `
      SELECT
        entity_id,
        name,
        entity_type,
        wikipedia_summary,
        wikipedia_url
      FROM entities
      ORDER BY name
      LIMIT 100
      `
    );
    console.log("Entities query complete", {
      rowCount: result.rowCount,
      durationMs: Date.now() - startedAt,
    });

    return jsonResponse(200, { entities: result.rows });
  } catch (error) {
    return serverError(error);
  }
}
