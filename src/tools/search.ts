import { STORYBLOK_OPENAPI } from "../openapi/index.js";

/**
 * Operation behavior hint.
 * - undefined: Mutating, non-idempotent (e.g., POST creating new resources)
 * - 'readOnly': Does not modify the environment
 * - 'destructive': May delete or destroy data (idempotent)
 * - 'idempotent': Mutating but safe to retry (e.g., PUT updates)
 */
export type OperationBehavior = 'readOnly' | 'destructive' | 'idempotent';

export interface SearchResult {
  operations: Array<{
    operationId: string;
    method: string;
    path: string;
    summary?: string;
    description?: string;
    behavior?: OperationBehavior;
  }>;
}

export async function toolSearch(args: { query: string }): Promise<SearchResult> {
  const query = args.query.toLowerCase();
  const operations: SearchResult["operations"] = [];

  // Search through OpenAPI spec for matching endpoints
  for (const [path, pathItem] of Object.entries(STORYBLOK_OPENAPI.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (
        ["get", "post", "put", "delete", "patch"].includes(method.toLowerCase())
      ) {
        const op = operation as any;
        const operationId = op.operationId || `${method.toUpperCase()} ${path}`;
        const summary = op.summary || "";
        const description = op.description || "";
        const searchText = `${operationId} ${path} ${summary} ${description}`.toLowerCase();

        if (searchText.includes(query)) {
          // Extract behavior hint if present
          const behavior = op["x-mcp-behavior"] as OperationBehavior | undefined;

          operations.push({
            operationId,
            method: method.toUpperCase(),
            path,
            summary,
            description,
            ...(behavior && { behavior }),
          });
        }
      }
    }
  }

  return { operations };
}
