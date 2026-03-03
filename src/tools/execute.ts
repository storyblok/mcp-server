import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { EXECUTE_INPUT_SCHEMA, makeExecuteHandler } from "../utils/execute.js";

export function registerExecuteTool(server: McpServer) {
  server.registerTool(
    "execute",
    {
      description:
        "Execute a mutating Storyblok API operation. Use for operations with behavior: 'idempotent' or no behavior hint (e.g., creating stories, updating stories, publishing, uploading assets).",
      inputSchema: EXECUTE_INPUT_SCHEMA,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      } as Record<string, boolean>,
    },
    makeExecuteHandler(["idempotent", undefined])
  );
}
