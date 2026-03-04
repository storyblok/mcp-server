/**
 * Fetches the Storyblok Management API OpenAPI spec from a private GitHub repo.
 * Requires the `gh` CLI to be installed and authenticated.
 *
 * Required env variables:
 *   - OPENAPI_MAPI_URL   GitHub blob URL to the OpenAPI file, e.g.:
 *                        https://github.com/{owner}/{repo}/blob/{branch}/{path}
 *
 * Usage:
 *   npx tsx scripts/openapi/fetch-spec.ts
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const { OPENAPI_MAPI_URL } = process.env;

if (!OPENAPI_MAPI_URL) throw new Error("Missing env variable: OPENAPI_MAPI_URL");

const outputPath = path.join(
  new URL("../..", import.meta.url).pathname,
  "scripts/openapi/openapi.json"
);

// Parse GitHub blob URL: https://github.com/{owner}/{repo}/blob/{ref}/{path}
const url = new URL(OPENAPI_MAPI_URL);
const [, owner, repo, , ...rest] = url.pathname.split("/");
const refAndPath = rest.join("/");

// Find the matching branch (handles branches with slashes)
// --paginate with --jq outputs one JSON value per line across all pages
const branchNames = execSync(
  `gh api repos/${owner}/${repo}/branches --paginate --jq '.[].name'`,
  { encoding: "utf-8" }
).trim().split("\n");
const branch = branchNames.find((name) => refAndPath.startsWith(name + "/"));
if (!branch) throw new Error(`No matching branch found in ${refAndPath}`);

const filePath = refAndPath.slice(branch.length + 1);

execSync(
  `gh api "repos/${owner}/${repo}/contents/${filePath}?ref=${branch}" --header "Accept: application/vnd.github.raw+json" > "${outputPath}"`,
  { stdio: "inherit" }
);

console.log(`Spec written to ${outputPath}`);
