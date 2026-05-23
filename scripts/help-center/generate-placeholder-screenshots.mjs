#!/usr/bin/env node
/**
 * Writes minimal placeholder PNGs to qa-evidence-audit/help-center/
 * for every path in screenshots-manifest.json (demo-safe solid frames).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MIN_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const manifestPath = join(root, "data", "help-center", "screenshots-manifest.json");
const auditRoot = join(root, "qa-evidence-audit", "help-center");

function main() {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  let written = 0;
  for (const rel of manifest.publicPaths || []) {
    const parts = rel.replace(/^help-center\/screenshots\//, "").split("/");
    const auditPath = join(auditRoot, ...parts);
    if (existsSync(auditPath)) continue;
    mkdirSync(dirname(auditPath), { recursive: true });
    writeFileSync(auditPath, MIN_PNG);
    written++;
  }
  console.log(`Wrote ${written} placeholder PNG(s) under qa-evidence-audit/help-center/`);
}

main();
