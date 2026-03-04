import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getOperationMap } from "../openapi/index.js";
import type { OperationBehavior } from "../utils/parameters.js";
import {
  getResponseFields,
  type ResponseFieldMap,
} from "../utils/response-fields.js";

export interface SearchResult {
  operations: Array<{
    operationId: string;
    method: string;
    path: string;
    summary?: string;
    description?: string;
    behavior?: OperationBehavior;
    responseFields?: ResponseFieldMap;
  }>;
}

export async function toolSearch(args: { query: string }): Promise<SearchResult> {
  const query = args.query.toLowerCase();
  const operations: SearchResult["operations"] = [];

  for (const op of getOperationMap().values()) {
    const operationId = op.getOperationId();
    const summary = op.getSummary() ?? "";
    const description = op.getDescription() ?? "";
    const searchText = `${operationId} ${op.path} ${summary} ${description}`.toLowerCase();

    if (searchText.includes(query)) {
      const behavior = op.schema['x-mcp-behavior'] as OperationBehavior | undefined;
      const responseFields = getResponseFields(operationId);

      operations.push({
        operationId,
        method: op.method.toUpperCase(),
        path: op.path,
        summary,
        description,
        ...(behavior && { behavior }),
        ...(responseFields && { responseFields }),
      });
    }
  }

  return { operations };
}

export function registerSearchTool(server: McpServer) {
  server.registerTool(
    "search",
    {
      description:
        "Search for available Storyblok API endpoints. Returns operations with their operationId, behavior, and available response fields.\n\nAlways use this first when you don't know which operation to call. Then pass the operationId to the matching execute tool based on the behavior field:\n- \"readOnly\" → execute_readonly\n- \"destructive\" → execute_destructive\n- \"idempotent\" or no behavior → execute",
      inputSchema: {
        query: z
          .string()
          .describe(
            "Search query to find endpoints (e.g., 'stories', 'assets', 'spaces')"
          ),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      } as const,
    },
    async ({ query }) => {
      const result = await toolSearch({ query });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    }
  );
}
