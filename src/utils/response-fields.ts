import { getOperationMap } from "../openapi/index.js";

type JsonSchema = Record<string, unknown>;

export type ResponseFieldMap = Record<string, string[]>;

/**
 * For a given operation, extract the available response fields
 * from its success (2xx) response schema in the OpenAPI spec.
 *
 * Returns a map: { topLevelKey: [propertyName, ...], ... }
 * e.g., { stories: ["id", "name", "slug", "content", ...] }
 *
 * Returns undefined if no parseable response schema exists.
 */
export function getResponseFields(
  operationId: string
): ResponseFieldMap | undefined {
  const op = getOperationMap().get(operationId);
  if (!op) return undefined;

  const responses = op.schema.responses as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (!responses) return undefined;

  const successCode = Object.keys(responses).find((c) =>
    c.startsWith("2")
  );
  if (!successCode) return undefined;

  const content = responses[successCode]?.content as
    | Record<string, Record<string, unknown>>
    | undefined;
  const schema = content?.["application/json"]?.schema as
    | JsonSchema
    | undefined;
  if (!schema) return undefined;

  if (schema.type !== "object" || !schema.properties) return undefined;

  const properties = schema.properties as Record<string, JsonSchema>;
  const fieldMap: ResponseFieldMap = {};

  for (const [key, propSchema] of Object.entries(properties)) {
    const subFields = extractPropertyNames(propSchema);
    fieldMap[key] = subFields ?? [];
  }

  return Object.keys(fieldMap).length > 0 ? fieldMap : undefined;
}

/**
 * Given a property schema, return the direct property names.
 * Handles inline objects and arrays of objects.
 * ($refs are not present after dereference.)
 */
function extractPropertyNames(schema: JsonSchema): string[] | null {
  // Array with object items
  if (schema.type === "array" && schema.items) {
    const items = schema.items as JsonSchema;
    if (items.type === "object" && items.properties) {
      return Object.keys(items.properties as Record<string, unknown>);
    }
    return null;
  }

  // Inline object with properties
  if (schema.type === "object" && schema.properties) {
    return Object.keys(schema.properties as Record<string, unknown>);
  }

  return null;
}
