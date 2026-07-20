import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * @param {string} filename
 */
function loadEnvFile(filename) {
  const envPath = path.join(ROOT, filename);
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

export function loadAllProjectEnv() {
  for (const file of [
    ".env.local",
    ".env.e2e.local",
    ".env.vercel.local",
    ".env.vercel.prod.check",
  ]) {
    loadEnvFile(file);
  }
}

export { ROOT };
