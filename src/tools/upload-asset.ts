import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ALL_REGIONS } from "@storyblok/region-helper";
import { readFile } from "node:fs/promises";
import {
  makeStoryblokRequest,
  StoryblokApiError,
  ConfigurationError,
} from "../http-client.js";
import { isConfigured } from "../config.js";
import type { ToolError } from "../utils/errors.js";

export interface UploadAssetArgs {
  space_id: number;
  filename: string;
  source: string;
  alt?: string;
  title?: string;
  copyright?: string;
  asset_folder_id?: number;
  region?: string;
}

export interface UploadAssetSuccess {
  success: true;
  message: string;
  data: {
    id: number;
    pretty_url: string;
    public_url: string;
    filename: string;
  };
}

export type UploadAssetResult = UploadAssetSuccess | ToolError;

interface CreateAssetResponse {
  id: number;
  fields: Record<string, string>;
  post_url: string;
  pretty_url: string;
  public_url: string;
}

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  mp4: "video/mp4",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  zip: "application/zip",
  json: "application/json",
  csv: "text/csv",
  txt: "text/plain",
};

function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

async function fetchFileBytes(source: string): Promise<Uint8Array> {
  if (source.startsWith("http://") || source.startsWith("https://")) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch source URL: ${response.status} ${response.statusText}`
      );
    }
    return new Uint8Array(await response.arrayBuffer());
  }
  return new Uint8Array(await readFile(source));
}

async function uploadToS3(
  assetData: CreateAssetResponse,
  fileBytes: Uint8Array,
  filename: string,
  mimeType: string
): Promise<void> {
  const form = new FormData();

  // Append all S3 signing fields first — ORDER MATTERS for S3 policy
  for (const [key, value] of Object.entries(assetData.fields)) {
    form.append(key, value);
  }

  // file field MUST be last (S3 requirement)
  const blob = new Blob([fileBytes], { type: mimeType });
  form.append("file", blob, filename);

  // Do NOT set Content-Type manually — fetch sets multipart/form-data with boundary automatically
  const s3Response = await fetch(assetData.post_url, {
    method: "POST",
    body: form,
  });

  // S3 returns 204 No Content on success
  if (s3Response.status !== 204) {
    const body = await s3Response.text();
    throw new Error(
      `S3 upload failed: ${s3Response.status} ${s3Response.statusText}. Body: ${body}`
    );
  }
}

export async function toolUploadAsset(
  args: UploadAssetArgs
): Promise<UploadAssetResult> {
  if (!isConfigured()) {
    return {
      success: false,
      error: "Storyblok API token not configured",
      message:
        "Please set the STORYBLOK_API_TOKEN environment variable to your " +
        "Storyblok Personal Access Token.",
    };
  }

  const {
    space_id,
    filename,
    source,
    alt,
    title,
    copyright,
    asset_folder_id,
    region,
  } = args;
  const mimeType = getMimeType(filename);

  // Step 1: Create asset record in Storyblok
  let assetData: CreateAssetResponse;
  try {
    const queryParams: Record<string, unknown> = {
      filename,
      validate_upload: 1,
    };
    if (alt !== undefined) queryParams.alt = alt;
    if (title !== undefined) queryParams.title = title;
    if (copyright !== undefined) queryParams.copyright = copyright;
    if (asset_folder_id !== undefined)
      queryParams.asset_folder_id = asset_folder_id;

    const response = await makeStoryblokRequest({
      method: "POST",
      path: `/v1/spaces/${space_id}/assets`,
      spaceId: space_id,
      region,
      queryParams,
    });

    assetData = response.data as CreateAssetResponse;
  } catch (error) {
    if (error instanceof ConfigurationError) {
      return {
        success: false,
        error: "Configuration error",
        message: error.message,
      };
    }
    if (error instanceof StoryblokApiError) {
      return {
        success: false,
        error: `API error: ${error.status} ${error.statusText}`,
        message: error.message,
        details: {
          step: "create_asset",
          status: error.status,
          statusText: error.statusText,
        },
      };
    }
    return {
      success: false,
      error: "Failed to create asset record",
      message: error instanceof Error ? error.message : String(error),
      details: { step: "create_asset" },
    };
  }

  // Read file bytes from source (local path or URL)
  let fileBytes: Uint8Array;
  try {
    fileBytes = await fetchFileBytes(source);
  } catch (error) {
    return {
      success: false,
      error: "Failed to read source file",
      message: error instanceof Error ? error.message : String(error),
      details: { step: "read_file" },
    };
  }

  // Step 2: Upload file to S3
  try {
    await uploadToS3(assetData, fileBytes, filename, mimeType);
  } catch (error) {
    return {
      success: false,
      error: "S3 upload failed",
      message: error instanceof Error ? error.message : String(error),
      details: { step: "s3_upload" },
    };
  }

  // Step 3: Finish upload (required because validate_upload=1 was set)
  try {
    const finishResponse = await makeStoryblokRequest({
      method: "GET",
      path: `/v1/spaces/${space_id}/assets/${assetData.id}/finish_upload`,
      spaceId: space_id,
      region,
    });

    const finished = finishResponse.data as {
      id?: number;
      pretty_url?: string;
      public_url?: string;
    };

    return {
      success: true,
      message: `Asset "${filename}" uploaded successfully`,
      data: {
        id: finished.id ?? assetData.id,
        pretty_url: finished.pretty_url ?? assetData.pretty_url,
        public_url: finished.public_url ?? assetData.public_url,
        filename,
      },
    };
  } catch (error) {
    if (error instanceof StoryblokApiError) {
      return {
        success: false,
        error: `API error: ${error.status} ${error.statusText}`,
        message: error.message,
        details: {
          step: "finish_upload",
          status: error.status,
          statusText: error.statusText,
        },
      };
    }
    return {
      success: false,
      error: "Failed to finalize asset upload",
      message: error instanceof Error ? error.message : String(error),
      details: { step: "finish_upload" },
    };
  }
}

export function registerUploadAssetTool(server: McpServer) {
  server.registerTool(
    "upload_asset",
    {
      description:
        "Upload an asset to Storyblok in a single operation. Handles the Storyblok asset record creation, S3 file upload, and finalization automatically. Supports local file paths and HTTP/HTTPS URLs as source.",
      inputSchema: {
        space_id: z.number().describe("Storyblok space ID"),
        filename: z
          .string()
          .describe("Filename including extension (e.g. 'image.jpg')"),
        source: z
          .string()
          .describe("Local file path or HTTP/HTTPS URL of the file to upload"),
        alt: z.string().optional().describe("Alt text for the asset"),
        title: z.string().optional().describe("Title for the asset"),
        copyright: z
          .string()
          .optional()
          .describe("Copyright information for the asset"),
        asset_folder_id: z
          .number()
          .optional()
          .describe("ID of the asset folder to upload into"),
        region: z
          .enum(ALL_REGIONS as [string, ...string[]])
          .optional()
          .describe(
            "Storyblok region (eu, us, cn, ap, ca). Do NOT provide this parameter by default — it is auto-detected from space_id. Only provide it when the operation description explicitly asks you to."
          ),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      } as Record<string, boolean>,
    },
    async (args) => {
      try {
        const result = await toolUploadAsset(args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
          isError: !result.success,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error: "Unexpected error",
                  message:
                    error instanceof Error ? error.message : String(error),
                },
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
