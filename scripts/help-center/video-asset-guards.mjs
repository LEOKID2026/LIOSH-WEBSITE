/**
 * Shared guards: placeholder vs real captured Help Center video assets.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const ASSET_KIND_PLACEHOLDER = "placeholder";
export const ASSET_KIND_CAPTURED = "captured";

export const PLACEHOLDER_PROVENANCE_FILE = ".placeholder-provenance.json";

export function resolveEntryAssetKind(entry, manifest) {
  return entry?.assetKind ?? manifest?.assetKindDefault ?? ASSET_KIND_PLACEHOLDER;
}

export function isCapturedEntry(entry, manifest) {
  return resolveEntryAssetKind(entry, manifest) === ASSET_KIND_CAPTURED;
}

export function isPlaceholderEntry(entry, manifest) {
  return !isCapturedEntry(entry, manifest);
}

export function hashFile(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

export function publicDiskPath(publicVideosRoot, rel) {
  const parts = rel.replace(/^help-center\/videos\//, "").split("/");
  return join(publicVideosRoot, ...parts);
}

export function groupPathsByHash(paths) {
  const groups = new Map();
  for (const p of paths) {
    const h = hashFile(p);
    if (!groups.has(h)) groups.set(h, []);
    groups.get(h).push(p);
  }
  return groups;
}

export function readPlaceholderProvenance(auditVideosRoot) {
  const p = join(auditVideosRoot, PLACEHOLDER_PROVENANCE_FILE);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return { corrupt: true, path: p };
  }
}

export function templatePaths(auditVideosRoot) {
  return {
    desktopWebm: join(auditVideosRoot, "_templates", "desktop", "main.webm"),
    mobileWebm: join(auditVideosRoot, "_templates", "mobile", "main.webm"),
    desktopPoster: join(auditVideosRoot, "_templates", "desktop", "poster.jpg"),
    mobilePoster: join(auditVideosRoot, "_templates", "mobile", "poster.jpg"),
  };
}

export function fileMatchesAnyHash(filePath, hashes) {
  if (!existsSync(filePath) || !hashes?.length) return false;
  const h = hashFile(filePath);
  return hashes.includes(h);
}

/**
 * Fail when multiple captured public clips share a checksum (unless whitelisted).
 */
export function collectDuplicateChecksumFailures({
  manifest,
  publicVideosRoot,
  viewport,
  kind = "webm",
}) {
  const failures = [];
  const paths = [];
  for (const entry of manifest.videos || []) {
    if (!isCapturedEntry(entry, manifest)) continue;
    const rel = entry.assets[viewport][kind === "webm" ? "webm" : "poster"];
    const disk = publicDiskPath(publicVideosRoot, rel);
    if (existsSync(disk)) paths.push(disk);
  }
  if (paths.length <= 1) return failures;

  const groups = groupPathsByHash(paths);
  const whitelist =
    manifest.checksumWhitelist?.[viewport]?.[kind] ||
    manifest.checksumWhitelist?.[viewport] ||
    [];

  if (groups.size === 1) {
    failures.push(
      `All ${paths.length} published ${viewport} ${kind} files share one checksum (global duplicate — not allowed for captured assets)`
    );
  }

  for (const [hash, list] of groups.entries()) {
    if (list.length <= 1) continue;
    if (whitelist.includes(hash)) continue;
    failures.push(
      `Duplicate ${viewport} ${kind} checksum ${hash.slice(0, 16)}… across ${list.length} captured files (not whitelisted)`
    );
  }
  return failures;
}

/**
 * Detect published files that are byte-identical to placeholder templates.
 */
export function collectPlaceholderPublicationFailures({
  manifest,
  publicVideosRoot,
  auditVideosRoot,
}) {
  const failures = [];
  const provenance = readPlaceholderProvenance(auditVideosRoot);
  const tpl = templatePaths(auditVideosRoot);
  const templateHashes = new Set(
    [
      provenance?.templates?.desktop?.webmSha256,
      provenance?.templates?.mobile?.webmSha256,
      provenance?.templates?.desktop?.posterSha256,
      provenance?.templates?.mobile?.posterSha256,
    ].filter(Boolean)
  );

  for (const ent of ["desktop", "mobile"]) {
    const webmTpl = tpl[`${ent}Webm`];
    const posterTpl = tpl[`${ent}Poster`];
    if (existsSync(webmTpl)) templateHashes.add(hashFile(webmTpl));
    if (existsSync(posterTpl)) templateHashes.add(hashFile(posterTpl));
  }

  if (!existsSync(publicVideosRoot)) return failures;

  function walk(dir, acc = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p, acc);
      else acc.push(p);
    }
    return acc;
  }

  const published = walk(publicVideosRoot);
  for (const file of published) {
    if (!existsSync(file)) continue;
    const h = hashFile(file);
    if (templateHashes.has(h)) {
      failures.push(
        `Published file matches placeholder template/provenance hash: ${file.replace(/\\/g, "/")}`
      );
    }
  }

  if (provenance?.source === "help:placeholders-videos") {
    const capturedInPublic = (manifest.videos || []).some((entry) => {
      if (!isCapturedEntry(entry, manifest)) return false;
      for (const vp of ["desktop", "mobile"]) {
        for (const kind of ["webm", "poster"]) {
          const rel = entry.assets[vp][kind === "webm" ? "webm" : "poster"];
          if (existsSync(publicDiskPath(publicVideosRoot, rel))) return true;
        }
      }
      return false;
    });
    if (capturedInPublic) {
      failures.push(
        "Placeholder provenance marker present but manifest marks captured assets as published in public/"
      );
    }
  }

  return failures;
}

export function collectReviewStatusFailures(manifest) {
  const failures = [];
  for (const entry of manifest.videos || []) {
    if (!isPlaceholderEntry(entry, manifest)) continue;
    for (const vp of ["desktop", "mobile"]) {
      const st = entry.internalReview?.[vp]?.status;
      if (st === "passed") {
        failures.push(
          `${entry.id} (${vp}): internalReview must not be "passed" for placeholder assets`
        );
      }
    }
  }
  return failures;
}
