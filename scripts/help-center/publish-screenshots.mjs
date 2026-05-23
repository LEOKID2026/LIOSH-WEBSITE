#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const approvedPath = join(root, "data", "help-center", "screenshots-manifest-approved.json");
const manifestPath = join(root, "data", "help-center", "screenshots-manifest.json");
const auditRoot = join(root, "qa-evidence-audit", "help-center");
const publicRoot = join(root, "public");

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

function main() {
  const manifestFile = existsSync(approvedPath) ? approvedPath : manifestPath;
  const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
  let copied = 0;
  let skipped = 0;

  for (const rel of manifest.publicPaths || []) {
    const pubPath = join(publicRoot, rel);
    ensureDir(dirname(pubPath));

    const parts = rel.replace(/^help-center\/screenshots\//, "").split("/");
    const section = parts[0];
    const slug = parts[1];
    const viewport = parts[2];
    const file = parts[3];
    const auditPath = join(auditRoot, section, slug, viewport, file);

    if (!existsSync(auditPath)) {
      console.warn(`SKIP (no raw): ${rel}`);
      skipped++;
      continue;
    }
    copyFileSync(auditPath, pubPath);
    copied++;
  }

  console.log(`Published ${copied} file(s), skipped ${skipped}`);
  if (skipped > 0) process.exit(1);
}

main();
