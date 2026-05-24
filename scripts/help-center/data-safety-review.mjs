#!/usr/bin/env node
/**
 * Data-safety + quality review for raw Help Center screenshots.
 * Writes data/help-center/screenshots-manifest-approved.json only when all manifest paths pass.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateScreenshotFile, MIN_CAPTURE_BYTES } from "./capture-quality.mjs";
import { loadCaptureState } from "./capture-state.mjs";

const FORBIDDEN_PATTERNS = [/@gmail\.com/i, /\b\d{3}-\d{7}\b/];

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const manifestPath = join(root, "data", "help-center", "screenshots-manifest.json");
const auditRoot = join(root, "qa-evidence-audit", "help-center");
const outPath = join(root, "data", "help-center", "screenshots-manifest-approved.json");

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
  const approved = [];
  const rejected = [];
  /** @type {Map<string, string>} hash -> first rel */
  const hashOwners = new Map();
  const captureState = loadCaptureState();
  for (const [key, meta] of Object.entries(captureState.jobs || {})) {
    if (!meta.sha256) continue;
    const rel = `help-center/screenshots/${key}.png`;
    if (!hashOwners.has(meta.sha256)) hashOwners.set(meta.sha256, rel);
  }

  for (const rel of required) {
    const auditPath = relToAuditPath(rel);
    if (!existsSync(auditPath)) {
      rejected.push({ rel, reason: "missing raw file" });
      continue;
    }

    const viewport = viewportFromRel(rel);
    const quality = evaluateScreenshotFile({
      filePath: auditPath,
      viewport,
      minBytes: MIN_CAPTURE_BYTES,
    });
    if (!quality.ok) {
      rejected.push({ rel, reason: quality.reasons.join("; ") });
      continue;
    }

    const hash = quality.sha256;
    if (hashOwners.has(hash) && hashOwners.get(hash) !== rel) {
      rejected.push({
        rel,
        reason: `duplicate content hash (same file as ${hashOwners.get(hash)})`,
      });
      continue;
    }
    if (!hashOwners.has(hash)) hashOwners.set(hash, rel);

    const nameCheck = rel + auditPath;
    for (const pat of FORBIDDEN_PATTERNS) {
      if (pat.test(nameCheck)) {
        rejected.push({ rel, reason: `forbidden pattern in path metadata` });
        break;
      }
    }
    if (rejected.some((r) => r.rel === rel)) continue;

    approved.push(rel);
  }

  const fullPass = approved.length === required.length && rejected.length === 0;

  writeFileSync(
    outPath,
    `${JSON.stringify(
      {
        version: 1,
        reviewedAt: new Date().toISOString(),
        minBytes: MIN_CAPTURE_BYTES,
        requiredCount: required.length,
        approvedCount: approved.length,
        rejectedCount: rejected.length,
        publishAllowed: fullPass,
        publicPaths: fullPass ? approved : [],
        rejected,
        notes: [
          "Checks size, PNG dimensions, mobile height cap, duplicate SHA-256 across jobs.",
          "Demo account ADMIN / child ישראל ישראלי only.",
          "publishAllowed is true only when every manifest path is approved.",
        ],
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  console.log(
    `Approved: ${approved.length}/${required.length}, Rejected: ${rejected.length}, publishAllowed: ${fullPass}`
  );
  if (rejected.length) {
    console.warn("Rejected samples:");
    for (const r of rejected.slice(0, 20)) {
      console.warn(`  - ${r.rel}: ${r.reason}`);
    }
  }
  if (!fullPass) process.exit(1);
}

main();
