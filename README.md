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

Before configuring your MCP client, ensure you have:

1. Built the server: `npm install && npm run build`
2. Your Storyblok Personal Access Token from [Storyblok Account Settings](https://app.storyblok.com/#!/me/account?tab=token)

### Quick Setup

<details>
<summary><b>Claude Code</b></summary>

Add the server using the Claude Code CLI:

```bash
claude mcp add storyblok node /absolute/path/to/storyblok-mcp/dist/index.js --env STORYBLOK_API_TOKEN=your_token_here
```

Replace `/absolute/path/to/storyblok-mcp` with the actual path to this repository and `your_token_here` with your actual Storyblok token.

</details>

<details>
<summary><b>Claude Desktop</b></summary>

Edit your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

Add the following configuration:

```json
{
  "mcpServers": {
    "storyblok": {
      "command": "node",
      "args": ["/absolute/path/to/storyblok-mcp/dist/index.js"],
      "env": {
        "STORYBLOK_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

Replace `/absolute/path/to/storyblok-mcp` with the actual path to this repository and `your_token_here` with your actual Storyblok token.

After saving, restart Claude Desktop.

</details>

<details>
<summary><b>Other MCP Clients</b></summary>

For other MCP clients (Cline, Cursor, etc.), add this server configuration to your client's MCP settings:

```json
{
  "mcpServers": {
    "storyblok": {
      "command": "node",
      "args": ["/absolute/path/to/storyblok-mcp/dist/index.js"],
      "env": {
        "STORYBLOK_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

Refer to your client's documentation for the specific configuration file location.

</details>

## Setup

```bash
npm install
npm run build
npm start
```

## Development

```bash
npm run dev
```

## Building

```bash
npm run build
```

## Testing

Use the MCP Inspector to interactively test the server:

```bash
npm run inspect
```

This opens a web UI where you can list tools, call them with test parameters, and inspect responses.
