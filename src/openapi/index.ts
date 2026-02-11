// Storyblok OpenAPI Specification

import { getOpenApiSpec, clearSpecCache } from "./loader.js";

// Export the merged OpenAPI spec
// This is lazily loaded on first access
export const STORYBLOK_OPENAPI = getOpenApiSpec();

// Re-export utilities for consumers who need more control
export { getOpenApiSpec, clearSpecCache } from "./loader.js";
export type { OpenApiSpec } from "./loader.js";
