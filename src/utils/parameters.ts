import { STORYBLOK_OPENAPI } from "../openapi/index.js";
import { validateSchema, formatValidationErrors } from "./schema-validator.js";

/**
 * Operation behavior hint from x-mcp-behavior.
 */
export type OperationBehavior = 'readOnly' | 'destructive' | 'idempotent';

/**
 * Get the behavior hint for an operation.
 * Returns undefined for mutating, non-idempotent operations (POST/PATCH creates).
 */
export function getOperationBehavior(operation: string): OperationBehavior | undefined {
  for (const [path, pathItem] of Object.entries(STORYBLOK_OPENAPI.paths)) {
    for (const [method, op] of Object.entries(pathItem)) {
      if (!["get", "post", "put", "delete", "patch"].includes(method.toLowerCase())) {
        continue;
      }

      const opData = op as { operationId?: string; "x-mcp-behavior"?: OperationBehavior };
      const operationId = opData.operationId || `${method.toUpperCase()} ${path}`;

      if (operationId === operation || `${method.toUpperCase()} ${path}` === operation) {
        return opData["x-mcp-behavior"];
      }
    }
  }
  return undefined;
}

export interface ParameterDef {
  name: string;
  in: "path" | "query" | "header";
  required?: boolean;
  schema?: Record<string, unknown>;
}

export interface OperationDetails {
  method: string;
  path: string;
  operationId: string;
  parameters?: ParameterDef[];
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema?: unknown }>;
  };
}

export interface CategorizedParameters {
  pathParams: Record<string, unknown>;
  queryParams: Record<string, unknown>;
  bodyParam: unknown | undefined;
}

export interface ValidationError {
  parameter: string;
  message: string;
}

export function findOperationDetails(
  operation: string
): OperationDetails | null {
  for (const [path, pathItem] of Object.entries(STORYBLOK_OPENAPI.paths)) {
    // Extract path-level parameters (like space_id)
    const pathLevelParams = (
      pathItem as { parameters?: ParameterDef[] }
    ).parameters;

    for (const [method, op] of Object.entries(pathItem)) {
      if (
        !["get", "post", "put", "delete", "patch"].includes(method.toLowerCase())
      ) {
        continue;
      }

      const opData = op as {
        operationId?: string;
        parameters?: ParameterDef[];
        requestBody?: OperationDetails["requestBody"];
      };
      const operationId =
        opData.operationId || `${method.toUpperCase()} ${path}`;

      if (
        operationId === operation ||
        `${method.toUpperCase()} ${path}` === operation
      ) {
        // Merge path-level and operation-level parameters
        const mergedParams = [
          ...(pathLevelParams || []),
          ...(opData.parameters || []),
        ];

        return {
          method: method.toUpperCase(),
          path,
          operationId,
          parameters: mergedParams.length > 0 ? mergedParams : undefined,
          requestBody: opData.requestBody,
        };
      }
    }
  }
  return null;
}

export function categorizeParameters(
  opDetails: OperationDetails,
  providedParams: Record<string, unknown>
): CategorizedParameters {
  const pathParams: Record<string, unknown> = {};
  const queryParams: Record<string, unknown> = {};
  let bodyParam: unknown | undefined;

  const paramDefs = opDetails.parameters || [];

  // Categorize based on OpenAPI parameter definitions
  for (const paramDef of paramDefs) {
    const value = providedParams[paramDef.name];
    if (value !== undefined) {
      if (paramDef.in === "path") {
        pathParams[paramDef.name] = value;
      } else if (paramDef.in === "query") {
        queryParams[paramDef.name] = value;
      }
    }
  }

  // Check for body parameter
  if (opDetails.requestBody) {
    if ("body" in providedParams) {
      bodyParam = providedParams.body;
    } else {
      // Collect remaining params as body
      const knownParamNames = new Set(paramDefs.map((p) => p.name));
      const bodyFields: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(providedParams)) {
        if (!knownParamNames.has(key) && key !== "body") {
          bodyFields[key] = value;
        }
      }
      if (Object.keys(bodyFields).length > 0) {
        bodyParam = bodyFields;
      }
    }
  }

  return { pathParams, queryParams, bodyParam };
}

export function substitutePathParameters(
  pathTemplate: string,
  pathParams: Record<string, unknown>
): string {
  let result = pathTemplate;

  for (const [name, value] of Object.entries(pathParams)) {
    const placeholder = `{${name}}`;
    if (result.includes(placeholder)) {
      result = result.replace(placeholder, encodeURIComponent(String(value)));
    }
  }

  return result;
}

export function validateParameters(
  opDetails: OperationDetails,
  providedParams: Record<string, unknown>,
  categorized: CategorizedParameters
): ValidationError[] {
  const errors: ValidationError[] = [];
  const paramDefs = opDetails.parameters || [];

  // Check required path/query parameters and validate schemas
  for (const paramDef of paramDefs) {
    const value = providedParams[paramDef.name];

    // Check required
    if (paramDef.required && value === undefined) {
      errors.push({
        parameter: paramDef.name,
        message: `Required ${paramDef.in} parameter "${paramDef.name}" is missing`,
      });
      continue;
    }

    // Validate schema if value is provided
    if (value !== undefined && paramDef.schema) {
      const result = validateSchema(paramDef.schema, value);
      const schemaErrors = formatValidationErrors(result, paramDef.name);
      errors.push(...schemaErrors.map((message) => ({ parameter: paramDef.name, message })));
    }
  }

  // Check required request body
  if (opDetails.requestBody?.required && categorized.bodyParam === undefined) {
    errors.push({
      parameter: "body",
      message: "Request body is required for this operation",
    });
  }

  // Validate request body schema
  if (categorized.bodyParam !== undefined && opDetails.requestBody?.content) {
    const jsonContent = opDetails.requestBody.content["application/json"];
    if (jsonContent?.schema) {
      const result = validateSchema(jsonContent.schema, categorized.bodyParam);
      const schemaErrors = formatValidationErrors(result, "body");
      errors.push(...schemaErrors.map((message) => ({ parameter: "body", message })));
    }
  }

  return errors;
}

// Backward compatibility alias
export const validateRequiredParameters = (
  opDetails: OperationDetails,
  providedParams: Record<string, unknown>
): ValidationError[] => {
  const categorized = categorizeParameters(opDetails, providedParams);
  return validateParameters(opDetails, providedParams, categorized);
};
