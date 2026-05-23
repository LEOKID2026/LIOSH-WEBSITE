#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const approvedPath = join(root, "data", "help-center", "screenshots-manifest-approved.json");
const manifestPath = join(root, "data", "help-center", "screenshots-manifest.json");
const publicRoot = join(root, "public");

function main() {
  const manifestFile = existsSync(approvedPath) ? approvedPath : manifestPath;
  if (!existsSync(manifestFile)) {
    console.error("Missing screenshots manifest — run: npm run help:build-manifest");
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
  const missing = [];
  for (const rel of manifest.publicPaths || []) {
    const disk = join(publicRoot, rel.replace(/\//g, "\\"));
    const diskUnix = join(publicRoot, rel);
    if (!existsSync(disk) && !existsSync(diskUnix)) {
      missing.push(rel);
    }
  }
  if (missing.length) {
    console.error(`Missing ${missing.length} published screenshot(s):`);
    for (const m of missing.slice(0, 20)) console.error(`  - ${m}`);
    if (missing.length > 20) console.error(`  ... and ${missing.length - 20} more`);
    process.exit(1);
  }
  console.log(`OK: ${manifest.publicPaths.length} screenshot files present under public/`);
}

main();
