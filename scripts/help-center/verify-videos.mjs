#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateVideoFile } from "./video-quality.mjs";
import {
  ASSET_KIND_CAPTURED,
  collectDuplicateChecksumFailures,
  collectPlaceholderPublicationFailures,
  collectReviewStatusFailures,
  isCapturedEntry,
  isPlaceholderEntry,
  publicDiskPath,
  resolveEntryAssetKind,
} from "./video-asset-guards.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const manifestPath = join(root, "data", "help-center", "videos-manifest.json");
const publicVideos = join(root, "public", "help-center", "videos");
const auditVideos = join(root, "qa-evidence-audit", "help-center", "videos");

function main() {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const errors = [];
  let capturedWebm = 0;
  let capturedPoster = 0;

  if (manifest.videos.length !== 42) {
    errors.push(`Expected 42 manifest entries, got ${manifest.videos.length}`);
  }

  for (const entry of manifest.videos) {
    if (JSON.stringify(entry.viewports) !== JSON.stringify(["desktop", "mobile"])) {
      errors.push(`${entry.id}: invalid viewports`);
    }
    const kind = resolveEntryAssetKind(entry, manifest);
    if (kind !== ASSET_KIND_CAPTURED && kind !== "placeholder") {
      errors.push(`${entry.id}: unknown assetKind "${kind}"`);
    }

    for (const vp of ["desktop", "mobile"]) {
      if (entry.assets[vp].mp4 != null) {
        errors.push(`${entry.id}: mp4 must be null`);
      }
      for (const fileKind of ["webm", "poster"]) {
        const rel = entry.assets[vp][fileKind === "webm" ? "webm" : "poster"];
        const disk = publicDiskPath(publicVideos, rel);

        if (isPlaceholderEntry(entry, manifest)) {
          if (existsSync(disk)) {
            errors.push(
              `${rel}: placeholder manifest entry must not be served from public/ (remove or quarantine)`
            );
          }
          continue;
        }

        if (!existsSync(disk)) {
          errors.push(`${rel}: missing captured asset in public/`);
          continue;
        }

        const q = evaluateVideoFile({
          filePath: disk,
          viewport: vp,
          kind: fileKind === "webm" ? "webm" : "poster",
        });
        if (!q.ok) {
          errors.push(`${rel}: ${q.reasons.join("; ")}`);
          continue;
        }
        if (fileKind === "webm") capturedWebm++;
        else capturedPoster++;
      }
    }
  }

  errors.push(...collectReviewStatusFailures(manifest));
  errors.push(
    ...collectDuplicateChecksumFailures({
      manifest,
      publicVideosRoot: publicVideos,
      viewport: "desktop",
      kind: "webm",
    })
  );
  errors.push(
    ...collectDuplicateChecksumFailures({
      manifest,
      publicVideosRoot: publicVideos,
      viewport: "mobile",
      kind: "webm",
    })
  );
  errors.push(
    ...collectDuplicateChecksumFailures({
      manifest,
      publicVideosRoot: publicVideos,
      viewport: "desktop",
      kind: "poster",
    })
  );
  errors.push(
    ...collectDuplicateChecksumFailures({
      manifest,
      publicVideosRoot: publicVideos,
      viewport: "mobile",
      kind: "poster",
    })
  );
  errors.push(
    ...collectPlaceholderPublicationFailures({
      manifest,
      publicVideosRoot: publicVideos,
      auditVideosRoot: auditVideos,
    })
  );

  const orphans = [];
  function walk(dir, prefix = "") {
    if (!existsSync(dir)) return;
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) walk(p, `${prefix}${ent.name}/`);
      else {
        const rel = `help-center/videos/${prefix}${ent.name}`.replace(/\\/g, "/");
        if (!manifest.publicPaths.includes(rel)) orphans.push(rel);
      }
    }
  }
  walk(publicVideos);
  if (orphans.length) {
    errors.push(`Orphan files under public/: ${orphans.length}`);
    orphans.slice(0, 5).forEach((o) => errors.push(`  orphan: ${o}`));
  }

  const capturedCount = manifest.videos.filter((v) =>
    isCapturedEntry(v, manifest)
  ).length;
  const placeholderCount = manifest.videos.length - capturedCount;

  if (errors.length) {
    console.error(`verify-videos FAILED (${errors.length} issue(s)):`);
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log(
    `OK: 42 entries (${capturedCount} captured, ${placeholderCount} placeholder dormant); ` +
      `public webm=${capturedWebm}, posters=${capturedPoster}; ` +
      `mp4 deferred; no placeholder publication; checksum gates active`
  );
}

main();
