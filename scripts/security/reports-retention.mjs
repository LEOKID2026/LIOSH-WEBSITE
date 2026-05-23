#!/usr/bin/env node
/**
 * Dry-run by default — removes nothing unless --apply is passed.
 * Targets reports/ QA artifacts only (never public/).
 */
import { readdir, stat, unlink } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const REPORTS_DIR = join(ROOT, "reports");
const DEFAULT_MAX_AGE_DAYS = 30;
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const maxAgeDays = Number(args.find((a) => a.startsWith("--max-age-days="))?.split("=")[1]) || DEFAULT_MAX_AGE_DAYS;
const cutoffMs = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

async function walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
      continue;
    }
    files.push(full);
  }
  return files;
}

async function main() {
  const files = await walk(REPORTS_DIR);
  const stale = [];
  for (const file of files) {
    const info = await stat(file);
    if (info.mtimeMs < cutoffMs) stale.push(file);
  }

  console.log(`reports retention scan: ${files.length} files, ${stale.length} older than ${maxAgeDays} days`);
  console.log(`mode: ${apply ? "APPLY (destructive)" : "DRY-RUN (default)"}`);

  for (const file of stale) {
    console.log(apply ? `delete: ${file}` : `would-delete: ${file}`);
    if (apply) await unlink(file);
  }

  if (!apply && stale.length > 0) {
    console.log("Pass --apply to delete stale files.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
