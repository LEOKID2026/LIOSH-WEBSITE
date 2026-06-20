/**
 * Canonical lobby + account display model for student subject pages.
 * All visible account-level fields should be derived here (not from raw localStorage).
 */

import { mapSubjectAccountViewFromStudentProfile } from "./student-account-state-view.js";
import { pickSubjectChallengeBlobs } from "../learning-client/student-dashboard-account-tiles.js";
import { isStudentIdentityDebugEnabled } from "../student-identity-debug-flag.js";
import {
  StudentDisplayTruthState,
  STUDENT_TRUTH_LABELS_HE,
  classifyChallengeProgressPct,
  classifyServerNumber,
  formatStudentPercentHe,
  subjectAccuracyFromDerivedSub,
} from "./student-display-truth.js";

/** Subjects where correct-only daily paths imply `correct` should track `questions` for legacy rows. Hebrew excluded (guided flow can increment questions alone). */
const DAILY_QUESTIONS_IMPLY_CORRECT = new Set(["math", "moledet_geography", "geometry", "science"]);

/**
 * @typedef {object} StudentSubjectDashboardCurrentRun
 * @property {boolean} [gameActive]
 * @property {number} [score]
 * @property {number} [streak]
 * @property {number} [correct]
 * @property {number} [bestScore]
 * @property {number} [bestStreak]
 * @property {number} [lives]
 * @property {number | null} [timeLeft]
 */

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Build canonical daily challenge numbers from the server row + derived accuracy (never raw localStorage).
 * @param {Record<string, unknown> | null | undefined} dailyBlob
 * @param {unknown} derived
 * @param {string} subjectKey
 * @param {number | null} accountAccuracyPct
 */
export function reconcileDailyChallengeForDisplay(dailyBlob, derived, subjectKey, accountAccuracyPct) {
  const raw = dailyBlob && typeof dailyBlob === "object" && !Array.isArray(dailyBlob) ? dailyBlob : {};
  let questionsToday = Math.max(0, Math.floor(num(raw.questions)));
  let correctToday = Math.max(0, Math.floor(num(raw.correct)));
  const scoreToday = Math.max(0, Math.floor(num(raw.bestScore ?? raw.score)));
  const date = raw.date != null ? String(raw.date) : "";
  const completed = !!raw.completed;

  let reconciled = false;
  let reconcileReason = "";

  if (questionsToday > 0 && correctToday < questionsToday) {
    if (DAILY_QUESTIONS_IMPLY_CORRECT.has(subjectKey) && correctToday === 0) {
      correctToday = questionsToday;
      reconciled = true;
      reconcileReason = "implied:questions_counter_matches_correct_only_path";
    } else if (typeof accountAccuracyPct === "number" && accountAccuracyPct >= 1) {
      const implied = Math.min(questionsToday, Math.max(correctToday, Math.round((questionsToday * accountAccuracyPct) / 100)));
      if (implied > correctToday) {
        correctToday = implied;
        reconciled = true;
        reconcileReason = "implied:accountAccuracyPct_floor";
      }
    }
  }

  if (correctToday > questionsToday) {
    correctToday = questionsToday;
    reconciled = true;
    reconcileReason = (reconcileReason ? reconcileReason + ";" : "") + "clamp:correct_leq_questions";
  }

  const accuracyToday =
    questionsToday > 0 ? Math.round((correctToday / questionsToday) * 100) : accountAccuracyPct != null ? accountAccuracyPct : null;

  return {
    questionsToday,
    correctToday,
    scoreToday,
    accuracyToday,
    date,
    completed,
    reconciled,
    reconcileReason,
    sourceMap: {
      questionsToday: "server-profile:challenges.daily.questions",
      correctToday: reconciled ? `reconciled:${reconcileReason || "yes"}` : "server-profile:challenges.daily.correct",
      scoreToday: "server-profile:challenges.daily.bestScore",
      accuracyToday:
        questionsToday > 0
          ? "derived:correctToday/questionsToday"
          : accountAccuracyPct != null
            ? "server-derived:accountAccuracyPct"
            : "none",
    },
  };
}

/**
 * Merge server challenge row with in-flight React state so UI matches session before PATCH.
 * @param {Record<string, unknown> | null | undefined} serverBlob
 * @param {Record<string, unknown> | null | undefined} liveBlob
 */
export function mergeChallengeBlobForDisplay(serverBlob, liveBlob) {
  const s = serverBlob && typeof serverBlob === "object" && !Array.isArray(serverBlob) ? serverBlob : {};
  const l = liveBlob && typeof liveBlob === "object" && !Array.isArray(liveBlob) ? liveBlob : {};
  return {
    ...s,
    questions: Math.max(Math.floor(num(s.questions)), Math.floor(num(l.questions))),
    correct: Math.max(Math.floor(num(s.correct)), Math.floor(num(l.correct))),
    bestScore: Math.max(Math.floor(num(s.bestScore ?? s.score)), Math.floor(num(l.bestScore ?? l.score))),
    date: l.date != null ? l.date : s.date,
    completed: !!(l.completed || s.completed),
    week: l.week != null ? l.week : s.week,
    target: s.target != null ? s.target : l.target,
    current: Math.max(Math.floor(num(s.current)), Math.floor(num(l.current))),
  };
}

/**
 * @param {object} args
 * @param {string} args.subject
 * @param {string} [args.studentId]
 * @param {import("../learning-client/studentLearningProfileClient").StudentLearningProfileResponse | null | undefined} [args.profile]
 * @param {unknown} [args.derived]
 * @param {StudentSubjectDashboardCurrentRun} [args.currentRunState]
 * @param {Record<string, unknown>} [args.scoresStoreSnapshot] — in-memory mirror of server scoresStore for current subject (never read localStorage here)
 * @param {string} [args.topicScopeKey] — optional diagnostic only; score/streak middle tiles are subject-wide
 * @param {object} [args.monthlyState]
 * @param {number} [args.monthlyState.totalMinutes]
 * @param {number} [args.monthlyState.goalMinutes]
 * @param {string} [args.monthlyState.yearMonth]
 * @param {boolean} [args.monthlyState.celebrationShownForMonth]
 * @param {string} [args.mode]
 * @param {boolean} [args.gameActive]
 * @param {string | null | undefined} [args.playerDisplayName]
 * @param {string | null | undefined} [args.avatarEmoji]
 * @param {boolean} [args.hydrationComplete]
 * @param {Record<string, unknown>} [args.liveDailyBlob] — in-session React state merged with server (max counts)
 * @param {Record<string, unknown>} [args.liveWeeklyBlob]
 */
export function buildStudentSubjectDashboardView(args) {
  const {
    subject,
    studentId = "",
    profile,
    derived: derivedArg,
    currentRunState = {},
    scoresStoreSnapshot,
    topicScopeKey = "",
    monthlyState = {},
    mode = "",
    gameActive = false,
    playerDisplayName,
    avatarEmoji = null,
    hydrationComplete = false,
    liveDailyBlob = null,
    liveWeeklyBlob = null,
  } = args;

  const sessionActive = !!gameActive;
  const profileNorm =
    profile && typeof profile === "object"
      ? {
          ...profile,
          row:
            profile.row && typeof profile.row === "object" && !Array.isArray(profile.row)
              ? profile.row
              : {},
        }
      : { row: {}, derived: {} };

  const derived =
    derivedArg && typeof derivedArg === "object" && !Array.isArray(derivedArg)
      ? derivedArg
      : profileNorm.derived && typeof profileNorm.derived === "object" && !Array.isArray(profileNorm.derived)
        ? profileNorm.derived
        : {};

  const row = profileNorm.row && typeof profileNorm.row === "object" ? profileNorm.row : {};
  const subRow = row.subjects?.[subject] && typeof row.subjects[subject] === "object" ? row.subjects[subject] : {};
  const scoresFromProfile =
    subRow.scoresStore && typeof subRow.scoresStore === "object" && !Array.isArray(subRow.scoresStore)
      ? subRow.scoresStore
      : {};
  const scoresStore =
    scoresStoreSnapshot && typeof scoresStoreSnapshot === "object" && !Array.isArray(scoresStoreSnapshot)
      ? scoresStoreSnapshot
      : scoresFromProfile;

  const account = mapSubjectAccountViewFromStudentProfile(profileNorm, subject, playerDisplayName ?? undefined);
  const accountAccuracyPct = account.accountAccuracyPct;

  /** Subject-wide best across all `scoresStore` keys for this player (same scope as parent per-subject snapshot). */
  const subjectBestScore = Math.max(0, Math.floor(num(account.bestScore)));
  const subjectBestStreak = Math.max(0, Math.floor(num(account.bestStreak)));

  const reactBestScore = num(currentRunState?.bestScore);
  const reactBestStreak = num(currentRunState?.bestStreak);
  /** Middle tiles: subject account bests only (not current topic bucket). Optional session high-water from React `bestScore`/`bestStreak` when they already reflect server ref after hydration. */
  const middleBestScore = Math.max(subjectBestScore, reactBestScore);
  const middleBestStreak = Math.max(subjectBestStreak, reactBestStreak);

  const score = num(currentRunState?.score);
  const streak = num(currentRunState?.streak);
  const correct = num(currentRunState?.correct);
  const lifetimeCorrect = Math.max(0, Math.floor(num(derived?.bySubject?.[subject]?.correctTotal)));

  const hudScore = sessionActive ? score : subjectBestScore;
  const hudStreak = sessionActive ? streak : subjectBestStreak;
  const hudCorrect = sessionActive ? correct : lifetimeCorrect;

  const derivedSub = derived?.bySubject?.[subject];
  const subjectAcc = subjectAccuracyFromDerivedSub(derivedSub);
  const middleAccuracyPct = accountAccuracyPct != null ? accountAccuracyPct : subjectAcc.pct;
  const middleAccuracyDisplayHe = formatStudentPercentHe(middleAccuracyPct, {
    gradedCount: subjectAcc.gradedCount,
  });
  const middleAccuracyState =
    middleAccuracyPct == null
      ? StudentDisplayTruthState.noData
      : middleAccuracyPct === 0
        ? StudentDisplayTruthState.realZero
        : StudentDisplayTruthState.serverConfirmed;

  const { daily: dailyBlobRaw, weekly: weeklyBlobRaw } = pickSubjectChallengeBlobs(row.challenges, subject);
  const dailyMerged = mergeChallengeBlobForDisplay(dailyBlobRaw, liveDailyBlob);
  const weeklyMerged = mergeChallengeBlobForDisplay(weeklyBlobRaw, liveWeeklyBlob);
  const dailyCanon = reconcileDailyChallengeForDisplay(dailyMerged, derived, subject, accountAccuracyPct);
  if (liveDailyBlob && typeof liveDailyBlob === "object") {
    dailyCanon.sourceMap = {
      ...dailyCanon.sourceMap,
      questionsToday: "merged:server_profile+liveReact(max)",
      correctToday: dailyCanon.reconciled ? dailyCanon.sourceMap.correctToday : "merged:server_profile+liveReact(max)",
      scoreToday: "merged:server_profile+liveReact(max)",
    };
  }

  const weeklyQuestions = Math.max(0, Math.floor(num(weeklyMerged?.questions)));
  const weeklyCorrect = Math.max(0, Math.floor(num(weeklyMerged?.correct)));
  const weeklyTarget = Math.max(1, Math.floor(num(weeklyMerged?.target, 100)));
  const weeklyCurrent = Math.max(0, Math.floor(num(weeklyMerged?.current)));
  const weeklyCompleted = !!weeklyMerged?.completed;

  const goalMinutes = Math.max(1, num(monthlyState.goalMinutes, 1));
  const monthlyMinutesRaw =
    monthlyState.totalMinutes != null && Number.isFinite(Number(monthlyState.totalMinutes))
      ? Math.max(0, num(monthlyState.totalMinutes))
      : null;
  const totalMinutes = monthlyMinutesRaw ?? 0;
  const monthlyMinutesTruth = classifyServerNumber(monthlyMinutesRaw, { serverConfirmed: monthlyMinutesRaw != null });
  const progressPct =
    monthlyMinutesRaw != null ? Math.min(100, Math.round((monthlyMinutesRaw / goalMinutes) * 100)) : null;

  const dailyProgressPctRaw =
    dailyCanon.questionsToday > 0
      ? Math.min(100, Math.round((dailyCanon.correctToday / dailyCanon.questionsToday) * 100))
      : null;
  const dailyProgressTruth = classifyChallengeProgressPct(
    { reconciled: dailyCanon.reconciled, questionsToday: dailyCanon.questionsToday, serverOnly: !liveDailyBlob },
    dailyProgressPctRaw
  );
  const weeklyProgressPctRaw =
    weeklyCurrent > 0 || weeklyTarget > 0
      ? Math.min(100, Math.round((weeklyCurrent / weeklyTarget) * 100))
      : null;
  const weeklyProgressTruth = classifyChallengeProgressPct(
    { reconciled: false, questionsToday: weeklyQuestions, serverOnly: !liveWeeklyBlob },
    weeklyProgressPctRaw
  );

  const topicProgressSnapshot =
    subRow.progressStore?.progress && typeof subRow.progressStore.progress === "object"
      ? subRow.progressStore.progress
      : null;

  const view = {
    meta: {
      subject,
      studentId: String(studentId || profileNorm.studentId || "").trim(),
      mode: String(mode || ""),
      gameActive: sessionActive,
      hydrationComplete: !!hydrationComplete,
      ignoredLocalStorage: true,
      topicScopeKeyDiagnostic: String(topicScopeKey || "").trim() || null,
    },
    topHud: {
      score: hudScore,
      streak: hudStreak,
      correct: hudCorrect,
      stars: account.stars,
      starsState: account.starsState,
      starsScopeHe: STUDENT_TRUTH_LABELS_HE.cumulative,
      level: account.playerLevel,
      levelState: account.playerLevelState,
      xp: account.xp,
      xpState: account.xpState,
      xpScopeHe: STUDENT_TRUTH_LABELS_HE.cumulative,
      lives: num(currentRunState?.lives),
      timer: currentRunState?.timeLeft,
      avatar: avatarEmoji ?? null,
      sourceMap: {
        score: sessionActive ? "current-run:sessionScore" : "account:subjectWide_bestScore_from_scoresStore",
        streak: sessionActive ? "current-run:sessionStreak" : "account:subjectWide_bestStreak_from_scoresStore",
        correct: sessionActive ? "current-run:sessionCorrectCount" : "server-derived:bySubject.correctTotal",
        stars: "server-profile:progressStore.stars",
        level: "server-profile:progressStore.playerLevel",
        xp: "server-profile:progressStore.xp",
        lives: "current-run:lives",
        timer: "current-run:timeLeft",
        avatar: "server-profile:profile.avatarEmoji_or_react_local_ui",
      },
    },
    middleTiles: {
      challenges: {
        dailyProgressPct: dailyProgressTruth.pct,
        dailyProgressState: dailyProgressTruth.state,
        dailyProgressDisplayHe: dailyProgressTruth.displayHe,
        weeklyProgressPct: weeklyProgressTruth.pct,
        weeklyProgressState: weeklyProgressTruth.state,
        weeklyProgressDisplayHe: weeklyProgressTruth.displayHe,
        weeklyCompleted,
        tileRole: "opens_modal_only",
        modalSource: "merged:server_profile_challenges+liveReact_daily_weekly",
      },
      accuracy: middleAccuracyPct,
      accuracyDisplayHe: middleAccuracyDisplayHe,
      accuracyState: middleAccuracyState,
      bestStreak: middleBestStreak,
      bestScore: middleBestScore,
      sourceMap: {
        bestScore: "account:subjectWide_maxAcross_scoresStore_keys(+react_session_floor_if_higher)",
        bestStreak: "account:subjectWide_maxAcross_scoresStore_keys(+react_session_floor_if_higher)",
        accuracy: "server-derived:bySubject.accuracy",
        challenges: "server-profile:challenges.daily+weekly(+live_merge);tile_is_button_without_numeric_label",
      },
    },
    dailyChallenge: {
      questionsToday: dailyCanon.questionsToday,
      correctToday: dailyCanon.correctToday,
      scoreToday: dailyCanon.scoreToday,
      accuracyToday: dailyCanon.accuracyToday,
      status: dailyCanon.completed ? "completed" : "active",
      date: dailyCanon.date,
      reconciled: dailyCanon.reconciled,
      sourceMap: dailyCanon.sourceMap,
    },
    weeklyChallenge: {
      questions: weeklyQuestions,
      correct: weeklyCorrect,
      target: weeklyTarget,
      current: weeklyCurrent,
      completed: weeklyCompleted,
      sourceMap: {
        aggregate: "server-profile:challenges.weekly",
      },
    },
    monthlyJourney: {
      minutes: monthlyMinutesRaw,
      minutesDisplayHe: monthlyMinutesTruth.displayHe,
      minutesState: monthlyMinutesTruth.state,
      goal: goalMinutes,
      progressPct,
      progressState:
        progressPct == null
          ? StudentDisplayTruthState.unavailable
          : progressPct === 0
            ? StudentDisplayTruthState.realZero
            : StudentDisplayTruthState.serverConfirmed,
      claimedState: !!monthlyState.celebrationShownForMonth,
      yearMonth: monthlyState.yearMonth ?? "",
      scopeLabelHe: STUDENT_TRUTH_LABELS_HE.periodThisMonth,
      sourceMap: {
        minutes: "server-derived:monthlyMinutesIsraelMonth_passed_via_monthlyState",
        goal: "server-economy:monthlyState.goalMinutes_from_economyConfig",
      },
    },
    topicProgress: {
      snapshot: topicProgressSnapshot,
      sourceMap: {
        snapshot: topicProgressSnapshot ? "server-profile:subjects[subject].progressStore.progress" : "none",
      },
    },
  };

  return view;
}

/**
 * @param {string} subjectKey
 * @param {ReturnType<typeof buildStudentSubjectDashboardView>} view
 * @param {{ hydrationComplete?: boolean }} [extra]
 */
export function logStudentSubjectDashboardDiagnostics(subjectKey, view, extra = {}) {
  if (!isStudentIdentityDebugEnabled()) return;
  try {
    const fields = [];
    const push = (path, val, src) => fields.push({ path, value: val, source: src });
    const th = view.topHud;
    const mt = view.middleTiles;
    const dc = view.dailyChallenge;
    push("topHud.score", th.score, th.sourceMap?.score);
    push("topHud.streak", th.streak, th.sourceMap?.streak);
    push("topHud.correct", th.correct, th.sourceMap?.correct);
    push("topHud.stars", th.stars, th.sourceMap?.stars);
    push("topHud.level", th.level, th.sourceMap?.level);
    push("middleTiles.bestScore", mt.bestScore, mt.sourceMap?.bestScore);
    push("middleTiles.bestStreak", mt.bestStreak, mt.sourceMap?.bestStreak);
    push("middleTiles.accuracy", mt.accuracy, mt.sourceMap?.accuracy);
    push("topHud.lives", th.lives, th.sourceMap?.lives);
    push("topHud.timer", th.timer, th.sourceMap?.timer);
    push("dailyChallenge.questionsToday", dc.questionsToday, dc.sourceMap?.questionsToday);
    push("dailyChallenge.correctToday", dc.correctToday, dc.sourceMap?.correctToday);
    push("dailyChallenge.scoreToday", dc.scoreToday, dc.sourceMap?.scoreToday);
    push("dailyChallenge.accuracyToday", dc.accuracyToday, dc.sourceMap?.accuracyToday);
    console.info("[LIOSH student-dashboard-full]", subjectKey, {
      studentId: view.meta.studentId,
      hydrationComplete: !!(extra.hydrationComplete ?? view.meta.hydrationComplete),
      ignoredLocalStorage: view.meta.ignoredLocalStorage,
      fields,
    });
  } catch {
    /* ignore */
  }
}

/** @deprecated use logStudentSubjectDashboardDiagnostics */
export function logStudentDashboardLayoutDebug(subjectKey, payload) {
  if (!isStudentIdentityDebugEnabled()) return;
  try {
    console.info("[LIOSH student-dashboard]", subjectKey, payload);
  } catch {
    /* ignore */
  }
}
