import { getPool } from "../shared/db";
import { jsonResponse, methodNotAllowed, serverError } from "../shared/response";

type ApiGatewayEvent = {
  body?: string | null;
  httpMethod?: string;
  isBase64Encoded?: boolean;
  path?: string;
  rawPath?: string;
  pathParameters?: Record<string, string | undefined> | null;
  requestContext?: {
    http?: {
      method?: string;
      path?: string;
    };
  };
};

type LoadScenarioBody = {
  scenarioId?: string;
  scenario_id?: string;
  name?: string;
};

const scenarioFields = `
  scenario_id,
  name,
  description,
  start_year,
  end_year,
  created_at
`;

const entityFields = `
  entity_id,
  scenario_id,
  name,
  entity_type,
  summary,
  wikipedia_summary,
  wikipedia_url,
  wikipedia_thumbnail,
  latitude,
  longitude,
  start_year,
  end_year
`;

const eventFields = `
  event_id,
  scenario_id,
  name,
  description,
  event_type,
  start_year,
  end_year,
  latitude,
  longitude,
  source_url,
  wikipedia_summary,
  wikipedia_url,
  wikipedia_thumbnail
`;

function getMethod(event: ApiGatewayEvent) {
  return event.requestContext?.http?.method ?? event.httpMethod ?? "GET";
}

function getPath(event: ApiGatewayEvent) {
  return event.requestContext?.http?.path ?? event.rawPath ?? event.path ?? "";
}

function routePath(path: string) {
  const marker = "/prod";
  return path.startsWith(marker) ? path.slice(marker.length) || "/" : path;
}

function readBody(event: ApiGatewayEvent): LoadScenarioBody {
  if (!event.body) return {};

  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;

    return JSON.parse(rawBody) as LoadScenarioBody;
  } catch {
    return {};
  }
}

async function listScenarios() {
  console.log("Starting scenarios query");
  const startedAt = Date.now();
  const result = await getPool().query(
    `
    SELECT ${scenarioFields}
    FROM scenarios
    ORDER BY name
    `
  );
  console.log("Scenarios query complete", { rowCount: result.rowCount, durationMs: Date.now() - startedAt });

  return result.rows;
}

async function getScenarioById(scenarioId: string) {
  const result = await getPool().query(
    `
    SELECT ${scenarioFields}
    FROM scenarios
    WHERE scenario_id = $1
    `,
    [scenarioId]
  );

  return result.rows[0] ?? null;
}

async function getScenarioByName(name: string) {
  const result = await getPool().query(
    `
    SELECT ${scenarioFields}
    FROM scenarios
    WHERE name ILIKE $1
    ORDER BY name
    LIMIT 1
    `,
    [name]
  );

  return result.rows[0] ?? null;
}

async function loadScenarioData(scenarioId: string) {
  const [scenario, entities, events, relationships] = await Promise.all([
    getScenarioById(scenarioId),
    getPool().query(
      `
      SELECT ${entityFields}
      FROM entities
      WHERE scenario_id = $1
      ORDER BY name
      `,
      [scenarioId]
    ),
    getPool().query(
      `
      SELECT ${eventFields}
      FROM events
      WHERE scenario_id = $1
      ORDER BY start_year NULLS LAST, name
      `,
      [scenarioId]
    ),
    getPool().query(
      `
      SELECT
        r.relationship_id,
        r.scenario_id,
        r.source_entity_id,
        source.name AS source_name,
        r.target_entity_id,
        target.name AS target_name,
        r.relationship_type,
        r.start_year,
        r.end_year,
        r.confidence_score,
        r.source_metadata
      FROM relationships r
      JOIN entities source ON source.entity_id = r.source_entity_id
      JOIN entities target ON target.entity_id = r.target_entity_id
      WHERE r.scenario_id = $1
      ORDER BY r.relationship_type, source.name, target.name
      `,
      [scenarioId]
    ),
  ]);

  if (!scenario) return null;

  return {
    scenario,
    entities: entities.rows,
    events: events.rows,
    relationships: relationships.rows,
  };
}

async function handleLoad(event: ApiGatewayEvent) {
  const body = readBody(event);
  let scenarioId = body.scenarioId ?? body.scenario_id;

  if (!scenarioId && body.name) {
    const scenario = await getScenarioByName(body.name);
    scenarioId = scenario?.scenario_id;
  }

  if (!scenarioId) {
    const [firstScenario] = await listScenarios();
    scenarioId = firstScenario?.scenario_id;
  }

  if (!scenarioId) return jsonResponse(404, { error: "No scenarios available" });

  const data = await loadScenarioData(scenarioId);
  if (!data) return jsonResponse(404, { error: "Scenario not found" });

  return jsonResponse(200, data);
}

export async function handler(event: ApiGatewayEvent) {
  const method = getMethod(event);
  const path = routePath(getPath(event));
  const id = event.pathParameters?.id;

  if (method === "OPTIONS") return jsonResponse(200, {});

  try {
    if (path.endsWith("/load")) {
      if (method !== "POST") return methodNotAllowed();
      return await handleLoad(event);
    }

    if (method !== "GET") return methodNotAllowed();

    if (id) {
      const scenario = await getScenarioById(id);
      if (!scenario) return jsonResponse(404, { error: "Scenario not found" });
      return jsonResponse(200, { scenario });
    }

    return jsonResponse(200, { scenarios: await listScenarios() });
  } catch (error) {
    return serverError(error);
  }
}
