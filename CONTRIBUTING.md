# Contributing

## Development Setup

```bash
npm install
npm run dev
```

## Updating the OpenAPI Specification

The bundled OpenAPI specification (`src/openapi/openapi.json`) is generated from a base spec fetched from a private GitHub repository, with an overlay applied on top.

Requires the [`gh` CLI](https://cli.github.com) to be installed and authenticated (`gh auth login`).

Set the required environment variable:

| Variable | Description |
|----------|-------------|
| `OPENAPI_MAPI_URL` | GitHub blob URL to the OpenAPI file: `https://github.com/{owner}/{repo}/blob/{branch}/{path}` |

Then run:

```bash
npm run openapi:update
```

This fetches the base spec to `scripts/openapi/openapi.json` (gitignored), applies `scripts/openapi/overlay.yaml` on top, and writes the result to `src/openapi/openapi.json`.

The individual steps can also be run separately with `openapi:fetch` and `openapi:generate`.

> **Note**: `gh` must be authenticated with access to the private repository (`gh auth login`).

## Building

```bash
npm run build
```

## Testing

```bash
npm run inspect
```

Opens the MCP Inspector UI for interactive testing.
