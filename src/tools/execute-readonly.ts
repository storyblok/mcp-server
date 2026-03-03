import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { EXECUTE_INPUT_SCHEMA, makeExecuteHandler } from "../utils/execute.js";

export function registerExecuteReadonlyTool(server: McpServer) {
  server.registerTool(
    "execute_readonly",
    {
      description:
        "Execute a read-only Storyblok API operation. Use for operations with behavior: 'readOnly' (e.g., listing stories, getting assets).",
      inputSchema: EXECUTE_INPUT_SCHEMA,
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      } as Record<string, boolean>,
    },
    makeExecuteHandler(["readOnly"])
  );
}
