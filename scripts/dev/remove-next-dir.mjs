/**
 * Remove .next with retries (Windows dev server may briefly lock files).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const NEXT_DIR = path.join(ROOT, ".next");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function removeNextDirWithRetries(maxAttempts = 15, delayMs = 1000) {
  if (!fs.existsSync(NEXT_DIR)) return;

  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      fs.rmSync(NEXT_DIR, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      return;
    } catch (err) {
      lastError = err;
      await sleep(delayMs);
    }
  }
  throw lastError ?? new Error("Failed to remove .next");
}

removeNextDirWithRetries().catch((err) => {
  console.error("[remove-next-dir] Failed:", err?.message || err);
  process.exit(1);
});
