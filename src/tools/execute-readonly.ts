import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { EXECUTE_INPUT_SCHEMA, makeExecuteHandler } from "../utils/execute.js";

export function registerExecuteReadonlyTool(server: McpServer) {
  server.registerTool(
    "execute_readonly",
    {
      description:
        "Execute a read-only Storyblok API operation. Use for operations with behavior: 'readOnly' (e.g., listing stories, getting assets).\n\nOperation IDs are not guessable — always call `search` first to get the exact operationId. Never assume or infer operation names.\n\nList operations support pagination via `page` and `per_page` parameters (default: page=1, per_page=25, max per_page=1000). When paginating, the response includes a `pagination` object with `total`, `page`, `per_page`, and `total_pages`. Use this to determine if more pages exist and fetch them with subsequent calls.",
      inputSchema: EXECUTE_INPUT_SCHEMA,
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      } as Record<string, boolean>,
    },
    makeExecuteHandler(["readOnly"])
  );
}
