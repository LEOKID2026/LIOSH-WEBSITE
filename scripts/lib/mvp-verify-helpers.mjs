/**
 * Shared helpers for Child World MVP verification scripts (Phase 2.7).
 * Test isolation + combined working-tree allowlist — no product logic.
 */
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const MVP_VERIFY_ROOT = resolve(__dirname, "../..");

/** Combined approved paths for Phases 1–2.8 on one working tree. */
export const MVP_APPROVED_FILE_PATTERNS = [
  /^\.env\.local$/,
  /^lib\/learning-client\/studentHomeDashboardClient\.js$/,
  /^lib\/learning-client\/dailyMissionsView\.js$/,
  /^lib\/learning-client\/fetchStudentHomeProfile\.js$/,
  /^lib\/learning-client\/subjectMonthlyPersistenceView\.js$/,
  /^lib\/learning-supabase\/israel-calendar\.server\.js$/,
  /^lib\/learning-supabase\/learning-coin-award\.server\.js$/,
  /^lib\/learning-supabase\/mission-progress\.server\.js$/,
  /^lib\/learning-supabase\/monthly-persistence-reward\.server\.js$/,
  /^pages\/student\/home\.js$/,
  /^pages\/api\/learning\/session\/finish\.js$/,
  /^pages\/api\/student\/home-profile\.js$/,
  /^pages\/api\/student\/learning-profile\.js$/,
  /^pages\/api\/admin\/monthly-persistence-award\.js$/,
  /^pages\/learning\/(math|geometry|hebrew|english|science|moledet-geography)-master\.js$/,
  /^components\/student\/StudentDailyMissionsPanel\.js$/,
  /^components\/student\/StudentMonthlyPersistencePanel\.js$/,
  /^components\/learning\/SubjectDailyMissionsModal\.js$/,
  /^components\/learning\/SubjectMonthlyPrizeJourney\.js$/,
  /^scripts\/lib\/mvp-verify-helpers\.mjs$/,
  /^scripts\/lib\/mvp-verify-http-preflight\.mjs$/,
  /^scripts\/verify-phase\d/,
  /^scripts\/verify-mvp-/,
  /^scripts\/verify-israel-monthly-display\.mjs$/,
  /^scripts\/verify-time-cap\.mjs$/,
  /^docs\//,
  /^\.cursor\//,
];

export const MVP_FORBIDDEN_PREFIXES = [
  "lib/parent-server/",
  "pages/api/learning/session/start",
  "pages/api/learning/session/answer",
  "utils/expert-review",
  "lib/diagnostic",
  "supabase/migrations/",
];

export function normalizeRepoPath(filePath) {
  return String(filePath || "").replace(/\\/g, "/").trim();
}

export function getWorkingTreeFiles(root = MVP_VERIFY_ROOT) {
  let diffNames = "";
  try {
    diffNames = execSync("git diff --name-only HEAD", { cwd: root, encoding: "utf8" });
  } catch {
    diffNames = "";
  }
  let untracked = "";
  try {
    untracked = execSync("git ls-files --others --exclude-standard", { cwd: root, encoding: "utf8" });
  } catch {
    untracked = "";
  }
  const files = [
    ...(diffNames ? diffNames.split("\n") : []),
    ...(untracked ? untracked.split("\n") : []),
  ]
    .map(normalizeRepoPath)
    .filter(Boolean);
  return [...new Set(files)];
}

export function isMvpApprovedFile(filePath, extraPatterns = []) {
  const f = normalizeRepoPath(filePath);
  const patterns = [...MVP_APPROVED_FILE_PATTERNS, ...extraPatterns];
  return patterns.some((p) => p.test(f));
}

/**
 * Assert working tree only touches combined MVP-approved files (excludes .env.local from failure).
 */
export function assertMvpWorkingTreeScope(hooks, { label = "MVP working tree scope", extraPatterns = [] } = {}) {
  const { pass, fail } = hooks;
  const files = getWorkingTreeFiles();
  const unexpected = files.filter(
    (f) => f !== ".env.local" && !isMvpApprovedFile(f, extraPatterns)
  );
  if (unexpected.length === 0) {
    pass(label);
  } else {
    fail(label, unexpected.join(", "));
  }
  return { files, unexpected };
}

export function assertMvpForbiddenPrefixesUntouched(hooks) {
  const { pass, fail } = hooks;
  const files = getWorkingTreeFiles();
  for (const prefix of MVP_FORBIDDEN_PREFIXES) {
    const hits = files.filter((f) => f.includes(prefix));
    if (hits.length === 0) pass(`No changes under ${prefix}`);
    else fail(`No changes under ${prefix}`, hits.join(", "));
  }
}

export async function getTodayIsraelMidnightUtc() {
  const { getTodayIsraelMidnightUtc: fn } = await import(
    pathToFileURL(resolve(MVP_VERIFY_ROOT, "lib/learning-supabase/israel-calendar.server.js")).href
  );
  return fn();
}

/** Sum learning_session coin earnings since Israel midnight (matches production cap). */
export async function sumTodayLearningSessionEarnings(supabase, studentId) {
  const todayIsraelStart = await getTodayIsraelMidnightUtc();
  const { data, error } = await supabase
    .from("coin_transactions")
    .select("amount")
    .eq("student_id", studentId)
    .eq("direction", "earn")
    .eq("source_type", "learning_session")
    .gte("created_at", todayIsraelStart.toISOString());

  if (error) throw new Error(`sumTodayLearningSessionEarnings: ${error.message}`);
  return (data || []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
}

export async function getTransactionByKey(supabase, idempotencyKey) {
  const { data } = await supabase
    .from("coin_transactions")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  return data ?? null;
}

/**
 * Assert award via the specific transaction row (immune to concurrent session coins).
 */
export function assertScopedCoinAward(hooks, { label, tx, expectedAmount, balanceBefore }) {
  const { pass, fail, assertEq } = hooks;
  if (!tx) {
    fail(`${label}: transaction row exists`, "not found");
    return;
  }
  pass(`${label}: transaction row exists`);
  if (assertEq) {
    assertEq(`${label}: amount`, tx.amount, expectedAmount);
    if (balanceBefore != null && tx.balance_after != null) {
      assertEq(`${label}: balance_after`, tx.balance_after, balanceBefore.balance + expectedAmount);
    }
  } else {
    if (tx.amount === expectedAmount) pass(`${label}: amount = ${expectedAmount}`);
    else fail(`${label}: amount`, `expected ${expectedAmount}, got ${tx.amount}`);
    if (balanceBefore != null && tx.balance_after != null) {
      const expectedBal = balanceBefore.balance + expectedAmount;
      if (tx.balance_after === expectedBal) pass(`${label}: balance_after`);
      else fail(`${label}: balance_after`, `expected ${expectedBal}, got ${tx.balance_after}`);
    }
  }
}

/**
 * Student with the lowest Israel-day learning_session earnings.
 * @returns {{ studentId: string, todayEarned: number }}
 */
export async function resolveLowEarnedStudent(supabase, excludeIds = []) {
  const exclude = new Set(excludeIds.filter(Boolean));
  const { data: codes } = await supabase
    .from("student_access_codes")
    .select("student_id")
    .eq("is_active", true);

  let bestId = null;
  let bestEarned = Infinity;

  for (const row of codes || []) {
    const id = row.student_id;
    if (!id || exclude.has(id)) continue;
    const earned = await sumTodayLearningSessionEarnings(supabase, id);
    if (earned < bestEarned) {
      bestEarned = earned;
      bestId = id;
    }
  }

  if (bestId) return { studentId: bestId, todayEarned: bestEarned };

  const { data: rows } = await supabase.from("students").select("id").limit(10);
  for (const row of rows || []) {
    const id = row.id;
    if (!id || exclude.has(id)) continue;
    const earned = await sumTodayLearningSessionEarnings(supabase, id);
    if (earned < bestEarned) {
      bestEarned = earned;
      bestId = id;
    }
  }

  if (!bestId) throw new Error("no student available for verification");
  return { studentId: bestId, todayEarned: bestEarned };
}

/**
 * Student with the lowest Israel-day learning_session earnings (for cap tests).
 * @returns {{ studentId: string, todayEarned: number }}
 */
export async function resolveCapTestStudent(supabase, primaryStudentId) {
  return resolveLowEarnedStudent(supabase, [primaryStudentId]);
}
