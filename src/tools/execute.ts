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
  ValidationError,
} from "../utils/parameters.js";

export interface ExecuteResult {
  success: boolean;
  operation: string;
  message?: string;
  data?: unknown;
  error?: string;
  details?: {
    status?: number;
    statusText?: string;
    validationErrors?: ValidationError[];
  };
}

export async function toolExecute(args: {
  operation: string;
  parameters?: Record<string, unknown>;
  region?: string;
}): Promise<ExecuteResult> {
  const { operation, parameters = {}, region } = args;

  // Check if configured
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

  // Find the operation in the OpenAPI spec
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

  // Categorize parameters first (needed for body validation)
  const categorized = categorizeParameters(opDetails, parameters);
  const { pathParams, queryParams, bodyParam } = categorized;

  // Validate parameters (required + schema validation)
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

  // Build the final path
  const finalPath = substitutePathParameters(opDetails.path, pathParams);

  try {
    // Make the API request (region auto-detected from space_id, or explicit region)
    const spaceId = (pathParams.space_id ?? queryParams.space_id) as number | string | undefined;
    const response = await makeStoryblokRequest({
      method: opDetails.method,
      path: finalPath,
      spaceId,
      region,
      queryParams,
      body: bodyParam,
    });

    return {
      success: true,
      operation,
      message: `Successfully executed ${opDetails.method} ${finalPath}`,
      data: response.data,
      details: {
        status: response.status,
        statusText: response.statusText,
      },
    };
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
