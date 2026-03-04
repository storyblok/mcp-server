export type PickFieldsResult =
  | { success: true; data: unknown }
  | { success: false; error: string; invalidFields: string[] };

/**
 * Filter response data to include only the requested fields.
 *
 * Supports:
 * - Top-level keys: "stories" keeps the entire `stories` value
 * - Nested fields: "stories.name" keeps only `name` on each element
 *   (if `stories` is an array, filters each element; if object, filters the object)
 *
 * Returns data unchanged when `fields` is undefined/empty.
 * Returns an error if any requested fields don't exist in the response.
 */
export function pickFields(
  data: unknown,
  fields?: string[]
): PickFieldsResult {
  if (!fields || fields.length === 0) return { success: true, data };
  if (typeof data !== "object" || data === null) return { success: true, data };

  const record = data as Record<string, unknown>;

  // Parse fields into a map: { topLevelKey: string[] | null }
  // null means "keep entire value" (bare top-level key with no dot)
  const fieldMap = new Map<string, string[] | null>();

  for (const field of fields) {
    const dotIndex = field.indexOf(".");
    if (dotIndex === -1) {
      fieldMap.set(field, null);
    } else {
      const topKey = field.substring(0, dotIndex);
      const subField = field.substring(dotIndex + 1);
      const existing = fieldMap.get(topKey);
      // Don't overwrite null (which means "keep everything")
      if (existing === null) continue;
      if (existing) {
        existing.push(subField);
      } else {
        fieldMap.set(topKey, [subField]);
      }
    }
  }

  // Validate that all requested top-level keys exist
  const invalidFields: string[] = [];
  for (const [key, subFields] of fieldMap) {
    if (!(key in record)) {
      if (subFields === null) {
        invalidFields.push(key);
      } else {
        invalidFields.push(...subFields.map((sf) => `${key}.${sf}`));
      }
      continue;
    }

    // Validate sub-fields exist across a sample of elements (for arrays) or on the object
    if (subFields !== null) {
      const value = record[key];
      const samples = Array.isArray(value) ? value.slice(0, 10) : [value];
      const knownKeys = new Set<string>();
      for (const sample of samples) {
        if (typeof sample === "object" && sample !== null) {
          for (const k of Object.keys(sample as Record<string, unknown>)) {
            knownKeys.add(k);
          }
        }
      }
      if (knownKeys.size > 0) {
        for (const sf of subFields) {
          if (!knownKeys.has(sf)) {
            invalidFields.push(`${key}.${sf}`);
          }
        }
      }
    }
  }

  if (invalidFields.length > 0) {
    return {
      success: false,
      error: `Unknown fields: ${invalidFields.join(", ")}. Use the search tool to check available responseFields for this operation.`,
      invalidFields,
    };
  }

  // Build filtered result
  const result: Record<string, unknown> = {};

  for (const [key, subFields] of fieldMap) {
    const value = record[key];

    if (subFields === null) {
      result[key] = value;
    } else {
      result[key] = filterValue(value, subFields);
    }
  }

  return { success: true, data: result };
}

function filterValue(value: unknown, subFields: string[]): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => pickSubFields(item, subFields));
  }
  if (typeof value === "object" && value !== null) {
    return pickSubFields(value, subFields);
  }
  return value;
}

function pickSubFields(obj: unknown, subFields: string[]): unknown {
  if (typeof obj !== "object" || obj === null) return obj;
  const record = obj as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const field of subFields) {
    if (field in record) {
      result[field] = record[field];
    }
  }
  return result;
}
