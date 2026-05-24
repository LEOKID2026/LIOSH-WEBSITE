#!/usr/bin/env node
/**
 * Student video preflight — one workflow × viewport.
 *
 *   node --env-file=.env.local --env-file=.env.e2e.local scripts/student-video-pilot/preflight.mjs \
 *     --slug=student-home-tour --viewport=desktop [--base-url=]
 */
import { parseCliArgs, assertAllowedBaseUrl } from "./lib/common.mjs";
import { runPreflight } from "./lib/preflight-engine.mjs";
import { loadWorkflow } from "./workflows/index.mjs";

async function main() {
  const { slug, viewport, baseUrl } = parseCliArgs();
  assertAllowedBaseUrl(baseUrl);
  const workflow = loadWorkflow(slug);
  const report = await runPreflight(workflow, { slug, viewport, baseUrl });
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error("BLOCKER:", e.message);
  process.exit(1);
});
