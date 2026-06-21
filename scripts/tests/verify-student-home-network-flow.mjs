#!/usr/bin/env node
/**
 * Simulates /student/home network waterfall + achievement-grants cooldown.
 * Run: node scripts/tests/verify-student-home-network-flow.mjs
 * Env: E2E creds via .env.e2e.local or E2E_STUDENT_USERNAME/PIN
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BASE = process.env.BASE_URL || "http://127.0.0.1:3001";

function loadEnv(file) {
  const p = resolve(ROOT, file);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(".env.e2e.local");

const username = process.env.E2E_STUDENT_USERNAME || "eran";
const pin = process.env.E2E_STUDENT_PIN || "7479";

async function login() {
  const res = await fetch(`${BASE}/api/student/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, pin }),
  });
  const m = res.headers.get("set-cookie")?.match(/liosh_student_session=([^;]+)/);
  if (!m) throw new Error("login failed — no session cookie");
  return `liosh_student_session=${m[1]}`;
}

async function timed(name, path, cookie, method = "GET") {
  const t0 = Date.now();
  const res = await fetch(`${BASE}${path}`, { method, headers: { cookie, accept: "application/json" } });
  const json = await res.json().catch(() => ({}));
  return { name, path, ms: Date.now() - t0, status: res.status, json };
}

async function main() {
  console.log("=== Student home network flow ===\n");
  const cookie = await login();

  const me = await timed("/me", "/api/student/me", cookie);
  const summary = await timed("/summary", "/api/student/home-profile/summary", cookie);
  const legacy = await timed("/legacy (should NOT be used by UI)", "/api/student/home-profile", cookie);

  const grants1 = await timed("/achievement-grants #1", "/api/student/home-profile/achievement-grants", cookie, "POST");
  const grants2 = await timed("/achievement-grants #2 (cooldown)", "/api/student/home-profile/achievement-grants", cookie, "POST");

  const rows = [me, summary, grants1, grants2];
  console.table(rows.map((r) => ({ endpoint: r.name, ms: r.ms, status: r.status })));

  const criticalMs = Math.max(me.ms, summary.ms);
  console.log("\nCritical path (parallel me+summary): ~%dms", criticalMs);
  console.log("Summary has accountSnapshot:", !!summary.json?.accountSnapshot);
  console.log("Summary has challenges.daily:", !!summary.json?.challenges?.daily?.missions?.length);
  console.log("Legacy monolith still exists (back-compat):", legacy.status, legacy.ms + "ms");

  console.log("\nAchievement grants #1 skipped:", grants1.json?.skipped);
  console.log("Achievement grants #2 skipped:", grants2.json?.skipped, grants2.json?.skipReason || "");
  console.log("Grants #2 ms (expect fast if cooldown):", grants2.ms);

  const ok =
    summary.json?.accountSnapshot &&
    grants2.json?.skipped === true &&
    grants2.ms < 2500 &&
    criticalMs < 8000;

  if (!ok) {
    console.error("\nVERIFY FAILED");
    process.exit(1);
  }
  console.log("\nVERIFY OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
