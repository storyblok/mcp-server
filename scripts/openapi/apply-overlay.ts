/**
 * Generates the merged OpenAPI spec from the base spec and overlays.
 *
 * Prerequisites (not tracked in this repo):
 *   - scripts/openapi/storyblok-mapi.json  (base OpenAPI spec)
 *   - scripts/openapi/overlay.yaml         (overlay file)
 *   - npm packages: js-yaml, openapi-overlays-js
 *
 * Usage:
 *   npx tsx scripts/generate-merged-spec.ts
 */

import fs from "fs";
import path from "path";
import yaml from "js-yaml";
// @ts-expect-error - importing from internal source as module has no exports
import { applyOverlay } from "openapi-overlays-js/src/overlay.js";

const rootDir = new URL("../..", import.meta.url).pathname;
const openApiDir = path.join(rootDir, "scripts/openapi");
const outputPath = path.join(rootDir, "src/openapi/openapi.json");

// Load base spec
const specFile = fs
  .readdirSync(openApiDir)
  .find((f) => f.endsWith(".json"));
if (!specFile) throw new Error(`No JSON spec found in ${openApiDir}`);
let spec = JSON.parse(fs.readFileSync(path.join(openApiDir, specFile), "utf-8"));

// Apply overlays
const overlayFiles = fs
  .readdirSync(openApiDir)
  .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
  .sort();

for (const file of overlayFiles) {
  const overlay = yaml.load(
    fs.readFileSync(path.join(openApiDir, file), "utf-8")
  );
  spec = applyOverlay(spec, overlay);
  console.log(`Applied overlay: ${file}`);
}

// Write merged spec
fs.writeFileSync(outputPath, JSON.stringify(spec, null, 2));
console.log(`Merged spec written to ${outputPath}`);
