import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerSearchTool } from "./tools/search.js";
import { registerExecuteReadonlyTool } from "./tools/execute-readonly.js";
import { registerExecuteTool } from "./tools/execute.js";
import { registerExecuteDestructiveTool } from "./tools/execute-destructive.js";
import { registerUploadAssetTool } from "./tools/upload-asset.js";
import { getOasInstance } from "./openapi/index.js";
import pkg from "../package.json" with { type: "json" };

const { name, version } = pkg;

const server = new McpServer({ name, version }, {
  instructions: `Use the Storyblok Management API in three steps:
1. Find the right operation: call \`search\` with a keyword to get matching operationIds and their behavior.
2. Pick the execute tool by behavior: "readOnly" → execute_readonly | "destructive" → execute_destructive | "idempotent" or none → execute.
3. Call the execute tool with the operationId and required parameters.

Key notes:
- Most operations require a numeric \`space_id\`. Ask the user if you don't have it.
- List operations support \`page\` and \`per_page\` for pagination; check \`pagination.total_pages\` in the response.
- Use the \`fields\` parameter to limit large responses to only needed fields.
- To upload files or images, use the dedicated \`upload_asset\` tool instead of execute.`,
});

registerSearchTool(server);
registerExecuteReadonlyTool(server);
registerExecuteTool(server);
registerExecuteDestructiveTool(server);
registerUploadAssetTool(server);

async function main() {
  await getOasInstance().dereference();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Storyblok MCP server running on stdio");
}

main().catch(console.error);
