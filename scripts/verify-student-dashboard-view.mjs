#!/usr/bin/env node
/**
 * Verify canonical student subject dashboard view vs student_learning_state row.
 * Validates all 12 lobby windows (8 HUD + 4 middle) for scope consistency.
 *
 * Usage: node scripts/verify-student-dashboard-view.mjs <studentId> <subjectKey> [topicScopeKey]
 * Example: node scripts/verify-student-dashboard-view.mjs <uuid> math easy_addition
 *
 * Env: NEXT_PUBLIC_LEARNING_SUPABASE_URL + LEARNING_SUPABASE_SERVICE_ROLE_KEY (from .env.local)
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function loadEnvLocal() {
  const p = join(ROOT, ".env.local");
  if (!existsSync(p)) return {};
  const raw = readFileSync(p, "utf8");
  const out = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const k = m[1].trim();
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

  const th = view.topHud;
  const mt = view.middleTiles;
  const ch = mt.challenges;
  console.log("\n=== 12-window canonical values (numeric / structured) ===\n");
  const rows = [
    ["1", "אווטר", th.avatar ?? "(react/local image)"],
    ["2", "טיימר", th.timer ?? "(react)"],
    ["3", "חיים", th.lives],
    ["4", "נכון", th.correct],
    ["5", "רמה", th.level],
    ["6", "כוכבים", th.stars],
    ["7", "רצף", th.streak],
    ["8", "ניקוד", th.score],
    ["9", "אתגרים", `tileRole=${ch?.tileRole ?? "?"} dailyPct=${ch?.dailyProgressPct}% weeklyPct=${ch?.weeklyProgressPct}%`],
    ["10", "דיוק", view.middleTiles.accuracyDisplayHe ?? `${mt.accuracy}%`],
    ["11", "שיא רצף", mt.bestStreak],
    ["12", "שיא ניקוד", mt.bestScore],
  ];
  for (const [id, label, val] of rows) {
    console.log(`${id.padStart(2)}  ${label.padEnd(12, " ")}  ${val}`);
  }
}

async function main() {
  const studentId = String(process.argv[2] || "").trim();
  const subject = String(process.argv[3] || "math").trim();
  const topicScopeKey = String(process.argv[4] || (subject === "geometry" ? "easy_area" : "easy_addition")).trim();

  if (!studentId) {
    console.error("Usage: node scripts/verify-student-dashboard-view.mjs <studentId> <subjectKey> [topicScopeKey]");
    process.exit(2);
  }

  const env = { ...process.env, ...loadEnvLocal() };
  const url = env.NEXT_PUBLIC_LEARNING_SUPABASE_URL || env.LEARNING_SUPABASE_URL;
  const key = env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_LEARNING_SUPABASE_URL or LEARNING_SUPABASE_SERVICE_ROLE_KEY");
    process.exit(2);
  }

  const viewUrl = pathToFileURL(join(ROOT, "lib/learning-shared/student-subject-dashboard-view.js")).href;
  const snapUrl = pathToFileURL(join(ROOT, "lib/learning-shared/student-account-state-view.js")).href;
  const profUrl = pathToFileURL(join(ROOT, "lib/learning-supabase/student-learning-profile.server.js")).href;
  const [{ buildStudentSubjectDashboardView }, accountMod, profMod] = await Promise.all([
    import(viewUrl),
    import(snapUrl),
    import(profUrl),
  ]);
  const { buildAccountSnapshotForParentReport, mapSubjectAccountViewFromStudentProfile } = accountMod;
  const { computeStudentLearningDerived, normalizeLearningProfileRow } = profMod;

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: student, error: stErr } = await supabase
    .from("students")
    .select("id,full_name")
    .eq("id", studentId)
    .maybeSingle();
  if (stErr || !student?.id) {
    console.error("Student not found:", stErr?.message || studentId);
    process.exit(1);
  }

  const { data: sls, error: slsErr } = await supabase
    .from("student_learning_state")
    .select("subjects,challenges,monthly")
    .eq("student_id", studentId)
    .maybeSingle();
  if (slsErr) {
    console.error(slsErr.message);
    process.exit(1);
  }

  const derived = await computeStudentLearningDerived(supabase, studentId);
  const name = String(student.full_name || "").trim() || "Student";
  const rowNorm = normalizeLearningProfileRow(sls || {});

  const profileLike = {
    ok: true,
    studentId,
    row: rowNorm,
    derived,
  };

  const scoresStore = rowNorm.subjects?.[subject]?.scoresStore || {};

  const baseArgs = {
    subject,
    studentId,
    profile: profileLike,
    derived,
    currentRunState: { gameActive: false, score: 0, streak: 0, correct: 0, bestScore: 0, bestStreak: 0 },
    scoresStoreSnapshot: scoresStore,
    topicScopeKey,
    monthlyState: {
      totalMinutes: derived?.monthlyMinutesUtcMonth ?? 0,
      goalMinutes: 300,
      yearMonth: "",
      selectedRewardKey: null,
      celebrationShownForMonth: false,
    },
    mode: "lobby",
    gameActive: false,
    playerDisplayName: name,
    hydrationComplete: true,
    liveDailyBlob: null,
    liveWeeklyBlob: null,
  };

  const view = buildStudentSubjectDashboardView(baseArgs);

  const viewAltTopic = buildStudentSubjectDashboardView({
    ...baseArgs,
    topicScopeKey: topicScopeKey === "easy_addition" ? "hard_multiplication" : "easy_addition",
  });

  const viewInRun = buildStudentSubjectDashboardView({
    ...baseArgs,
    gameActive: true,
    mode: "challenge",
    currentRunState: {
      gameActive: true,
      score: 12,
      streak: 3,
      correct: 4,
      bestScore: 0,
      bestStreak: 0,
      lives: 2,
      timeLeft: 30,
    },
  });

  const snap = buildAccountSnapshotForParentReport(sls, derived, name);
  const account = mapSubjectAccountViewFromStudentProfile(profileLike, subject, name);
  const parentSub = snap.bySubject?.[subject];

  console.log("=== buildStudentSubjectDashboardView (lobby) ===");
  console.log(JSON.stringify({ meta: view.meta, topHud: view.topHud, middleTiles: view.middleTiles, dailyChallenge: view.dailyChallenge, weeklyChallenge: view.weeklyChallenge }, null, 2));
  printTwelveWindowSummary(view);

  console.log("\n=== parent accountSnapshot (reference) ===");
  console.log(
    JSON.stringify(
      {
        summaryPlayerLevel: snap.summaryPlayerLevel,
        summaryStars: snap.summaryStars,
        bySubject: snap.bySubject?.[subject],
      },
      null,
      2
    )
  );

  let failed = false;
  const fail = (msg) => {
    console.error("FAIL:", msg);
    failed = true;
  };

  const accPct = derived?.bySubject?.[subject]?.accuracy;
  const q = view.dailyChallenge.questionsToday;
  const c = view.dailyChallenge.correctToday;
  const accToday = view.dailyChallenge.accuracyToday;
  if (q > 0 && accToday === 0 && c === 0 && typeof accPct === "number" && accPct >= 50) {
    fail("daily modal would show 0% with questions>0 and zero correct while derived accuracy is high.");
  }
  if (q > 0 && c > q) {
    fail("daily correct exceeds questions (invalid).");
  }
  if (typeof accPct === "number" && view.middleTiles.accuracy != null && view.middleTiles.accuracy !== Math.round(accPct)) {
    fail("middleTiles.accuracy != round(derived.bySubject.accuracy).");
  }
  if (accPct == null && view.middleTiles.accuracy != null) {
    fail("middleTiles.accuracy should be null when derived accuracy is missing.");
  }

  if (view.middleTiles.bestScore !== account.bestScore) {
    fail(`middleTiles.bestScore (${view.middleTiles.bestScore}) != mapSubjectAccountView.bestScore (${account.bestScore}).`);
  }
  if (view.middleTiles.bestStreak !== account.bestStreak) {
    fail(`middleTiles.bestStreak (${view.middleTiles.bestStreak}) != mapSubjectAccountView.bestStreak (${account.bestStreak}).`);
  }

  // --- 12-window / scope rules (lobby) ---
  if (!view.meta?.ignoredLocalStorage) {
    fail("meta.ignoredLocalStorage must be true for canonical lobby contract.");
  }
  if (String(view.middleTiles.sourceMap?.bestScore || "").includes("topicKey")) {
    fail("middleTiles.sourceMap.bestScore must not describe topicKey-scoped bests.");
  }
  if (String(view.middleTiles.sourceMap?.bestStreak || "").includes("topicKey")) {
    fail("middleTiles.sourceMap.bestStreak must not describe topicKey-scoped bests.");
  }

  if (view.topHud.score !== view.middleTiles.bestScore) {
    fail(`lobby topHud.score (${view.topHud.score}) must equal middleTiles.bestScore (${view.middleTiles.bestScore}) — subject-wide contract.`);
  }
  if (view.topHud.streak !== view.middleTiles.bestStreak) {
    fail(`lobby topHud.streak (${view.topHud.streak}) must equal middleTiles.bestStreak (${view.middleTiles.bestStreak}) — subject-wide contract.`);
  }

  if (view.topHud.streak > 0 && view.middleTiles.bestStreak === 0) {
    fail("topHud.streak > 0 but middleTiles.bestStreak === 0 in lobby (subject-level contradiction).");
  }

  if (view.middleTiles.bestScore !== viewAltTopic.middleTiles.bestScore || view.middleTiles.bestStreak !== viewAltTopic.middleTiles.bestStreak) {
    fail("middle bestScore/bestStreak must not depend on topicScopeKey (topic independence check).");
  }

  if (parentSub) {
    if (view.middleTiles.bestScore !== parentSub.bestScore) {
      fail(`middleTiles.bestScore (${view.middleTiles.bestScore}) != parent bySubject.bestScore (${parentSub.bestScore}).`);
    }
    if (view.middleTiles.bestStreak !== parentSub.bestStreak) {
      fail(`middleTiles.bestStreak (${view.middleTiles.bestStreak}) != parent bySubject.bestStreak (${parentSub.bestStreak}).`);
    }
    if (view.topHud.level !== parentSub.playerLevel) {
      fail(`topHud.level (${view.topHud.level}) != parent bySubject.playerLevel (${parentSub.playerLevel}).`);
    }
    if (view.topHud.stars !== parentSub.stars) {
      fail(`topHud.stars (${view.topHud.stars}) != parent bySubject.stars (${parentSub.stars}).`);
    }
    if (
      parentSub.accountAccuracyPct != null &&
      view.middleTiles.accuracy !== Math.round(parentSub.accountAccuracyPct)
    ) {
      fail(`middleTiles.accuracy (${view.middleTiles.accuracy}) != round(parent bySubject.accountAccuracyPct) (${parentSub.accountAccuracyPct}).`);
    }
  }

  const lifetimeCorrect = Math.max(0, Math.floor(Number(derived?.bySubject?.[subject]?.correctTotal) || 0));
  if (view.topHud.correct !== lifetimeCorrect) {
    fail(`lobby topHud.correct (${view.topHud.correct}) != derived.bySubject correctTotal (${lifetimeCorrect}).`);
  }

  // In-run: top HUD shows session; middle stays account-wide (>= server account floor)
  if (viewInRun.topHud.score !== 12 || viewInRun.topHud.streak !== 3) {
    fail("gameActive view should expose session score/streak on topHud.");
  }
  if (viewInRun.middleTiles.bestScore < account.bestScore) {
    fail("middleTiles.bestScore should never drop below mapSubjectAccountView.bestScore.");
  }
  if (viewInRun.middleTiles.bestStreak < account.bestStreak) {
    fail("middleTiles.bestStreak should never drop below mapSubjectAccountView.bestStreak.");
  }

  if (!view.middleTiles.challenges?.tileRole) {
    fail("middleTiles.challenges.tileRole must be set (אתגרים contract).");
  }

  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
