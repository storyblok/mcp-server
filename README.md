> [!IMPORTANT]
> **Research Project** — This is an experimental project from the Storyblok Innovation Lab and may change without notice.

# Storyblok MCP Server

An MCP (Model Context Protocol) server for the Storyblok API.

## Features

- **Tool Search**: Discover available Storyblok API endpoints by keyword, returning operationIds, behavior hints, and available response fields
- **Tool Execution**: Execute API calls with automatic parameter handling, split by behavior:
  - `execute_readonly` — safe read-only operations (GET)
  - `execute` — mutating/idempotent operations (POST, PUT, PATCH)
  - `execute_destructive` — destructive operations (DELETE)
- **Asset Upload**: Upload files or images to Storyblok in a single step — handles asset record creation, S3 upload, and finalization automatically; supports local file paths and HTTP/HTTPS URLs
- **Pagination**: List operations support `page` and `per_page` parameters; check `pagination.total_pages` in responses
- **Field Filtering**: Use the `fields` parameter on execute tools to limit large responses to only the fields you need

## Configuration

This MCP server requires a Storyblok API token to make real API calls.

### Setting up your token

1. Get your Personal Access Token from [Storyblok Account Settings](https://app.storyblok.com/#!/me/account?tab=token)
2. Set the environment variable:

```bash
export STORYBLOK_API_TOKEN=your_token_here
```

Or create a `.env` file (gitignored):

```bash
STORYBLOK_API_TOKEN=your_token_here
```

### Configuration Options

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STORYBLOK_API_TOKEN` | Yes | - | Your Storyblok Personal Access Token |
| `STORYBLOK_API_URL` | No | Auto-detected | Override the API base URL (region is auto-detected from `space_id`) |

## MCP Client Configuration

### Prerequisites

1. Node.js >= 20.6.0
2. Your Storyblok Personal Access Token from [Storyblok Account Settings](https://app.storyblok.com/#!/me/account?tab=token)

### Quick Setup (via npx)

No installation needed — just configure your MCP client to run the package directly:

<details>
<summary><b>Claude Code</b></summary>

```bash
claude mcp add storyblok npx storyblok-mcp --env STORYBLOK_API_TOKEN=your_token_here
```

</details>

<details>
<summary><b>Claude Desktop</b></summary>

Edit your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "storyblok": {
      "command": "npx",
      "args": ["-y", "storyblok-mcp"],
      "env": {
        "STORYBLOK_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

After saving, restart Claude Desktop.

</details>

<details>
<summary><b>Other MCP Clients</b></summary>

For other MCP clients (Cline, Cursor, etc.), use the same npx-based configuration:

```json
{
  "mcpServers": {
    "storyblok": {
      "command": "npx",
      "args": ["-y", "storyblok-mcp"],
      "env": {
        "STORYBLOK_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

Refer to your client's documentation for the specific configuration file location.

</details>

## Development

```bash
npm install
npm run dev       # start with file watching
npm run start     # start without file watching
npm run inspect   # open MCP Inspector UI
npm run typecheck # run TypeScript type checking
```

## Versioning

This package follows [Semantic Versioning](https://semver.org/):

```bash
npm version patch  # bug fixes (0.1.0 → 0.1.1)
npm version minor  # new features (0.1.0 → 0.2.0)
npm version major  # breaking changes (0.1.0 → 1.0.0)
```

After bumping, push the tag and publish:

```bash
git push --follow-tags
npm publish
```
