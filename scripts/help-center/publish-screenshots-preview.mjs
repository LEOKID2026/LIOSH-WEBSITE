#!/usr/bin/env node
/**
 * Dev-only: copy ready raw screenshots to public/ without requiring 135/135 approval.
 * Missing paths stay absent — enable NEXT_PUBLIC_HELP_CENTER_ALLOW_MISSING_SCREENSHOTS=1 for placeholders.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateScreenshotFile, MIN_APPROVED_BYTES } from "./capture-quality.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const manifestPath = join(root, "data", "help-center", "screenshots-manifest.json");
const auditRoot = join(root, "qa-evidence-audit", "help-center");
const publicRoot = join(root, "public");
const reportPath = join(root, "docs", "help-center", "PREVIEW-PUBLISH-REPORT.json");

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

function relToAuditPath(rel) {
  const parts = rel.replace(/^help-center\/screenshots\//, "").split("/");
  return join(auditRoot, ...parts);
}

function viewportFromRel(rel) {
  const parts = rel.split("/");
  const vp = parts[parts.length - 2];
  if (vp === "mobile" || vp === "tablet" || vp === "desktop") return vp;
  return "desktop";
}

function main() {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const required = manifest.publicPaths || [];
  const copied = [];
  const skipped = [];

  for (const rel of required) {
    const auditPath = relToAuditPath(rel);
    const pubPath = join(publicRoot, rel);

    if (!existsSync(auditPath)) {
      skipped.push({ rel, reason: "missing raw file" });
      continue;
    }

    const quality = evaluateScreenshotFile({
      filePath: auditPath,
      viewport: viewportFromRel(rel),
      minBytes: MIN_APPROVED_BYTES,
    });
    if (!quality.ok) {
      skipped.push({ rel, reason: quality.reasons.join("; ") });
      continue;
    }

    ensureDir(dirname(pubPath));
    copyFileSync(auditPath, pubPath);
    copied.push(rel);
  }

  const report = {
    mode: "preview",
    publishedAt: new Date().toISOString(),
    requiredCount: required.length,
    copiedCount: copied.length,
    skippedCount: skipped.length,
    copied,
    skipped,
    notes: [
      "Not for production sign-off. Run full help:data-safety-review + help:publish-screenshots when 135/135 ready.",
      "Set NEXT_PUBLIC_HELP_CENTER_ALLOW_MISSING_SCREENSHOTS=1 to show placeholders for missing images.",
    ],
  };

  ensureDir(dirname(reportPath));
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(
    `Preview publish: ${copied.length}/${required.length} copied to public/ (${skipped.length} skipped)`
  );
  console.log(`Report: docs/help-center/PREVIEW-PUBLISH-REPORT.json`);
  if (skipped.length) {
    console.warn("Skipped samples:");
    for (const s of skipped.slice(0, 15)) {
      console.warn(`  - ${s.rel}: ${s.reason}`);
    }
    if (skipped.length > 15) console.warn(`  ... and ${skipped.length - 15} more`);
  }
}

main();
