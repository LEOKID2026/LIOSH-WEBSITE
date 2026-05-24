#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  fileMatchesAnyHash,
  isCapturedEntry,
  readPlaceholderProvenance,
  resolveEntryAssetKind,
  templatePaths,
  hashFile,
  ASSET_KIND_CAPTURED,
} from "./video-asset-guards.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const manifestPath = join(root, "data", "help-center", "videos-manifest.json");
const approvedPath = join(root, "data", "help-center", "videos-manifest-approved.json");
const auditRoot = join(root, "qa-evidence-audit", "help-center", "videos");
const publicRoot = join(root, "public");

function main() {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (!existsSync(approvedPath)) {
    console.error("Missing videos-manifest-approved.json — run help:video-data-safety-review");
    process.exit(1);
  }
  const doc = JSON.parse(readFileSync(approvedPath, "utf8"));
  if (!doc.publishAllowed) {
    console.error(`Publish blocked: publishAllowed=false (${doc.approvedCount}/${doc.requiredCount})`);
    process.exit(1);
  }

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

  let copied = 0;
  for (const rel of doc.publicPaths || []) {
    const entry = manifest.videos.find((v) =>
      [v.assets.desktop.webm, v.assets.mobile.webm, v.assets.desktop.poster, v.assets.mobile.poster].includes(
        rel
      )
    );
    if (!entry || !isCapturedEntry(entry, manifest)) {
      console.error(`Refusing to publish non-captured asset: ${rel}`);
      process.exit(1);
    }
    const vp = rel.includes("/mobile/") ? "mobile" : "desktop";
    if (entry.internalReview?.[vp]?.status !== "passed") {
      console.error(`Refusing to publish ${rel}: internalReview.${vp} is not passed`);
      process.exit(1);
    }
    const parts = rel.replace(/^help-center\/videos\//, "").split("/");
    const src = join(auditRoot, ...parts);
    const dest = join(publicRoot, rel);
    if (!existsSync(src)) {
      console.error(`Missing raw: ${src}`);
      process.exit(1);
    }
    if (fileMatchesAnyHash(src, templateHashes)) {
      console.error(`Refusing to publish placeholder template bytes: ${rel}`);
      process.exit(1);
    }
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
    copied++;
  }
  console.log(`Published ${copied} captured video asset(s) to public/`);
}

main();
