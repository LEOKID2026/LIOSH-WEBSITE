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
import { homedir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..", "..");

const TRACKED_ENV_PREFIXES = [
  "E2E_STUDENT_",
  "E2E_PARENT_",
  "VIRTUAL_STUDENT_",
  "PLAYWRIGHT_",
  "PORT",
  "SUPABASE_",
  "NEXT_PUBLIC_LEARNING_SUPABASE_",
  "LEARNING_SUPABASE_",
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
  // Phase D introduces 12 real QA students (AAA1..AAA12) under one parent.
  // The indexed fallback allows operators to set
  //   E2E_STUDENT_{1..24}_USERNAME / E2E_STUDENT_{N}_PIN
  // as a non-JSON shape. The label defaults to `student-{N}` but a
  // friendly label can be provided via E2E_STUDENT_{N}_LABEL — used by
  // the Phase D plan to match plan entries to the real account.
  const accounts = [];
  for (let i = 1; i <= 24; i++) {
    const username = String(process.env[`E2E_STUDENT_${i}_USERNAME`] || "").trim();
    const code = String(process.env[`E2E_STUDENT_${i}_CODE`] || "").trim();
    const pin = String(process.env[`E2E_STUDENT_${i}_PIN`] || "").replace(/\D/g, "").trim();
    if (!username && !code) continue;
    if (!pin || pin.length !== 4) continue;
    const explicitLabel = String(process.env[`E2E_STUDENT_${i}_LABEL`] || "").trim();
    const label = explicitLabel || username || code || `student-${i}`;
    accounts.push({ label, username, code, pin });
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

export function resolveParentAuthMode() {
  // 'ui' is the DEFAULT and the only mode that can produce full PASS.
  // 'token' is debug-only: it must always result in 'partial', never 'pass'.
  const raw = String(process.env.VIRTUAL_STUDENT_PARENT_AUTH || "ui").trim().toLowerCase();
  return raw === "token" ? "token" : "ui";
}

function normalizeParentEntry(entry, index) {
  if (!entry || typeof entry !== "object") {
    throw new Error(`VIRTUAL_STUDENT_PARENT_ACCOUNTS[${index}] must be an object`);
  }
  const label = String(entry.label || `parent-${index + 1}`).trim() || `parent-${index + 1}`;
  const email = String(entry.email || "").trim();
  const password = String(entry.password || "");
  const linkedStudentLabel = entry.linkedStudent ? String(entry.linkedStudent).trim() : "";
  if (!email) throw new Error(`VIRTUAL_STUDENT_PARENT_ACCOUNTS[${index}] requires "email"`);
  if (!password) throw new Error(`VIRTUAL_STUDENT_PARENT_ACCOUNTS[${index}] requires "password"`);
  return { label, email, password, linkedStudentLabel };
}

function parseParentAccountsJson() {
  const raw = String(process.env.VIRTUAL_STUDENT_PARENT_ACCOUNTS || "").trim();
  if (!raw) return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`VIRTUAL_STUDENT_PARENT_ACCOUNTS parse failed: ${error?.message || error}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error("VIRTUAL_STUDENT_PARENT_ACCOUNTS must be a JSON array");
  }
  return parsed.map((entry, index) => normalizeParentEntry(entry, index));
}

function singleFallbackParentAccount() {
  const email = String(process.env.E2E_PARENT_EMAIL || "").trim();
  const password = String(process.env.E2E_PARENT_PASSWORD || "");
  if (!email || !password) return null;
  return { label: "parent-primary", email, password, linkedStudentLabel: "" };
}

export function loadParentAccounts() {
  tryLoadDotenvFiles();
  const fromJson = parseParentAccountsJson();
  if (fromJson && fromJson.length > 0) return fromJson;
  const single = singleFallbackParentAccount();
  return single ? [single] : [];
}

export function selectParentAccount(parents, label, linkedStudentLabel) {
  if (!Array.isArray(parents) || parents.length === 0) {
    throw new Error(
      "No virtual-student parent accounts found. Set VIRTUAL_STUDENT_PARENT_ACCOUNTS (JSON) or E2E_PARENT_EMAIL + E2E_PARENT_PASSWORD."
    );
  }
  const wanted = String(label || "").trim();
  if (wanted) {
    const match = parents.find((p) => p.label === wanted);
    if (!match) {
      const known = parents.map((p) => p.label).join(", ");
      throw new Error(`No parent account with label "${wanted}". Available: ${known}`);
    }
    return match;
  }
  const studentLabel = String(linkedStudentLabel || "").trim();
  if (studentLabel) {
    const match = parents.find((p) => p.linkedStudentLabel === studentLabel);
    if (match) return match;
  }
  return parents[0];
}

export function isHeaded() {
  const raw = String(process.env.VIRTUAL_STUDENT_HEADED || "").trim().toLowerCase();
  return raw === "1" || raw === "true";
}

export function getRepoRoot() {
  return REPO_ROOT;
}

// ---------------------------------------------------------------------------
// Phase D2 — daily-simulator config helpers
// ---------------------------------------------------------------------------
//
// All Phase D2 daily/longitudinal config flows through these helpers. They
// follow the same precedence rule as the existing helpers above: explicit
// CLI argument > env > sensible default.
//
// State directory rationale (see plan §10):
//   The longitudinal state.json must live OUTSIDE the repo so it is not
//   committed, not deleted by `reports/*` cleanup, and survives `git
//   clean -fdx`. Default per OS:
//     Windows:   %LOCALAPPDATA%\liosh-qa\virtual-student-state
//     POSIX:     $XDG_DATA_HOME/liosh-qa/virtual-student-state
//                 (falls back to ~/.local/share/...)

function isTruthy(value) {
  if (value === true) return true;
  const s = String(value ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

/**
 * Resolve the directory where state.json + state.json.bak + timeline.md
 * live. Honour VIRTUAL_STUDENT_DAILY_STATE_DIR if set, else use an
 * OS-appropriate default OUTSIDE the repo.
 */
export function resolveStateDir() {
  tryLoadDotenvFiles();
  const envOverride = String(
    process.env.VIRTUAL_STUDENT_DAILY_STATE_DIR || ""
  ).trim();
  if (envOverride) return envOverride;
  // process.platform is a string ('win32', 'darwin', 'linux', ...).
  // Note: importing `platform` from 'node:os' returns a FUNCTION, so we
  // intentionally use the string form here.
  if (process.platform === "win32") {
    const local =
      process.env.LOCALAPPDATA ||
      join(process.env.USERPROFILE || homedir(), "AppData", "Local");
    return join(local, "liosh-qa", "virtual-student-state");
  }
  const xdg = String(process.env.XDG_DATA_HOME || "").trim();
  if (xdg) return join(xdg, "liosh-qa", "virtual-student-state");
  return join(homedir(), ".local", "share", "liosh-qa", "virtual-student-state");
}

/**
 * Resolve the daily mode. CLI flag wins; env fallback; default
 * 'realtime' (because the canonical use case is the nightly Task
 * Scheduler run).
 */
export function resolveDailyMode(explicit) {
  tryLoadDotenvFiles();
  const raw = String(
    explicit || process.env.VIRTUAL_STUDENT_DAILY_MODE || "realtime"
  )
    .trim()
    .toLowerCase();
  return raw === "fast" ? "fast" : "realtime";
}

/**
 * Resolve the target date. CLI flag wins; env fallback; default 'today
 * in Asia/Jerusalem' (matches when the owner's evening starts).
 */
export function resolveDailyDate(explicit) {
  tryLoadDotenvFiles();
  const candidate = String(
    explicit || process.env.VIRTUAL_STUDENT_DAILY_DATE || ""
  ).trim();
  if (candidate && /^\d{4}-\d{2}-\d{2}$/.test(candidate)) return candidate;
  // 'en-CA' returns YYYY-MM-DD natively, which is the format we want.
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jerusalem",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    // Fallback to UTC date if Intl with timeZone is unavailable.
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Hard wall-clock cap on a single nightly run. Default 480 min = 8 h.
 */
export function resolveDailyMaxMinutes() {
  tryLoadDotenvFiles();
  const raw = String(process.env.VIRTUAL_STUDENT_DAILY_MAX_MINUTES || "480").trim();
  const num = Number(raw);
  return Number.isFinite(num) && num > 0 ? num : 480;
}

/**
 * Pacer scale: 1.0 in realtime mode, 0.0 in fast mode, overridable via
 * VIRTUAL_STUDENT_DAILY_PACER_SCALE.
 */
export function resolveDailyPacerScale(mode) {
  tryLoadDotenvFiles();
  const raw = String(process.env.VIRTUAL_STUDENT_DAILY_PACER_SCALE || "").trim();
  if (raw) {
    const num = Number(raw);
    if (Number.isFinite(num) && num >= 0) return num;
  }
  return String(mode || "").toLowerCase() === "fast" ? 0.0 : 1.0;
}

/** --dry-run | VIRTUAL_STUDENT_DAILY_DRY_RUN=1 — generate plan only. */
export function resolveDailyDryRun(cliFlag) {
  if (isTruthy(cliFlag)) return true;
  tryLoadDotenvFiles();
  return isTruthy(process.env.VIRTUAL_STUDENT_DAILY_DRY_RUN);
}

/** --preflight-only | VIRTUAL_STUDENT_DAILY_PREFLIGHT_ONLY=1. */
export function resolveDailyPreflightOnly(cliFlag) {
  if (isTruthy(cliFlag)) return true;
  tryLoadDotenvFiles();
  return isTruthy(process.env.VIRTUAL_STUDENT_DAILY_PREFLIGHT_ONLY);
}

/** --force | VIRTUAL_STUDENT_DAILY_FORCE=1 — bypass same-day idempotency. */
export function resolveDailyForce(cliFlag) {
  if (isTruthy(cliFlag)) return true;
  tryLoadDotenvFiles();
  return isTruthy(process.env.VIRTUAL_STUDENT_DAILY_FORCE);
}

/**
 * In-session pacing (wait before each answer) — ON by default.
 * Set VIRTUAL_STUDENT_IN_SESSION_PACING=0 to disable (blocked on production).
 */
export function resolveInSessionPacingEnabled(explicit) {
  if (explicit === false) return false;
  if (explicit === true) return true;
  tryLoadDotenvFiles();
  const raw = String(process.env.VIRTUAL_STUDENT_IN_SESSION_PACING || "1").trim();
  return !isTruthy(raw === "0" || raw.toLowerCase() === "false" || raw.toLowerCase() === "off");
}

/** Post-session DB timestamp backfill to simulated calendar date (default OFF). */
export function resolveTimestampStampingEnabled(explicit) {
  if (explicit === false) return false;
  if (explicit === true) return true;
  tryLoadDotenvFiles();
  return isTruthy(process.env.VIRTUAL_STUDENT_TIMESTAMP_STAMPING);
}

/**
 * Production QA requires timestamp stamping so parent-report date filters
 * match simulated calendar days (not wall-clock run date).
 */
export function assertProductionTimestampStampingGuard({
  baseUrl,
  dryRun = false,
  preflightOnly = false,
}) {
  if (dryRun || preflightOnly) return;
  if (!isProductionQaBaseUrl(baseUrl)) return;
  if (!resolveTimestampStampingEnabled()) {
    throw new Error(
      "production-guard: VIRTUAL_STUDENT_TIMESTAMP_STAMPING=1 is required on " +
        "production QA. Without it, learning_sessions.started_at uses wall-clock " +
        "and parent reports filtered by simulated month show empty."
    );
  }
}

export function isProductionQaBaseUrl(baseUrl) {
  const u = String(baseUrl || "").trim().toLowerCase();
  return u.includes("liosh-website.vercel.app");
}

/**
 * Block unrealistic fast automation writes to production QA.
 * Requires in-session pacing on production; fast/pacerScale=0 allowed only
 * when in-session pacing is enabled (synthetic realistic duration).
 */
export function assertProductionRealisticPacingGuard({
  baseUrl,
  mode,
  pacerScale,
  inSessionPacingEnabled,
  dryRun = false,
  preflightOnly = false,
}) {
  if (dryRun || preflightOnly) return;
  if (!isProductionQaBaseUrl(baseUrl)) return;

  if (!inSessionPacingEnabled) {
    throw new Error(
      "production-guard: in-session pacing is DISABLED. Refusing to write " +
        "unrealistic duration_seconds to production QA. Enable " +
        "VIRTUAL_STUDENT_IN_SESSION_PACING=1 (default) or use localhost."
    );
  }

  const fastOrZero =
    String(mode || "").toLowerCase() === "fast" ||
    Number(pacerScale) === 0;
  if (fastOrZero) {
    console.warn(
      "[production-guard] mode=fast or pacerScale=0 — allowed ONLY because " +
        "in-session pacing is enabled (synthetic realistic duration per question)."
    );
  }
}

/** Max concurrent AAA students in parallel daily orchestrator (default 4 for stability). */
export function resolveParallelStudentConcurrency() {
  tryLoadDotenvFiles();
  const raw = String(process.env.VIRTUAL_STUDENT_PARALLEL_STUDENTS || "4").trim();
  const num = Number(raw);
  return Number.isFinite(num) && num > 0 ? Math.min(12, Math.floor(num)) : 4;
}
