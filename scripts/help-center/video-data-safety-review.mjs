#!/usr/bin/env node
/**
 * Internal data-safety review for Help Center videos — updates manifest internalReview.
 * Placeholder assets are never approved for publish; only assetKind "captured" may pass.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateVideoFile } from "./video-quality.mjs";
import {
  ASSET_KIND_CAPTURED,
  isCapturedEntry,
  isPlaceholderEntry,
  readPlaceholderProvenance,
  resolveEntryAssetKind,
  templatePaths,
  hashFile,
  fileMatchesAnyHash,
} from "./video-asset-guards.mjs";

const FORBIDDEN_PATTERNS = [/@gmail\.com/i, /\b\d{3}-\d{7}\b/];

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const manifestPath = join(root, "data", "help-center", "videos-manifest.json");
const approvedPath = join(root, "data", "help-center", "videos-manifest-approved.json");
const auditRoot = join(root, "qa-evidence-audit", "help-center", "videos");

function auditPath(rel) {
  const parts = rel.replace(/^help-center\/videos\//, "").split("/");
  return join(auditRoot, ...parts);
}

function main() {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const approvedPaths = [];
  const rejected = [];
  const provenance = readPlaceholderProvenance(auditRoot);
  const tpl = templatePaths(auditRoot);
  const templateHashes = [
    provenance?.templates?.desktop?.webmSha256,
    provenance?.templates?.mobile?.webmSha256,
    provenance?.templates?.desktop?.posterSha256,
    provenance?.templates?.mobile?.posterSha256,
  ].filter(Boolean);
  if (existsSync(tpl.desktopWebm)) templateHashes.push(hashFile(tpl.desktopWebm));
  if (existsSync(tpl.mobileWebm)) templateHashes.push(hashFile(tpl.mobileWebm));
  if (existsSync(tpl.desktopPoster)) templateHashes.push(hashFile(tpl.desktopPoster));
  if (existsSync(tpl.mobilePoster)) templateHashes.push(hashFile(tpl.mobilePoster));

  for (const entry of manifest.videos) {
    for (const vp of ["desktop", "mobile"]) {
      const webmRel = entry.assets[vp].webm;
      const posterRel = entry.assets[vp].poster;
      const webmPath = auditPath(webmRel);
      const posterPath = auditPath(posterRel);

      let status = "excluded";
      let reason = "not reviewed";

      if (isPlaceholderEntry(entry, manifest)) {
        reason =
          "placeholder scaffold — not a real article capture (internalReview must not pass)";
        entry.internalReview[vp] = { status, reason };
        rejected.push({ id: `${entry.id}/${vp}`, reason });
        continue;
      }

      if (resolveEntryAssetKind(entry, manifest) !== ASSET_KIND_CAPTURED) {
        reason = `unknown assetKind — only "${ASSET_KIND_CAPTURED}" may pass review`;
        entry.internalReview[vp] = { status, reason };
        rejected.push({ id: `${entry.id}/${vp}`, reason });
        continue;
      }

      status = "passed";
      reason = null;

      const wq = evaluateVideoFile({ filePath: webmPath, viewport: vp, kind: "webm" });
      if (!wq.ok) {
        status = "excluded";
        reason = wq.reasons.join("; ");
      }
      const pq = evaluateVideoFile({ filePath: posterPath, viewport: vp, kind: "poster" });
      if (status === "passed" && !pq.ok) {
        status = "excluded";
        reason = pq.reasons.join("; ");
      }
      if (status === "passed" && fileMatchesAnyHash(webmPath, templateHashes)) {
        status = "excluded";
        reason = "webm matches help:placeholders-videos template (not a real capture)";
      }
      if (status === "passed" && fileMatchesAnyHash(posterPath, templateHashes)) {
        status = "excluded";
        reason = "poster matches help:placeholders-videos template (not a real capture)";
      }
      if (status === "passed") {
        const meta = webmRel + posterRel;
        for (const pat of FORBIDDEN_PATTERNS) {
          if (pat.test(meta)) {
            status = "excluded";
            reason = "forbidden pattern in path metadata";
            break;
          }
        }
      }

      entry.internalReview[vp] = { status, reason };
      if (status === "passed") {
        approvedPaths.push(webmRel, posterRel);
      } else {
        rejected.push({ id: `${entry.id}/${vp}`, reason });
      }
    }
  }

  const capturedEntries = manifest.videos.filter((v) => isCapturedEntry(v, manifest));
  const requiredCount = capturedEntries.length * 4;
  const fullPass =
    capturedEntries.length > 0 &&
    approvedPaths.length === requiredCount &&
    rejected.length === 0;

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  writeFileSync(
    approvedPath,
    `${JSON.stringify(
      {
        version: 1,
        reviewedAt: new Date().toISOString(),
        requiredCount,
        approvedCount: approvedPaths.length,
        rejectedCount: rejected.length,
        publishAllowed: fullPass,
        publicPaths: fullPass ? approvedPaths : [],
        rejected,
        notes: [
          "Internal agent review only — not a user approval checkpoint.",
          "Placeholder assets are never publishable and must not use internalReview.status=passed.",
          "publishAllowed true only when all captured (non-placeholder) assets pass.",
        ],
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  const placeholderCount = manifest.videos.length - capturedEntries.length;
  console.log(
    `Review: captured entries=${capturedEntries.length}, placeholder dormant=${placeholderCount}, ` +
      `approved ${approvedPaths.length}/${requiredCount}, rejected ${rejected.length}, publishAllowed=${fullPass}`
  );
  if (rejected.length) {
    for (const r of rejected.slice(0, 15)) console.warn(`  - ${r.id}: ${r.reason}`);
  }
  if (placeholderCount === manifest.videos.length) {
    console.log("All entries are placeholder — publish correctly blocked until real capture.");
    process.exit(0);
  }
  if (!fullPass) process.exit(1);
}

main();
