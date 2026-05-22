/**
 * Artifact writer for virtual-student-qa runs.
 *
 * Layout:
 *   reports/virtual-student-qa/{ISO-timestamp}/
 *     run-summary.json
 *     run-summary.md
 *     screenshots/{name}.png
 *     logs/{scenarioLogId}.log
 *     failure-repro.md   (only on FAIL)
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
