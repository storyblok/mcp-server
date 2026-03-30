# Storyblok MCP Server (Archived)

> [!CAUTION]
> **This repository has been archived.** It is no longer maintained and will not receive updates.
>
> The Storyblok MCP Server is now **fully hosted** — no local clone or Node.js required.
> Please use the hosted version at **<https://mcp.labs.storyblok.com/>** for setup instructions.

This repository contained a locally-run MCP (Model Context Protocol) server for the Storyblok Management API.

It has been superseded by the **hosted Storyblok MCP Server**, which requires no installation, and supports all major MCP clients out of the box.

## Migration

Connect directly to the hosted server at:

```text
https://mcp.labs.storyblok.com/mcp
```

Authentication is done via a Bearer token (your Storyblok Personal Access Token) in the `Authorization` header.

### Claude Code

```bash
claude mcp add --transport http Storyblok https://mcp.labs.storyblok.com/mcp --header "Authorization: Bearer your_token_here"
```

### Claude Desktop

Edit your configuration file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "Storyblok": {
      "type": "http",
      "url": "https://mcp.labs.storyblok.com/mcp",
      "headers": {
        "Authorization": "Bearer your_token_here"
      }
    }
  }
}
```

### Other Clients (Cursor, VS Code, Windsurf, etc.)

See the full setup guide at **<https://mcp.labs.storyblok.com/>** for client-specific instructions, one-click installs, and role-based access options.
