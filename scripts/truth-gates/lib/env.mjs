import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const TRUTH_GATES_ROOT = resolve(__dirname, "../../..");

/** @param {string[]} files */
export function loadEnvFiles(files = [".env.local", ".env.e2e.local"]) {
  for (const file of files) {
    const p = resolve(TRUTH_GATES_ROOT, file);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

export function hasLiveSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL &&
      process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY
  );
}

export function hasLiveParentE2EEnv() {
  const email =
    process.env.E2E_PARENT_EMAIL ||
    process.env.E2E_PARENT_USERNAME ||
    "";
  const password =
    process.env.E2E_PARENT_PASSWORD ||
    process.env.SIM_TEACHER_PARENT_PASSWORD ||
    "";
  return Boolean(email && password);
}

export function baseUrl() {
  return (
    process.env.TRUTH_GATES_BASE_URL ||
    process.env.PLAYWRIGHT_BASE_URL ||
    process.env.QA_BASE_URL ||
    "http://127.0.0.1:3002"
  );
}
