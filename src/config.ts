import {
  getRegion,
  getManagementBaseUrl,
  isRegion,
} from "@storyblok/region-helper";

export interface StoryblokConfig {
  apiToken: string;
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export function getConfig(): StoryblokConfig {
  const apiToken = process.env.STORYBLOK_API_TOKEN;

  if (!apiToken) {
    throw new ConfigurationError(
      "STORYBLOK_API_TOKEN environment variable is required. " +
        "Please set it to your Storyblok Personal Access Token."
    );
  }

  return { apiToken };
}

export function resolveBaseUrl(spaceId?: number | string, region?: string): string {
  // Explicit URL override takes highest priority
  if (process.env.STORYBLOK_API_URL) {
    return process.env.STORYBLOK_API_URL;
  }

  // Auto-detect region from space ID
  if (spaceId !== undefined) {
    const detected = getRegion(spaceId);
    if (detected) {
      return getManagementBaseUrl(detected);
    }
  }

  // Explicit region parameter (for endpoints without space_id)
  if (region && isRegion(region)) {
    return getManagementBaseUrl(region);
  }

  // Default to EU
  return getManagementBaseUrl("eu");
}

let cachedConfig: StoryblokConfig | null = null;

export function getConfigOrNull(): StoryblokConfig | null {
  if (cachedConfig) return cachedConfig;

  try {
    cachedConfig = getConfig();
    return cachedConfig;
  } catch {
    return null;
  }
}

export function isConfigured(): boolean {
  return getConfigOrNull() !== null;
}
