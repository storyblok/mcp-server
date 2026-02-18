import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ALL_REGIONS } from "@storyblok/region-helper";
import { toolSearch } from "./tools/search.js";
import { toolExecute } from "./tools/execute.js";
import { getOperationBehavior, OperationBehavior } from "./utils/parameters.js";

const server = new McpServer({
  name: "storyblok-mcp",
  version: "0.1.0",
});

server.registerTool(
  "search",
  {
    description:
      "Search for available Storyblok API endpoints. Returns operations with their behavior hint (readOnly, destructive, or undefined/idempotent for mutating).",
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
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Helper to create execute tool with behavior validation
function createExecuteTool(
  name: string,
  description: string,
  allowedBehaviors: (OperationBehavior | undefined)[],
  annotations: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  }
) {
  server.registerTool(
    name,
    {
      description,
      inputSchema: {
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
      },
      annotations: annotations as Record<string, boolean>,
    },
    async ({ operation, parameters, region }) => {
      // Validate operation behavior matches expected
      const actualBehavior = getOperationBehavior(operation);
      if (!allowedBehaviors.includes(actualBehavior)) {
        const allowedDesc = allowedBehaviors.map(b => b ?? "mutating (no behavior hint)").join(" or ");
        const actualDesc = actualBehavior ?? "mutating (no behavior hint)";
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                operation,
                error: `Operation behavior mismatch`,
                message: `This tool is for ${allowedDesc} operations, but "${operation}" is ${actualDesc}. Use the appropriate execute tool for this operation's behavior.`,
              }, null, 2),
            },
          ],
          isError: true,
        };
      }

      try {
        const result = await toolExecute({ operation, parameters, region });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error executing tool: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

// Read-only operations (GET without side effects)
createExecuteTool(
  "execute_readonly",
  "Execute a read-only Storyblok API operation. Use for operations with behavior: 'readOnly' (e.g., listing stories, getting assets).",
  ["readOnly"],
  {
    readOnlyHint: true,
    openWorldHint: false,
  }
);

// Mutating operations (POST creates, PUT updates, publish/unpublish, etc.)
createExecuteTool(
  "execute",
  "Execute a mutating Storyblok API operation. Use for operations with behavior: 'idempotent' or no behavior hint (e.g., creating stories, updating stories, publishing, uploading assets).",
  ["idempotent", undefined],
  {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  }
);

// Destructive operations (DELETE, clear_trash, discard_changes)
createExecuteTool(
  "execute_destructive",
  "Execute a destructive Storyblok API operation. Use for operations with behavior: 'destructive' (e.g., deleting stories, clearing trash). Data may be permanently lost.",
  ["destructive"],
  {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Storyblok MCP server running on stdio");
}

main().catch(console.error);
