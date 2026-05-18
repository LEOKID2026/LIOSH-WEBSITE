#!/usr/bin/env node
/**
 * Export browser localStorage (mleo_*) to a regression fixture module.
 *
 * In DevTools on parent-report page (while logged in as child):
 *   copy(JSON.stringify(Object.fromEntries(
 *     Object.keys(localStorage).filter(k => k.startsWith('mleo_')).map(k => [k, localStorage.getItem(k)])
 *   )))
 *
 * Save as scripts/fixtures/snapshots/<name>-localStorage.json then:
 *   npm run export:parent-report-localStorage-fixture -- scripts/fixtures/snapshots/<name>-localStorage.json
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : null;

if (!inputPath || !existsSync(inputPath)) {
  console.error("Usage: npm run export:parent-report-localStorage-fixture -- <path-to-localStorage.json>");
  process.exit(1);
}

const snap = JSON.parse(readFileSync(inputPath, "utf8"));
const outDir = join(ROOT, "scripts", "fixtures", "snapshots");
mkdirSync(outDir, { recursive: true });
const baseName = inputPath.replace(/\\/g, "/").split("/").pop()?.replace(/\.json$/i, "") || "child-export";
const outPath = join(outDir, `${baseName}.fixture.mjs`);

const body = `/**
 * Auto-exported localStorage snapshot — ${new Date().toISOString()}
 * Source: ${inputPath}
 */
export const LOCAL_STORAGE_SNAPSHOT = ${JSON.stringify(snap, null, 2)};

export function getLocalStorageSnapshot() {
  return LOCAL_STORAGE_SNAPSHOT;
}

export default { LOCAL_STORAGE_SNAPSHOT, getLocalStorageSnapshot };
`;

writeFileSync(outPath, body, "utf8");
console.log(`Wrote ${outPath}`);
console.log("Run sign-off with:");
console.log(`  npm run test:parent-report-real-output-signoff -- --fixture ${outPath.replace(/\\/g, "/")}`);
