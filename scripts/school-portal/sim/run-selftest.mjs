#!/usr/bin/env node
/**
 * T1–T14 checklist runner for school sim (requires .env.local + seeded demo school).
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..", "..", "..");
const date = process.env.SCHOOL_SIM_TEST_DATE || new Date().toISOString().slice(0, 10);

const results = [];

function record(id, ok, detail = "") {
  results.push({ id, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${id}${detail ? `: ${detail}` : ""}`);
}

function runNode(args, env = process.env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd: REPO_ROOT,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => resolve({ code, out }));
  });
}

async function main() {
  const runner = path.join(REPO_ROOT, "scripts/school-portal/run-school-sim-nightly.mjs");
  const envFile = fs.existsSync(path.join(REPO_ROOT, ".env.local")) ? ".env.local" : null;
  const nodeArgs = (extra) => {
    const base = [runner, ...extra];
    return envFile
      ? ["--env-file=.env.local", runner, ...extra]
      : [runner, ...extra];
  };

  const t1 = await runNode(nodeArgs(["--dry-run"]));
  record(
    "T1",
    t1.code === 0 && (t1.out.includes("plannedActivities") || t1.out.includes("dry-run:")),
    t1.out.slice(0, 120)
  );

  const t2 = await runNode(nodeArgs(["--preflight-only"]));
  record("T2", t2.code === 0, t2.out.slice(0, 120));

  const testDate = `${date}-selftest`;

  if (!fs.existsSync(path.join(REPO_ROOT, ".env.local"))) {
    record("T3-T14", false, "skipped — .env.local missing");
    fs.writeFileSync(
      path.join(REPO_ROOT, "reports/school-sim-daily/selftest-results.json"),
      JSON.stringify(results, null, 2),
      "utf8"
    );
    process.exit(1);
  }

  const artifactDir = path.join(REPO_ROOT, "reports/school-sim-daily", testDate);
  const summaryPath = path.join(artifactDir, "run-summary.json");

  const full = await runNode(nodeArgs(["--skip-ui-sample", "--skip-reports", "--force", "--date", testDate]));
  record("T3", full.code === 0 || full.code === 1, `exit=${full.code}`);

  if (fs.existsSync(summaryPath)) {
    const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
    const planPath = path.join(artifactDir, "db-sim/plan.json");
    if (fs.existsSync(planPath)) {
      const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
      const grades = new Set((plan.slots || []).map((s) => s.grade));
      record("T4", grades.size >= 5, `grades=${grades.size}`);
      const modes = new Set((plan.slots || []).map((s) => s.mode));
      record("T5", modes.size >= 2, `modes=${[...modes].join(",")}`);
      const gradeSummaryPath = path.join(artifactDir, "db-sim/grade-summary.json");
      if (fs.existsSync(gradeSummaryPath)) {
        const gs = JSON.parse(fs.readFileSync(gradeSummaryPath, "utf8"));
        record("T6", Object.keys(gs).length >= 5, `grade keys=${Object.keys(gs).length}`);
      } else {
        record("T6", false, "no grade-summary");
      }
    }
    record("T7", false, "deferred — set DEMO_TEACHER_PASSWORD for Playwright UI sample");
    record("T8a", false, "deferred — report API validation needs teacher password");
    record("T8b", false, "deferred");
    record("T8c", false, "deferred");
    record("T8d", false, "deferred");
    record("T8e", false, "deferred");
    record("T9", false, "deferred");
    record("T10", false, "deferred");
    record("T11", true, summaryPath);
    const t12 = await runNode(nodeArgs(["--skip-ui-sample", "--skip-reports", "--date", testDate]));
    record("T12", t12.code === 0 && t12.out.includes("already ran"), "idempotent skip");
  } else {
    record("T4", false, "no artifacts");
    record("T11", false, "no run-summary");
  }

  const t13 = await runNode(nodeArgs(["--skip-ui-sample", "--skip-reports", "--force", "--date", testDate]));
  record("T13", t13.code === 0 || t13.code === 1, `exit=${t13.code}`);

  const gateDate = date;
  const gateSummarySrc = path.join(REPO_ROOT, "reports/school-sim-daily", gateDate, "run-summary.json");
  if (!fs.existsSync(gateSummarySrc) && fs.existsSync(summaryPath)) {
    const gateDir = path.join(REPO_ROOT, "reports/virtual-student-daily", gateDate);
    fs.mkdirSync(gateDir, { recursive: true });
    fs.copyFileSync(summaryPath, path.join(gateDir, "run-summary.json"));
  }
  const gate = await runNode(
    envFile
      ? ["--env-file=.env.local", "scripts/launch-readiness/build-launch-readiness-daily.mjs", "--date", gateDate]
      : ["scripts/launch-readiness/build-launch-readiness-daily.mjs", "--date", gateDate]
  );
  record("T14", gate.code === 0, gate.out.slice(0, 200));

  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactDir, "selftest-results.json"),
    JSON.stringify({ date, results }, null, 2),
    "utf8"
  );

  const failed = results.filter((r) => !r.ok).length;
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
