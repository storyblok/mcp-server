import { z, type ZodTypeAny, type SafeParseReturnType } from "zod";
import { STORYBLOK_OPENAPI } from "../openapi/index.js";

type JsonSchema = Record<string, unknown>;

/**
 * Resolve a $ref pointer to the actual schema from components
 */
function resolveRef(ref: string): JsonSchema | null {
  const match = ref.match(/^#\/components\/schemas\/(.+)$/);
  if (!match) return null;
  const components = (STORYBLOK_OPENAPI as { components?: { schemas?: Record<string, JsonSchema> } }).components;
  return components?.schemas?.[match[1]] ?? null;
}

/**
 * Convert JSON Schema to Zod schema (minimal implementation for Storyblok API)
 */
function jsonSchemaToZod(schema: JsonSchema): ZodTypeAny {
  // Handle $ref
  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref as string);
    if (resolved) return jsonSchemaToZod(resolved);
  }

  // Handle type
  const type = schema.type;

  // Handle nullable via array type: ["string", "null"]
  if (Array.isArray(type)) {
    const nonNullType = type.find((t) => t !== "null");
    if (nonNullType && type.includes("null")) {
      const baseSchema = jsonSchemaToZod({ ...schema, type: nonNullType });
      return baseSchema.nullable();
    }
  }

  // Build base schema by type
  let zodSchema: ZodTypeAny;

  switch (type) {
    case "string":
      zodSchema = z.string();
      if (schema.minLength) zodSchema = (zodSchema as z.ZodString).min(schema.minLength as number);
      if (schema.maxLength) zodSchema = (zodSchema as z.ZodString).max(schema.maxLength as number);
      if (schema.pattern) zodSchema = (zodSchema as z.ZodString).regex(new RegExp(schema.pattern as string));
      if (schema.format === "email") zodSchema = (zodSchema as z.ZodString).email();
      if (schema.format === "url" || schema.format === "uri") zodSchema = (zodSchema as z.ZodString).url();
      break;

    case "number":
      zodSchema = z.number();
      if (schema.minimum !== undefined) zodSchema = (zodSchema as z.ZodNumber).min(schema.minimum as number);
      if (schema.maximum !== undefined) zodSchema = (zodSchema as z.ZodNumber).max(schema.maximum as number);
      break;

    case "integer":
      zodSchema = z.number().int();
      if (schema.minimum !== undefined) zodSchema = (zodSchema as z.ZodNumber).min(schema.minimum as number);
      if (schema.maximum !== undefined) zodSchema = (zodSchema as z.ZodNumber).max(schema.maximum as number);
      break;

    case "boolean":
      zodSchema = z.boolean();
      break;

    case "array":
      if (schema.items) {
        const itemSchema = jsonSchemaToZod(schema.items as JsonSchema);
        zodSchema = z.array(itemSchema);
      } else {
        zodSchema = z.array(z.unknown());
      }
      break;

    case "object":
      if (schema.properties) {
        const shape: Record<string, ZodTypeAny> = {};
        const properties = schema.properties as Record<string, JsonSchema>;
        const required = (schema.required as string[]) || [];

        for (const [key, propSchema] of Object.entries(properties)) {
          let propZodSchema = jsonSchemaToZod(propSchema);
          if (!required.includes(key)) {
            propZodSchema = propZodSchema.optional();
          }
          shape[key] = propZodSchema;
        }

        zodSchema = z.object(shape);
        if (schema.additionalProperties !== false) {
          zodSchema = (zodSchema as z.ZodObject<any>).passthrough();
        }
      } else {
        zodSchema = z.record(z.unknown());
      }
      break;

    default:
      zodSchema = z.unknown();
  }

  // Handle enum
  if (schema.enum && Array.isArray(schema.enum)) {
    const enumValues = schema.enum as [string, ...string[]];
    zodSchema = z.enum(enumValues);
  }

  return zodSchema;
}

/**
 * Validate a value against a JSON Schema (from OpenAPI spec)
 */
export function validateSchema(
  schema: unknown,
  value: unknown
): SafeParseReturnType<unknown, unknown> {
  if (!schema) {
    return { success: true, data: value };
  }

  let resolvedSchema = schema as JsonSchema;

  // Resolve $ref if present
  if (resolvedSchema.$ref) {
    const resolved = resolveRef(resolvedSchema.$ref as string);
    if (!resolved) {
      return { success: true, data: value };
    }
    resolvedSchema = resolved;
  }

  try {
    const zodSchema = jsonSchemaToZod(resolvedSchema);
    return zodSchema.safeParse(value);
  } catch {
    // If schema conversion fails, allow the value through
    // (let the API handle validation)
    return { success: true, data: value };
  }
}

/**
 * Format Zod validation errors into user-friendly messages
 */
export function formatValidationErrors(
  result: SafeParseReturnType<unknown, unknown>,
  paramName: string
): string[] {
  if (result.success) return [];

  return result.error.errors.map((err) => {
    const path = err.path.length > 0 ? `${paramName}.${err.path.join(".")}` : paramName;
    return `${path}: ${err.message}`;
  });
}
