import { z } from "zod";
import { ALL_REGIONS } from "@storyblok/region-helper";
import {
  makeStoryblokRequest,
  StoryblokApiError,
  ConfigurationError,
} from "../http-client.js";
import { isConfigured } from "../config.js";
import {
  findOperationDetails,
  categorizeParameters,
  substitutePathParameters,
  validateParameters,
  getOperationBehavior,
} from "./parameters.js";
import { pickFields } from "./response.js";

export async function toolExecute(args: {
  operation: string;
  parameters?: Record<string, unknown>;
  region?: string;
  fields?: string[];
}): Promise<unknown> {
  const { operation, parameters = {}, region, fields } = args;

  if (!isConfigured()) {
    return {
      success: false,
      operation,
      error: "Storyblok API token not configured",
      message:
        "Please set the STORYBLOK_API_TOKEN environment variable to your " +
        "Storyblok Personal Access Token.",
    };
  }

  const opDetails = findOperationDetails(operation);

  if (!opDetails) {
    return {
      success: false,
      operation,
      error: `Operation "${operation}" not found in Storyblok API`,
      message: "Use the 'search' tool to find available operations.",
    };
  }

  // Check if operation requires explicit region (no space_id in its definition)
  const hasSpaceIdParam = opDetails.parameters?.some((p) => p.name === "space_id") ?? false;
  if (!hasSpaceIdParam && !region) {
    return {
      success: false,
      operation,
      error: "Region required",
      message:
        "This operation does not include a space_id, so the region cannot be auto-detected. " +
        "Please ask the user which region (eu, us, cn, ap, ca) their Storyblok space is in " +
        "and provide it via the region parameter.",
    };
  }

  const categorized = categorizeParameters(opDetails, parameters);
  const { pathParams, queryParams, bodyParam } = categorized;

  const validationErrors = validateParameters(opDetails, parameters, categorized);
  if (validationErrors.length > 0) {
    return {
      success: false,
      operation,
      error: "Parameter validation failed",
      message: validationErrors.map((e) => e.message).join("; "),
      details: { validationErrors },
    };
  }

  const finalPath = substitutePathParameters(opDetails.path, pathParams);

  try {
    const spaceId = (pathParams.space_id ?? queryParams.space_id) as number | string | undefined;
    const response = await makeStoryblokRequest({
      method: opDetails.method,
      path: finalPath,
      spaceId,
      region,
      queryParams,
      body: bodyParam,
    });

    const result = pickFields(response.data, fields);
    if (!result.success) {
      return {
        success: false,
        operation,
        error: "Field selection failed",
        message: result.error,
        details: { invalidFields: result.invalidFields },
      };
    }
    return result.data;
  } catch (error) {
    if (error instanceof ConfigurationError) {
      return {
        success: false,
        operation,
        error: "Configuration error",
        message: error.message,
      };
    }

    if (error instanceof StoryblokApiError) {
      return {
        success: false,
        operation,
        error: `API error: ${error.status} ${error.statusText}`,
        message: error.message,
        data: error.responseBody,
        details: {
          status: error.status,
          statusText: error.statusText,
        },
      };
    }

    return {
      success: false,
      operation,
      error: "Unexpected error",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export const EXECUTE_INPUT_SCHEMA = {
  operation: z
    .string()
    .describe("The operation ID to execute (from search results)"),
  parameters: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Parameters for the operation"),
  region: z
    .enum(ALL_REGIONS as [string, ...string[]])
    .optional()
    .describe(
      "Storyblok region (eu, us, cn, ap, ca). Do NOT provide this parameter by default — it is auto-detected from space_id. Only provide it when the operation description explicitly asks you to."
    ),
  fields: z
    .array(z.string())
    .optional()
    .describe(
      "Optional list of response fields to return, using dot notation (e.g., [\"stories.id\", \"stories.name\"]). Available fields are shown in search results under responseFields. When omitted, the full response is returned. Use this for list operations to avoid large fields — operation descriptions call out which fields are expensive."
    ),
};

export function makeExecuteHandler(allowedBehaviors: (ReturnType<typeof getOperationBehavior>)[]) {
  return async ({ operation, parameters, region, fields }: { operation: string; parameters?: Record<string, unknown>; region?: string; fields?: string[] }) => {
    const actualBehavior = getOperationBehavior(operation);
    if (!allowedBehaviors.includes(actualBehavior)) {
      const allowedDesc = allowedBehaviors.map(b => b ?? "mutating (no behavior hint)").join(" or ");
      const actualDesc = actualBehavior ?? "mutating (no behavior hint)";
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: false,
              operation,
              error: "Operation behavior mismatch",
              message: `This tool is for ${allowedDesc} operations, but "${operation}" is ${actualDesc}. Use the appropriate execute tool for this operation's behavior.`,
            }),
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await toolExecute({ operation, parameters, region, fields });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error executing tool: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  };
}
