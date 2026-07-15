/**
 * Pure view-model builder for the student home dashboard (browser + Node safe).
 * Primary input: GET /api/student/home-profile (compact payload + server-built accountSnapshot).
 */

import { LEARNING_PROFILE_SUBJECT_KEYS } from "../learning-shared/student-learning-profile-model.js";
import { mapSubjectAccountView } from "../learning-shared/student-account-state-view.js";
import { formatGradeLevelHe, normalizeGradeLevelToKey } from "../learning-student-defaults.js";
import { resolveProfileBackgroundKey } from "../student-ui/profile-background.client.js";
import { buildDailyMissionsView } from "./dailyMissionsView.js";
import {
  GEOGRAPHY_MASTER_HREF,
  MOLEDET_MASTER_HREF,
  VISUAL_STRAND_LABEL_HE,
} from "../learning-shared/moledet-geography-display.js";
import {
  StudentDisplayTruthState,
  STUDENT_TRUTH_LABELS_HE,
  classifyMonthlyMinutes,
  classifyServerNumber,
  finiteNumberOrNull,
  formatStudentCoinBalance,
  formatStudentPercentHe,
  subjectAccuracyFromDerivedSub,
} from "../learning-shared/student-display-truth.js";

/** @type {readonly string[]} Display order for the home subject grid */
export const STUDENT_HOME_SUBJECT_ORDER = [
  "math",
  "hebrew",
  "english",
  "science",
  "geometry",
  "moledet_visual",
  "geography_visual",
  "history",
];

const MG_INTERNAL_KEY = "moledet_geography";

const SUBJECT_UI = {
  math: { labelHe: "מתמטיקה", href: "/learning/math-master", storageKey: "math" },
  hebrew: { labelHe: "עברית", href: "/learning/hebrew-master", storageKey: "hebrew" },
  english: { labelHe: "אנגלית", href: "/learning/english-master", storageKey: "english" },
  science: { labelHe: "מדעים", href: "/learning/science-master", storageKey: "science" },
  geometry: { labelHe: "גאומטריה", href: "/learning/geometry-master", storageKey: "geometry" },
  moledet_visual: {
    labelHe: VISUAL_STRAND_LABEL_HE.moledet,
    href: MOLEDET_MASTER_HREF,
    storageKey: MG_INTERNAL_KEY,
  },
  geography_visual: {
    labelHe: VISUAL_STRAND_LABEL_HE.geography,
    href: GEOGRAPHY_MASTER_HREF,
    storageKey: MG_INTERNAL_KEY,
  },
  history: {
    labelHe: "היסטוריה",
    href: "/learning/history-master",
    storageKey: "history",
  },
};

function n(v) {
  const x = finiteNumberOrNull(v);
  return x ?? 0;
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
  const monthlyPersistenceStatus =
    homePayload?.monthlyPersistenceStatus &&
    typeof homePayload.monthlyPersistenceStatus === "object" &&
    !Array.isArray(homePayload.monthlyPersistenceStatus)
      ? homePayload.monthlyPersistenceStatus
      : null;
  const monthlyPersistenceLoadError = homePayload?.monthlyPersistenceLoadError === true;
  const economyConfig =
    homePayload?.economyConfig &&
    typeof homePayload.economyConfig === "object" &&
    !Array.isArray(homePayload.economyConfig)
      ? homePayload.economyConfig
      : null;
  const economyConfigLoadError = homePayload?.economyConfigLoadError === true;
  const monthlyPersistenceTiers = Array.isArray(economyConfig?.monthlyTiers)
    ? economyConfig.monthlyTiers
    : [];
  const tiersStatusByMinutes = new Map(
    (Array.isArray(monthlyPersistenceStatus?.tiersStatus)
      ? monthlyPersistenceStatus.tiersStatus
      : []
    ).map((row) => [Number(row.minutes), row])
  );
  const snap =
    homePayload?.accountSnapshot &&
    typeof homePayload.accountSnapshot === "object" &&
    !Array.isArray(homePayload.accountSnapshot)
      ? homePayload.accountSnapshot
      : null;

  if (!snap) return null;

  const derivedPending = homePayload?.derivedPending === true || !derived;

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
  const avatarBackgroundKey = resolveProfileBackgroundKey(profile.avatarBackgroundKey);

  const gradeLevelRaw =
    student?.grade_level != null && student?.grade_level !== "" ? String(student.grade_level) : "";
  const dailyMissions = buildDailyMissionsView(row.challenges);
  const coinTruth = formatStudentCoinBalance(student?.coin_balance, "ready");

  const bySub =
    derived?.bySubject && typeof derived.bySubject === "object" && !Array.isArray(derived.bySubject)
      ? derived.bySubject
      : {};

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

  const answersTotalAll = derived ? n(derived.answersTotalAll) : 0;

  const ym =
    derived?.yearMonthIsrael != null
      ? String(derived.yearMonthIsrael)
      : derived?.yearMonthUtc != null
        ? String(derived.yearMonthUtc)
        : "";
  const monthly = row.monthly && typeof row.monthly === "object" && !Array.isArray(row.monthly) ? row.monthly : {};
  const celebrationsShown =
    monthly.celebrationsShown && typeof monthly.celebrationsShown === "object" ? monthly.celebrationsShown : {};
  const goalMinutes =
    economyConfig?.goalMinutes != null ? Number(economyConfig.goalMinutes) : null;
  const derivedMonthMinutes = derived
    ? finiteNumberOrNull(derived.monthlyMinutesIsraelMonth ?? derived.monthlyMinutesUtcMonth)
    : null;
  const persistenceActiveMinutes =
    monthlyPersistenceStatus?.activeMinutes != null
      ? finiteNumberOrNull(monthlyPersistenceStatus.activeMinutes)
      : null;
  const canonicalMonthMinutes =
    persistenceActiveMinutes != null ? persistenceActiveMinutes : derivedMonthMinutes;
  const minutesThisMonth =
    canonicalMonthMinutes != null ? Math.round(canonicalMonthMinutes * 100) / 100 : null;
  const monthlyMinutesTruth = classifyMonthlyMinutes(minutesThisMonth, {
    serverConfirmed: true,
    filterNoteHe: STUDENT_TRUTH_LABELS_HE.creditedLearningMinutes,
  });
  const progressPct =
    minutesThisMonth != null && goalMinutes != null && goalMinutes > 0
      ? Math.min(100, Math.round((minutesThisMonth / goalMinutes) * 100))
      : null;
  const celebrationShownForMonth = !!(ym && celebrationsShown[ym]);
  const minutesRemaining =
    minutesThisMonth != null && goalMinutes != null
      ? Math.max(0, Math.round(goalMinutes - minutesThisMonth))
      : null;

  /** @type {Array<{ label: string, subjectKey: string, subjectLabelHe: string }>} */
  const badges = [];
  const seen = new Set();
  const achievementNames = Array.isArray(snap.achievementsNames) ? snap.achievementsNames : [];
  if (achievementNames.length) {
    for (const label of achievementNames) {
      const t = String(label || "").trim();
      if (!t || seen.has(t)) continue;
      seen.add(t);
      badges.push({ label: t, subjectKey: "", subjectLabelHe: "" });
    }
  }
  for (const sk of STUDENT_HOME_SUBJECT_ORDER) {
    const storageKey = SUBJECT_UI[sk]?.storageKey ?? sk;
    const acc = mapSubjectAccountView(row, storageKey, name, derived);
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
    const storageKey = meta.storageKey ?? sk;
    const subSnap = snap.bySubject?.[storageKey];
    const dSub = bySub[storageKey];
    const subAcc = subjectAccuracyFromDerivedSub(dSub);
    const accPct = subSnap?.accountAccuracyPct != null ? Math.round(n(subSnap.accountAccuracyPct)) : subAcc.pct;
    const answersTotal = n(dSub?.answersTotal);
    const correctTotal = n(dSub?.correctTotal);
    const wrongTotal = n(dSub?.wrongTotal);
    const gradedCount = correctTotal + wrongTotal;
    const sessionMinRaw = finiteNumberOrNull(dSub?.sessionMinutesTotal);
    const sessionMin = sessionMinRaw != null ? Math.round(sessionMinRaw * 10) / 10 : null;
    const answersTruth = classifyServerNumber(answersTotal, {
      gradedCount: answersTotal === 0 ? 0 : null,
      serverConfirmed: true,
    });
    const progressIndicatorPct =
      accPct != null && gradedCount > 0 ? Math.min(100, Math.max(0, accPct)) : null;
    const progressIndicatorState =
      progressIndicatorPct == null
        ? StudentDisplayTruthState.noData
        : StudentDisplayTruthState.serverConfirmed;

    subjects.push({
      key: sk,
      labelHe: meta.labelHe,
      href: meta.href,
      level: subSnap?.playerLevel != null ? n(subSnap.playerLevel) : null,
      levelDisplayHe:
        subSnap?.playerLevel != null ? String(n(subSnap.playerLevel)) : STUDENT_TRUTH_LABELS_HE.noData,
      stars: subSnap?.stars != null ? n(subSnap.stars) : null,
      starsScopeHe: STUDENT_TRUTH_LABELS_HE.cumulative,
      bestScore: n(subSnap?.bestScore),
      bestStreak: n(subSnap?.bestStreak),
      accuracyPct: accPct,
      accuracyDisplayHe: formatStudentPercentHe(accPct, { gradedCount }),
      accuracyState:
        accPct == null
          ? StudentDisplayTruthState.noData
          : accPct === 0
            ? StudentDisplayTruthState.realZero
            : StudentDisplayTruthState.serverConfirmed,
      answersTotal,
      answersDisplayHe: answersTruth.displayHe,
      answersState: answersTruth.state,
      correctTotal,
      sessionMinutesRounded: sessionMin,
      sessionMinutesDisplayHe:
        sessionMin != null ? String(sessionMin) : STUDENT_TRUTH_LABELS_HE.noData,
      progressIndicatorPct,
      progressIndicatorState,
      hasServerSlice: !!subSnap,
    });
  }

  const recommendations = [];
  let topKey = null;
  let topAnswers = -1;
  for (const sk of STUDENT_HOME_SUBJECT_ORDER) {
    const storageKey = SUBJECT_UI[sk]?.storageKey ?? sk;
    const at = n(bySub[storageKey]?.answersTotal);
    if (at > topAnswers) {
      topAnswers = at;
      topKey = sk;
    }
  }
  if (topKey && topAnswers > 0 && SUBJECT_UI[topKey]) {
    recommendations.push({
      id: "practice-focus",
      titleHe: "הצעה להמשך",
      descriptionHe: `יש לך הכי הרבה פעילות בנושא ${SUBJECT_UI[topKey].labelHe}. אפשר להמשיך לשם בקליק.`,
      href: SUBJECT_UI[topKey].href,
      ctaHe: `מעבר ל${SUBJECT_UI[topKey].labelHe}`,
      truthState: StudentDisplayTruthState.estimated,
    });
  }
  recommendations.push({
    id: "pick-subject",
    titleHe: "המשך מהמקום שבו עצרת",
    descriptionHe:
      topAnswers > 0
        ? "בחרו נושא מהרשימה למטה כדי להמשיך ללמוד."
        : "עדיין לא נרשמה פעילות - בחרו נושא כדי להתחיל.",
    href: "/learning",
    ctaHe: "מעבר לעמוד הלימודים",
    truthState: StudentDisplayTruthState.estimated,
  });

  // ── Phase 2: daily missions view ────────────────────────────────────────
  const dailyMissionsFull = buildDailyMissionsView(row.challenges);

  // ── Phase 2: monthly persistence coin tiers ─────────────────────────────
  const persistencePanelMinutes =
    persistenceActiveMinutes != null
      ? Math.round(persistenceActiveMinutes * 10) / 10
      : minutesThisMonth != null
        ? Math.round(minutesThisMonth * 10) / 10
        : null;
  const currentMonthMinutes = persistencePanelMinutes ?? 0;
  const completedTiers =
    persistencePanelMinutes != null && monthlyPersistenceTiers.length
      ? monthlyPersistenceTiers.filter((t) => persistencePanelMinutes >= t.minutes)
      : [];
  const nextTierObj =
    persistencePanelMinutes != null && monthlyPersistenceTiers.length
      ? monthlyPersistenceTiers.find((t) => persistencePanelMinutes < t.minutes) ?? null
      : null;
  const progressToNextTierPct =
    persistencePanelMinutes != null && nextTierObj
      ? Math.min(100, Math.round((persistencePanelMinutes / nextTierObj.minutes) * 100))
      : persistencePanelMinutes != null
        ? 100
        : null;

  const coinTruthFull = formatStudentCoinBalance(student?.coin_balance, "ready");

  const tiersWithStatus = monthlyPersistenceTiers.map((tier) => {
    const statusRow = tiersStatusByMinutes.get(tier.minutes);
    const reached =
      statusRow?.reached === true ||
      (persistencePanelMinutes != null && persistencePanelMinutes >= tier.minutes);
    const awarded = statusRow?.awarded === true;
    return {
      ...tier,
      reached,
      awarded,
    };
  });

  const monthlyPersistence = {
    currentMinutes: persistencePanelMinutes,
    currentMinutesDisplayHe: monthlyPersistenceLoadError
      ? STUDENT_TRUTH_LABELS_HE.unavailable
      : monthlyMinutesTruth.displayHe,
    currentMinutesState: monthlyPersistenceLoadError
      ? StudentDisplayTruthState.unavailable
      : monthlyMinutesTruth.state,
    filterNoteHe: STUDENT_TRUTH_LABELS_HE.creditedLearningMinutes,
    minutesFilterMismatch: false,
    loadError: monthlyPersistenceLoadError,
    economyConfigLoadError,
    tiers: tiersWithStatus,
    completedTiers,
    nextTier: nextTierObj,
    progressToNextTierPct,
    minutesToNextTier:
      persistencePanelMinutes != null && nextTierObj
        ? Math.max(0, Math.round((nextTierObj.minutes - persistencePanelMinutes) * 10) / 10)
        : null,
    nextTierEncouragementHe: monthlyPersistenceLoadError
      ? STUDENT_TRUTH_LABELS_HE.unavailable
      : persistencePanelMinutes == null
        ? STUDENT_TRUTH_LABELS_HE.noData
        : nextTierObj
          ? `עוד ${Math.max(0, Math.ceil(nextTierObj.minutes - persistencePanelMinutes))} דקות לפרס הבא`
          : "השגת את כל פרסי החודש! כל הכבוד!",
  };

  return {
    identity: {
      studentId: String(student?.id || "").trim(),
      fullName: String(student?.full_name || "").trim(),
      /** Raw value from session (e.g. grade_3); use gradeLevelDisplayHe in UI. */
      gradeLevel: gradeLevelRaw,
      gradeLevelDisplayHe: formatGradeLevelHe(student?.grade_level),
      coinBalance: coinTruthFull.value,
      coinBalanceDisplayHe: coinTruthFull.displayHe,
      coinBalanceState: coinTruthFull.state,
      avatarEmoji,
      avatarCustomDataUrl,
      avatarBackgroundKey,
      friendlyLineHe: "שמחים לראות אותך! כל תרגול מקרב אותך ליעד.",
    },
    accountStats: {
      summaryLevel: n(snap.summaryPlayerLevel) || 1,
      summaryStars: n(snap.summaryStars),
      summaryStarsScopeHe: STUDENT_TRUTH_LABELS_HE.cumulative,
      bestScoreOverall,
      bestStreakOverall,
      overallAccuracyPct,
      overallAccuracyDisplayHe: formatStudentPercentHe(overallAccuracyPct, { gradedCount: graded }),
      overallAccuracyState:
        overallAccuracyPct == null
          ? StudentDisplayTruthState.noData
          : overallAccuracyPct === 0
            ? StudentDisplayTruthState.realZero
            : StudentDisplayTruthState.serverConfirmed,
      questionsAnswered: answersTotalAll,
      questionsAnsweredDisplayHe: classifyServerNumber(answersTotalAll, {
        gradedCount: answersTotalAll === 0 ? 0 : null,
      }).displayHe,
      correctAnswers: correctAll,
      learningMinutesLifetimeRounded:
        sessionMinutesAll > 0 ? Math.round(sessionMinutesAll * 10) / 10 : sessionMinutesAll,
      learningMinutesLifetimeDisplayHe:
        sessionMinutesAll > 0
          ? String(Math.round(sessionMinutesAll * 10) / 10)
          : STUDENT_TRUTH_LABELS_HE.noData,
      learningMinutesLifetimeScopeHe: STUDENT_TRUTH_LABELS_HE.cumulative,
      learningMinutesThisMonth: minutesThisMonth,
      learningMinutesThisMonthDisplayHe: monthlyMinutesTruth.displayHe,
      learningMinutesThisMonthState: monthlyMinutesTruth.state,
      learningMinutesFilterNoteHe: monthlyMinutesTruth.filterNoteHe,
      monthlyGoalMinutes: goalMinutes,
    },
    monthlyJourney: {
      yearMonth: ym,
      minutesThisMonth,
      minutesDisplayHe: monthlyMinutesTruth.displayHe,
      minutesState: monthlyMinutesTruth.state,
      filterNoteHe: monthlyMinutesTruth.filterNoteHe,
      goalMinutes,
      progressPct,
      progressState:
        progressPct == null
          ? StudentDisplayTruthState.noData
          : progressPct === 0
            ? StudentDisplayTruthState.realZero
            : StudentDisplayTruthState.serverConfirmed,
      celebrationShownForMonth,
      minutesRemaining,
      scopeLabelHe: STUDENT_TRUTH_LABELS_HE.periodThisMonth,
      encouragementHe: monthlyPersistenceLoadError
        ? STUDENT_TRUTH_LABELS_HE.unavailable
        : minutesThisMonth == null
          ? STUDENT_TRUTH_LABELS_HE.noData
          : progressPct != null && progressPct >= 100
            ? celebrationShownForMonth
              ? "יעד החודש הושג. כל הכבוד!"
              : "יעד החודש בדרך כלל מסומן אחרי שמגיעים ליעד הדקות - המשיכו ללמוד!"
            : minutesRemaining != null
              ? `נשארו בערך ${minutesRemaining} דקות ליעד החודש (${goalMinutes} דקות).`
              : STUDENT_TRUTH_LABELS_HE.noData,
    },
    subjects,
    badges,
    recommendations,
    dailyMissions: dailyMissionsFull,
    monthlyPersistence,
    meta: {
      hasHomeDashboardPayload: true,
      derivedPending,
      analyticsPending: derivedPending,
      subjectsKeys: [...STUDENT_HOME_SUBJECT_ORDER],
      monthlyPersistenceLoadError,
      minutesFilterMismatch: false,
      parentActivityInDashboardMinutes: true,
      parentActivityDashboardNoteHe:
        "פעילות הורה מזוכה בדקות/progress/rewards דרך computeStudentLearningDerived + monthly persistence (סוכן 2). לא מוצגת בדוח הורים כפעילות נפרדת.",
    },
  };
}
