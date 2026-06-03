#!/usr/bin/env node
/**
 * Windows-only: remove stale .next before production build.
 * Prevents ENOENT/ENOTEMPTY unlink races during Next.js static generation
 * when a prior build left partial artifacts or files were locked mid-write.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const NEXT_DIR = path.join(ROOT, ".next");

/** @param {number} ms */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** @param {string} dir @param {number} attempts */
async function removeDirWithRetry(dir, attempts = 4) {
  if (!fs.existsSync(dir)) return;
  for (let i = 0; i < attempts; i += 1) {
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      return;
    } catch (err) {
      if (i === attempts - 1) {
        console.error(`ensure-clean-next-build: failed to remove ${dir}`);
        throw err;
      }
      await sleep(400 * (i + 1));
    }
  }
}

async function main() {
  if (process.platform !== "win32") return;
  if (!fs.existsSync(NEXT_DIR)) return;
  await removeDirWithRetry(NEXT_DIR);
}

main();
