/**
 * Artifact writer for virtual-student-qa runs.
 *
 * Phase A/B/C/D layout:
 *   reports/virtual-student-qa/{ISO-timestamp}/
 *     run-summary.json
 *     run-summary.md
 *     screenshots/{name}.png
 *     logs/{scenarioLogId}.log
 *     failure-repro.md   (only on FAIL)
 *
 * Phase D2 (daily simulator) layout:
 *   reports/virtual-student-daily/YYYY-MM-DD/
 *     run-summary.json
 *     run-summary.md
 *     plan.json                (always written; the planner output)
 *     state-snapshot.json      (only after a successful daily run)
 *     scheduler.log            (written by run-nightly.ps1, not this module)
 *     screenshots/{name}.png
 *     logs/{logId}.log
 *     failure-repro.md         (only on FAIL)
 *
 * The longitudinal state file (state.json + state.json.bak + timeline.md)
 * is OWNED BY [longitudinal-state.mjs](longitudinal-state.mjs), NOT by
 * this module, because it lives outside the repo (see
 * VIRTUAL_STUDENT_DAILY_STATE_DIR).
 *
 * No PINs / passwords / Bearer tokens are written. Only env variable NAMES
 * appear in failure-repro.md so the operator can reproduce without leaking
 * secrets.
 */
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";

export function makeRunArtifacts({ repoRoot, runId }) {
  const root = join(repoRoot, "reports", "virtual-student-qa", runId);
  const screenshotsDir = join(root, "screenshots");
  const logsDir = join(root, "logs");
  mkdirSync(root, { recursive: true });
  mkdirSync(screenshotsDir, { recursive: true });
  mkdirSync(logsDir, { recursive: true });

  return {
    root,
    paths: { root, screenshots: screenshotsDir, logs: logsDir },

    async saveScreenshot(page, name) {
      const safe = String(name).replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = join(screenshotsDir, `${safe}.png`);
      try {
        await page.screenshot({ path: filePath, fullPage: true });
      } catch {
        // Page may already be closed during failure paths; ignore.
      }
      return filePath;
    },

    appendLog(scenarioLogId, line) {
      const safe = String(scenarioLogId).replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = join(logsDir, `${safe}.log`);
      const stamped = `[${new Date().toISOString()}] ${line}\n`;
      try {
        appendFileSync(filePath, stamped, "utf8");
      } catch {
        // Ignore log write errors.
      }
    },

    writeJsonSummary(summary) {
      writeFileSync(join(root, "run-summary.json"), JSON.stringify(summary, null, 2), "utf8");
    },

    writeMarkdownSummary(markdown) {
      writeFileSync(join(root, "run-summary.md"), markdown, "utf8");
    },

    writeFailureRepro(text) {
      writeFileSync(join(root, "failure-repro.md"), text, "utf8");
    },
  };
}

export function newRunId() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return [
    now.getUTCFullYear(),
    pad(now.getUTCMonth() + 1),
    pad(now.getUTCDate()),
    "T",
    pad(now.getUTCHours()),
    pad(now.getUTCMinutes()),
    pad(now.getUTCSeconds()),
    "Z",
  ].join("");
}

/**
 * Phase D2 — daily artifact writer.
 *
 * Writes everything under `reports/virtual-student-daily/<date>/`. The
 * date is the canonical YYYY-MM-DD calendar date for the simulated day,
 * not the wall-clock timestamp of the run. This is what makes a missed
 * day's catch-up run discoverable: re-running with `--date 2026-05-22`
 * lands its artifacts in the same dated folder regardless of when it
 * actually executed.
 *
 * Idempotency: the same dated folder may be written more than once (e.g.
 * dry-run followed by full run, or a `--force` rerun). This module
 * overwrites existing files for that day. The PREVIOUS day's artifacts
 * are never touched.
 */
export function makeDailyArtifacts({ repoRoot, date }) {
  if (!repoRoot) throw new Error("makeDailyArtifacts: repoRoot required");
  const safeDate = String(date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(safeDate)) {
    throw new Error(
      `makeDailyArtifacts: date must be YYYY-MM-DD (got: ${String(date)})`
    );
  }
  const root = join(repoRoot, "reports", "virtual-student-daily", safeDate);
  const screenshotsDir = join(root, "screenshots");
  const logsDir = join(root, "logs");
  mkdirSync(root, { recursive: true });
  mkdirSync(screenshotsDir, { recursive: true });
  mkdirSync(logsDir, { recursive: true });

  return {
    root,
    date: safeDate,
    paths: { root, screenshots: screenshotsDir, logs: logsDir },

    async saveScreenshot(page, name) {
      const safe = String(name).replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = join(screenshotsDir, `${safe}.png`);
      try {
        await page.screenshot({ path: filePath, fullPage: true });
      } catch {
        // Ignore — page may already be closed during failure paths.
      }
      return filePath;
    },

    appendLog(logId, line) {
      const safe = String(logId).replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = join(logsDir, `${safe}.log`);
      const stamped = `[${new Date().toISOString()}] ${line}\n`;
      try {
        appendFileSync(filePath, stamped, "utf8");
      } catch {
        // Ignore log write errors.
      }
    },

    writeJsonSummary(summary) {
      writeFileSync(
        join(root, "run-summary.json"),
        JSON.stringify(summary, null, 2),
        "utf8"
      );
    },

    writeMarkdownSummary(markdown) {
      writeFileSync(join(root, "run-summary.md"), markdown, "utf8");
    },

    writeFailureRepro(text) {
      writeFileSync(join(root, "failure-repro.md"), text, "utf8");
    },

    /** Always written (dry-run or full run). The planner output. */
    writePlanArtifact(plan) {
      writeFileSync(
        join(root, "plan.json"),
        JSON.stringify(plan, null, 2),
        "utf8"
      );
    },

    /**
     * Snapshot of the longitudinal state AFTER this day's run, copied
     * into the daily folder for audit. The canonical state file lives
     * in resolveStateDir(); this is just a read-only copy.
     */
    writeStateSnapshot(state) {
      writeFileSync(
        join(root, "state-snapshot.json"),
        JSON.stringify(state, null, 2),
        "utf8"
      );
    },

    /**
     * E5.1 — machine-readable parent report evidence (JSON + MD).
     * reports/virtual-student-daily/<date>/parent-report-snapshots/<label>-<phase>.{json,md}
     */
    writeParentReportEvidence(evidence) {
      if (!evidence?.studentLabel || !evidence?.phase) {
        throw new Error("writeParentReportEvidence: studentLabel and phase required");
      }
      const dir = join(root, "parent-report-snapshots");
      mkdirSync(dir, { recursive: true });
      const safeLabel = String(evidence.studentLabel).replace(/[^a-zA-Z0-9._-]/g, "_");
      const safePhase = String(evidence.phase).replace(/[^a-zA-Z0-9._-]/g, "_");
      const base = join(dir, `${safeLabel}-${safePhase}`);
      writeFileSync(`${base}.json`, JSON.stringify(evidence, null, 2), "utf8");
      return base;
    },

    writeParentReportEvidenceMarkdown(evidence, markdown) {
      const dir = join(root, "parent-report-snapshots");
      mkdirSync(dir, { recursive: true });
      const safeLabel = String(evidence.studentLabel).replace(/[^a-zA-Z0-9._-]/g, "_");
      const safePhase = String(evidence.phase).replace(/[^a-zA-Z0-9._-]/g, "_");
      const mdPath = join(dir, `${safeLabel}-${safePhase}.md`);
      writeFileSync(mdPath, markdown, "utf8");
      return mdPath;
    },
  };
}
