type JsonValue = Record<string, unknown> | unknown[];

const defaultHeaders = {
  "access-control-allow-origin": process.env.CORS_ORIGIN ?? "*",
  "access-control-allow-headers": "content-type,authorization",
  "access-control-allow-methods": "GET,OPTIONS",
  "content-type": "application/json",
};

export function jsonResponse(statusCode: number, body: JsonValue) {
  return {
    statusCode,
    headers: defaultHeaders,
    body: JSON.stringify(body),
  };
}

export function methodNotAllowed() {
  return jsonResponse(405, { error: "Method not allowed" });
}

export function serverError(error: unknown) {
  console.error(error);
  return jsonResponse(500, { error: "Internal server error" });
}
