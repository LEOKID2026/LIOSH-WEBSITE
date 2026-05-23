#!/usr/bin/env node
/**
 * Agent internal data-safety review for raw Help Center screenshots.
 * - Rejects 1x1 placeholder PNGs (tiny file size)
 * - Writes data/help-center/screenshots-manifest-approved.json
 */
import { readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MIN_BYTES = 8_000;
const FORBIDDEN_PATTERNS = [
  /@gmail\.com/i,
  /\b\d{3}-\d{7}\b/,
];

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const manifestPath = join(root, "data", "help-center", "screenshots-manifest.json");
const auditRoot = join(root, "qa-evidence-audit", "help-center");
const outPath = join(root, "data", "help-center", "screenshots-manifest-approved.json");

function main() {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const approved = [];
  const rejected = [];

  for (const rel of manifest.publicPaths || []) {
    const parts = rel.replace(/^help-center\/screenshots\//, "").split("/");
    const auditPath = join(auditRoot, ...parts);
    if (!existsSync(auditPath)) {
      rejected.push({ rel, reason: "missing raw file" });
      continue;
    }
    const size = statSync(auditPath).size;
    if (size < MIN_BYTES) {
      rejected.push({ rel, reason: `file too small (${size} bytes) — likely placeholder` });
      continue;
    }
    approved.push(rel);
  }

  writeFileSync(
    outPath,
    `${JSON.stringify(
      {
        version: 1,
        reviewedAt: new Date().toISOString(),
        minBytes: MIN_BYTES,
        approvedCount: approved.length,
        rejectedCount: rejected.length,
        publicPaths: approved,
        rejected,
        notes: [
          "Review checks file size only; visual PII scan is manual in MANUAL-QA.md.",
          "Demo account ADMIN / child ישראל ישראלי only.",
        ],
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  console.log(`Approved: ${approved.length}, Rejected: ${rejected.length}`);
  if (rejected.length) {
    console.warn("Rejected samples:");
    for (const r of rejected.slice(0, 15)) {
      console.warn(`  - ${r.rel}: ${r.reason}`);
    }
  }
  if (approved.length === 0) {
    process.exit(1);
  }
}

main();
