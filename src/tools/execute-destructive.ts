import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { EXECUTE_INPUT_SCHEMA, makeExecuteHandler } from "../utils/execute.js";

export function registerExecuteDestructiveTool(server: McpServer) {
  server.registerTool(
    "execute_destructive",
    {
      description:
        "Execute a destructive Storyblok API operation. Use for operations with behavior: 'destructive' (e.g., deleting stories, clearing trash). Data may be permanently lost.",
      inputSchema: EXECUTE_INPUT_SCHEMA,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      } as Record<string, boolean>,
    },
    makeExecuteHandler(["destructive"])
  );
}
