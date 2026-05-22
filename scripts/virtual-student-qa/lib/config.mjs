/**
 * Virtual Student QA Runner — config / env loader.
 *
 * Phase A scope:
 *   - Hybrid env shape: VIRTUAL_STUDENT_ACCOUNTS JSON preferred,
 *     fallback to E2E_STUDENT_USERNAME / E2E_STUDENT_PIN (single)
 *     and E2E_STUDENT_{N}_USERNAME / E2E_STUDENT_{N}_PIN (multi).
 *   - Student auth mode: 'ui' (default, real /student/login form) or
 *     'api' (TEMPORARY shortcut, opt-in via VIRTUAL_STUDENT_STUDENT_AUTH=api).
 *   - Base URL resolution: PLAYWRIGHT_BASE_URL > VIRTUAL_STUDENT_BASE_URL
 *     > E2E_BASE_URL > PORT > http://127.0.0.1:3001.
 *
 * Never logs PINs or passwords.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..", "..");

const TRACKED_ENV_PREFIXES = [
  "E2E_STUDENT_",
  "VIRTUAL_STUDENT_",
  "PLAYWRIGHT_",
  "PORT",
  "SUPABASE_",
];

function tryLoadDotenvFiles() {
  for (const name of [".env.e2e.local", ".env.local", ".env"]) {
    const filePath = join(REPO_ROOT, name);
    if (!existsSync(filePath)) continue;
    let text;
    try {
      text = readFileSync(filePath, "utf8");
    } catch {
      continue;
    }
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      if (!TRACKED_ENV_PREFIXES.some((prefix) => key === prefix || key.startsWith(prefix))) {
        continue;
      }
      if (process.env[key]) continue;
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

function normalizeAccountEntry(entry, index) {
  if (!entry || typeof entry !== "object") {
    throw new Error(`VIRTUAL_STUDENT_ACCOUNTS[${index}] must be an object`);
  }
  const label = String(entry.label || `student-${index + 1}`).trim() || `student-${index + 1}`;
  const username = String(entry.username || "").trim();
  const code = String(entry.code || "").trim();
  const pin = String(entry.pin || "").replace(/\D/g, "").trim();
  if (!username && !code) {
    throw new Error(`VIRTUAL_STUDENT_ACCOUNTS[${index}] requires "username" or "code"`);
  }
  if (!pin || pin.length !== 4) {
    throw new Error(`VIRTUAL_STUDENT_ACCOUNTS[${index}] requires a 4-digit "pin"`);
  }
  return { label, username, code, pin };
}

function parseAccountsJson() {
  const raw = String(process.env.VIRTUAL_STUDENT_ACCOUNTS || "").trim();
  if (!raw) return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`VIRTUAL_STUDENT_ACCOUNTS parse failed: ${error?.message || error}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error("VIRTUAL_STUDENT_ACCOUNTS must be a JSON array");
  }
  return parsed.map((entry, index) => normalizeAccountEntry(entry, index));
}

function indexedFallbackAccounts() {
  const accounts = [];
  for (let i = 1; i <= 9; i++) {
    const username = String(process.env[`E2E_STUDENT_${i}_USERNAME`] || "").trim();
    const code = String(process.env[`E2E_STUDENT_${i}_CODE`] || "").trim();
    const pin = String(process.env[`E2E_STUDENT_${i}_PIN`] || "").replace(/\D/g, "").trim();
    if (!username && !code) continue;
    if (!pin || pin.length !== 4) continue;
    accounts.push({ label: `student-${i}`, username, code, pin });
  }
  return accounts;
}

function singleFallbackAccount() {
  const username = String(process.env.E2E_STUDENT_USERNAME || "").trim();
  const code = String(process.env.E2E_STUDENT_CODE || "").trim();
  const pin = String(process.env.E2E_STUDENT_PIN || "").replace(/\D/g, "").trim();
  if (!username && !code) return null;
  if (!pin || pin.length !== 4) return null;
  return { label: "primary", username, code, pin };
}

export function loadAccounts() {
  tryLoadDotenvFiles();
  const fromJson = parseAccountsJson();
  if (fromJson && fromJson.length > 0) return fromJson;
  const indexed = indexedFallbackAccounts();
  if (indexed.length > 0) return indexed;
  const single = singleFallbackAccount();
  return single ? [single] : [];
}

export function selectAccount(accounts, label) {
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error(
      "No virtual-student accounts found. Set VIRTUAL_STUDENT_ACCOUNTS (JSON) or E2E_STUDENT_USERNAME + E2E_STUDENT_PIN."
    );
  }
  const wanted = String(label || "").trim();
  if (!wanted) return accounts[0];
  const match = accounts.find((account) => account.label === wanted);
  if (!match) {
    const known = accounts.map((account) => account.label).join(", ");
    throw new Error(`No virtual-student account with label "${wanted}". Available: ${known}`);
  }
  return match;
}

export function resolveBaseUrl(explicit) {
  tryLoadDotenvFiles();
  const candidates = [
    explicit,
    process.env.PLAYWRIGHT_BASE_URL,
    process.env.VIRTUAL_STUDENT_BASE_URL,
    process.env.E2E_BASE_URL,
    process.env.PORT ? `http://127.0.0.1:${process.env.PORT}` : null,
    "http://127.0.0.1:3001",
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const raw = String(candidate).trim();
    if (!raw) continue;
    const withProtocol = raw.includes("://") ? raw : `http://${raw}`;
    try {
      return new URL(withProtocol).origin;
    } catch {
      // Try the next candidate.
    }
  }
  return "http://127.0.0.1:3001";
}

export function resolveStudentAuthMode() {
  const raw = String(process.env.VIRTUAL_STUDENT_STUDENT_AUTH || "ui").trim().toLowerCase();
  return raw === "api" ? "api" : "ui";
}

export function isHeaded() {
  const raw = String(process.env.VIRTUAL_STUDENT_HEADED || "").trim().toLowerCase();
  return raw === "1" || raw === "true";
}

export function getRepoRoot() {
  return REPO_ROOT;
}
