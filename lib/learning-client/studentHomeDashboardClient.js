/**
 * Pure view-model builder for the student home dashboard (browser + Node safe).
 * Primary input: GET /api/student/home-profile (compact payload + server-built accountSnapshot).
 */

import { LEARNING_PROFILE_SUBJECT_KEYS } from "../learning-shared/student-learning-profile-model.js";
import { mapSubjectAccountView } from "../learning-shared/student-account-state-view.js";
import { MONTHLY_MINUTES_TARGET, getRewardLabel } from "../../data/reward-options.js";
import { formatGradeLevelHe } from "../learning-student-defaults.js";

/** Monthly persistence coin reward tiers (Phase 2). */
const MONTHLY_PERSISTENCE_TIERS = [
  { minutes: 100,  coins: 10_000,  label: "10,000 מטבעות" },
  { minutes: 250,  coins: 30_000,  label: "30,000 מטבעות" },
  { minutes: 400,  coins: 60_000,  label: "60,000 מטבעות" },
  { minutes: 600,  coins: 100_000, label: "100,000 מטבעות" },
];

/** @type {readonly string[]} Display order for the home subject grid */
export const STUDENT_HOME_SUBJECT_ORDER = [
  "math",
  "hebrew",
  "english",
  "science",
  "geometry",
  "moledet_geography",
];

const SUBJECT_UI = {
  math: { labelHe: "חשבון", href: "/learning/math-master" },
  hebrew: { labelHe: "עברית", href: "/learning/hebrew-master" },
  english: { labelHe: "אנגלית", href: "/learning/english-master" },
  science: { labelHe: "מדעים", href: "/learning/science-master" },
  geometry: { labelHe: "גיאומטריה", href: "/learning/geometry-master" },
  moledet_geography: { labelHe: "מולדת וגיאוגרפיה", href: "/learning/moledet-geography-master" },
};

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

/**
 * @param {{ id: string, full_name?: string, grade_level?: string | null, coin_balance?: number }} student from /api/student/me
 * @param {object | null | undefined} homePayload from GET /api/student/home-profile
 */
export function buildStudentHomeView({ student, homePayload }) {
  if (!student?.id) return null;

  const derived =
    homePayload?.derived && typeof homePayload.derived === "object" && !Array.isArray(homePayload.derived)
      ? homePayload.derived
      : null;
  const snap =
    homePayload?.accountSnapshot &&
    typeof homePayload.accountSnapshot === "object" &&
    !Array.isArray(homePayload.accountSnapshot)
      ? homePayload.accountSnapshot
      : null;

  if (!derived || !snap) return null;

  const row = {
    monthly: homePayload.monthly && typeof homePayload.monthly === "object" && !Array.isArray(homePayload.monthly) ? homePayload.monthly : {},
    profile: homePayload.profile && typeof homePayload.profile === "object" && !Array.isArray(homePayload.profile) ? homePayload.profile : {},
    challenges:
      homePayload.challenges && typeof homePayload.challenges === "object" && !Array.isArray(homePayload.challenges)
        ? homePayload.challenges
        : {},
    streaks: homePayload.streaks && typeof homePayload.streaks === "object" && !Array.isArray(homePayload.streaks) ? homePayload.streaks : {},
    achievements:
      homePayload.achievements && typeof homePayload.achievements === "object" && !Array.isArray(homePayload.achievements)
        ? homePayload.achievements
        : {},
    subjects:
      homePayload.subjectsProgressOnly &&
      typeof homePayload.subjectsProgressOnly === "object" &&
      !Array.isArray(homePayload.subjectsProgressOnly)
        ? homePayload.subjectsProgressOnly
        : {},
  };

  const name = String(student?.full_name || "").trim() || "Student";
  const profile = row.profile && typeof row.profile === "object" && !Array.isArray(row.profile) ? row.profile : {};
  const avatarEmoji = profile.avatarEmoji != null ? String(profile.avatarEmoji).trim().slice(0, 8) : "👤";
  const rawCustom = profile.avatarCustomDataUrl;
  const avatarCustomDataUrl =
    typeof rawCustom === "string" && rawCustom.trim().startsWith("data:image/") ? rawCustom.trim() : null;

  const bySub =
    derived.bySubject && typeof derived.bySubject === "object" && !Array.isArray(derived.bySubject) ? derived.bySubject : {};

  let correctAll = 0;
  let wrongAll = 0;
  for (const sk of LEARNING_PROFILE_SUBJECT_KEYS) {
    const b = bySub[sk];
    if (!b) continue;
    correctAll += n(b.correctTotal);
    wrongAll += n(b.wrongTotal);
  }
  const graded = correctAll + wrongAll;
  const overallAccuracyPct = graded > 0 ? Math.round((correctAll / graded) * 100) : null;

  let bestScoreOverall = 0;
  let bestStreakOverall = 0;
  let sessionMinutesAll = 0;
  for (const sk of LEARNING_PROFILE_SUBJECT_KEYS) {
    const subSnap = snap.bySubject?.[sk];
    if (subSnap) {
      bestScoreOverall = Math.max(bestScoreOverall, n(subSnap.bestScore));
      bestStreakOverall = Math.max(bestStreakOverall, n(subSnap.bestStreak));
    }
    sessionMinutesAll += n(bySub[sk]?.sessionMinutesTotal);
  }

  const answersTotalAll = n(derived.answersTotalAll);

  // Prefer canonical Israel calendar month fields; fall back to legacy *UtcMonth aliases (same values since 2026-05-22 fix).
  const ym =
    derived.yearMonthIsrael != null
      ? String(derived.yearMonthIsrael)
      : derived.yearMonthUtc != null
        ? String(derived.yearMonthUtc)
        : "";
  const monthly = row.monthly && typeof row.monthly === "object" && !Array.isArray(row.monthly) ? row.monthly : {};
  const rewardChoices = monthly.rewardChoices && typeof monthly.rewardChoices === "object" ? monthly.rewardChoices : {};
  const celebrationsShown =
    monthly.celebrationsShown && typeof monthly.celebrationsShown === "object" ? monthly.celebrationsShown : {};
  const goalMinutes = MONTHLY_MINUTES_TARGET;
  const minutesThisMonth = Math.round(
    n(derived.monthlyMinutesIsraelMonth ?? derived.monthlyMinutesUtcMonth) * 100
  ) / 100;
  const progressPct = goalMinutes > 0 ? Math.min(100, Math.round((minutesThisMonth / goalMinutes) * 100)) : 0;
  const selectedRewardKey = ym && rewardChoices[ym] != null ? String(rewardChoices[ym]) : "";
  const selectedRewardLabel = selectedRewardKey ? getRewardLabel(selectedRewardKey) : "";
  const celebrationShownForMonth = !!(ym && celebrationsShown[ym]);
  const minutesRemaining = Math.max(0, Math.round(goalMinutes - minutesThisMonth));

  /** @type {Array<{ label: string, subjectKey: string, subjectLabelHe: string }>} */
  const badges = [];
  const seen = new Set();
  for (const sk of STUDENT_HOME_SUBJECT_ORDER) {
    const acc = mapSubjectAccountView(row, sk, name, derived);
    const list = Array.isArray(acc.badges) ? acc.badges : [];
    for (const b of list) {
      const label =
        typeof b === "string" ? b : b && typeof b === "object" && b.name != null ? String(b.name) : String(b || "");
      const t = label.trim();
      if (!t || seen.has(t)) continue;
      seen.add(t);
      badges.push({ label: t, subjectKey: sk, subjectLabelHe: SUBJECT_UI[sk]?.labelHe ?? sk });
    }
  }

  const subjects = [];
  for (const sk of STUDENT_HOME_SUBJECT_ORDER) {
    const meta = SUBJECT_UI[sk];
    if (!meta) continue;
    const subSnap = snap.bySubject?.[sk];
    const dSub = bySub[sk];
    const rawDerivedAcc = dSub && typeof dSub.accuracy === "number" ? Math.round(n(dSub.accuracy)) : null;
    const accPct = subSnap?.accountAccuracyPct != null ? Math.round(n(subSnap.accountAccuracyPct)) : null;
    const accuracyDisplay = accPct ?? rawDerivedAcc;
    const answersTotal = n(dSub?.answersTotal);
    const correctTotal = n(dSub?.correctTotal);
    const sessionMin = n(dSub?.sessionMinutesTotal);
    const progressApprox =
      answersTotal > 0 && accuracyDisplay != null ? Math.min(100, Math.max(0, accuracyDisplay)) : answersTotal > 0 ? 8 : 0;

    subjects.push({
      key: sk,
      labelHe: meta.labelHe,
      href: meta.href,
      level: n(subSnap?.playerLevel) || 1,
      stars: n(subSnap?.stars),
      bestScore: n(subSnap?.bestScore),
      bestStreak: n(subSnap?.bestStreak),
      accuracyPct: accuracyDisplay,
      answersTotal,
      correctTotal,
      sessionMinutesRounded: Math.round(sessionMin * 10) / 10,
      progressIndicatorPct: progressApprox,
      hasServerSlice: !!subSnap,
    });
  }

  const recommendations = [];
  let topKey = null;
  let topAnswers = -1;
  for (const sk of STUDENT_HOME_SUBJECT_ORDER) {
    const at = n(bySub[sk]?.answersTotal);
    if (at > topAnswers) {
      topAnswers = at;
      topKey = sk;
    }
  }
  if (topKey && topAnswers > 0 && SUBJECT_UI[topKey]) {
    recommendations.push({
      id: "practice-focus",
      titleHe: "תרגול מומלץ",
      descriptionHe: `יש לך הכי הרבה פעילות בנושא ${SUBJECT_UI[topKey].labelHe}. אפשר להמשיך לשם בקליק.`,
      href: SUBJECT_UI[topKey].href,
      ctaHe: `מעבר ל${SUBJECT_UI[topKey].labelHe}`,
    });
  }
  recommendations.push({
    id: "pick-subject",
    titleHe: "המשך מהמקום שבו עצרת",
    descriptionHe:
      topAnswers > 0
        ? "בחרו נושא מהרשימה למטה כדי להמשיך ללמוד."
        : "עדיין לא נרשמה פעילות — בחרו נושא כדי להתחיל.",
    href: "/learning",
    ctaHe: "מעבר לעמוד הלימודים",
  });

  const gradeLevelRaw =
    student?.grade_level != null && student?.grade_level !== "" ? String(student.grade_level) : "";

  // ── Phase 2: daily missions view ────────────────────────────────────────
  const challenges = row.challenges;
  const daily =
    challenges?.daily && typeof challenges.daily === "object" && !Array.isArray(challenges.daily)
      ? challenges.daily
      : null;

  // Compare server date to today in Israel timezone (client-side Intl is available in browsers)
  let todayIsrael = "";
  try {
    todayIsrael = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
  } catch {
    todayIsrael = "";
  }

  let dailyMissions = null;
  if (daily?.date === todayIsrael && Array.isArray(daily?.missions) && daily.missions.length > 0) {
    const missions = daily.missions.map((m) => {
      const tgt  = Number(m.target)   || 0;
      const prog = Math.min(Number(m.progress) || 0, tgt);
      return {
        id:          String(m.id    || ""),
        textHe:      String(m.textHe || ""),
        type:        String(m.type  || ""),
        target:      tgt,
        progress:    prog,
        completed:   Boolean(m.completed),
        coinAwarded: Boolean(m.coinAwarded),
        rewardCoins: Number(m.rewardCoins) || 20,
        progressPct: tgt > 0 ? Math.min(100, Math.round((prog / tgt) * 100)) : 0,
      };
    });
    dailyMissions = {
      date:           daily.date,
      missions,
      totalCompleted: missions.filter((m) => m.completed).length,
      allCompleted:   missions.length > 0 && missions.every((m) => m.completed),
    };
  }

  // ── Phase 2: monthly persistence coin tiers ─────────────────────────────
  const currentMonthMinutes = minutesThisMonth; // from existing derived computation
  const completedTiers = MONTHLY_PERSISTENCE_TIERS.filter((t) => currentMonthMinutes >= t.minutes);
  const nextTierObj    = MONTHLY_PERSISTENCE_TIERS.find((t)  => currentMonthMinutes <  t.minutes) ?? null;
  const progressToNextTierPct = nextTierObj
    ? Math.min(100, Math.round((currentMonthMinutes / nextTierObj.minutes) * 100))
    : 100;

  const monthlyPersistence = {
    currentMinutes:        Math.round(currentMonthMinutes * 10) / 10,
    tiers:                 MONTHLY_PERSISTENCE_TIERS,
    completedTiers,
    nextTier:              nextTierObj,
    progressToNextTierPct,
  };

  return {
    identity: {
      studentId: String(student?.id || "").trim(),
      fullName: String(student?.full_name || "").trim(),
      /** Raw value from session (e.g. grade_3); use gradeLevelDisplayHe in UI. */
      gradeLevel: gradeLevelRaw,
      gradeLevelDisplayHe: formatGradeLevelHe(student?.grade_level),
      coinBalance: n(student?.coin_balance),
      avatarEmoji,
      avatarCustomDataUrl,
      friendlyLineHe: "שמחים לראות אותך! כל תרגול מקרב אותך ליעד.",
    },
    accountStats: {
      summaryLevel: n(snap.summaryPlayerLevel) || 1,
      summaryStars: n(snap.summaryStars),
      bestScoreOverall,
      bestStreakOverall,
      overallAccuracyPct,
      questionsAnswered: answersTotalAll,
      correctAnswers: correctAll,
      learningMinutesLifetimeRounded: Math.round(sessionMinutesAll * 10) / 10,
      learningMinutesThisMonth: minutesThisMonth,
      monthlyGoalMinutes: goalMinutes,
    },
    monthlyJourney: {
      yearMonth: ym,
      minutesThisMonth,
      goalMinutes,
      progressPct,
      selectedRewardKey: selectedRewardKey || null,
      selectedRewardLabel: selectedRewardLabel || "",
      celebrationShownForMonth,
      minutesRemaining,
      encouragementHe:
        progressPct >= 100
          ? celebrationShownForMonth
            ? "יעד החודש הושג. כל הכבוד!"
            : "יעד החודש בדרך כלל מסומן אחרי שמגיעים ליעד הדקות — המשיכו ללמוד!"
          : `נשארו בערך ${minutesRemaining} דקות ליעד החודש (${goalMinutes} דקות).`,
    },
    subjects,
    badges,
    recommendations,
    dailyMissions,
    monthlyPersistence,
    meta: {
      hasHomeDashboardPayload: true,
      subjectsKeys: [...STUDENT_HOME_SUBJECT_ORDER],
    },
  };
}
