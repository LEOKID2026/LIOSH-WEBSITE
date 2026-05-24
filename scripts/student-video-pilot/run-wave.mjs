#!/usr/bin/env node
/**
 * Run SL1–SL9 wave: each workflow desktop then mobile; continues on failure.
 *
 *   node --env-file=.env.local --env-file=.env.e2e.local scripts/student-video-pilot/run-wave.mjs [--base-url=]
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseCliArgs, root, resolveBaseUrl } from "./lib/common.mjs";
import { WAVE_ORDER } from "./workflows/index.mjs";

const VIEWPORTS = ["desktop", "mobile"];

function runStep(script, slug, viewport, baseUrl) {
  const cmd =
    `node --env-file=.env.local --env-file=.env.e2e.local scripts/student-video-pilot/${script}.mjs --slug=${slug} --viewport=${viewport} --base-url=${baseUrl}`.trim();
  const r = spawnSync(cmd, { encoding: "utf8", cwd: root, shell: true });
  return {
    ok: r.status === 0,
    status: r.status,
    stdout: r.stdout || "",
    stderr: r.stderr || "",
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const baseUrl = resolveBaseUrl(argv);
  const fromArg = argv.find((a) => a.startsWith("--from="));
  const fromId = fromArg ? fromArg.slice("--from=".length).toUpperCase() : null;
  let workflows = WAVE_ORDER;
  if (fromId) {
    const idx = WAVE_ORDER.findIndex((w) => w.id === fromId);
    if (idx < 0) throw new Error(`Unknown --from workflow id: ${fromId}`);
    workflows = WAVE_ORDER.slice(idx);
  }
  const startedAt = new Date().toISOString();
  const results = [];
  let passCount = 0;
  let failCount = 0;

  const warmup = spawnSync(
    `node --env-file=.env.local scripts/help-center/provision-demo-account.mjs`,
    { encoding: "utf8", cwd: root, shell: true }
  );
  if (warmup.status !== 0) {
    console.warn("WARN: provision-demo warmup failed", warmup.stderr || warmup.stdout);
  }
  await new Promise((r) => setTimeout(r, 2000));

  for (const workflow of workflows) {
    for (const viewport of VIEWPORTS) {
      const label = `${workflow.id} ${workflow.slug} (${viewport})`;
      console.log(`\n=== ${label} — preflight ===`);
      const pf = runStep("preflight", workflow.slug, viewport, baseUrl);
      if (!pf.ok) {
        failCount++;
        results.push({
          workflowId: workflow.id,
          slug: workflow.slug,
          viewport,
          phase: "preflight",
          ok: false,
          blockers: pf.stderr || pf.stdout,
        });
        console.error(`BLOCKER: preflight failed for ${label}`);
        continue;
      }

      console.log(`=== ${label} — capture ===`);
      const cap = runStep("capture", workflow.slug, viewport, baseUrl);
      if (cap.ok) {
        passCount++;
        results.push({
          workflowId: workflow.id,
          slug: workflow.slug,
          viewport,
          phase: "capture",
          ok: true,
        });
        console.log(`OK: ${label}`);
      } else {
        failCount++;
        results.push({
          workflowId: workflow.id,
          slug: workflow.slug,
          viewport,
          phase: "capture",
          ok: false,
          blockers: cap.stderr || cap.stdout,
        });
        console.error(`BLOCKER: capture failed for ${label}`);
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    baseUrl,
    waveOrder: WAVE_ORDER.map((w) => w.id),
    summary: { pass: passCount, fail: failCount, total: passCount + failCount },
    results,
  };

  const outDir = join(root, "qa-evidence-audit", "student-video-pilot");
  mkdirSync(outDir, { recursive: true });
  const reportPath = join(outDir, "wave-report.json");
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`\nWave complete: ${passCount} passed, ${failCount} failed`);
  console.log(`Report → ${reportPath}`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
