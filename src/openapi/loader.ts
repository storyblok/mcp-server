import fs from "fs";
import path from "path";

export interface OpenApiSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
  };
  servers?: Array<{ url: string }>;
  paths: Record<string, Record<string, unknown>>;
  components?: unknown;
}

// Cached spec to avoid reloading on every call
let cachedSpec: OpenApiSpec | null = null;

/**
 * Get the directory containing the OpenAPI spec.
 */
function getOpenApiDir(): string {
  const currentDir = new URL(".", import.meta.url).pathname;
  return currentDir;
}

/**
 * Get the OpenAPI spec.
 * Results are cached for performance.
 */
export function getOpenApiSpec(): OpenApiSpec {
  if (cachedSpec) {
    return cachedSpec;
  }

  const specPath = path.join(getOpenApiDir(), "openapi.json");

  if (!fs.existsSync(specPath)) {
    throw new Error(`OpenAPI spec not found: ${specPath}`);
  }

  const specContent = fs.readFileSync(specPath, "utf-8");

  try {
    cachedSpec = JSON.parse(specContent) as OpenApiSpec;
    return cachedSpec;
  } catch (error) {
    throw new Error(
      `Failed to parse OpenAPI spec at ${specPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Clear the cached spec. Useful for testing or hot-reloading.
 */
export function clearSpecCache(): void {
  cachedSpec = null;
}
