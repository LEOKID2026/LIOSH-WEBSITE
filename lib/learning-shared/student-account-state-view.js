/**
 * Single source of truth for account / gamification display fields shared by
 * student HUD and parent reports. Pure functions — safe in browser and Node.
 */

import {
  LEARNING_PROFILE_SUBJECT_KEYS,
  normalizeLearningProfileRow,
} from "./student-learning-profile-model.js";
import {
  accountAccuracyDisplayFromDerived,
  maxBestForPlayerInKey,
  pickSubjectChallengeBlobs,
} from "../learning-client/student-dashboard-account-tiles.js";
import { isStudentIdentityDebugEnabled } from "../student-identity-debug-flag.js";
import { StudentDisplayTruthState, classifyServerNumber } from "./student-display-truth.js";

/** @param {unknown} v */
function isPlainObject(v) {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

/**
 * @param {unknown} scoresStore
 * @param {string} playerName
 */
export function maxBestAcrossScoresStore(scoresStore, playerName) {
  if (!isPlainObject(scoresStore)) return { bestScore: 0, bestStreak: 0 };
  let bestScore = 0;
  let bestStreak = 0;
  for (const key of Object.keys(scoresStore)) {
    const { maxScore, maxStreak } = maxBestForPlayerInKey(scoresStore, key, playerName);
    bestScore = Math.max(bestScore, maxScore);
    bestStreak = Math.max(bestStreak, maxStreak);
  }
  return { bestScore, bestStreak };
}

/**
 * @param {unknown} rowLike - raw `student_learning_state` row or `{ subjects, challenges, … }`
 * @param {string} subjectKey
 * @param {string} playerDisplayName
 * @param {unknown} [derivedLike] - optional `computeStudentLearningDerived` result
 */
export function mapSubjectAccountView(rowLike, subjectKey, playerDisplayName, derivedLike) {
  const row = normalizeLearningProfileRow(rowLike || {});
  const sub = row.subjects[subjectKey];
  const subObj = isPlainObject(sub) ? sub : {};
  const ps = isPlainObject(subObj.progressStore) ? subObj.progressStore : {};
  const scoresStore = isPlainObject(subObj.scoresStore) ? subObj.scoresStore : {};
  const name = String(playerDisplayName || "").trim() || "Student";

  const playerLevel = typeof ps.playerLevel === "number" && Number.isFinite(ps.playerLevel) ? ps.playerLevel : null;
  const stars = typeof ps.stars === "number" && Number.isFinite(ps.stars) ? ps.stars : null;
  const xp = typeof ps.xp === "number" && Number.isFinite(ps.xp) ? ps.xp : null;
  const { bestScore, bestStreak } = maxBestAcrossScoresStore(scoresStore, name);
  const accountAccuracyPct = accountAccuracyDisplayFromDerived(derivedLike, subjectKey);
  const { daily, weekly } = pickSubjectChallengeBlobs(row.challenges, subjectKey);
  const usedProfileFallback = rowLike == null;
  const serverConfirmed = !usedProfileFallback;

  const playerLevelTruth = classifyServerNumber(playerLevel, { serverConfirmed });
  const starsTruth = classifyServerNumber(stars, { serverConfirmed });
  const xpTruth = classifyServerNumber(xp, { serverConfirmed });

  return {
    subject: subjectKey,
    playerLevel: playerLevelTruth.value,
    playerLevelState: playerLevelTruth.state,
    stars: starsTruth.value,
    starsState: starsTruth.state,
    xp: xpTruth.value,
    xpState: xpTruth.state,
    bestScore,
    bestStreak,
    accountAccuracyPct,
    badges: Array.isArray(ps.badges) ? ps.badges : [],
    dailyChallenge: daily && typeof daily === "object" ? daily : null,
    weeklyChallenge: weekly && typeof weekly === "object" ? weekly : null,
    usedProfileFallback,
  };
}

/**
 * Aggregate gamification for parent-report-v2 `summary` + `challenges` overlay.
 * @param {unknown} rowLike
 * @param {unknown} derivedLike
 * @param {string | null | undefined} studentFullName
 */
export function buildAccountSnapshotForParentReport(rowLike, derivedLike, studentFullName) {
  const name = String(studentFullName || "").trim() || "Student";
  const row = normalizeLearningProfileRow(rowLike || {});

  let stars = 0;
  let xp = 0;
  let playerLevel = 1;
  const badgeNames = [];
  /** @type {Record<string, { playerLevel: number; stars: number; xp: number; bestScore: number; bestStreak: number; accountAccuracyPct: number | null }>} */
  const bySubject = {};

  for (const sk of LEARNING_PROFILE_SUBJECT_KEYS) {
    const v = mapSubjectAccountView(row, sk, name, derivedLike);
    bySubject[sk] = {
      playerLevel: v.playerLevel ?? 1,
      stars: v.stars ?? 0,
      xp: v.xp ?? 0,
      bestScore: v.bestScore,
      bestStreak: v.bestStreak,
      accountAccuracyPct: v.accountAccuracyPct,
    };
    stars += v.stars ?? 0;
    xp += v.xp ?? 0;
    playerLevel = Math.max(playerLevel, v.playerLevel ?? 1);
    for (const b of v.badges) {
      const label = typeof b === "string" ? b : b && typeof b === "object" && b.name != null ? String(b.name) : String(b);
      if (label) badgeNames.push(label);
    }
  }

  const challenges = row.challenges && typeof row.challenges === "object" && !Array.isArray(row.challenges) ? row.challenges : {};

  let dQuestions = 0;
  let dCorrect = 0;
  let dBestScore = 0;
  let wCurrent = 0;
  let wTarget = 100;
  let wCompleted = false;

  for (const sk of LEARNING_PROFILE_SUBJECT_KEYS) {
    const { daily, weekly } = pickSubjectChallengeBlobs(challenges, sk);
    if (daily && typeof daily === "object") {
      dQuestions += Number(daily.questions) || 0;
      dCorrect += Number(daily.correct) || 0;
      dBestScore = Math.max(dBestScore, Number(daily.bestScore) || 0);
    }
    if (weekly && typeof weekly === "object") {
      wCurrent = Math.max(wCurrent, Number(weekly.current) || 0);
      const t = Number(weekly.target);
      if (Number.isFinite(t) && t > 0) wTarget = Math.max(wTarget, t);
      wCompleted = wCompleted || !!weekly.completed;
    }
  }

  const achievementsCount = badgeNames.length;

  /** @type {Record<string, { questions: number; correct: number; bestScore: number }>} */
  const challengesBySubject = {};
  for (const sk of LEARNING_PROFILE_SUBJECT_KEYS) {
    const { daily } = pickSubjectChallengeBlobs(challenges, sk);
    challengesBySubject[sk] = {
      questions: daily && typeof daily === "object" ? Number(daily.questions) || 0 : 0,
      correct: daily && typeof daily === "object" ? Number(daily.correct) || 0 : 0,
      bestScore: daily && typeof daily === "object" ? Number(daily.bestScore) || 0 : 0,
    };
  }

  return {
    summaryPlayerLevel: playerLevel,
    summaryStars: stars,
    summaryXp: xp,
    achievementsCount,
    achievementsNames: badgeNames,
    challengesDaily: { questions: dQuestions, correct: dCorrect, bestScore: dBestScore },
    challengesWeekly: { current: wCurrent, target: wTarget, completed: wCompleted },
    challengesBySubject,
    bySubject,
    sources: {
      summaryPlayerLevel: "student_learning_state.subjects.*.progressStore.playerLevel (max)",
      summaryStars: "student_learning_state.subjects.*.progressStore.stars (sum)",
      summaryXp: "student_learning_state.subjects.*.progressStore.xp (sum)",
      achievementsCount: "student_learning_state.subjects.*.progressStore.badges (flattened)",
      challengesDaily: "student_learning_state.challenges (per-subject daily blobs, merged)",
      challengesWeekly: "student_learning_state.challenges (per-subject weekly blobs, merged)",
      challengesBySubject: "student_learning_state.challenges (per-subject daily)",
      bySubject: "student_learning_state + derived.bySubject[].accuracy",
    },
  };
}

/**
 * Mutates `baseReport` in place (summary, challenges, achievements) when `apiBody.accountSnapshot` exists.
 * @param {Record<string, unknown>} baseReport
 * @param {Record<string, unknown>} apiBody — GET report-data JSON
 */
export function applyParentReportGamificationOverlay(baseReport, apiBody) {
  const snap = apiBody?.accountSnapshot;
  if (!baseReport || typeof baseReport !== "object" || !snap || typeof snap !== "object") return baseReport;
  if (!baseReport.summary || typeof baseReport.summary !== "object") return baseReport;

  const pre = {
    playerLevel: baseReport.summary.playerLevel,
    stars: baseReport.summary.stars,
    xp: baseReport.summary.xp,
    achievements: baseReport.summary.achievements,
  };

  baseReport.summary = {
    ...baseReport.summary,
    playerLevel: snap.summaryPlayerLevel,
    stars: snap.summaryStars,
    xp: snap.summaryXp,
    achievements: snap.achievementsCount,
  };

  const ch = baseReport.challenges && typeof baseReport.challenges === "object" ? baseReport.challenges : {};
  const bySubSnap =
    snap.challengesBySubject && typeof snap.challengesBySubject === "object" ? snap.challengesBySubject : {};
  /** @type {Record<string, { questions: number; correct: number; bestScore: number }>} */
  const bySubjectOut = {};
  for (const sk of LEARNING_PROFILE_SUBJECT_KEYS) {
    const d = bySubSnap[sk];
    if (d && typeof d === "object") {
      bySubjectOut[sk] = {
        questions: Number(d.questions) || 0,
        correct: Number(d.correct) || 0,
        bestScore: Number(d.bestScore) || 0,
      };
    }
  }

  baseReport.challenges = {
    ...ch,
    daily: { ...(ch.daily && typeof ch.daily === "object" ? ch.daily : {}), ...snap.challengesDaily },
    weekly: { ...(ch.weekly && typeof ch.weekly === "object" ? ch.weekly : {}), ...snap.challengesWeekly },
    bySubject: { ...(ch.bySubject && typeof ch.bySubject === "object" ? ch.bySubject : {}), ...bySubjectOut },
  };

  const names = Array.isArray(snap.achievementsNames) ? snap.achievementsNames : [];
  baseReport.achievements = names.map((name) => ({ name, earned: true }));

  logParentReportAccountOverlayDebug(apiBody?.student?.id, pre, snap);
  return baseReport;
}

/**
 * @param {unknown} studentId
 * @param {Record<string, unknown>} preOverlaySummarySlice
 * @param {Record<string, unknown>} snap
 */
function logParentReportAccountOverlayDebug(studentId, preOverlaySummarySlice, snap) {
  if (!isStudentIdentityDebugEnabled()) return;
  try {
    console.info("[LIOSH parent-report-account]", {
      studentId: studentId ?? null,
      preOverlay: preOverlaySummarySlice,
      postOverlay: {
        playerLevel: snap.summaryPlayerLevel,
        stars: snap.summaryStars,
        xp: snap.summaryXp,
        achievements: snap.achievementsCount,
      },
      sources: snap.sources ?? null,
    });
  } catch {
    /* ignore */
  }
}

/**
 * Convenience for student masters: same mapping as parent snapshot per subject.
 * @param {{ row?: Record<string, unknown>; derived?: unknown; studentId?: string }} profile
 * @param {string} subjectKey
 * @param {string} [playerNameHint]
 */
export function mapSubjectAccountViewFromStudentProfile(profile, subjectKey, playerNameHint) {
  const row = profile?.row || {};
  const derived = profile?.derived;
  const name =
    String(playerNameHint || "").trim() ||
    String(row.profile?.displayName || row.profile?.fullName || "").trim() ||
    "Student";
  return mapSubjectAccountView(row, subjectKey, name, derived);
}
