#!/usr/bin/env node
/**
 * Run capture for SL2–SL9 (skip SL1). Preflight + capture per viewport.
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { parseCliArgs, root, resolveBaseUrl } from "./lib/common.mjs";
import { WAVE_ORDER } from "./workflows/index.mjs";

const SKIP_SLUGS = new Set(["student-home-tour"]);
const VIEWPORTS = ["desktop", "mobile"];

function run(script, slug, viewport, baseUrl) {
  const cmd =
    `node --env-file=.env.local --env-file=.env.e2e.local scripts/student-video-pilot/${script}.mjs --slug=${slug} --viewport=${viewport} --base-url=${baseUrl}`.trim();
  return spawnSync(cmd, { encoding: "utf8", cwd: root, shell: true });
}

const argv = process.argv.slice(2);
const baseUrl = resolveBaseUrl(argv);
const results = [];

for (const workflow of WAVE_ORDER) {
  if (SKIP_SLUGS.has(workflow.slug)) continue;
  for (const viewport of VIEWPORTS) {
    const label = `${workflow.id} ${workflow.slug} (${viewport})`;
    console.log(`\n=== ${label} ===`);
    const pf = run("preflight", workflow.slug, viewport, baseUrl);
    if (pf.status !== 0) {
      console.error(`BLOCKER preflight: ${label}`);
      results.push({ label, ok: false, phase: "preflight" });
      continue;
    }
    const cap = run("capture", workflow.slug, viewport, baseUrl);
    results.push({ label, ok: cap.status === 0, phase: "capture" });
    console.log(cap.status === 0 ? `OK ${label}` : `BLOCKER capture: ${label}`);
  }
}

const pass = results.filter((r) => r.ok).length;
console.log(`\nDone: ${pass}/${results.length} passed`);
process.exit(pass === results.length ? 0 : 1);
