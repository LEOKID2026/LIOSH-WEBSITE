#!/usr/bin/env node
/**
 * E2E_TRUTH_PASS — DB → API → UI → PDF for one student/parent/range.
 * Runs child gates in sequence; all must PASS (not SKIP) for E2E_TRUTH_PASS.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles, hasLiveSupabaseEnv, hasLiveParentE2EEnv, baseUrl } from "../lib/env.mjs";
import { passGate, failGate, skipGate } from "../lib/gate-result.mjs";
import { assertDevServerReachable } from "../lib/live-parent-report.mjs";

loadEnvFiles();

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const chain = ["DB_PASS", "API_PASS", "UI_PASS", "PDF_PASS"];

if (!hasLiveSupabaseEnv() || !hasLiveParentE2EEnv()) {
  skipGate(
    "E2E_TRUTH_PASS",
    "requires Supabase service role + E2E_PARENT_EMAIL/PASSWORD + dev server",
    { details: { requiredEnv: ["LEARNING_SUPABASE_SERVICE_ROLE_KEY", "E2E_PARENT_*"] } }
  );
}

const origin = baseUrl().replace(/\/$/, "");
if (!(await assertDevServerReachable(origin))) {
  skipGate("E2E_TRUTH_PASS", `dev server not reachable at ${origin}`);
}

/** @type {Record<string, number>} */
const results = {};

for (const gate of chain) {
  const script = join(ROOT, "scripts/truth-gates/gates", `${gate.toLowerCase().replace(/_/g, "-")}.mjs`);
  const r = spawnSync("node", [script], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
  });
  results[gate] = r.status ?? 1;
  if (results[gate] !== 0) {
    failGate("E2E_TRUTH_PASS", `${gate} did not PASS (exit ${results[gate]})`, {
      usesLiveDb: true,
      usesLiveApi: true,
      usesLiveUi: true,
      usesRealPdfBytes: true,
      details: { chainResults: results, stderr: r.stderr?.slice(0, 2000) },
    });
  }
}

passGate("E2E_TRUTH_PASS", "DB → API → UI → PDF chain passed for live student/range", {
  usesLiveDb: true,
  usesLiveApi: true,
  usesLiveUi: true,
  usesRealPdfBytes: true,
  details: { chainResults: results, baseUrl: origin },
});
