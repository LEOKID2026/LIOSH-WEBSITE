#!/usr/bin/env node
/**
 * Copy raw audit PNGs to public/ when they pass capture-quality gates (section crops).
 * Does not require full 135/135 approved manifest — for visual QA after partial re-capture.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateScreenshotFile, MIN_CAPTURE_BYTES } from "./capture-quality.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const manifestPath = join(root, "data", "help-center", "screenshots-manifest.json");
const auditRoot = join(root, "qa-evidence-audit", "help-center");
const publicRoot = join(root, "public");

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
  let copied = 0;
  let skipped = 0;
  const skipSamples = [];

  for (const rel of required) {
    const auditPath = relToAuditPath(rel);
    const pubPath = join(publicRoot, rel);
    if (!existsSync(auditPath)) {
      skipped++;
      if (skipSamples.length < 15) skipSamples.push({ rel, reason: "missing raw" });
      continue;
    }
    const quality = evaluateScreenshotFile({
      filePath: auditPath,
      viewport: viewportFromRel(rel),
      minBytes: MIN_CAPTURE_BYTES,
    });
    if (!quality.ok) {
      skipped++;
      if (skipSamples.length < 15) {
        skipSamples.push({ rel, reason: quality.reasons.join("; ") });
      }
      continue;
    }
    mkdirSync(dirname(pubPath), { recursive: true });
    copyFileSync(auditPath, pubPath);
    copied++;
  }

  console.log(`Synced ${copied}/${required.length} screenshot(s) to public/ (${skipped} skipped)`);
  if (skipSamples.length) {
    console.log("Skipped samples:");
    for (const s of skipSamples) console.log(`  - ${s.rel}: ${s.reason}`);
  }
  process.exit(copied === required.length ? 0 : 1);
}

main();
