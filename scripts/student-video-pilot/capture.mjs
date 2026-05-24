#!/usr/bin/env node
/**
 * Student video capture — one workflow × viewport (preflight if stale >15min).
 *
 *   node --env-file=.env.local --env-file=.env.e2e.local scripts/student-video-pilot/capture.mjs \
 *     --slug=student-home-tour --viewport=desktop [--base-url=]
 */
import { parseCliArgs, assertAllowedBaseUrl, workflowPaths } from "./lib/common.mjs";
import { runCaptureWithVerify } from "./lib/capture-engine.mjs";
import { loadWorkflow } from "./workflows/index.mjs";

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--skip-verify") || argv.includes("--skip-preflight")) {
    console.error("BLOCKER: --skip-verify / --skip-preflight not allowed");
    process.exit(1);
  }

  const { slug, viewport, baseUrl } = parseCliArgs(argv);
  assertAllowedBaseUrl(baseUrl);
  const workflow = loadWorkflow(slug);
  const paths = workflowPaths(slug, viewport);

  try {
    const meta = await runCaptureWithVerify(workflow, { slug, viewport, baseUrl });
    console.log(JSON.stringify(meta, null, 2));
    console.log(`\nOK → ${paths.outWebm}`);
  } catch (e) {
    if (e.preflight) {
      console.error("BLOCKER: preflight failed");
      console.error(JSON.stringify(e.preflight, null, 2));
    } else if (e.meta) {
      console.error("BLOCKER: verification failed");
      e.meta.verification?.errors?.forEach((err) => console.error(`  - ${err}`));
      console.error(JSON.stringify(e.meta, null, 2));
    } else {
      console.error("BLOCKER:", e.message);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
