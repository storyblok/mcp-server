import { createRequire } from "node:module";
import { getConfig, resolveBaseUrl, ConfigurationError } from "./config.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { name: string; version: string };

export interface HttpRequestOptions {
  method: string;
  path: string;
  spaceId?: number | string;
  region?: string;
  queryParams?: Record<string, unknown>;
  body?: unknown;
}

export interface HttpResponse {
  status: number;
  statusText: string;
  data: unknown;
}

export class StoryblokApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
    public responseBody?: unknown
  ) {
    super(message);
    this.name = "StoryblokApiError";
  }
}

export async function makeStoryblokRequest(
  options: HttpRequestOptions
): Promise<HttpResponse> {
  const config = getConfig();

  // Resolve base URL from space ID (auto-detects region) or explicit region
  const baseUrl = resolveBaseUrl(options.spaceId, options.region).replace(/\/$/, "");
  const path = options.path.startsWith("/") ? options.path : `/${options.path}`;
  const url = new URL(`${baseUrl}${path}`);

  if (options.queryParams) {
    for (const [key, value] of Object.entries(options.queryParams)) {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    }
  }

  // Build headers
  const headers: Record<string, string> = {
    Authorization: config.apiToken,
    "Content-Type": "application/json",
    "User-Agent": `${pkg.name}/${pkg.version}`,
    "Sb-Agent": pkg.name,
    "Sb-Agent-Version": pkg.version,
    "Strict-Mode": "1",
  };

  // Build request options
  const fetchOptions: RequestInit = {
    method: options.method,
    headers,
  };

  // Add body for methods that support it
  if (options.body && ["POST", "PUT", "PATCH"].includes(options.method)) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  // Make the request
  const response = await fetch(url.toString(), fetchOptions);

  // Parse response body
  let data: unknown;
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = text || null;
  }

  // Check for errors
  if (!response.ok) {
    throw new StoryblokApiError(
      `Storyblok API error: ${response.status} ${response.statusText}`,
      response.status,
      response.statusText,
      data
    );
  }

  return {
    status: response.status,
    statusText: response.statusText,
    data,
  };
}

export { ConfigurationError };
