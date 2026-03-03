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

const server = new McpServer({ name, version });

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
