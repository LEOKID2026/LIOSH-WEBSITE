import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Layout from "../../components/Layout";
import { useRouter } from "next/router";
import { useIOSViewportFix } from "../../hooks/useIOSViewportFix";
import { HISTORY_QUESTIONS } from "../../data/history-questions/index.js";
import {
  HISTORY_GRADES,
  HISTORY_GRADE_ORDER,
  HISTORY_TOPIC_LABEL_HE,
} from "../../data/history-curriculum";
import { trackHistoryTopicTime } from "../../utils/history-time-tracking";
import { HISTORY_TEACH_GRADE_KEY } from "../../utils/history-curriculum-gates";
import { useLearningVisibilityClock } from "../../hooks/useLearningVisibilityClock";
import { useLearningWrongAnswerAdvance } from "../../hooks/useLearningWrongAnswerAdvance";
import {
  beginMasterQuestionLedger,
  finalizeMasterQuestionLedger,
  isFairnessVisibilityLedgerActive,
  resolveMasterSessionDurationSeconds,
} from "../../utils/learning-time-credit";
import { computeFreePracticeTiming } from "../../lib/learning/timing-policy.js";
import {
  applyLearningMasterMobileShellLayoutVars,
  LEARNING_MASTER_MOBILE_ANSWER_SCALE_CLASS,
  LEARNING_MASTER_MOBILE_BOOK_TILE_BOTTOM,
  LEARNING_MASTER_MOBILE_CONTENT_SCROLL_CLASS as CONTENT_SCROLL_CLASS,
  LEARNING_MASTER_MOBILE_GAME_CLASS,
  LEARNING_MASTER_MOBILE_HUD_CLASS as HUD_CLASS,
  LEARNING_MASTER_MOBILE_MODE_ROW_CLASS as MODE_ROW_CLASS,
  LEARNING_MASTER_MOBILE_SUBTITLE_ROW_CLASS as SUBTITLE_ROW_CLASS,
  LEARNING_MASTER_MOBILE_WRAP_CLASS,
} from "../../utils/learning-master-mobile.client.js";
import {
  LIVE_PRACTICE_GAME_OVER_HE,
  LIVE_PRACTICE_WRONG_HE,
  formatLearningWrongFeedbackHe,
} from "../../utils/learning-live-feedback-he";
import TrackingDebugPanel from "../../components/TrackingDebugPanel";
import LearningPlannerRecommendationBlock from "../../components/LearningPlannerRecommendationBlock";
import { reportModeFromGameState } from "../../utils/report-track-meta";
import {
  updateDailyStreak,
  getStreakReward,
} from "../../utils/daily-streak";
import { useGameAudio } from "../../hooks/useGameAudio";
import { startLearningMasterSessionAudio } from "../../lib/game-audio/learning-master-session-audio.js";
import { useMobileViewport } from "../../hooks/useMobileViewport";

import { learningMixedHebrewMathStyle } from "../../utils/learning-mixed-hebrew-math";
import { renderLearningMixedHebrewMathText } from "../../components/learning/LearningMixedHebrewMathText";
import { getQuestionFontStyle } from "../../utils/learning-question-font";
import { resolveLearningMcqChoiceClassName } from "../../utils/learning-mcq-choice-styles.client";
import { sanitizeQuestionForStudentDisplay } from "../../utils/student-question-stem-sanitizer";
import { buildQuestionFingerprint } from "../../utils/question-quality";
import StudentQuestionDisplay from "../../components/learning/StudentQuestionDisplay";
import {
  buildHebrewApprovedVerbalMasterLayout,
  buildHebrewApprovedVerbalMcqGridClassName,
  getHebrewApprovedSingleVerbalQuestionStyle,
  HEBREW_APPROVED_VERBAL_ANSWER_AREA_CLASS,
} from "../../utils/hebrew-approved-verbal-master-contract.client.js";
import { warnDuplicateMcqOptionsDevOnly } from "../../utils/answer-compare";
import {
  distractorFamilyFromOptionCell,
  extractDiagnosticMetadataFromQuestion,
  mergeDiagnosticIntoMistakeEntry,
} from "../../utils/diagnostic-mistake-metadata";
import { normalizeMistakeEvent } from "../../utils/mistake-event.js";
import {
  buildPendingProbeFromMistake,
  selectQuestionWithProbe,
  probeMatchesSession,
  attachProbeMetaToQuestion,
  applyProbeOutcome,
  buildDiagnosticProbeClientMeta,
  clearActiveDiagnosticState,
  decrementPendingProbeExpiry,
} from "../../utils/active-diagnostic-runtime/index.js";
import { inferNormalizedTags } from "../../utils/fast-diagnostic-engine/infer-tags.js";
import {
  finishLearningSession,
  saveLearningAnswer,
  startLearningSession,
} from "../../lib/learning-client/learningActivityClient";
import { buildQuestionEngineMetadataFromQuestion } from "../../lib/learning/question-engine-metadata.js";
import { scheduleAdaptivePlannerRecommendation } from "../../lib/learning-client/scheduleAdaptivePlannerRecommendation";
import { buildPlannerRecommendationViewModel } from "../../lib/learning-client/adaptive-planner-recommendation-view-model";
import {
  buildRecommendedPracticeFromViewModel,
  mapPlannerTargetDifficultyToTriLevel,
  mergePlannerSessionClientMeta,
} from "../../lib/learning-client/adaptive-planner-recommended-practice";
import { useSubjectSessionDefaults } from "../../hooks/useSubjectSessionDefaults";
import MasterSubjectAccessScreen from "../../components/learning/MasterSubjectAccessScreen.jsx";
import { notifyLearningSessionSaveFailure } from "../../lib/learning-client/learning-session-save-feedback.client.js";
import {
  STUDENT_GRADE_REQUIRED_MESSAGE_HE,
  STUDENT_SUBJECT_LOADING_MESSAGE_HE,
} from "../../lib/learning-client/student-subject-practice-gate.he.js";
import { useEscapeCloseModals } from "../../hooks/useEscapeCloseModals.js";
import {
  debounceStudentLearningProfilePatch,
  fetchStudentLearningProfile,
  patchStudentLearningProfile,
  refreshStudentLearningProfileAfterSession,
  getCachedStudentLearningProfile,
} from "../../lib/learning-client/studentLearningProfileClient";
import {
  applyLearningProfileAvatarRowToPlayerState,
  compressImageFileToJpegDataUrl,
  patchLearningProfileAvatarCustomImage,
  patchLearningProfileClearAvatarCustom,
  selectProfileBackgroundKey,
} from "../../lib/learning-client/student-avatar-profile-sync";
import {
  accountAccuracyDisplayFromDerived,
  logAccountTileSync,
  maxBestForPlayerInKey,
  pickSubjectChallengeBlobs,
  subjectChallengePatch,
} from "../../lib/learning-client/student-dashboard-account-tiles";
import { mapSubjectAccountViewFromStudentProfile } from "../../lib/learning-shared/student-account-state-view";
import {
  buildStudentSubjectDashboardView,
  logStudentSubjectDashboardDiagnostics,
} from "../../lib/learning-shared/student-subject-dashboard-view";
import SubjectDailyMissionsModal from "../../components/learning/SubjectDailyMissionsModal";
import { buildDailyMissionsView } from "../../lib/learning-client/dailyMissionsView";
import { fetchStudentHomeProfile } from "../../lib/learning-client/fetchStudentHomeProfile";
import { buildSubjectMonthlyPersistenceViewFromProfile } from "../../lib/learning-client/subjectMonthlyPersistenceView";
import { getLearningBookIndexHref } from "../../lib/learning-book/learning-book-catalog-meta";
import LearningBookIndexTile from "../../components/learning-book/LearningBookIndexTile";
import { getHistoryBookHref } from "../../lib/learning-book/resolve-history-book-page";
import {
  consumeAnyHistoryBookLearningSnapshot,
  consumeAnyHistoryBookPracticePreset,
  isHistoryBookPracticeEntry,
  saveHistoryBookLearningSnapshot,
  HISTORY_BOOK_GRADES,
  withHistoryBookLearningReturn,
} from "../../lib/learning-book/history-book-nav";
import {
  buildBookContextClientMetaExtras,
  tryConsumeBookContextOnPracticeEntry,
} from "../../lib/learning-book/book-context-master-helper";
import { useLearningMasterUi } from "../../hooks/useLearningMasterUi.js";
import SubjectMasterSessionShell from "../../components/learning/SubjectMasterSessionShell.jsx";
import StudentLoadingPanel from "../../components/ui/StudentLoadingPanel.jsx";
import { useGuestPlayableTopics } from "../../hooks/useGuestPlayableTopics.js";
import { GUEST_TOPIC_LOCK_MESSAGE_HE } from "../../lib/guest/constants.js";
import StudentLearningAvatar from "../../components/arcade/club/StudentLearningAvatar.jsx";
import ProfileBackgroundPickerGrid from "../../components/student/ProfileBackgroundPickerGrid.jsx";
import { DEFAULT_PROFILE_BACKGROUND_KEY } from "../../lib/student-ui/profile-background-options.js";
import { readProfileBackgroundFromLocalStorage } from "../../lib/student-ui/profile-background.client.js";
import LearningMasterHud from "../../components/learning/LearningMasterHud.jsx";
import LearningMasterNavBar from "../../components/learning/LearningMasterNavBar.jsx";
import LearningMasterDesktopHeader from "../../components/learning/LearningMasterDesktopHeader.jsx";
import LearningMasterAdSlot from "../../components/learning/LearningMasterAdSlot.jsx";
import LearningMasterMobileQuestionActionDock from "../../components/learning/LearningMasterMobileQuestionActionDock.jsx";
import LearningMasterMobileNavTitle from "../../components/learning/LearningMasterMobileNavTitle.jsx";
import { StepExerciseUiProvider } from "../../contexts/StepExerciseUiContext.jsx";
import { formatMathHudNumber } from "../../utils/math-master-hud-number.client.js";
import { useStudentDisplayLevelPractice } from "../../hooks/useStudentDisplayLevelPractice.js";
import { StudentDisplayLevelSelect } from "../../components/learning/StudentDisplayLevelSelect.js";
import {
  migrateLegacyPracticeKeyToDisplayLevel,
  studentDisplayLevelKeys,
  studentDisplayLevelLabel,
} from "../../lib/learning-client/student-display-level-practice.js";

// ================== CONFIG ==================

const STORAGE_KEY = "mleo_history_master";


const LEVELS = {
  easy: { name: "קל", difficulty: 1 },
  medium: { name: "בינוני", difficulty: 2 },
  hard: { name: "קשה", difficulty: 3 },
};

/** Grades 1–2: only easy in default UI (owner policy — medium/hard stretch blocked). */
function historyLevelKeysForGradeKey(gradeKey) {
  const gNum = parseInt(String(gradeKey).replace(/\D/g, ""), 10) || 3;
  if (gNum <= 2) return ["easy"];
  return Object.keys(LEVELS);
}

function clampHistoryLevelForGrade(gradeKey, levelKey) {
  const allowed = historyLevelKeysForGradeKey(gradeKey);
  return allowed.includes(levelKey) ? levelKey : allowed[0];
}

const MODES = {
  learning: { name: "למידה", description: "ללא סיום משחק, תרגול בקצב שלך" },
  challenge: { name: "אתגר", description: "טיימר + חיים, מרוץ ניקוד גבוה" },
  speed: { name: "מהירות", description: "תשובות מהירות = יותר נקודות! ⚡" },
  marathon: { name: "מרתון", description: "כמה שאלות תצליח ברצף? 🏃" },
  practice: { name: "תרגול", description: "בוחר נושא או מיקוד אימון ייעודי" },
};

const GRADES = HISTORY_GRADES;
const GRADE_ORDER = HISTORY_GRADE_ORDER;
const HISTORY_BOOK_GRADE_SET = new Set(HISTORY_BOOK_GRADES);

const TOPICS = {
  what_is_history: { name: HISTORY_TOPIC_LABEL_HE.what_is_history, icon: "📜" },
  classical_greece: { name: HISTORY_TOPIC_LABEL_HE.classical_greece, icon: "🏛️" },
  hellenism_jews: { name: HISTORY_TOPIC_LABEL_HE.hellenism_jews, icon: "🌍" },
  hasmonaeans: { name: HISTORY_TOPIC_LABEL_HE.hasmonaeans, icon: "🕎" },
  rome_jews: { name: HISTORY_TOPIC_LABEL_HE.rome_jews, icon: "🏺" },
  mixed: { name: HISTORY_TOPIC_LABEL_HE.mixed, icon: "🎲" },
};

const PRACTICE_FOCUS_OPTIONS = [
  { value: "balanced", label: "📚 כל הנושאים" },
  { value: "greece_hellenism", label: "🏛️ יוון והלניזם" },
  { value: "hasmonaeans_rome", label: "🕎 חשמונאים ורומא" },
];

const PRACTICE_TOPIC_GROUPS = {
  balanced: null,
  greece_hellenism: ["what_is_history", "classical_greece", "hellenism_jews"],
  hasmonaeans_rome: ["hasmonaeans", "rome_jews"],
};

const AVATAR_OPTIONS = [
  "👤",
  "🧑",
  "👦",
  "👧",
  "🦁",
  "🐱",
  "🐶",
  "🐰",
  "🐻",
  "🐼",
  "🦊",
  "🐸",
  "🦄",
  "🌟",
  "🎮",
  "🏆",
  "⭐",
  "💫",
];

const HISTORY_MISTAKES_KEY = "mleo_history_mistakes";
const HISTORY_MISTAKES_MAX = 80;
const HISTORY_INTEL_KEY = "mleo_history_learning_intel";
const INTEL_FORMAT_VERSION = 2;
const INSIGHT_ANSWER_TAIL_MAX = 20;
const INSIGHT_TOPIC_TAIL_MAX = 8;
const INSIGHT_MIN_TOPIC_ATTEMPTS = 4;
const INTEL_RECENT_MAX = 28;
const RETRY_QUEUE_MAX = 28;
/** Max extra weight from mistake rate (1 + this). Lower = less topic lock-in. */
const TOPIC_WEIGHT_MAX_BOOST = 0.72;
const REFERENCE_SECTIONS = {
  greece_hellenism: {
    label: "יוון והלניזם",
    entries: [
      { term: "דמוקרטיה", desc: "השתתפות אזרחים בהחלטות - אתונה." },
      { term: "פוליס", desc: "עיר-מדינה יוונית עצמאית." },
      { term: "הלניזם", desc: "התפשטות תרבות יוונית לאחר אלכסנדר." },
      { term: "מקור ראשוני", desc: "עדות ישירה מהתקופה הנחקרת." },
    ],
  },
  hasmonaeans_rome: {
    label: "חשמונאים ורומא",
    entries: [
      { term: "גזרות אנטיוכוס", desc: "לחץ על היהדות - זרז למרד." },
      { term: "חנוכה", desc: "ניצחון המכבים וחידוש המקדש." },
      { term: "פרובינציה", desc: "יהודה תחת שלטון רומי." },
      { term: "יבנה", desc: "מרכז ללימוד לאחר החורבן." },
    ],
  },
};

const QUESTIONS = HISTORY_QUESTIONS;

function getTopicLabel(key) {
  const t = TOPICS[key];
  if (!t) return key;
  return `${t.icon} ${t.name}`;
}

function loadHistoryMistakesFromStorage() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_MISTAKES_KEY) || "[]";
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function sanitizeTopicStats(raw) {
  const out = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw)) {
    if (typeof k !== "string" || k.length === 0 || k.length > 80) continue;
    if (!v || typeof v !== "object" || Array.isArray(v)) continue;
    let attempts = Math.floor(Number(v.attempts));
    let wrong = Math.floor(Number(v.wrong));
    if (!Number.isFinite(attempts) || attempts < 0) attempts = 0;
    if (!Number.isFinite(wrong) || wrong < 0) wrong = 0;
    attempts = Math.min(attempts, 500000);
    wrong = Math.min(wrong, attempts);
    out[k] = { attempts, wrong };
  }
  return out;
}

function sanitizeRecentIds(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((id) => typeof id === "string" && id.length > 0 && id.length < 140)
    .slice(-INTEL_RECENT_MAX);
}

function sanitizeAnswerTail(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => x === true || x === 1 || x === "1")
    .slice(-INSIGHT_ANSWER_TAIL_MAX);
}

function sanitizeTopicAnswerTails(raw) {
  const out = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw)) {
    if (!TOPICS[k]) continue;
    if (!Array.isArray(v)) continue;
    out[k] = v
      .map((x) => x === true || x === 1 || x === "1")
      .slice(-INSIGHT_TOPIC_TAIL_MAX);
  }
  return out;
}

function loadHistoryIntel() {
  if (typeof window === "undefined") {
    return {
      topicStats: {},
      recentIds: [],
      recentStemFps: [],
      answerTail: [],
      topicAnswerTails: {},
    };
  }
  try {
    const raw = localStorage.getItem(HISTORY_INTEL_KEY);
    if (!raw) {
      return {
        topicStats: {},
        recentIds: [],
      recentStemFps: [],
        answerTail: [],
        topicAnswerTails: {},
      };
    }
    const p = JSON.parse(raw);
    if (p === null || typeof p !== "object" || Array.isArray(p)) {
      return {
        topicStats: {},
        recentIds: [],
      recentStemFps: [],
        answerTail: [],
        topicAnswerTails: {},
      };
    }
    const topicStats = sanitizeTopicStats(p.topicStats);
    const recentIds = sanitizeRecentIds(p.recentIds);
    const answerTail = sanitizeAnswerTail(p.answerTail);
    const topicAnswerTails = sanitizeTopicAnswerTails(p.topicAnswerTails);
    const recentStemFps = Array.isArray(p.recentStemFps)
      ? p.recentStemFps.map(String).slice(-40)
      : [];
    return { topicStats, recentIds, recentStemFps, answerTail, topicAnswerTails };
  } catch {
    return {
      topicStats: {},
      recentIds: [],
      recentStemFps: [],
      answerTail: [],
      topicAnswerTails: {},
    };
  }
}

function persistHistoryIntel(intel) {
  if (typeof window === "undefined") return;
  try {
    const payload = {
      v: INTEL_FORMAT_VERSION,
      topicStats: sanitizeTopicStats(intel.topicStats),
      recentIds: sanitizeRecentIds(intel.recentIds),
      recentStemFps: Array.isArray(intel.recentStemFps)
        ? intel.recentStemFps.slice(-40)
        : [],
      answerTail: sanitizeAnswerTail(intel.answerTail),
      topicAnswerTails: sanitizeTopicAnswerTails(intel.topicAnswerTails),
    };
    localStorage.setItem(HISTORY_INTEL_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function topicMistakeWeight(topicKey, topicStats) {
  const s = topicStats[topicKey];
  if (!s || typeof s !== "object") return 1;
  const attempts = Math.max(Number(s.attempts) || 0, 1);
  const wrong = Math.min(Number(s.wrong) || 0, attempts);
  const rate = wrong / attempts;
  return 1 + Math.min(TOPIC_WEIGHT_MAX_BOOST, rate * 1.85);
}

function weightedPickQuestions(eligible, topicStats) {
  if (eligible.length === 0) return null;
  if (eligible.length === 1) return eligible[0];
  let total = 0;
  const weights = eligible.map((q) => {
    const w = topicMistakeWeight(q.topic, topicStats);
    total += w;
    return w;
  });
  let r = Math.random() * total;
  for (let i = 0; i < eligible.length; i++) {
    r -= weights[i];
    if (r <= 0) return eligible[i];
  }
  return eligible[eligible.length - 1];
}

/** Drops due, ineligible retries; returns first due question still in pool, or null. */
function dequeueEligibleRetry(queue, pool, askCounter) {
  if (!queue.length || !pool.length) return null;
  queue.sort((a, b) => a.dueAt - b.dueAt);
  const maxSteps = queue.length + 3;
  for (let step = 0; step < maxSteps; step++) {
    const dueIdx = queue.findIndex((r) => r.dueAt <= askCounter);
    if (dueIdx < 0) return null;
    const item = queue.splice(dueIdx, 1)[0];
    const candidate = QUESTIONS.find((q) => q.id === item.id);
    if (candidate && pool.some((p) => p.id === item.id)) {
      return candidate;
    }
  }
  return null;
}

function loadLeaderboardTop10ByDisplayLevel(saved, displayLevel) {
  if (!saved || typeof saved !== "object") return buildTop10(null);
  const sourcePrefixes =
    displayLevel === "advanced" ? ["hard_"] : ["easy_", "medium_"];
  const filtered = {};
  for (const [key, arr] of Object.entries(saved)) {
    if (sourcePrefixes.some((p) => key.startsWith(p))) {
      filtered[key] = arr;
    }
  }
  return buildTop10(filtered);
}

function computeHistoryProgressInsights(topicStats, answerTail) {
  const rows = [];
  let totalAttempts = 0;
  let totalWrong = 0;
  for (const [key, s] of Object.entries(topicStats || {})) {
    const att = Number(s.attempts) || 0;
    const wr = Math.min(Number(s.wrong) || 0, att);
    totalAttempts += att;
    totalWrong += wr;
    const acc = att > 0 ? (att - wr) / att : 0;
    rows.push({ key, attempts: att, acc });
  }
  const totalCorrect = totalAttempts - totalWrong;
  const overallPct =
    totalAttempts > 0
      ? Math.round((totalCorrect / totalAttempts) * 100)
      : null;

  const eligible = rows.filter(
    (r) => r.attempts >= INSIGHT_MIN_TOPIC_ATTEMPTS
  );
  const eligibleTopicCount = eligible.length;
  let strongest = null;
  let weakest = null;
  if (eligibleTopicCount >= 1) {
    const byAcc = [...eligible].sort((a, b) => a.acc - b.acc);
    weakest = byAcc[0];
    strongest = byAcc[byAcc.length - 1];
    if (eligibleTopicCount === 1) {
      weakest = null;
    } else if (strongest && weakest && strongest.key === weakest.key) {
      weakest = null;
    }
  }

  const tail = Array.isArray(answerTail) ? answerTail : [];
  let trend = null;
  if (tail.length >= 10) {
    const mid = Math.floor(tail.length / 2);
    const first = tail.slice(0, mid);
    const second = tail.slice(mid);
    const r1 = first.filter(Boolean).length / first.length;
    const r2 = second.filter(Boolean).length / second.length;
    const d = r2 - r1;
    if (d >= 0.2) trend = "up";
    else if (d <= -0.2) trend = "down";
    else trend = "stable";
  }

  const recentN = tail.length;
  const recentPct =
    recentN > 0
      ? Math.round((tail.filter(Boolean).length / recentN) * 100)
      : null;

  return {
    totalAttempts,
    totalCorrect,
    totalWrong,
    overallPct,
    strongest,
    weakest,
    eligibleTopicCount,
    trend,
    recentN,
    recentPct,
  };
}

function buildInsightFeedbackLines(insights, topicAnswerTails) {
  const lines = [];
  const tailMap =
    topicAnswerTails && typeof topicAnswerTails === "object"
      ? topicAnswerTails
      : {};

  if (!insights || (insights.totalAttempts || 0) < 1) return lines;

  const w = insights.weakest;
  if (
    w &&
    w.attempts >= INSIGHT_MIN_TOPIC_ATTEMPTS &&
    w.acc <= 0.55 &&
    TOPICS[w.key]
  ) {
    lines.push(
      `כדאי חיזוק בנושא ${TOPICS[w.key].name} (דיוק ~${Math.round(
        w.acc * 100
      )}%).`
    );
  }

  const s = insights.strongest;
  if (
    s &&
    insights.eligibleTopicCount >= 2 &&
    s.attempts >= INSIGHT_MIN_TOPIC_ATTEMPTS &&
    s.acc >= 0.72 &&
    TOPICS[s.key] &&
    (!w || s.key !== w.key)
  ) {
    const t = `חוזק יחסי בנושא ${TOPICS[s.key].name}.`;
    if (!lines.includes(t)) lines.push(t);
  }

  for (const key of Object.keys(tailMap)) {
    const t = tailMap[key];
    if (!Array.isArray(t) || t.length < 6 || !TOPICS[key]) continue;
    const mid = Math.floor(t.length / 2);
    if (mid < 1) continue;
    const first = t.slice(0, mid);
    const second = t.slice(mid);
    const a = first.filter(Boolean).length / first.length;
    const b = second.filter(Boolean).length / second.length;
    if (b - a >= 0.25) {
      const t2 = `יש שיפור יפה בנושא ${TOPICS[key].name}.`;
      if (!lines.includes(t2)) lines.push(t2);
      break;
    }
  }

  if (insights.trend === "up") {
    const t3 = "מגמת הדיוק ברצף האחרון עולה.";
    if (!lines.includes(t3)) lines.push(t3);
  } else if (insights.trend === "down") {
    const t4 =
      "מגמת הדיוק ברצף האחרון יורדת - כדאי לחזור על החומר.";
    if (!lines.includes(t4)) lines.push(t4);
  }

  return lines.slice(0, 3);
}

// ================== QUESTION BANK ==================

// כל שאלה: נושא, כיתות מתאימות, רמת קושי, ניסוח, תשובות, הסבר, תיאוריה קצרה
// ================== QUESTION BANK ==================

// כל שאלה: נושא, כיתות מתאימות, רמת קושי, ניסוח, תשובות, הסבר, תיאוריה קצרה


// ================== HELPERS ==================

function levelAllowed(question, levelKey) {
  const order = { easy: 1, medium: 2, hard: 3 };
  const min = order[question.minLevel] || 1;
  const max = order[question.maxLevel] || 3;
  const cur = order[levelKey] || 1;
  return cur >= min && cur <= max;
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildTop10(saved) {
  const all = [];
  if (!saved) return [];
  Object.values(saved).forEach((arr) => {
    if (!Array.isArray(arr)) return;
    arr.forEach((entry) => {
      if (!entry || !entry.playerName) return;
      all.push({
        name: entry.playerName,
        bestScore: entry.bestScore ?? entry.score ?? 0,
        bestStreak: entry.bestStreak ?? entry.streak ?? 0,
        timestamp: entry.timestamp || 0,
      });
    });
  });
  const sorted = all
    .sort((a, b) => {
      if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
      if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak;
      return (b.timestamp || 0) - (a.timestamp || 0);
    })
    .slice(0, 10);
  while (sorted.length < 10) {
    sorted.push({
      name: "-",
      bestScore: 0,
      bestStreak: 0,
      timestamp: 0,
      placeholder: true,
    });
  }
  return sorted;
}

function getErrorExplanationHistory(question, wrongAnswer) {
  if (!question) return "";
  const correct = question.options?.[question.correctIndex];
  switch (question.topic) {
    case "what_is_history":
      return "חשוב על סוג המקור: האם הוא ראשוני או משני? ומה מסדר ציר הזמן?";
    case "classical_greece":
      return "השווה בין אתונה לספרטה: שלטון, חינוך וערכים.";
    case "hellenism_jews":
      return "חשוב על המפגש בין תרבות יוונית ליהדות - סיבות ותוצאות.";
    case "hasmonaeans":
      return "קשר בין הגזרות, המרד והקמת הממלכה.";
    case "rome_jews":
      return "עקוב אחרי רצף האירועים: רומא, שלטון, מרד, חורban, יavne.";
    default:
      break;
  }
  return correct
    ? 'נסה לחשוב שוב לפי ניסוח השאלה והנקודות ברשימה "מה חשוב לזכור?" למעלה - בלי לנחש מהר מדי.'
    : "בדוק שוב את הנתונים ואת ההסבר שלמדת.";
}

function getSolutionStepsHistory(question) {
  if (!question) return [];
  const lines = [];
  lines.push("1. קודם כל נבין את השאלה – על איזה נושא היא מדברת?");
  if (question.theoryLines && question.theoryLines.length > 0) {
    question.theoryLines.forEach((line, i) => {
      lines.push(`${i + 2}. ${line}`);
    });
  }
  const correctText =
    question.options && question.options[question.correctIndex]
      ? question.options[question.correctIndex]
      : "";
  if (correctText) {
    const quoted = `\u2066${correctText}\u2069`;
    lines.push(
      `${lines.length + 1}. מתוך כל האפשרויות, רק "${quoted}" מתאים להסבר.`
    );
  }
  if (question.explanation) {
    lines.push(`${lines.length + 1}. סיכום: ${question.explanation}`);
  }
  return lines;
}

// ================== MAIN COMPONENT ==================

export default function HistoryMaster() {
  useIOSViewportFix();
  const router = useRouter();

  const { MB, ui, shellClass, shellBgStyle } = useLearningMasterUi();
  const learningModalOverlay = ui.learningModalOverlay;
  const learningModalPanel = ui.learningModalPanel;
  const learningModalHeader = ui.learningModalHeader;
  const learningModalCloseBtn = ui.learningModalCloseBtn;
  const learningModalTitle = ui.learningModalTitle;
  const learningModalFooter = ui.learningModalFooter;
  const learningQuestionBox = ui.learningQuestionBox;
  const learningQuestionText = ui.learningQuestionText;
  const learningExplBody = ui.learningExplBody;
  const learningModalScrollBody = ui.learningModalScrollBody;
  const stepExerciseUi = ui.stepExerciseUi;
  const learningPrimaryCloseBtn = ui.learningPrimaryCloseBtn;
  const learningExplainOpenBtn = ui.learningExplainOpenBtn;

  const wrapRef = useRef(null);
  const headerRef = useRef(null);
  const desktopHeaderRef = useRef(null);
  const controlsRef = useRef(null);
  const gameRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const {
    session,
    grade: sessionGrade,
    setGrade,
    gradeReady: sessionGradeReady,
    canPickGrade,
    fullName: sessionFullName,
    coinBalance: sessionCoinBalance,
  } = useSubjectSessionDefaults({
    permissionKey: "history",
    requireGradeNumber: false,
    transformGradeKey: () => HISTORY_TEACH_GRADE_KEY,
  });
  /** History curriculum is G6-only; all students practice from the same content bank. */
  const grade = sessionGrade || HISTORY_TEACH_GRADE_KEY;
  const gradeReady = sessionGradeReady || Boolean(grade);
  const [mode, setMode] = useState("practice");
  const {
    displayLevel,
    sourceDifficulty: level,
    handleDisplayLevelChange: onDisplayLevelChange,
    setDisplayLevel,
    buildSessionStartLevelFields,
    buildAnswerLevelFields,
    tagQuestion,
    applyAnswerAdaptive,
    hydrateFromResumeSnapshot,
    applyPlannerLevelKey,
    resetAdaptiveForSessionStart,
    adaptiveRef,
    label: displayLevelLabel,
  } = useStudentDisplayLevelPractice("history");
  const [topic, setTopic] = useState("what_is_history");
  const [gameActive, setGameActive] = useState(false);
  const handleDisplayLevelChange = useCallback(
    (nextDisplayLevel) => {
      onDisplayLevelChange(nextDisplayLevel);
      setGameActive(false);
    },
    [onDisplayLevelChange]
  );
  const historyTopicsForGuest = useMemo(
    () => (GRADES[grade]?.topics || Object.keys(TOPICS)).filter((t) => t !== "mixed"),
    [grade]
  );
  const guestTopics = useGuestPlayableTopics("history", historyTopicsForGuest);
  const bookIndexHref = grade ? getLearningBookIndexHref("history", grade) : null;
  const bookTopicHref = useMemo(() => {
    if (!HISTORY_BOOK_GRADE_SET.has(grade)) return null;
    return getHistoryBookHref({ grade, topic, kind: null });
  }, [grade, topic]);
  const [adaptivePlannerRecommendationView, setAdaptivePlannerRecommendationView] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const questionBookHref = useMemo(() => {
    if (mode !== "learning" || !currentQuestion) return null;
    if (!HISTORY_BOOK_GRADE_SET.has(grade)) return null;
    return getHistoryBookHref({
      grade,
      topic: currentQuestion.topic || topic,
      kind: currentQuestion.pageId || null,
    });
  }, [grade, mode, currentQuestion, topic]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const correctRef = useRef(0);
  const [wrong, setWrong] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [bestScore, setBestScore] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [avgTime, setAvgTime] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const questionTimeLedgerRef = useRef(null);

  useLearningVisibilityClock({
    enabled: gameActive && isFairnessVisibilityLedgerActive(mode),
    ledger: questionTimeLedgerRef.current,
  });

  const [showSolution, setShowSolution] = useState(false);
  const [showPreviousSolution, setShowPreviousSolution] = useState(false);
  const {
    scheduleWrongAnswerAdvance,
    clearWrongAnswerAdvanceTimer,
    clearWrongAnswerAdvanceState,
  } = useLearningWrongAnswerAdvance(showSolution, showPreviousSolution);
  const [previousExplanationQuestion, setPreviousExplanationQuestion] = useState(null);
  const [showTheoryHelp, setShowTheoryHelp] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [errorExplanation, setErrorExplanation] = useState("");
  // Phase 2: tracks whether any explanation/hint/step-by-step was viewed for the current question
  const stepByStepViewedRef = useRef(false);
  const bookContextRef = useRef(null);
  const bookContextConsumedRef = useRef(false);

  const questionPoolRef = useRef([]);
  const questionIndexRef = useRef(0);
  const historyIntelRef = useRef({
    topicStats: {},
    recentIds: [],
    answerTail: [],
    topicAnswerTails: {},
  });
  const askCounterRef = useRef(0);
  /** @type {React.MutableRefObject<{ id: string; dueAt: number }[]>} */
  const retryQueueRef = useRef([]);
  const sessionStartRef = useRef(null);
  const sessionSecondsRef = useRef(0);
  const solvedCountRef = useRef(0);
  const learningSessionIdRef = useRef(null);
  const plannerResponseSeqRef = useRef(0);
  const plannerNextSessionClientMetaRef = useRef(null);
  const learningSessionStartPromiseRef = useRef(null);
  const pendingHistoryTrackMetaRef = useRef(null);
  /** Session-local only — prefer next bank row matching diagnostic probe (Phase 3D-A). Never persisted. */
  const pendingDiagnosticProbeRef = useRef(null);
  /** Session-local hypothesis ledger after probe answers (Phase 3D-B). Never persisted. */
  const historyHypothesisLedgerRef = useRef(null);
  /** Question pool topic id for the question currently being timed (matches localStorage bucket). */
  const historyTrackingTopicKeyRef = useRef(null);
  const bookPracticePresetRef = useRef(null);

  const learningProfileStudentIdRef = useRef(null);
  const learningProfileHydratedRef = useRef(false);
  const [serverAccountSubjectAccuracyPct, setServerAccountSubjectAccuracyPct] = useState(null);
  const [learningProfileHydrationTick, setLearningProfileHydrationTick] = useState(0);
  const scoresStoreRef = useRef({});
  const progressLoadedRef = useRef(false);
  const progressStringRef = useRef("");

  const [playerName, setPlayerName] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem("mleo_player_name") || "";
    } catch {
      return "";
    }
  });
  const openBookFromLearning = useCallback(
    (href) => {
      if (!href) return;
      if (!HISTORY_BOOK_GRADE_SET.has(grade)) return;
      const snapshot = {
        gameActive: true,
        mode,
        grade,
        displayLevel,
        level,
        topic,
        currentQuestion,
        score,
        streak,
        correct,
        wrong,
        selectedAnswer,
        feedback,
        questionStartTime,
      };
      saveHistoryBookLearningSnapshot(grade, snapshot);
      router.push(withHistoryBookLearningReturn(href));
    },
    [
      mode,
      grade,
      displayLevel,
      level,
      topic,
      currentQuestion,
      score,
      streak,
      correct,
      wrong,
      selectedAnswer,
      feedback,
      questionStartTime,
      router,
    ]
  );

  const applyBookPracticePreset = useCallback((preset) => {
    if (!preset || preset.mode !== "learning") return;
    const presetGrade = preset.grade;
    if (!HISTORY_BOOK_GRADE_SET.has(presetGrade)) return;
    if (!GRADES[presetGrade]?.topics?.includes(preset.topic)) return;
    bookPracticePresetRef.current = preset;
    setGrade(presetGrade);
    setMode("learning");
    setTopic(preset.topic);
  }, []);

  useEffect(() => {
    if (sessionFullName) {
      setPlayerName(sessionFullName);
    } else if (session?.sessionResolved) {
      setPlayerName("ילד/ה");
    }
  }, [sessionFullName, session?.sessionResolved]);

  useEffect(() => {
    setChildCoinBalance(sessionCoinBalance);
  }, [sessionCoinBalance]);

  useEffect(() => {
    const snap = consumeAnyHistoryBookLearningSnapshot();
    if (!snap || snap.gameActive !== true) return;
    setMode(typeof snap.mode === "string" ? snap.mode : "practice");
    if (typeof snap.grade === "string") setGrade(snap.grade);
    hydrateFromResumeSnapshot(snap);
    if (typeof snap.topic === "string") setTopic(snap.topic);
    setGameActive(true);
    if (snap.currentQuestion) setCurrentQuestion(snap.currentQuestion);
    setScore(typeof snap.score === "number" ? snap.score : 0);
    setStreak(typeof snap.streak === "number" ? snap.streak : 0);
    setCorrect(typeof snap.correct === "number" ? snap.correct : 0);
    setWrong(typeof snap.wrong === "number" ? snap.wrong : 0);
    setSelectedAnswer(snap.selectedAnswer ?? null);
    setFeedback(snap.feedback ?? null);
    setQuestionStartTime(
      typeof snap.questionStartTime === "number"
        ? snap.questionStartTime
        : Date.now()
    );
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    if (!isHistoryBookPracticeEntry(router.query)) return;
    const preset = consumeAnyHistoryBookPracticePreset();
    if (preset) {
      applyBookPracticePreset(preset);
    }
  }, [router.isReady, router.query, applyBookPracticePreset]);

  useEffect(() => {
    tryConsumeBookContextOnPracticeEntry(
      router,
      { subject: "history", grade },
      { bookContextRef, bookContextConsumedRef }
    );
  }, [router.isReady, router.query, grade]);

  const [playerAvatar, setPlayerAvatar] = useState(() => {
    if (typeof window === "undefined") return "👤";
    try {
      return localStorage.getItem("mleo_player_avatar") || "👤";
    } catch {
      return "👤";
    }
  });
  const [playerAvatarImage, setPlayerAvatarImage] = useState(null); // תמונת אווטר מותאמת אישית
  const [playerAvatarBackground, setPlayerAvatarBackground] = useState(DEFAULT_PROFILE_BACKGROUND_KEY);
  const [showPlayerProfile, setShowPlayerProfile] = useState(false);
  const [practiceFocus, setPracticeFocus] = useState("balanced");
  const [focusedPracticeMode, setFocusedPracticeMode] = useState("normal");
  const focusedPracticeModeRef = useRef("normal");

  useEffect(() => {
    pendingDiagnosticProbeRef.current = null;
    historyHypothesisLedgerRef.current = null;
  }, [grade, level, displayLevel, topic, practiceFocus]);

  useEffect(() => {
    focusedPracticeModeRef.current = focusedPracticeMode;
  }, [focusedPracticeMode]);

  const [mistakes, setMistakes] = useState([]);
  const [insightRevision, setInsightRevision] = useState(0);
  const [showPracticeModal, setShowPracticeModal] = useState(false);
  const [showPracticeOptions, setShowPracticeOptions] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [referenceCategory, setReferenceCategory] = useState("greece_hellenism");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardLevel, setLeaderboardLevel] = useState("regular");
  const [leaderboardData, setLeaderboardData] = useState([]);
  
  // Daily Streak
  const [dailyStreak, setDailyStreak] = useState({ streak: 0, lastDate: null });
  const [showStreakReward, setShowStreakReward] = useState(null);
  
  // Sound system
  const audio = useGameAudio();
  const isMobileViewport = useMobileViewport();
  
  const [stars, setStars] = useState(0);
  const [badges, setBadges] = useState([]);
  const [showBadge, setShowBadge] = useState(null);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  // progress by topic
  const [progress, setProgress] = useState({
    what_is_history: { total: 0, correct: 0 },
    classical_greece: { total: 0, correct: 0 },
    hellenism_jews: { total: 0, correct: 0 },
    hasmonaeans: { total: 0, correct: 0 },
    rome_jews: { total: 0, correct: 0 },
  });
  
  const getTodayKey = () => {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  };
  
  const [dailyChallenge, setDailyChallenge] = useState(() => ({
    date: getTodayKey(),
    questions: 0,
    correct: 0,
    bestScore: 0,
    completed: false,
  }));

  const [weeklyChallenge, setWeeklyChallenge] = useState(() => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekKey = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
    return {
      week: weekKey,
      target: 100,
      current: 0,
      completed: false,
    };
  });
  
  const [showDailyChallenge, setShowDailyChallenge] = useState(false);
  const [monthlyPersistenceView, setMonthlyPersistenceView] = useState(null);
  /** Display-only: `payload.student.coin_balance` from GET /api/student/me (same source as student defaults). */
  const [childCoinBalance, setChildCoinBalance] = useState(0);
  const [subjectDailyMissions, setSubjectDailyMissions] = useState(null);
  const [subjectDailyMissionsLoading, setSubjectDailyMissionsLoading] = useState(false);

  const refreshMonthlyPersistenceView = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const profile = getCachedStudentLearningProfile();
      setMonthlyPersistenceView(buildSubjectMonthlyPersistenceViewFromProfile(profile));
    } catch {
      // ignore
    }
  }, []);

  // ----- MOUNT -----
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!learningProfileHydratedRef.current) return;
    try {
      const saved =
        scoresStoreRef.current && typeof scoresStoreRef.current === "object"
          ? scoresStoreRef.current
          : {};
      const key = `${level}_${topic}`;
      const { maxScore, maxStreak } = maxBestForPlayerInKey(saved, key, playerName);
      setBestScore(maxScore);
      setBestStreak(maxStreak);
      logAccountTileSync("history", {
        tile: "personalBests",
        level,
        topic,
        displayedBestScore: maxScore,
        displayedBestStreak: maxStreak,
      });
    } catch {}
  }, [level, topic, playerName, learningProfileHydrationTick]);

  useEffect(() => {
    if (!showLeaderboard || typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || "{}";
      const saved = JSON.parse(raw);
      setLeaderboardData(loadLeaderboardTop10ByDisplayLevel(saved, leaderboardLevel));
    } catch {
      setLeaderboardData([]);
    }
  }, [showLeaderboard, leaderboardLevel]);

  useEffect(() => {
    refreshMonthlyPersistenceView();
  }, [refreshMonthlyPersistenceView]);

  // טעינת תמונת אווטר מ-localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedImage = localStorage.getItem("mleo_player_avatar_image");
        if (savedImage) {
          setPlayerAvatarImage(savedImage);
          setPlayerAvatar(null);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // טיפול בהעלאת תמונת אווטר (דחיסה + שמירה בפרופיל — סנכרון בין מכשירים)
  const handleAvatarImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("התמונה גדולה מדי. נא לבחור תמונה עד 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("נא לבחור קובץ תמונה בלבד");
      return;
    }

    void (async () => {
      try {
        const dataUrl = await compressImageFileToJpegDataUrl(file);
        setPlayerAvatarImage(dataUrl);
        setPlayerAvatar(null);
        try {
          localStorage.setItem("mleo_player_avatar_image", dataUrl);
          localStorage.removeItem("mleo_player_avatar");
        } catch {
          /* ignore */
        }
        await patchLearningProfileAvatarCustomImage(dataUrl);
      } catch (err) {
        alert(err && typeof err === "object" && "message" in err ? String(err.message) : "שמירת התמונה נכשלה");
      }
    })();
    e.target.value = "";
  };

  // טיפול במחיקת תמונת אווטר
  const handleRemoveAvatarImage = () => {
    void (async () => {
      const defaultAvatar = "👤";
      setPlayerAvatarImage(null);
      try {
        localStorage.removeItem("mleo_player_avatar_image");
        localStorage.setItem("mleo_player_avatar", defaultAvatar);
      } catch {
        /* ignore */
      }
      setPlayerAvatar(defaultAvatar);
      try {
        await patchLearningProfileClearAvatarCustom(defaultAvatar);
      } catch {
        /* ignore */
      }
    })();
  };

  const handleSelectProfileBackground = (key) => {
    void selectProfileBackgroundKey(key, setPlayerAvatarBackground).catch(() => {});
  };


  useEffect(() => {
    let cancelled = false;
    fetchStudentLearningProfile()
      .then((profile) => {
        if (cancelled) return;
        if (!profile?.ok) {
          learningProfileHydratedRef.current = true;
          progressLoadedRef.current = true;
          setLearningProfileHydrationTick((n) => n + 1);
          refreshMonthlyPersistenceView();
          return;
        }
        learningProfileStudentIdRef.current = profile.studentId;
        const acc = mapSubjectAccountViewFromStudentProfile(profile, "history");
        const sub = profile.row.subjects?.history;
        if (sub && typeof sub === "object") {
          const ps = sub.progressStore;
          if (ps && typeof ps === "object") {
            if (typeof acc.stars === "number") setStars(acc.stars);
            if (Array.isArray(ps.badges)) setBadges(ps.badges);
            if (typeof acc.playerLevel === "number") setPlayerLevel(acc.playerLevel);
            if (typeof acc.xp === "number") setXp(acc.xp);
            if (ps.progress && typeof ps.progress === "object") {
              setProgress((prev) => ({ ...prev, ...ps.progress }));
            }
          }
          if (sub.scoresStore && typeof sub.scoresStore === "object") {
            scoresStoreRef.current = sub.scoresStore;
          }
          if (Array.isArray(sub.mistakes)) setMistakes(sub.mistakes);
          const si = sub.intel;
          if (si && typeof si === "object") {
            historyIntelRef.current = {
              topicStats: sanitizeTopicStats(si.topicStats),
              recentIds: sanitizeRecentIds(si.recentIds),
              answerTail: sanitizeAnswerTail(si.answerTail),
              topicAnswerTails: sanitizeTopicAnswerTails(si.topicAnswerTails),
            };
            setInsightRevision((n) => n + 1);
          }
        }
        const ch = profile.row.challenges;
        const { daily: chDaily, weekly: chWeekly } = pickSubjectChallengeBlobs(ch, "history");
        if (chDaily) setDailyChallenge(chDaily);
        if (chWeekly) setWeeklyChallenge(chWeekly);
        setServerAccountSubjectAccuracyPct(accountAccuracyDisplayFromDerived(profile.derived, "history"));
        const st = profile.row.streaks?.history;
        if (st && typeof st === "object") setDailyStreak(st);
        applyLearningProfileAvatarRowToPlayerState(
          profile.row.profile,
          setPlayerAvatar,
          setPlayerAvatarImage,
          setPlayerAvatarBackground,
        );
        learningProfileHydratedRef.current = true;
        try {
          const pr = profile.row.subjects?.history?.progressStore?.progress;
          progressStringRef.current = JSON.stringify(pr || {});
        } catch {
          progressStringRef.current = "";
        }
        progressLoadedRef.current = true;
        setLearningProfileHydrationTick((n) => n + 1);
        refreshMonthlyPersistenceView();
      })
      .catch(() => {
        if (cancelled) return;
        learningProfileHydratedRef.current = true;
        progressLoadedRef.current = true;
        setLearningProfileHydrationTick((n) => n + 1);
        refreshMonthlyPersistenceView();
      });
    return () => {
      cancelled = true;
    };
  }, [refreshMonthlyPersistenceView]);

  useEffect(() => {
    if (!learningProfileHydratedRef.current) return;
    if (!learningProfileStudentIdRef.current) return;
    const progressStore = { stars, badges, playerLevel, xp, progress };
    const intelSnap = historyIntelRef.current;
    debounceStudentLearningProfilePatch("history-master-sync", () => {
      const base = {
        subjects: {
          history: {
            progressStore,
            scoresStore: scoresStoreRef.current,
            mistakes,
            intel: {
              topicStats: sanitizeTopicStats(intelSnap.topicStats),
              recentIds: sanitizeRecentIds(intelSnap.recentIds),
              answerTail: sanitizeAnswerTail(intelSnap.answerTail),
              topicAnswerTails: sanitizeTopicAnswerTails(intelSnap.topicAnswerTails),
            },
          },
        },
        challenges: subjectChallengePatch("history", dailyChallenge, weeklyChallenge),
        streaks: { history: dailyStreak },
      };
      if (!playerAvatarImage) {
        return patchStudentLearningProfile({
          ...base,
          profile: {
            avatarEmoji: playerAvatar ? playerAvatar : undefined,
            avatarCustomDataUrl: null,
          },
        });
      }
      return patchStudentLearningProfile(base);
    }, 2400);
  }, [
    stars,
    badges,
    playerLevel,
    xp,
    progress,
    mistakes,
    dailyChallenge,
    weeklyChallenge,
    dailyStreak,
    playerAvatar,
    playerAvatarImage,
    insightRevision,
  ]);

  useEffect(() => {
    correctRef.current = correct;
  }, [correct]);

  useEffect(() => {
    if (typeof window === "undefined" || process.env.NODE_ENV !== "development") {
      return undefined;
    }
    window.__HISTORY_INTEL_DEBUG = () => ({
      displayLevel,
      sourceDifficulty: level,
      adaptiveInternalState: adaptiveRef.current?.internalState,
      correctStreak: adaptiveRef.current?.correctStreak,
      wrongStreak: adaptiveRef.current?.wrongStreak,
      retryQueueLength: retryQueueRef.current.length,
      retryQueue: retryQueueRef.current.map((r) => ({ ...r })),
      recentIdsLength: historyIntelRef.current.recentIds.length,
      insightTailLength: (historyIntelRef.current.answerTail || []).length,
      askCounter: askCounterRef.current,
      topicStatsSummary: Object.fromEntries(
        Object.entries(historyIntelRef.current.topicStats).map(([k, v]) => [
          k,
          {
            wrong: v.wrong,
            attempts: v.attempts,
            rate:
              v.attempts > 0
                ? Number((v.wrong / v.attempts).toFixed(3))
                : 0,
          },
        ])
      ),
    });
    return () => {
      try {
        delete window.__HISTORY_INTEL_DEBUG;
      } catch {
        window.__HISTORY_INTEL_DEBUG = undefined;
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      recordSessionProgress({ includePlannerRecommendation: false });
    };
  }, []);

  useEffect(() => {
    const allowed = GRADES[grade]?.topics || Object.keys(TOPICS);
    if (!allowed.includes(topic)) {
      const fallback = allowed[0] || "what_is_history";
      setTopic(fallback);
    }
  }, [grade, topic]);

  // ----- LAYOUT HEIGHT -----
  useEffect(() => {
    if (!wrapRef.current || !mounted) return;
    let resizeTimer = null;
    const calc = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        applyLearningMasterMobileShellLayoutVars({
          wrapRef,
          headerRef,
          desktopHeaderRef,
          controlsRef,
        });
      }, 150);
    };
    const timer = setTimeout(calc, 100);
    window.addEventListener("resize", calc, { passive: true });
    window.visualViewport?.addEventListener("resize", calc);
    return () => {
      clearTimeout(timer);
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener("resize", calc);
      window.visualViewport?.removeEventListener("resize", calc);
    };
  }, [mounted]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!progressLoadedRef.current) return;
    const currentProgressStr = JSON.stringify(progress);
    if (currentProgressStr === progressStringRef.current) return;
    progressStringRef.current = currentProgressStr;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY + "_progress") || "{}");
      saved.progress = progress;
      localStorage.setItem(STORAGE_KEY + "_progress", JSON.stringify(saved));
    } catch {}
  }, [progress]);

  // ----- DAILY CHALLENGE RESET -----
  useEffect(() => {
    const todayKey = getTodayKey();
    if (dailyChallenge.date !== todayKey) {
      setDailyChallenge({ 
        date: todayKey, 
        bestScore: 0, 
        questions: 0,
        correct: 0,
        completed: false,
      });
    }
    
    // Check weekly challenge reset
    const today = new Date();
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
    const weekKey = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
    if (weeklyChallenge.week !== weekKey) {
      setWeeklyChallenge({
        week: weekKey,
        target: 100,
        current: 0,
        completed: false,
      });
    }
  }, [dailyChallenge.date, weeklyChallenge.week]);

  // ----- TIMER -----
  useEffect(() => {
    if (!gameActive) return;
    if (mode !== "challenge" && mode !== "speed") return;
    if (timeLeft == null) return;
    if (timeLeft <= 0) {
      handleTimeUp();
      return;
    }
    const t = setTimeout(() => {
      setTimeLeft((prev) => (prev != null ? prev - 1 : prev));
    }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, gameActive, mode]);

  function filterQuestionsForCurrentSettings() {
    const gradeKey = grade;
    const allowedTopicsForGrade =
      GRADES[gradeKey]?.topics || Object.keys(TOPICS);
    const baseLevel = level;
    const sessionCorrect = correctRef.current;
    const levelForFilterRaw =
      focusedPracticeMode === "graded"
        ? sessionCorrect < 5
          ? "easy"
          : sessionCorrect < 15
          ? "medium"
          : level
        : baseLevel;
    const levelForFilter = clampHistoryLevelForGrade(gradeKey, levelForFilterRaw);

    if (focusedPracticeMode === "mistakes" && mistakes.length > 0) {
      const ids = new Set(mistakes.map((m) => m.id));
      const byLevel = QUESTIONS.filter(
        (q) => ids.has(q.id) && levelAllowed(q, levelForFilter)
      );
      if (byLevel.length > 0) return byLevel;
      const anyLevel = QUESTIONS.filter((q) => ids.has(q.id));
      if (anyLevel.length > 0) return anyLevel;
      return [];
    }

    let topicsList;
    if (mode === "practice" && practiceFocus !== "balanced") {
      topicsList = (PRACTICE_TOPIC_GROUPS[practiceFocus] || []).filter((t) =>
        allowedTopicsForGrade.includes(t)
      );
    } else if (topic === "mixed") {
      topicsList = allowedTopicsForGrade.filter((t) => t !== "mixed");
    } else {
      topicsList = [topic];
    }
    if (!topicsList || topicsList.length === 0) {
      topicsList =
        topic === "mixed"
          ? allowedTopicsForGrade.filter((t) => t !== "mixed")
          : [allowedTopicsForGrade[0] || "what_is_history"];
      if (!topicsList || topicsList.length === 0) {
        topicsList = ["what_is_history"];
      }
    }
    const pool = QUESTIONS.filter(
      (q) =>
        topicsList.includes(q.topic) &&
        q.grades.includes(gradeKey) &&
        levelAllowed(q, levelForFilter)
    );
    return pool;
  }

  function getAssignedLevelForQuestion() {
    return clampHistoryLevelForGrade(grade, level);
  }

  function bumpTopicIntel(topicKey, isWrong) {
    const intel = historyIntelRef.current;
    const prev = intel.topicStats[topicKey];
    const cur =
      prev && typeof prev === "object"
        ? {
            attempts: Number(prev.attempts) || 0,
            wrong: Number(prev.wrong) || 0,
          }
        : { attempts: 0, wrong: 0 };
    cur.attempts += 1;
    if (isWrong) cur.wrong += 1;
    intel.topicStats = { ...intel.topicStats, [topicKey]: cur };
    const ok = !isWrong;
    intel.answerTail = [...(intel.answerTail || []), ok].slice(
      -INSIGHT_ANSWER_TAIL_MAX
    );
    intel.topicAnswerTails = { ...(intel.topicAnswerTails || {}) };
    if (TOPICS[topicKey]) {
      const tPrev = intel.topicAnswerTails[topicKey] || [];
      intel.topicAnswerTails[topicKey] = [...tPrev, ok].slice(
        -INSIGHT_TOPIC_TAIL_MAX
      );
    }
    persistHistoryIntel(intel);
    setInsightRevision((n) => n + 1);
  }

  function pushRecentQuestionId(q, qid) {
    const intel = historyIntelRef.current;
    if (qid) {
      intel.recentIds = [...intel.recentIds.filter((x) => x !== qid), qid].slice(
        -INTEL_RECENT_MAX
      );
    }
    if (q) {
      const stemFp = buildQuestionFingerprint(q, {
        subject: "history",
        topic: q.topic,
      });
      if (stemFp) {
        intel.recentStemFps = [
          ...(intel.recentStemFps || []).filter((x) => x !== stemFp),
          stemFp,
        ].slice(-40);
      }
    }
    persistHistoryIntel(intel);
  }

  const progressInsights = useMemo(() => {
    if (!mounted) {
      return {
        base: null,
        feedback: [],
        currentLevelLabel: displayLevelLabel(),
        mistakeLogCount: 0,
      };
    }
    const intel = historyIntelRef.current;
    const base = computeHistoryProgressInsights(
      intel.topicStats,
      intel.answerTail
    );
    const feedback = buildInsightFeedbackLines(base, intel.topicAnswerTails);
    return {
      base,
      feedback,
      currentLevelLabel: displayLevelLabel(),
      mistakeLogCount: mistakes.length,
    };
  }, [mounted, level, displayLevel, mistakes.length, insightRevision]);

  function enqueueWrongQuestionRetry(isCorrect, questionId) {
    if (!gameActive) return;

    if (!isCorrect && questionId) {
      const delay = 3 + Math.floor(Math.random() * 3);
      retryQueueRef.current.push({
        id: questionId,
        dueAt: askCounterRef.current + delay,
      });
      if (retryQueueRef.current.length > RETRY_QUEUE_MAX) {
        retryQueueRef.current.sort((a, b) => a.dueAt - b.dueAt);
        retryQueueRef.current = retryQueueRef.current.slice(0, RETRY_QUEUE_MAX);
      }
    }
  }

  const applyScienceTopicCreditFromClosed = useCallback(
    (closed, questionForTrack, metaHint) => {
      if (!closed || closed.creditedSecForTopic <= 0) return;
      const topicKey =
        historyTrackingTopicKeyRef.current ?? questionForTrack?.topic;
      if (!topicKey) return;
      const qGrade =
        questionForTrack?.assignedGrade ||
        questionForTrack?.gradeKey ||
        grade;
      const qLevel =
        questionForTrack?.assignedLevel ||
        questionForTrack?.levelKey ||
        level;
      trackHistoryTopicTime(
        topicKey,
        qGrade,
        qLevel,
        closed.creditedSecForTopic,
        metaHint ?? {
          mode: reportModeFromGameState(mode, focusedPracticeMode),
          total: 1,
          correct: undefined,
        }
      );
    },
    [grade, level, mode, focusedPracticeMode]
  );

  const closeOpenQuestionLedger = useCallback(
    (includeTopic) => {
      const questionForTrack = currentQuestion;
      finalizeMasterQuestionLedger(
        questionTimeLedgerRef,
        sessionSecondsRef,
        includeTopic
          ? (closed) => {
              const meta = pendingHistoryTrackMetaRef.current;
              pendingHistoryTrackMetaRef.current = null;
              if (meta && meta.mode != null) {
                applyScienceTopicCreditFromClosed(closed, questionForTrack, {
                  mode: meta.mode,
                  correct: meta.correct,
                  total: meta.total,
                });
              } else {
                applyScienceTopicCreditFromClosed(closed, questionForTrack);
              }
            }
          : null
      );
      if (questionStartTime) setQuestionStartTime(null);
    },
    [currentQuestion, questionStartTime, applyScienceTopicCreditFromClosed]
  );

  function trackCurrentQuestionTime() {
    if (!questionStartTime && !questionTimeLedgerRef.current) return;
    closeOpenQuestionLedger(true);
  }

function recordSessionProgress(opts = {}) {
  const { includePlannerRecommendation = true } = opts;
  const sessionIdForFinish = learningSessionIdRef.current;
  const totalQuestionsForFinish = totalQuestions;
  const correctForFinish = correct;
  const wrongForFinish = wrong;
  const scoreForFinish = score;
  if (!sessionStartRef.current) return;
  trackCurrentQuestionTime();
  const elapsedMs = Date.now() - sessionStartRef.current;
  if (elapsedMs <= 0) {
    sessionStartRef.current = null;
    solvedCountRef.current = 0;
    sessionSecondsRef.current = 0;
    questionTimeLedgerRef.current = null;
    return;
  }
  const totalMs = sessionSecondsRef.current;
  if (totalMs <= 0) {
    sessionStartRef.current = null;
    solvedCountRef.current = 0;
    sessionSecondsRef.current = 0;
    questionTimeLedgerRef.current = null;
    return;
  }
  const answered = Math.max(solvedCountRef.current, totalQuestions);
  const durationMinutes = Number((totalMs / 60000).toFixed(2));
  const durationSeconds = resolveMasterSessionDurationSeconds(sessionSecondsRef);
  const accuracyForFinish =
    answered > 0 ? Math.round((Math.max(0, correctForFinish) / answered) * 100) : 0;
  void refreshStudentLearningProfileAfterSession().then((p) => {
    if (p?.ok) {
      refreshMonthlyPersistenceView();
      const acc = accountAccuracyDisplayFromDerived(p.derived, "history");
      if (acc != null) setServerAccountSubjectAccuracyPct(acc);
    }
  });
  if (sessionIdForFinish) {
    finishLearningSession({
      learningSessionId: sessionIdForFinish,
      totalQuestions: totalQuestionsForFinish,
      correctAnswers: correctForFinish,
      wrongAnswers: wrongForFinish,
      score: scoreForFinish,
      accuracy: accuracyForFinish,
      durationSeconds,
      mode: reportModeFromGameState(mode, focusedPracticeMode),
      clientMeta: {
        source: "history-master",
        version: "phase-2d-b6",
      },
    }).catch(() => {
        notifyLearningSessionSaveFailure(setFeedback, "history-master");
      });
    if (includePlannerRecommendation) {
      const cid = (plannerResponseSeqRef.current += 1);
      scheduleAdaptivePlannerRecommendation(
        {
          learningSessionId: sessionIdForFinish,
          subject: "history",
          grade,
          topic: historyTrackingTopicKeyRef.current ?? currentQuestion?.topic ?? "",
          mode,
          totalQuestions: totalQuestionsForFinish,
          correctAnswers: correctForFinish,
          wrongAnswers: wrongForFinish,
          score: scoreForFinish,
          accuracy: accuracyForFinish,
          durationSeconds,
          clientRequestId: cid,
        },
        {
          onResult: (data) => {
            if (data?.clientRequestId != null && Number(data.clientRequestId) !== cid) return;
            setAdaptivePlannerRecommendationView(buildPlannerRecommendationViewModel(data));
          },
        }
      );
    }
  }
  learningSessionIdRef.current = null;
  learningSessionStartPromiseRef.current = null;
  sessionStartRef.current = null;
  solvedCountRef.current = 0;
  sessionSecondsRef.current = 0;
}

function buildHistorySessionStartPayload() {
  const baseMeta = {
    source: "history-master",
    version: "phase-4-display-level",
  };
  const plannerExtra = plannerNextSessionClientMetaRef.current;
  return {
    subject: "history",
    topic: String(historyTrackingTopicKeyRef.current || currentQuestion?.topic || topic || "history"),
    mode: reportModeFromGameState(mode, focusedPracticeMode),
    gradeLevel: String(grade || ""),
    ...buildSessionStartLevelFields(),
    clientMeta:
      plannerExtra && typeof plannerExtra === "object"
        ? mergePlannerSessionClientMeta(baseMeta, plannerExtra)
        : baseMeta,
  };
}

async function ensureLearningSessionId() {
  if (learningSessionIdRef.current) return learningSessionIdRef.current;
  if (learningSessionStartPromiseRef.current) return learningSessionStartPromiseRef.current;
  const startPromise = startLearningSession(buildHistorySessionStartPayload())
    .then((res) => {
      const id = res?.learningSessionId ? String(res.learningSessionId) : "";
      if (!id) return null;
      learningSessionIdRef.current = id;
      return id;
    })
    .catch((error) => {
      console.warn("[history-master] session start save failed", error);
      return null;
    })
    .finally(() => {
      learningSessionStartPromiseRef.current = null;
      plannerNextSessionClientMetaRef.current = null;
    });
  learningSessionStartPromiseRef.current = startPromise;
  return startPromise;
}

function saveScienceAnswerInParallel({
  question,
  answerIndex,
  answerText,
  isCorrect,
  timeSpentMs,
  rawTimeSpentMs,
  creditedTimeMs,
  timingStatus,
  usedHint,
  diagnosticProbeMeta,
}) {
  const questionFingerprint = question?.id ? String(question.id) : null;
  const questionId = question?.id
    ? String(question.id)
    : questionFingerprint || `history-${Date.now()}`;
  const expectedValue =
    typeof question?.correctIndex === "number" && Array.isArray(question?.options)
      ? String(question.options[question.correctIndex] ?? "")
      : null;
  const selectedValue =
    answerText != null
      ? answerText
      : answerIndex != null && Array.isArray(question?.options)
        ? question.options[answerIndex]
        : answerIndex;
  const questionEngine = question
    ? buildQuestionEngineMetadataFromQuestion(
        { ...question, type: question.type || "mcq", question: question.stem },
        {
          selectedValue,
          generatorSource: "history-master",
          afterStepByStep: stepByStepViewedRef.current,
        }
      )
    : null;
  const qParams =
    question?.params && typeof question.params === "object" ? question.params : {};
  const answerParams = question
    ? {
        subtopicKey: qParams.subtopicKey || question.subtopicKey || null,
        subskillId: qParams.subskillId || qParams.subtopicKey || question.subtopicKey || null,
        topicKey: question.topic || topic || "history",
        skillId: qParams.diagnosticSkillId || question.skillId || qParams.skillId || null,
        patternFamily: qParams.patternFamily || null,
      }
    : null;
  const answerLevelFields = buildAnswerLevelFields(
    question?.sourceDifficulty || question?.assignedLevel || level
  );
  ensureLearningSessionId()
    .then((learningSessionId) => {
      if (!learningSessionId) return;
      return saveLearningAnswer({
        learningSessionId,
        subject: "history",
        topic: String(question?.topic || topic || "history"),
        gameMode: reportModeFromGameState(mode, focusedPracticeMode),
        questionId,
        questionFingerprint,
        prompt: String(question?.stem || ""),
        expectedAnswer: expectedValue,
        userAnswer:
          answerText != null
            ? String(answerText)
            : answerIndex != null
              ? String(answerIndex)
              : "",
        questionEngine,
        ...(answerParams ? { params: answerParams } : {}),
        isCorrect: Boolean(isCorrect),
        hintsUsed: 0,
        // Phase 3: send both raw and credited time
        timeSpentMs: rawTimeSpentMs ?? timeSpentMs,
        rawTimeSpentMs: rawTimeSpentMs ?? timeSpentMs,
        creditedTimeMs,
        timingStatus,
        gradeLevel: String(grade || ""),
        ...answerLevelFields,
        clientMeta: {
          source: "history-master",
          version: "phase-4-display-level",
          gradeKey: String(grade || ""),
          afterStepByStep: stepByStepViewedRef.current,
          displayLevel: answerLevelFields.displayLevel,
          sourceDifficulty: answerLevelFields.sourceDifficulty,
          ...buildBookContextClientMetaExtras(mode, {
            bookContextRef,
            bookContextConsumedRef,
          }),
          ...(diagnosticProbeMeta ? { diagnosticProbe: diagnosticProbeMeta } : {}),
        },
      });
    })
    .catch((error) => {
      console.warn("[history-master] answer save failed", error);
    });
}

  /**
   * @param {object} question
   * @param {unknown} wrongAnswer
   * @param {object} [mcqExtra]
   * @param {number} [mcqExtra.selectedOptionIndex]
   * @param {number} [mcqExtra.correctOptionIndex]
   * @param {number|null} [mcqExtra.responseMs]
   * @param {boolean} [mcqExtra.hintUsed]
   * @returns {Record<string, unknown>|null}
   */
  function buildScienceMistakeEntry(question, wrongAnswer, mcqExtra = {}) {
    if (typeof window === "undefined" || !question) return null;
    const ts = Date.now();
    const assignedGrade = question.assignedGrade || question.grades?.[0] || grade;
    const assignedLevel = question.assignedLevel || question.minLevel || level;
    const qParams =
      question.params && typeof question.params === "object" ? question.params : {};
    const diag = extractDiagnosticMetadataFromQuestion(question, {
      responseMs: mcqExtra.responseMs,
      hintUsed: mcqExtra.hintUsed,
    });

    let entry = {
      id: question.id,
      topic: question.topic,
      subtopicKey: qParams.subtopicKey || question.subtopicKey || null,
      topicOrOperation: qParams.subtopicKey || question.subtopicKey || question.topic,
      bucketKey: qParams.subtopicKey || question.subtopicKey || question.topic,
      grade: assignedGrade,
      level: assignedLevel,
      stem: question.stem,
      correct: question.options?.[question.correctIndex],
      wrong: wrongAnswer,
      exerciseText: question.stem || "",
      questionLabel: question.id != null ? String(question.id) : null,
      correctAnswer: question.options?.[question.correctIndex],
      userAnswer: wrongAnswer,
      isCorrect: false,
      mode,
      timestamp: ts,
      storedAt: ts,
      params: {
        uiLevel: level,
        displayLevel,
        contentPoolLevel: assignedLevel,
        gradeKey: assignedGrade,
        poolFallbackCode: "none",
        ...qParams,
      },
    };
    entry = mergeDiagnosticIntoMistakeEntry(entry, diag);
    entry = mergeDiagnosticIntoMistakeEntry(entry, {
      selectedOptionIndex: mcqExtra.selectedOptionIndex,
      correctOptionIndex: mcqExtra.correctOptionIndex,
    });
    const selIdx = mcqExtra.selectedOptionIndex;
    if (
      !entry.distractorFamily &&
      selIdx != null &&
      Array.isArray(question.options)
    ) {
      const cell = question.options[selIdx];
      const dfOpt = distractorFamilyFromOptionCell(cell);
      if (dfOpt) {
        entry = mergeDiagnosticIntoMistakeEntry(entry, { distractorFamily: dfOpt });
      }
    }
    return entry;
  }

  /**
   * @param {object} question
   * @param {unknown} wrongAnswer
   * @param {object} [mcqExtra]
   */
  function logScienceMistakeEntry(question, wrongAnswer, mcqExtra = {}) {
    const entry = buildScienceMistakeEntry(question, wrongAnswer, mcqExtra);
    if (!entry) return;
    try {
      const stored = loadHistoryMistakesFromStorage();
      stored.push(entry);
      const trimmed = stored.slice(-HISTORY_MISTAKES_MAX);
      localStorage.setItem(HISTORY_MISTAKES_KEY, JSON.stringify(trimmed));
      setMistakes(trimmed.slice().reverse());

      try {
        const normalized = normalizeMistakeEvent(entry, "history");
        const probe = buildPendingProbeFromMistake(
          normalized,
          {
            wrongQuestionId:
              question.id != null ? String(question.id) : undefined,
            fallbackTopicId: question.topic,
            fallbackGrade: entry.grade,
            fallbackLevel: entry.level,
          },
          "history"
        );
        if (probe) {
          pendingDiagnosticProbeRef.current = probe;
        } else {
          pendingDiagnosticProbeRef.current = null;
        }
      } catch {
        pendingDiagnosticProbeRef.current = null;
      }
    } catch {
      // ignore
    }
  }

  function clearScienceMistakes() {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(HISTORY_MISTAKES_KEY);
    } catch {}
    setMistakes([]);
  }

  function handleMistakePractice(entry) {
    if (!entry) return;
    const targetGrade = entry.grade || grade;
    const targetLevel = entry.level || level;
    const targetTopic = entry.topic || topic;
    setGrade(targetGrade);
    setDisplayLevel(migrateLegacyPracticeKeyToDisplayLevel(targetLevel, "history"));
    setTopic(targetTopic);
    setMode("learning");
    setGameActive(false);
    setShowPracticeModal(false);
    setShowPracticeOptions(false);
    setTimeout(() => {
      if (playerName.trim()) {
        startGame();
      }
    }, 200);
  }

  const beginScienceQuestionLedger = useCallback(
    (questionObj) => {
      if (!questionObj) return;
      beginMasterQuestionLedger(questionTimeLedgerRef, {
        subjectId: "history",
        mode,
        question: questionObj,
      });
    },
    [mode]
  );

  function generateNewQuestion(resetPool = false) {
    clearWrongAnswerAdvanceState();
    closeOpenQuestionLedger(true);

    if (resetPool) {
      askCounterRef.current = 0;
      retryQueueRef.current = [];
    }
    askCounterRef.current += 1;
    const askCounter = askCounterRef.current;

    const pool = filterQuestionsForCurrentSettings();

    if (pool.length === 0) {
      decrementPendingProbeExpiry(pendingDiagnosticProbeRef);
      questionPoolRef.current = [];
      questionIndexRef.current = 0;
      historyTrackingTopicKeyRef.current = null;
      setCurrentQuestion(null);
      setFeedback(
        "אין עדיין מספיק שאלות לנושא/כיתה/רמה שבחרת. נסה לשנות הגדרה."
      );
      return;
    }

    const intel = historyIntelRef.current;
    const recentSet = new Set(intel.recentIds);
    const recentStemSet = new Set(intel.recentStemFps || []);
    const lastStemFp = (intel.recentStemFps || [])[
      (intel.recentStemFps || []).length - 1
    ];
    const smartPicking = focusedPracticeMode !== "mistakes";

    const probeAtStart = pendingDiagnosticProbeRef.current;

    /** Phase 3D-B — attach probe meta via shared runtime when probe-driven row is shown. */
    let probeAttachOpts = null;

    let q = dequeueEligibleRetry(retryQueueRef.current, pool, askCounter);
    const usedRetryDequeue = !!q;

    if (!q) {
      const avoidRecent = pool.filter((item) => {
        if (recentSet.has(item.id)) return false;
        const fp = buildQuestionFingerprint(item, {
          subject: "history",
          topic: item.topic,
        });
        if (fp && recentStemSet.has(fp)) return false;
        if (fp && lastStemFp && fp === lastStemFp) return false;
        return true;
      });
      const usedRecentFallback = avoidRecent.length === 0;
      const eligible = usedRecentFallback ? pool : avoidRecent;

      const fallbackPick = () => {
        if (smartPicking && !usedRecentFallback) {
          return weightedPickQuestions(eligible, intel.topicStats);
        }
        return randomItem(eligible);
      };

      const probeOk =
        probeAtStart &&
        probeMatchesSession(probeAtStart, grade, level, topic);

      if (probeOk) {
        const pr = selectQuestionWithProbe({
          items: eligible,
          pendingProbe: probeAtStart,
          recentIds: recentSet,
          currentTopic: topic,
          fallbackPick,
          randomFn: Math.random,
        });
        q = pr.question;
        if (pr.usedProbe && probeAtStart) {
          probeAttachOpts = {
            probeSnapshot: probeAtStart,
            probeReason: pr.reason,
            expectedErrorTags: Array.isArray(q.params?.expectedErrorTags)
              ? [...q.params.expectedErrorTags]
              : undefined,
          };
        }
      } else {
        q = fallbackPick();
      }
    }

    if (!q) {
      q = randomItem(pool);
    }

    pushRecentQuestionId(q, q.id);

    // ערבוב התשובות (options) - Fisher-Yates shuffle
    let shuffledOptions = [...(q.options || [])];
    const originalCorrectIndex = q.correctIndex;
    
    // ערבוב התשובות
    for (let i = shuffledOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
    }

    // מציאת המיקום החדש של התשובה הנכונה
    const originalCorrectAnswer = q.options?.[originalCorrectIndex];
    const newCorrectIndex = shuffledOptions.findIndex(opt => opt === originalCorrectAnswer);

    warnDuplicateMcqOptionsDevOnly(shuffledOptions, q.id);

    historyTrackingTopicKeyRef.current = q.topic;
    /** @type {Record<string, unknown>} */
    let nextQuestionPayload = {
      ...q,
      options: shuffledOptions,
      correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : originalCorrectIndex,
      assignedGrade: grade,
      assignedLevel: getAssignedLevelForQuestion(),
    };
    if (probeAttachOpts && !usedRetryDequeue) {
      nextQuestionPayload = attachProbeMetaToQuestion(nextQuestionPayload, probeAttachOpts);
    }
    const displayQuestion = tagQuestion(
      sanitizeQuestionForStudentDisplay(nextQuestionPayload)
    );
    setCurrentQuestion(displayQuestion);
    if (currentQuestion) {
      setPreviousExplanationQuestion(currentQuestion);
    }
    setSelectedAnswer(null);
    setShowSolution(false);
    setShowPreviousSolution(false);
    setShowTheoryHelp(false);
    setErrorExplanation("");
    stepByStepViewedRef.current = false;
    setQuestionStartTime(Date.now());
    beginScienceQuestionLedger(displayQuestion);

    decrementPendingProbeExpiry(pendingDiagnosticProbeRef);
  }

  function hardResetGame() {
    closeOpenQuestionLedger(false);
    questionTimeLedgerRef.current = null;
    // Stop background music when game resets
    audio.stopMusic();
    setGameActive(false);
    historyTrackingTopicKeyRef.current = null;
    setCurrentQuestion(null);
    setScore(0);
    setStreak(0);
    setCorrect(0);
    correctRef.current = 0;
    setWrong(0);
    setTimeLeft(20);
    setSelectedAnswer(null);
    setFeedback(null);
    setShowSolution(false);
    setShowPreviousSolution(false);
    setPreviousExplanationQuestion(null);
    setShowTheoryHelp(false);
    setLives(3);
    clearActiveDiagnosticState(pendingDiagnosticProbeRef, historyHypothesisLedgerRef);

    // איפוס מאגר השאלות
    questionPoolRef.current = [];
    questionIndexRef.current = 0;
    retryQueueRef.current = [];
    askCounterRef.current = 0;
    setTotalQuestions(0);
    setAvgTime(0);
    setQuestionStartTime(null);
  }

  function saveRunToStorage() {
    if (typeof window === "undefined" || !playerName.trim()) return;
    try {
      let saved;
      if (learningProfileStudentIdRef.current && learningProfileHydratedRef.current) {
        const base = scoresStoreRef.current;
        saved =
          base && typeof base === "object"
            ? JSON.parse(JSON.stringify(base))
            : {};
      } else {
        saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      }
      const key = `${level}_${topic}`;
      const arr = Array.isArray(saved[key]) ? [...saved[key]] : [];
      arr.push({
        playerName: playerName.trim(),
        bestScore: score,
        bestStreak: streak,
        timestamp: Date.now(),
      });
      saved[key] = arr.slice(-100);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      scoresStoreRef.current = saved;
      const { maxScore, maxStreak } = maxBestForPlayerInKey(saved, key, playerName);
      setBestScore(maxScore);
      setBestStreak(maxStreak);
      if (showLeaderboard) {
        const all = loadLeaderboardTop10ByDisplayLevel(saved, leaderboardLevel);
        setLeaderboardData(all);
      }

      if (learningProfileStudentIdRef.current && learningProfileHydratedRef.current) {
        const patchBody = { subjects: { history: { scoresStore: saved } } };
        void patchStudentLearningProfile(patchBody)
          .then((json) => {
            const acc = accountAccuracyDisplayFromDerived(json?.derived, "history");
            if (acc != null) setServerAccountSubjectAccuracyPct(acc);
            logAccountTileSync("history", {
              tile: "finishPatch",
              responseAccuracy: acc,
              displayedBestScore: maxScore,
              displayedBestStreak: maxStreak,
            });
          })
          .catch(() => {});
      }
    } catch {
      // ignore
    }
  }

  function startGame(opts = {}) {
    if (guestTopics.isGuest && guestTopics.isLocked(topic)) {
      alert(GUEST_TOPIC_LOCK_MESSAGE_HE);
      return;
    }
    if (opts.fromAdaptivePlannerRecommendedPractice && opts.plannerSessionMeta && typeof opts.plannerSessionMeta === "object") {
      plannerNextSessionClientMetaRef.current = opts.plannerSessionMeta;
      applyPlannerLevelKey(opts.appliedLevelKey);
    } else {
      plannerNextSessionClientMetaRef.current = null;
      resetAdaptiveForSessionStart();
    }
    recordSessionProgress({ includePlannerRecommendation: false });
    setAdaptivePlannerRecommendationView(null);
    sessionStartRef.current = Date.now();
    solvedCountRef.current = 0;
    sessionSecondsRef.current = 0;
    questionTimeLedgerRef.current = null;
    setGameActive(true);
    setScore(0);
    setStreak(0);
    setCorrect(0);
    correctRef.current = 0;
    setWrong(0);
    setTotalQuestions(0);
    setAvgTime(0);
    setQuestionStartTime(null);
    setFeedback(null);
    setSelectedAnswer(null);
    setShowSolution(false);
    setShowPreviousSolution(false);
    setPreviousExplanationQuestion(null);
    setShowTheoryHelp(false);
    setErrorExplanation("");
    stepByStepViewedRef.current = false;
    learningSessionIdRef.current = null;
    learningSessionStartPromiseRef.current = null;
    clearActiveDiagnosticState(pendingDiagnosticProbeRef, historyHypothesisLedgerRef);
    setLives(mode === "challenge" ? 3 : 0);
    if (mode === "challenge") setTimeLeft(25);
    else if (mode === "speed") setTimeLeft(12);
    else setTimeLeft(null);
    void ensureLearningSessionId();

    startLearningMasterSessionAudio(audio);

    // מאתחל מאגר שאלות חדש לסשן הזה
    generateNewQuestion(true);
  }

  function handleAdaptivePlannerRecommendedPractice() {
    try {
      const vm = adaptivePlannerRecommendationView;
      const out = buildRecommendedPracticeFromViewModel(vm);
      if (!out.ok) return;
      setAdaptivePlannerRecommendationView(null);
      const appliedLevelKey = mapPlannerTargetDifficultyToTriLevel(out.startOptions.targetDifficulty);
      startGame({
        fromAdaptivePlannerRecommendedPractice: true,
        appliedLevelKey: appliedLevelKey || undefined,
        plannerSessionMeta: {
          plannerRecommended: true,
          plannerNextAction: out.startOptions.nextAction,
          plannerTargetDifficulty: out.startOptions.targetDifficulty,
          plannerQuestionCount: out.startOptions.questionCount,
        },
      });
    } catch {
      /* ignore */
    }
  }

  function stopGame() {
    // Stop background music when game stops
    audio.stopMusic();
    pendingHistoryTrackMetaRef.current = {
      correct: undefined,
      total: 1,
      mode: reportModeFromGameState(mode, focusedPracticeMode),
    };
    recordSessionProgress();
    saveRunToStorage();
    setGameActive(false);
    historyTrackingTopicKeyRef.current = null;
    setCurrentQuestion(null);
    setFeedback(null);
    setSelectedAnswer(null);
    setShowSolution(false);
    setShowPreviousSolution(false);
    setPreviousExplanationQuestion(null);
    setShowTheoryHelp(false);
    clearActiveDiagnosticState(pendingDiagnosticProbeRef, historyHypothesisLedgerRef);
  }

  function handleTimeUp() {
    audio.playSfx("sfx-game-over");
    pendingHistoryTrackMetaRef.current = {
      correct: 0,
      total: 1,
      mode: reportModeFromGameState(mode, focusedPracticeMode),
    };
    recordSessionProgress();
    setWrong((prev) => prev + 1);
    setStreak(0);
    setFeedback("הזמן נגמר! ⏰");
    setGameActive(false);
    historyTrackingTopicKeyRef.current = null;
    setCurrentQuestion(null);
    saveRunToStorage();
    setTimeout(() => {
      hardResetGame();
    }, 1800);
  }

  function handleAnswer(idx) {
    if (!gameActive || !currentQuestion || selectedAnswer != null) return;
    const questionForSave = currentQuestion;
    const hintUsedForSave = false;
    const rawMs = questionStartTime ? Math.max(0, Date.now() - questionStartTime) : null;
    const timeSpentMs = rawMs;
    const { rawTimeSpentMs, creditedTimeMs, timingStatus } = computeFreePracticeTiming(rawMs, {
      creditedMs: questionTimeLedgerRef.current ? questionTimeLedgerRef.current.peekCreditedMs() : undefined,
      tierCapMs: questionTimeLedgerRef.current?.tierCapMs,
    });
    const answerText = currentQuestion.options?.[idx];
    // update time stats
    setTotalQuestions((prev) => {
      const newTotal = prev + 1;
      if (questionStartTime) {
        const elapsed = (Date.now() - questionStartTime) / 1000;
        setAvgTime((prevAvg) =>
          prev === 0 ? elapsed : (prevAvg * prev + elapsed) / newTotal
        );
      }
      return newTotal;
    });
    setSelectedAnswer(idx);
    solvedCountRef.current += 1;
    // MCQ uses index-based comparison by design
    const isCorrect = idx === currentQuestion.correctIndex;

    let diagnosticProbeMetaForSave = null;
    if (
      questionForSave._diagnosticProbeAttempt === true &&
      questionForSave._probeMeta
    ) {
      let inferredTags = [];
      const probeAnsweredAt = Date.now();
      if (!isCorrect) {
        const wrongEntry = buildScienceMistakeEntry(questionForSave, answerText, {
          selectedOptionIndex: idx,
          correctOptionIndex:
            questionForSave.correctIndex != null
              ? questionForSave.correctIndex
              : undefined,
          responseMs: timeSpentMs,
          hintUsed: hintUsedForSave,
        });
        if (wrongEntry) {
          const normalizedWrong = normalizeMistakeEvent(wrongEntry, "history");
          inferredTags = inferNormalizedTags(normalizedWrong, "history");
        }
      }
      historyHypothesisLedgerRef.current = applyProbeOutcome(
        historyHypothesisLedgerRef.current,
        {
          isCorrect,
          inferredTags,
          probeMeta: questionForSave._probeMeta,
          now: probeAnsweredAt,
        }
      );
      diagnosticProbeMetaForSave = buildDiagnosticProbeClientMeta({
        probeMeta: questionForSave._probeMeta,
        ledger: historyHypothesisLedgerRef.current,
        inferredTags,
        answeredAt: probeAnsweredAt,
        learningSessionId: learningSessionIdRef.current,
      });
      setCurrentQuestion((prev) => {
        if (!prev || prev !== questionForSave) return prev;
        const {
          _diagnosticProbeAttempt: _a,
          _probeMeta: _b,
          ...rest
        } = prev;
        void _a;
        void _b;
        return rest;
      });
    }

    saveScienceAnswerInParallel({
      question: questionForSave,
      answerIndex: idx,
      answerText,
      isCorrect,
      timeSpentMs,
      rawTimeSpentMs,
      creditedTimeMs,
      timingStatus,
      usedHint: hintUsedForSave,
      diagnosticProbeMeta: diagnosticProbeMetaForSave,
    });
    pendingHistoryTrackMetaRef.current = {
      correct: isCorrect ? 1 : 0,
      total: 1,
      mode: reportModeFromGameState(mode, focusedPracticeMode),
    };
    trackCurrentQuestionTime();
    bumpTopicIntel(currentQuestion.topic, !isCorrect);
    applyAnswerAdaptive(isCorrect, { mode: focusedPracticeModeRef.current });
    enqueueWrongQuestionRetry(isCorrect, isCorrect ? null : currentQuestion.id);
    if (isCorrect) {
      let points = 10 + streak;
      if (mode === "speed" && timeLeft != null) {
        points += Math.floor(timeLeft * 1.5);
      }
      setScore((prev) => prev + points);
      setStreak((prev) => prev + 1);
      setCorrect((prev) => {
        const next = prev + 1;
        correctRef.current = next;
        return next;
      });
      clearWrongAnswerAdvanceState();
      setErrorExplanation("");
      // progress by topic
      setProgress((prev) => {
        const key = currentQuestion.topic;
        const cur = prev[key] || { total: 0, correct: 0 };
        const next = {
          total: cur.total + 1,
          correct: cur.correct + 1,
        };
        const newAll = { ...prev, [key]: next };
        persistProgress(newAll);
        return newAll;
      });
      // stars
      const newCorrect = correct + 1;
      if (newCorrect % 5 === 0) {
        setStars((prev) => {
          const s = prev + 1;
          persistProgress(null, s, null, null);
          return s;
        });
      }
      // XP
      const xpGain = 10;
      setXp((prev) => {
        let newXp = prev + xpGain;
        let lv = playerLevel;
        let changed = false;
        let xpNeeded = lv * 100;
        while (newXp >= xpNeeded) {
          newXp -= xpNeeded;
          lv += 1;
          changed = true;
          xpNeeded = lv * 100;
        }
        if (changed) {
          setPlayerLevel(lv);
          setShowLevelUp(true);
          audio.playSfx("sfx-level-up");
          setTimeout(() => setShowLevelUp(false), 2500);
        }
        persistProgress(null, null, lv, newXp);
        return newXp;
      });
      
      // Badges
      const newStreak = streak + 1;
      if (newStreak === 10 && !badges.includes("🔥 רצף חם")) {
        const newBadge = "🔥 רצף חם";
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        audio.playSfx("sfx-badge");
        setTimeout(() => setShowBadge(null), 3000);
        saveBadge(newBadge);
      } else if (newStreak === 25 && !badges.includes("⚡ מהיר כברק")) {
        const newBadge = "⚡ מהיר כברק";
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        audio.playSfx("sfx-badge");
        setTimeout(() => setShowBadge(null), 3000);
        saveBadge(newBadge);
      } else if (newStreak === 50 && !badges.includes("🌟 אלוף היסטוריה") && !badges.includes("🌟 מאסטר היסטוריה")) {
        const newBadge = "🌟 אלוף היסטוריה";
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        audio.playSfx("sfx-badge");
        setTimeout(() => setShowBadge(null), 3000);
        saveBadge(newBadge);
      } else if (newStreak === 100 && !badges.includes("👑 מלך ההיסטוריה")) {
        const newBadge = "👑 מלך ההיסטוריה";
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        audio.playSfx("sfx-badge");
        setTimeout(() => setShowBadge(null), 3000);
        saveBadge(newBadge);
      }
      
      // Badges לפי נושא
      const topicKey = currentQuestion.topic;
      const topicProgress = progress[topicKey] || { total: 0, correct: 0 };
      const newTopicCorrect = topicProgress.correct + 1;
      const topicName = TOPICS[topicKey]?.name || "נושא";
      if (newTopicCorrect === 50 && !badges.includes(`🔬 מומחה ${topicName}`)) {
        const newBadge = `🔬 מומחה ${topicName}`;
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        audio.playSfx("sfx-badge");
        setTimeout(() => setShowBadge(null), 3000);
        saveBadge(newBadge);
      } else if (newTopicCorrect === 100 && !badges.includes(`🏆 גאון ${topicName}`)) {
        const newBadge = `🏆 גאון ${topicName}`;
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        audio.playSfx("sfx-badge");
        setTimeout(() => setShowBadge(null), 3000);
        saveBadge(newBadge);
      }
      
      // Badges לפי ניקוד
      const newScore = score + points;
      if (newScore >= 1000 && newScore - points < 1000 && !badges.includes("💎 אלף נקודות")) {
        const newBadge = "💎 אלף נקודות";
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        audio.playSfx("sfx-badge");
        setTimeout(() => setShowBadge(null), 3000);
        saveBadge(newBadge);
      } else if (newScore >= 5000 && newScore - points < 5000 && !badges.includes("🎯 חמשת אלפים")) {
        const newBadge = "🎯 חמשת אלפים";
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        audio.playSfx("sfx-badge");
        setTimeout(() => setShowBadge(null), 3000);
        saveBadge(newBadge);
      }
      
      // Badges לפי תשובות נכונות
      if (newCorrect === 100 && correct < 100 && !badges.includes("⭐ מאה תשובות נכונות")) {
        const newBadge = "⭐ מאה תשובות נכונות";
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        audio.playSfx("sfx-badge");
        setTimeout(() => setShowBadge(null), 3000);
        saveBadge(newBadge);
      } else if (newCorrect === 500 && correct < 500 && !badges.includes("🌟 חמש מאות תשובות")) {
        const newBadge = "🌟 חמש מאות תשובות";
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        audio.playSfx("sfx-badge");
        setTimeout(() => setShowBadge(null), 3000);
        saveBadge(newBadge);
      }
      
      // daily challenge
      const todayKey = getTodayKey();
      setDailyChallenge((prev) => {
        const updated = {
          date: prev.date === todayKey ? prev.date : todayKey,
          bestScore: prev.date === todayKey ? Math.max(prev.bestScore, score + points) : score + points,
          questions: prev.date === todayKey ? prev.questions + 1 : 1,
          correct: prev.date === todayKey ? (prev.correct || 0) + 1 : 1,
          completed: false,
        };
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("mleo_history_daily_challenge", JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });
      
      // weekly challenge
      setWeeklyChallenge((prev) => {
        const today = new Date();
        const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
        const weekKey = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
        const updated = {
          week: prev.week === weekKey ? prev.week : weekKey,
          target: 100,
          current: prev.week === weekKey ? prev.current + 1 : 1,
          completed: prev.week === weekKey ? (prev.current + 1 >= 100) : false,
        };
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("mleo_history_weekly_challenge", JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });
      
      setFeedback("מצוין! ✅");
      
      // Play sound - different sound for streak milestones
      if ((streak + 1) % 5 === 0 && streak + 1 >= 5) {
        audio.playSfx("sfx-streak");
      } else {
        audio.playSfx("sfx-correct");
      }
      
      // Update daily streak
      const updatedStreak = updateDailyStreak("mleo_history_daily_streak");
      setDailyStreak(updatedStreak);
      
      // Show streak reward if applicable
      const reward = getStreakReward(updatedStreak.streak);
      if (reward && updatedStreak.streak > (dailyStreak.streak || 0)) {
        setShowStreakReward(reward);
        setTimeout(() => setShowStreakReward(null), 3000);
      }
      
      if ("vibrate" in navigator) navigator.vibrate?.(50);
      setTimeout(() => {
        if (!gameActive) return;
        generateNewQuestion();
        if (mode === "challenge") setTimeLeft(25);
        else if (mode === "speed") setTimeLeft(12);
      }, 900);
    } else {
      setWrong((prev) => prev + 1);
      setStreak(0);
      
      // Play sound for wrong answer
      audio.playSfx("sfx-wrong");
      
      const errExpl = getErrorExplanationHistory(currentQuestion, answerText);
      setErrorExplanation(errExpl);
      if (errExpl) stepByStepViewedRef.current = true;
      logScienceMistakeEntry(currentQuestion, answerText, {
        selectedOptionIndex: idx,
        correctOptionIndex:
          currentQuestion.correctIndex != null
            ? currentQuestion.correctIndex
            : undefined,
        responseMs: timeSpentMs,
        hintUsed: hintUsedForSave,
      });
      setProgress((prev) => {
        const key = currentQuestion.topic;
        const cur = prev[key] || { total: 0, correct: 0 };
        const next = {
          total: cur.total + 1,
          correct: cur.correct,
        };
        const newAll = { ...prev, [key]: next };
        persistProgress(newAll);
        return newAll;
      });
      if ("vibrate" in navigator) navigator.vibrate?.(200);
      if (mode === "learning") {
        const scienceCorrect =
          currentQuestion.options?.[currentQuestion.correctIndex] ?? "";
        setFeedback(formatLearningWrongFeedbackHe(scienceCorrect));
        scheduleWrongAnswerAdvance(() => {
          generateNewQuestion();
          setSelectedAnswer(null);
          setFeedback(null);
          setTimeLeft(null);
        });
      } else if (mode === "challenge") {
        setFeedback(`${LIVE_PRACTICE_WRONG_HE} (-1 ❤️)`);
        setLives((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            setFeedback(LIVE_PRACTICE_GAME_OVER_HE);
            audio.playSfx("sfx-game-over");
            recordSessionProgress();
            saveRunToStorage();
            setGameActive(false);
            historyTrackingTopicKeyRef.current = null;
            setCurrentQuestion(null);
            setTimeout(() => {
              hardResetGame();
            }, 2000);
          } else {
            scheduleWrongAnswerAdvance(() => {
              generateNewQuestion();
              setSelectedAnswer(null);
              setFeedback(null);
              if (mode === "challenge") setTimeLeft(25);
              else if (mode === "speed") setTimeLeft(12);
            });
          }
          return next;
        });
      } else {
        // speed / marathon / practice stay in active gameplay on wrong answers
        setFeedback(LIVE_PRACTICE_WRONG_HE);
        scheduleWrongAnswerAdvance(() => {
          generateNewQuestion();
          setSelectedAnswer(null);
          setFeedback(null);
          if (mode === "speed") setTimeLeft(12);
          else setTimeLeft(null);
        });
      }
    }
  }

  const isShowingAnySolution = showSolution || showPreviousSolution;
  const explanationQuestion = showPreviousSolution
    ? previousExplanationQuestion
    : currentQuestion;

  const closeExplanationModal = () => {
    setShowSolution(false);
    setShowPreviousSolution(false);
  };

  const openPreviousExplanation = () => {
    if (!previousExplanationQuestion) return;
    clearWrongAnswerAdvanceTimer();
    setShowSolution(false);
    setShowPreviousSolution(true);
    stepByStepViewedRef.current = true;
  };

  const saveBadge = (badge) => {
    if (typeof window === "undefined") return;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY + "_progress") || "{}");
      saved.badges = [...badges, badge];
      localStorage.setItem(STORAGE_KEY + "_progress", JSON.stringify(saved));
    } catch {}
  };

  function persistProgress(newProgress, newStars, newLevel, newXp) {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY + "_progress") || "{}";
      const saved = JSON.parse(raw);
      if (newProgress) saved.progress = newProgress;
      if (typeof newStars === "number") saved.stars = newStars;
      if (typeof newLevel === "number") saved.playerLevel = newLevel;
      if (typeof newXp === "number") saved.xp = newXp;
      localStorage.setItem(STORAGE_KEY + "_progress", JSON.stringify(saved));
    } catch {
      // ignore
    }
  }

  function resetStats() {
    setScore(0);
    setStreak(0);
    setCorrect(0);
    correctRef.current = 0;
    setWrong(0);
    setBestScore(0);
    setBestStreak(0);
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || "{}";
      const saved = JSON.parse(raw);
      const key = `${level}_${topic}`;
      delete saved[key];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // ignore
    }
  }

  function openLeaderboard() {
    setShowLeaderboard(true);
    if (typeof window === "undefined") {
      setLeaderboardData([]);
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || "{}";
      const saved = JSON.parse(raw);
      const top = loadLeaderboardTop10ByDisplayLevel(saved, leaderboardLevel);
      setLeaderboardData(top);
    } catch {
      setLeaderboardData([]);
    }
  }

  const backSafe = () => {
    router.push("/student/learning");
  };

  const profileSnap = getCachedStudentLearningProfile();
  const subjectView = useMemo(
    () =>
      buildStudentSubjectDashboardView({
        subject: "history",
        studentId: profileSnap?.studentId ?? "",
        profile: profileSnap,
        derived: profileSnap?.derived,
        currentRunState: {
          gameActive,
          score,
          streak,
          correct,
          bestScore,
          bestStreak,
          lives,
          timeLeft,
        },
        scoresStoreSnapshot: scoresStoreRef.current,
        topicScopeKey: `${level}_${topic}`,
        monthlyState: {
          totalMinutes: monthlyPersistenceView?.currentMinutes ?? 0,
          goalMinutes: monthlyPersistenceView?.goalMinutes ?? null,
          yearMonth: monthlyPersistenceView?.yearMonthIsrael ?? "",
          celebrationShownForMonth: Boolean(monthlyPersistenceView?.alreadyAwarded),
        },
        mode,
        gameActive,
        playerDisplayName: playerName,
        avatarEmoji: playerAvatar && !playerAvatarImage ? playerAvatar : null,
        hydrationComplete: learningProfileHydrationTick > 0 && !!learningProfileHydratedRef.current,
        liveDailyBlob: dailyChallenge,
        liveWeeklyBlob: weeklyChallenge,
      }),
    [
      gameActive,
      score,
      streak,
      correct,
      bestScore,
      bestStreak,
      lives,
      timeLeft,
      learningProfileHydrationTick,
      playerName,
      level,
      topic,
      monthlyPersistenceView,
      mode,
      playerAvatar,
      playerAvatarImage,
      dailyChallenge,
      weeklyChallenge,
    ]
  );

  useEffect(() => {
    logStudentSubjectDashboardDiagnostics("history", subjectView, {
      hydrationComplete: !!learningProfileHydratedRef.current,
    });
  }, [subjectView, learningProfileHydrationTick]);

  useEscapeCloseModals([
    { open: showPlayerProfile, close: () => setShowPlayerProfile(false) },
    { open: showPracticeOptions, close: () => setShowPracticeOptions(false) },
    { open: showReferenceModal, close: () => setShowReferenceModal(false) },
    { open: showHowTo, close: () => setShowHowTo(false) },
    { open: showLeaderboard, close: () => setShowLeaderboard(false) },
  ]);

  if (!mounted || session.sessionLoading) {
    return <SubjectMasterSessionShell shellClass={shellClass} shellBgStyle={shellBgStyle} />;
  }
  if (!gradeReady) {
    return <StudentLoadingPanel message={STUDENT_GRADE_REQUIRED_MESSAGE_HE} fullPage />;
  }

  const accuracy =
    totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
  const referenceSection =
    REFERENCE_SECTIONS[referenceCategory] || REFERENCE_SECTIONS.greece_hellenism;
  const referenceEntries = referenceSection.entries || [];
  const allowedTopics = GRADES[grade]?.topics || Object.keys(TOPICS);

  const showScienceTheoryHelp =
    mode === "learning" &&
    currentQuestion &&
    Array.isArray(currentQuestion.theoryLines) &&
    currentQuestion.theoryLines.length > 0;

  const showMobileQuestionActions = Boolean(questionBookHref || showScienceTheoryHelp);

  const verbalVisualLayout = currentQuestion
    ? buildHebrewApprovedVerbalMasterLayout({
        MB,
        questionParts: [currentQuestion.stem],
        answers: currentQuestion.options ?? currentQuestion.answers ?? [],
      })
    : null;

  return (
    <MasterSubjectAccessScreen permissionKey="history" titleHe="היסטוריה">
    <Layout>
      <div className={shellClass} style={shellBgStyle} dir="rtl">
        <div
          ref={wrapRef}
          className={LEARNING_MASTER_MOBILE_WRAP_CLASS}
          style={{
            maxWidth: "1200px",
            width: "min(1200px, 100vw)",
            paddingBottom: 0,
            margin: "0 auto"
          }}
        >
        {/* רקע עדין */}
        <div className="absolute inset-0 opacity-0 pointer-events-none hidden">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)",
              backgroundSize: "26px 26px",
            }}
          />
        </div>

        <LearningMasterDesktopHeader
          MB={MB}
          desktopHeaderRef={desktopHeaderRef}
          title="📜 היסטוריה"
          subtitle={`${playerName || "שחקן"} • ${GRADES[grade].name} • ${displayLevelLabel()} • ${getTopicLabel(topic)} • ${MODES[mode].name}`}
          onBack={backSafe}
          onCurriculumClick={() => router.push("/learning/curriculum?subject=history")}
          audio={audio}
        />

        <div className="md:hidden">
          <LearningMasterNavBar
            MB={MB}
            headerRef={headerRef}
            onCurriculumClick={() => router.push("/learning/curriculum?subject=history")}
            onBack={backSafe}
            hideCurriculum
            compactHeader
            integratedTopRow
            centerSlot={
              <LearningMasterMobileNavTitle MB={MB} title="📜 היסטוריה" audio={audio} />
            }
          />
        </div>

        {/* CONTENT */}
        <div
          className={`${CONTENT_SCROLL_CLASS} min-w-0`}
          style={{
            height: "100%",
            maxHeight: "100%",
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 18px)",
          }}
        >
          <div className={SUBTITLE_ROW_CLASS}>
            <p className={`${MB.pageSub} max-md:leading-none max-md:mb-0`}>
              {playerName || "שחקן"} • {GRADES[grade].name} • {displayLevelLabel()} •{" "}
              {getTopicLabel(topic)} • {MODES[mode].name}
            </p>
          </div>

          <LearningMasterHud
            MB={MB}
            controlsRef={controlsRef}
            className={HUD_CLASS}
            topHud={subjectView.topHud}
            lives={lives}
            mode={mode}
            gameActive={gameActive}
            timeLeft={timeLeft}
            onAvatarClick={() => setShowPlayerProfile(true)}
            playerAvatar={playerAvatar}
            playerAvatarImage={playerAvatarImage}
            playerAvatarBackground={playerAvatarBackground}
            playerAvatarBackground={playerAvatarBackground}
          />

          {/* בחירת מצב (תרגול / למידה / מהירות / מרתון / אתגר) */}
          <div
            className={`${MODE_ROW_CLASS} max-md:mb-1`}
            dir="rtl"
          >
            {["practice", "learning", "speed", "marathon", "challenge"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setGameActive(false);
                  setFeedback(null);
                }}
                className={mode === m ? MB.modeTabActive : MB.modeTabInactive}
              >
                {MODES[m].name}
              </button>
            ))}
            <div
              className={MB.coinBadgeDesktop}
              title="מטבעות משחק"
            >
              <span className={MB.coinBadgeLabel}>מטבעות:</span>
              <span dir="ltr" className={MB.coinBadgeValue}>
                {childCoinBalance}
              </span>
            </div>
          </div>

          {showStreakReward && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none" dir="rtl">
              <div className="bg-gradient-to-br from-orange-400 to-red-500 text-white px-8 py-6 rounded-2xl shadow-2xl text-center animate-bounce">
                <div className="text-4xl mb-2">{showStreakReward.emoji}</div>
                <div className="text-xl font-bold">{showStreakReward.message}</div>
              </div>
            </div>
          )}

          {/* LEVEL-UP POPUP */}
          {showLevelUp && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60">
              <div className="bg-gradient-to-br from-purple-600 to-pink-500 text-white px-6 py-4 rounded-2xl shadow-2xl text-center animate-pulse max-w-xs">
                <div className="text-4xl mb-2">🌟</div>
                <div className="text-xl font-bold mb-1">עלית רמה בהיסטוריה!</div>
                <div className="text-sm">כעת אתה ברמה {playerLevel}</div>
              </div>
            </div>
          )}

          {/* SETUP / GAME */}
          {!gameActive ? (
            <div className="relative flex flex-col flex-1 min-h-0 min-w-0 w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl items-center justify-start md:gap-1">
              {bookIndexHref ? (
                <LearningBookIndexTile
                  subject="history"
                  grade={grade}
                  testId={`science-${grade}-book-index-button`}
                  mobileBottomClass={LEARNING_MASTER_MOBILE_BOOK_TILE_BOTTOM}
                  onClick={() => router.push(bookIndexHref)}
                />
              ) : null}
              <div className="w-full flex justify-center mb-3 md:mb-4 overflow-x-auto [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] px-0.5">
                <div
                  className="inline-flex flex-nowrap items-center justify-center gap-2 md:gap-2.5 lg:gap-3 w-max max-w-full min-w-0"
                  dir="rtl"
                >
                <div
                  data-testid="science-player-name"
                  className={MB.preGamePlayerBadge}
                  dir={playerName && /[\u0590-\u05FF]/.test(playerName) ? "rtl" : "ltr"}
                  title={playerName.trim() ? playerName.trim() : undefined}
                  aria-label={playerName.trim() ? `שם ילד/ה: ${playerName.trim()}` : "שם ילד/ה לא זמין"}
                >
                  {playerName.trim() ? playerName.trim() : "שחקן"}
                </div>
                <select
                  value={grade}
                  title={GRADES[grade]?.name || grade}
                  disabled={!canPickGrade}
                  aria-disabled={!canPickGrade || undefined}
                  onChange={(e) => {
                    setGrade(e.target.value);
                    setGameActive(false);
                  }}
                  className={`${MB.selectControl} shrink-0 min-w-0 w-[5.75rem] max-w-[6.25rem] md:w-[6.5rem] md:max-w-[7rem]`}
                >
                  {GRADE_ORDER.map((g) => (
                    <option key={g} value={g}>
                      {GRADES[g]?.name || g}
                    </option>
                  ))}
                </select>
                <StudentDisplayLevelSelect
                  subjectId="history"
                  value={displayLevel}
                  title={displayLevelLabel()}
                  disabled={gameActive}
                  onChange={handleDisplayLevelChange}
                  className={`${MB.selectControl} shrink-0 min-w-0 w-[5rem] max-w-[5.5rem] md:w-[5.75rem] md:max-w-[6.25rem]`}
                />
                <div className="flex flex-1 min-w-0 md:flex-none md:max-w-[min(22rem,42vw)] items-center gap-1.5 md:gap-2 shrink">
                  <select
                    data-testid="science-topic-select"
                    value={topic}
                    title={getTopicLabel(topic)}
                    onChange={(e) => {
                      const nextTopic = e.target.value;
                      if (guestTopics.isGuest && guestTopics.isLocked(nextTopic)) {
                        alert(GUEST_TOPIC_LOCK_MESSAGE_HE);
                        return;
                      }
                      setTopic(nextTopic);
                      setGameActive(false);
                    }}
                    className={`${MB.selectControl} min-w-0 w-full md:w-[min(22rem,42vw)] md:max-w-[22rem]`}
                  >
                    {allowedTopics.map((t) => (
                      <option key={t} value={t} disabled={guestTopics.isLocked(t)}>
                        {guestTopics.label(t, getTopicLabel(t))}
                      </option>
                    ))}
                  </select>
                </div>
                </div>
              </div>
              {/* BEST / ACCURACY */}
              <div className="grid grid-cols-4 gap-1.5 md:gap-2 lg:gap-2.5 mb-3 md:mb-4 w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto shrink-0" dir="rtl">
                <div className={MB.preGameTile}>
                  <div className="flex shrink-0 items-center justify-center md:min-h-[28px] lg:min-h-[30px] px-0.5">
                    <span className={MB.preGameTileLabel}>שיא ניקוד</span>
                  </div>
                  <div className="flex flex-1 items-center justify-center min-h-0">
                    <span className={MB.preGameTileValueEmerald} dir="ltr">
                      {formatMathHudNumber(subjectView.middleTiles.bestScore)}
                    </span>
                  </div>
                </div>
                <div className={MB.preGameTile}>
                  <div className="flex shrink-0 items-center justify-center md:min-h-[28px] lg:min-h-[30px] px-0.5">
                    <span className={MB.preGameTileLabel}>שיא רצף</span>
                  </div>
                  <div className="flex flex-1 items-center justify-center min-h-0">
                    <span className={MB.preGameTileValueAmber} dir="ltr">
                      {formatMathHudNumber(subjectView.middleTiles.bestStreak)}
                    </span>
                  </div>
                </div>
                <div className={MB.preGameTile}>
                  <div className="flex shrink-0 items-center justify-center md:min-h-[28px] lg:min-h-[30px] px-0.5">
                    <span className={MB.preGameTileLabel}>דיוק</span>
                  </div>
                  <div className="flex flex-1 items-center justify-center min-h-0">
                    <span className={MB.preGameTileValueBlue}>{subjectView.middleTiles.accuracyDisplayHe}</span>
                  </div>
                </div>
                <div className={MB.preGameTile}>
                  <div className="flex shrink-0 items-center justify-center md:min-h-[28px] lg:min-h-[30px] px-0.5">
                    <span className={MB.preGameTileLabel}>אתגרים</span>
                  </div>
                  <div className="flex flex-1 items-center justify-center min-h-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSubjectDailyMissionsLoading(true);
                        void fetchStudentHomeProfile()
                          .then((p) => {
                            if (p?.ok) {
                              setSubjectDailyMissions(buildDailyMissionsView(p.challenges));
                            }
                          })
                          .catch(() => {})
                          .finally(() => {
                            setSubjectDailyMissionsLoading(false);
                            setShowDailyChallenge(true);
                          });
                      }}
                      className={MB.btnOpenSmall}
                    >
                      פתיחה
                    </button>
                  </div>
                </div>
              </div>

              <LearningPlannerRecommendationBlock
                model={adaptivePlannerRecommendationView}
                onRecommendedPractice={handleAdaptivePlannerRecommendedPractice}
              />


              <div className="mt-auto mb-2 w-full pt-3 md:pt-4 flex flex-col items-center gap-2 md:gap-3">
              <div className="flex items-center justify-center gap-1.5 md:gap-2.5 w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl flex-wrap px-1 md:px-2 mx-auto">
                <button
                  type="button"
                  data-testid="science-start-game"
                  onClick={startGame}
                  disabled={!playerName.trim()}
                  className={MB.btnPrimary}
                >
                  ▶️ התחל
                </button>
                <button
                  onClick={openLeaderboard}
                  className={`${MB.btnAction} ${MB.btnActionOrange}`}
                >
                  🏆 לוח תוצאות
                </button>
              </div>

              {/* כפתורים עזרה ותרגול ממוקד */}
              <div className="w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl flex justify-center gap-2 md:gap-2.5 flex-wrap mx-auto px-1 md:px-2">
                <button
                  onClick={() => setShowHowTo(true)}
                  className={`${MB.btnActionHelp} ${MB.btnActionCyan}`}
                >
                  ❓ איך לומדים היסטוריה כאן?
                </button>
                <button
                  onClick={() => setShowReferenceModal(true)}
                  className={`${MB.btnActionHelp} ${MB.btnActionPurple}`}
                >
                  📚 לוח עזרה
                </button>
                {bookTopicHref ? (
                  <button
                    type="button"
                    data-testid={`science-${grade}-book-topic-button`}
                    onClick={() => router.push(bookTopicHref)}
                    className={`${MB.btnActionHelp} ${MB.btnActionTeal}`}
                  >
                    הסבר בספר
                  </button>
                ) : null}
                <div
                  className={MB.coinBadgeMobile}
                  title="מטבעות משחק"
                >
                  <span className={MB.coinBadgeLabel}>מטבעות:</span>
                  <span dir="ltr" className={MB.coinBadgeValue}>
                    {childCoinBalance}
                  </span>
                </div>
                <button
                  onClick={() => setShowPracticeOptions(true)}
                  className={`${MB.btnActionHelp} ${MB.btnActionPink}`}
                >
                  תרגול ממוקד
                  {mistakes.length > 0 ? ` (${mistakes.length})` : ""}
                </button>
              </div>

              {!playerName.trim() && (
                <p className={MB.mutedHint}>
                  הכנס את שמך כדי להתחיל
                </p>
              )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0 w-full items-center">
              <div
                ref={gameRef}
                className={`${LEARNING_MASTER_MOBILE_GAME_CLASS} px-1`}
              >
                {(feedback || errorExplanation) && (
                  <div className="absolute top-0 left-0 right-0 z-[5] px-2 pt-1 pointer-events-none" role="status" aria-live="assertive" aria-atomic="true">
                    <div className="flex flex-col gap-2 items-stretch">
                      {feedback && (
                        <div
                          className={`${feedback.includes("מצוין") ? MB.feedbackOk : MB.feedbackBad}`}
                        >
                          {renderLearningMixedHebrewMathText(feedback)}
                        </div>
                      )}
                      {errorExplanation && (
                        <div
                          className="px-4 py-3 rounded-lg bg-[#0a1222]/95 border border-rose-300/60 shadow-xl backdrop-blur-sm text-sm leading-relaxed text-right"
                          style={learningMixedHebrewMathStyle}
                        >
                          <div className="text-xs font-semibold text-rose-100 mb-1.5 tracking-tight">
                            למה הטעות קרתה?
                          </div>
                          <div className="text-rose-50">
                            {renderLearningMixedHebrewMathText(errorExplanation)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {showScienceTheoryHelp ? (
                    <button
                      type="button"
                      onClick={() => setShowTheoryHelp(true)}
                      className={`${MB.floatBtn} ${MB.floatBtnTheory} z-[6] max-md:hidden pointer-events-auto`}
                    >
                      🧠 מה חשוב לזכור?
                    </button>
                  ) : null}
                {questionBookHref ? (
                  <div className={`${MB.floatBtnStack} max-md:hidden`}>
                    <button
                      type="button"
                      data-testid={`science-${grade}-book-question-button`}
                      onClick={() => openBookFromLearning(questionBookHref)}
                      className={`${MB.floatBtnHelper} ${MB.floatBtnBookColors}`}
                      title="הסבר בספר לנושא הנוכחי"
                    >
                      הסבר
                    </button>
                  </div>
                ) : null}

                <div
                  className={`${verbalVisualLayout?.questionSlotClassForStem ?? ""} relative ${showMobileQuestionActions ? "max-md:pb-11" : ""}`.trim()}
                >
                  <StudentQuestionDisplay
                    testId="science-question-stem"
                    question={
                      currentQuestion?.stem || "אין שאלה זמינה להגדרה זו."
                    }
                    getQuestionFontStyle={getQuestionFontStyle}
                    resolveVerbalSingleStyle={getHebrewApprovedSingleVerbalQuestionStyle}
                    leadClassName={
                      verbalVisualLayout?.questionLeadClassName ?? MB.questionLead
                    }
                    bodyClassName={
                      verbalVisualLayout?.questionBodyClassName ?? MB.questionBody
                    }
                    leadStyle={{
                      lineHeight: verbalVisualLayout?.questionLineHeightByPressure,
                    }}
                    bodyStyle={{
                      lineHeight: verbalVisualLayout?.questionLineHeightByPressure,
                    }}
                  />

                <LearningMasterMobileQuestionActionDock
                  MB={MB}
                  show={showMobileQuestionActions}
                  testId="science-question-mobile-actions"
                  bookSlot={
                    questionBookHref ? (
                      <button
                        type="button"
                        data-testid={`science-${grade}-book-question-button`}
                        onClick={() => openBookFromLearning(questionBookHref)}
                        className={`${MB.questionActionBtn} ${MB.floatBtnBookColors}`}
                        title="הסבר בספר לנושא הנוכחי"
                      >
                        הסבר
                      </button>
                    ) : null
                  }
                  secondarySlot={
                    showScienceTheoryHelp ? (
                      <button
                        type="button"
                        onClick={() => setShowTheoryHelp(true)}
                        className={`${MB.questionActionBtn} ${MB.floatBtnPurple}`}
                        title="מה חשוב לזכור?"
                      >
                        🧠 חשוב
                      </button>
                    ) : null
                  }
                />
                </div>

                <div className={HEBREW_APPROVED_VERBAL_ANSWER_AREA_CLASS}>
                  {currentQuestion && (
                    <div
                      className={buildHebrewApprovedVerbalMcqGridClassName({
                        useNarrowMobileAnswerFallback:
                          verbalVisualLayout?.useNarrowMobileAnswerFallback,
                        isMobileViewport,
                      })}
                    >
                      {currentQuestion.options?.map((opt, idx) => {
                        const isSelected = selectedAnswer === idx;
                        const isCorrect = idx === currentQuestion.correctIndex;
                        const isWrong = isSelected && !isCorrect;
                        const showResult = selectedAnswer != null;

                        return (
                          <button
                            type="button"
                            key={idx}
                            data-testid={`science-mcq-${idx}`}
                            onClick={() => handleAnswer(idx)}
                            disabled={showResult}
                            className={`rounded-xl border-2 transition-all active:scale-95 disabled:opacity-50 ${verbalVisualLayout?.answerCardTextClass ?? ""} ${verbalVisualLayout?.answerCardNarrowClass ?? ""} ${resolveLearningMcqChoiceClassName({
                              MB,
                              isSelected,
                              isCorrectChoice: isCorrect,
                              isWrong,
                              revealResults: showResult,
                            })}`}
                            style={{ direction: "rtl", unicodeBidi: "isolate" }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="w-full flex justify-center gap-2 flex-wrap mb-2 min-h-[2.75rem]" dir="rtl">
                    {mode === "learning" && currentQuestion && (
                      <button
                        type="button"
                        onClick={() => {
                          clearWrongAnswerAdvanceTimer();
                          stepByStepViewedRef.current = true;
                          setShowSolution(true);
                        }}
                        className={learningExplainOpenBtn}
                      >
                        📘 הסבר מלא
                      </button>
                    )}
                    <button
                      type="button"
                      data-testid="learning-stop-game"
                      onClick={stopGame}
                      className={MB.btnStop}
                    >
                      ⏹️ עצור
                    </button>
                    {(mode === "learning" || mode === "practice") &&
                      previousExplanationQuestion && (
                      <button
                        type="button"
                        onClick={openPreviousExplanation}
                        className={learningExplainOpenBtn}
                      >
                        🕘 תרגיל קודם
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* SOLUTION MODAL */}
              {isShowingAnySolution && explanationQuestion && (
                <StepExerciseUiProvider value={stepExerciseUi}>
                <div
                  className={learningModalOverlay}
                  onClick={closeExplanationModal}
                  dir="rtl"
                >
                  <div
                    className={`${learningModalPanel} overflow-hidden`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className={learningModalHeader}>
                      <button
                        type="button"
                        onClick={closeExplanationModal}
                        className={learningModalCloseBtn}
                        aria-label="סגור"
                      >
                        ✖
                      </button>
                      <h3 className={learningModalTitle}>
                        {showPreviousSolution
                          ? "פתרון התרגיל הקודם"
                          : "\u200Fאיך פותרים את השאלה?"}
                      </h3>
                      <span className="w-10 shrink-0" aria-hidden />
                    </div>
                    <div
                      className="flex-1 min-h-0 overflow-y-auto px-4 pb-3"
                      dir="rtl"
                    >
                      <div className={`mb-3 ${learningQuestionBox}`}>
                        <p
                          className={`${learningQuestionText} text-center`}
                          style={{
                            direction: "rtl",
                            unicodeBidi: "isolate",
                          }}
                        >
                          {(() => {
                            const q = (explanationQuestion.stem || "")
                              .trim()
                              .replace(/^\?+/, "");
                            return q.endsWith("?") ? q : `${q}?`;
                          })()}
                        </p>
                      </div>
                      <div
                        className="space-y-2.5"
                        style={learningMixedHebrewMathStyle}
                      >
                        {getSolutionStepsHistory(explanationQuestion).map(
                          (line, idx) => (
                            <div key={idx} className={learningExplBody}>
                              {renderLearningMixedHebrewMathText(line)}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                    <div className={learningModalFooter}>
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={closeExplanationModal}
                          className={learningPrimaryCloseBtn}
                          dir="rtl"
                        >
                          {"\u200Fסגור"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                </StepExerciseUiProvider>
              )}

              {showTheoryHelp &&
                mode === "learning" &&
                currentQuestion &&
                Array.isArray(currentQuestion.theoryLines) &&
                currentQuestion.theoryLines.length > 0 && (
                  <div
                    className={learningModalOverlay}
                    onClick={() => setShowTheoryHelp(false)}
                    dir="rtl"
                  >
                    <div
                      className="w-full max-w-md rounded-2xl border border-white/20 bg-[#0a1222]/95 shadow-2xl p-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h3 className="text-base font-extrabold text-white">
                          מה חשוב לזכור?
                        </h3>
                        <button
                          type="button"
                          onClick={() => setShowTheoryHelp(false)}
                          className="px-2 py-1 rounded-md bg-white/10 text-white/80 hover:bg-white/20 text-xs font-bold"
                          aria-label="סגור"
                        >
                          ✖
                        </button>
                      </div>
                      <ul className="list-disc pr-4 space-y-1 text-sm text-white/90">
                        {currentQuestion.theoryLines.map((line, i) => (
                          <li key={i}>
                            {renderLearningMixedHebrewMathText(line)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* LEADERBOARD MODAL */}
          {showLeaderboard && (
            <div
              role="dialog" aria-modal="true" className="fixed inset-0 bg-black/80 flex items-center justify-center z-[140] p-4"
              onClick={() => setShowLeaderboard(false)}
            >
              <div
                className="bg-gradient-to-br from-[#080c16] to-[#0a0f1d] border-2 border-white/20 rounded-2xl p-4 max-w-md w-full max-h-[85svh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-extrabold text-white mb-1">
                    🏆 לוח תוצאות – היסטוריה
                  </h2>
                  <p className="text-white/70 text-xs">שיאים מקומיים</p>
                </div>
                <div className="flex gap-2 mb-4 justify-center" dir="rtl">
                  {studentDisplayLevelKeys("history").slice().reverse().map((dl) => (
                    <button
                      key={dl}
                      type="button"
                      onClick={() => setLeaderboardLevel(dl)}
                      className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${
                        leaderboardLevel === dl
                          ? "bg-amber-500/80 text-white"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      }`}
                    >
                      {studentDisplayLevelLabel(dl)}
                    </button>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-center">
                    <thead>
                      <tr className="border-b border-white/20">
                        <th className="text-white/80 p-2 font-bold text-xs">
                          דירוג
                        </th>
                        <th className="text-white/80 p-2 font-bold text-xs">
                          שחקן
                        </th>
                        <th className="text-white/80 p-2 font-bold text-xs">
                          ניקוד
                        </th>
                        <th className="text-white/80 p-2 font-bold text-xs">
                          רצף
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboardData.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-white/60 p-4 text-sm">
                            עדיין אין תוצאות ברמה {studentDisplayLevelLabel(leaderboardLevel)}
                          </td>
                        </tr>
                      ) : (
                        leaderboardData.map((row, idx) => (
                          <tr
                            key={`${row.name}-${row.timestamp}-${idx}`}
                            className={`border-b border-white/10 ${
                              row.placeholder
                                ? "opacity-40"
                                : idx === 0
                                ? "bg-amber-500/20"
                                : idx === 1
                                ? "bg-gray-500/20"
                                : idx === 2
                                ? "bg-amber-900/20"
                                : ""
                            }`}
                          >
                            <td className="text-white/80 p-2 text-sm font-bold">
                              {row.placeholder
                                ? `#${idx + 1}`
                                : idx === 0
                                ? "🥇"
                                : idx === 1
                                ? "🥈"
                                : idx === 2
                                ? "🥉"
                                : `#${idx + 1}`}
                            </td>
                            <td className="text-white p-2 text-sm font-semibold">
                              {row.name}
                            </td>
                            <td className="text-emerald-400 p-2 text-sm font-bold">
                              {row.bestScore}
                            </td>
                            <td className="text-amber-400 p-2 text-sm font-bold">
                              🔥{row.bestStreak}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowLeaderboard(false)}
                    className="px-6 py-2 rounded-lg bg-amber-500/80 hover:bg-amber-500 font-bold text-sm"
                  >
                    סגור
                  </button>
                </div>
              </div>
            </div>
          )}

          {showReferenceModal && (
            <div
              role="dialog" aria-modal="true" className="fixed inset-0 bg-black/80 flex items-center justify-center z-[160] p-4"
              onClick={() => setShowReferenceModal(false)}
            >
              <div
                className="bg-gradient-to-br from-[#080c16] to-[#0a0f1d] border-2 border-blue-400/60 rounded-2xl p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto text-white"
                dir="rtl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-2xl font-extrabold">📚 לוח המושגים בהיסטוריה</h2>
                  <button
                    onClick={() => setShowReferenceModal(false)}
                    className="text-white/80 hover:text-white text-xl px-2"
                  >
                    ✖
                  </button>
                </div>
                <p className="text-sm text-white/70 mb-3">
                  בחר קטגוריה כדי לחזור במהירות על נקודות מפתח – כמו דפי העזר במשחקי החשבון והגאומטריה.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.entries(REFERENCE_SECTIONS).map(([key, section]) => (
                    <button
                      key={key}
                      onClick={() => setReferenceCategory(key)}
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        referenceCategory === key
                          ? "bg-blue-500/80 border-blue-300 text-white"
                          : "bg-white/5 border-white/20 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      {section.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" dir="rtl">
                  {referenceEntries.map((entry, idx) => (
                    <div
                      key={`${referenceCategory}-${idx}`}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2"
                    >
                      <div className="text-sm font-semibold mb-1">{entry.term}</div>
                      <div className="text-xs text-white/80">{entry.desc}</div>
                    </div>
                  ))}
                  {referenceEntries.length === 0 && (
                    <div className="text-center text-white/60 py-4 col-span-full">
                      אין עדיין מושגים להצגה.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {showPracticeModal && (
            <div
              role="dialog" aria-modal="true" className="fixed inset-0 bg-black/80 flex items-center justify-center z-[150] p-4"
              onClick={() => setShowPracticeModal(false)}
            >
              <div
                className="bg-gradient-to-br from-[#080c16] to-[#0a0f1d] border-2 border-purple-400/60 rounded-2xl p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto text-white"
                dir="rtl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-2xl font-extrabold">🎯 חזרה על שגיאות</h2>
                  <button
                    onClick={() => setShowPracticeModal(false)}
                    className="text-white/80 hover:text-white text-xl px-2"
                  >
                    ✖
                  </button>
                </div>
                {mistakes.length === 0 ? (
                  <p className="text-sm text-white/70 text-center py-4">
                    עדיין אין שגיאות לשמור. תרגל, טעה ולחץ כאן כדי לחזור בדיוק על מה שצריך.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {mistakes.slice(0, 10).map((item, idx) => (
                      <div
                        key={`${item.id}-${item.timestamp}-${idx}`}
                        className="bg-white/5 border border-white/10 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between text-xs text-white/60 mb-1">
                          <span>{getTopicLabel(item.topic)}</span>
                          <span>
                            {GRADES[item.grade]?.name || "כיתה"} •{" "}
                            {studentDisplayLevelLabel(
                              migrateLegacyPracticeKeyToDisplayLevel(item.level, "history")
                            )}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-white mb-1">
                          {item.stem}
                        </p>
                        <p className="text-xs text-emerald-300 mb-1">
                          תשובה נכונה: {item.correct}
                        </p>
                        <p className="text-xs text-rose-300">
                          התשובה שלך: {item.wrong || "-"}
                        </p>
                        <button
                          onClick={() => handleMistakePractice(item)}
                          className="mt-2 w-full px-3 py-2 rounded-lg bg-emerald-500/80 hover:bg-emerald-500 text-xs font-bold"
                        >
                          תרגל שאלה זו
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setShowPracticeModal(false)}
                    className="flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-bold"
                  >
                    סגור
                  </button>
                  {mistakes.length > 0 && (
                    <button
                      onClick={clearScienceMistakes}
                      className="flex-1 px-4 py-2 rounded-lg bg-red-500/80 hover:bg-red-500 text-sm font-bold"
                    >
                      🧹 נקה שגיאות
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {showPracticeOptions && (
            <div
              role="dialog" aria-modal="true" className="fixed inset-0 bg-black/80 flex items-center justify-center z-[155] p-4"
              onClick={() => setShowPracticeOptions(false)}
            >
              <div
                className="bg-gradient-to-br from-[#080c16] to-[#0a0f1d] border-2 border-emerald-400/60 rounded-2xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto text-white"
                dir="rtl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-2xl font-extrabold">🎛️ הגדרות תרגול</h2>
                  <button
                    onClick={() => setShowPracticeOptions(false)}
                    className="text-white/80 hover:text-white text-xl px-2"
                  >
                    ✖
                  </button>
                </div>
                <p className="text-sm text-white/70 mb-3">
                  שלוט באימון שלך: חזרה על שגיאות אחרונות, תרגול מדורג (התחלה נמוכה ומתקדמות לרמה שבחרת), או בחירת קטגוריה.
                </p>
                <div className="space-y-2 mb-4">
                  <p className="text-xs text-white/60 font-semibold">מצב תרגול</p>
                  {[
                    { value: "normal", label: "תרגול רגיל" },
                    { value: "mistakes", label: "חזרה על שגיאות" },
                    { value: "graded", label: "תרגול מדורג" },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="science-focus-mode"
                        value={opt.value}
                        checked={focusedPracticeMode === opt.value}
                        onChange={(e) => setFocusedPracticeMode(e.target.value)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-white/80">
                  <div className="font-semibold mb-1">מצב נוכחי</div>
                  <p>מצב: {MODES[mode].name}</p>
                  <p>
                    מיקוד:{" "}
                    {PRACTICE_FOCUS_OPTIONS.find((o) => o.value === practiceFocus)?.label ||
                      PRACTICE_FOCUS_OPTIONS[0].label}
                  </p>
                  <p>
                    מצב תרגול ממוקד:{" "}
                    {focusedPracticeMode === "normal"
                      ? "רגיל"
                      : focusedPracticeMode === "mistakes"
                      ? "חזרה על שגיאות"
                      : "מדורג"}
                  </p>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setShowPracticeOptions(false)}
                    className="flex-1 px-4 py-2 rounded-lg bg-emerald-500/80 hover:bg-emerald-500 text-sm font-bold"
                  >
                    סגור
                  </button>
                  <button
                    onClick={() => {
                      setFocusedPracticeMode("normal");
                      setPracticeFocus("balanced");
                      setShowPracticeOptions(false);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-bold"
                  >
                    איפוס ברירות מחדל
                  </button>
                </div>
              </div>
            </div>
          )}

          {showPlayerProfile && (
            <div
              role="dialog" aria-modal="true" className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4"
              onClick={() => setShowPlayerProfile(false)}
              dir="rtl"
            >
              <div
                className="bg-gradient-to-br from-[#080c16] to-[#0a0f1d] border-2 border-white/20 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto relative"
                onClick={(e) => e.stopPropagation()}
                dir="rtl"
                style={{ scrollbarGutter: "stable" }}
              >
                <button
                  onClick={() => setShowPlayerProfile(false)}
                  className="absolute left-4 top-4 text-white/80 hover:text-white text-2xl font-bold z-10"
                  style={{ direction: "ltr" }}
                >
                  ✖
                </button>
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-extrabold text-white mb-2">
                    👤 פרופיל שחקן
                  </h2>
                </div>

                <div className="text-center mb-4">
                  <div className="mb-3 flex justify-center">
                    <StudentLearningAvatar
                      avatarEmoji={playerAvatar || "👤"}
                      avatarCustomDataUrl={playerAvatarImage || ""}
                      avatarBackgroundKey={playerAvatarBackground}
                      sizeClass="h-24 w-24 text-6xl"
                    />
                  </div>
                  <div className="text-sm text-white/60 mb-3">בחר אווטר:</div>
                  
                  {/* כפתור לבחירת תמונה */}
                  <div className="mb-3">
                    <label className="block w-full">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarImageUpload}
                        className="hidden"
                        id="avatar-image-upload-science"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => document.getElementById("avatar-image-upload-science").click()}
                          className="px-3 py-2 rounded-lg bg-blue-500/80 hover:bg-blue-500 text-white text-xs font-bold transition-all flex-1"
                        >
                          📷 בחר תמונה
                        </button>
                        {playerAvatarImage && (
                          <button
                            type="button"
                            onClick={handleRemoveAvatarImage}
                            className="px-3 py-2 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-xs font-bold transition-all"
                          >
                            🗑️ מחק תמונה
                          </button>
                        )}
                      </div>
                    </label>
                    {playerAvatarImage && (
                      <div className="mt-2 text-xs text-white/60 text-center">
                        תמונה נבחרה ✓
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-6 gap-2 mb-4">
                    {AVATAR_OPTIONS.map((avatar) => (
                      <button
                        key={avatar}
                        onClick={() => {
                          setPlayerAvatar(avatar);
                          setPlayerAvatarImage(null);
                          try {
                            localStorage.setItem("mleo_player_avatar", avatar);
                            localStorage.removeItem("mleo_player_avatar_image");
                          } catch {
                            // ignore
                          }
                        }}
                        className={`text-3xl p-2 rounded-lg transition-all ${
                          !playerAvatarImage && playerAvatar === avatar
                            ? "bg-yellow-500/40 border-2 border-yellow-400 scale-110"
                            : "bg-black/30 border border-white/10 hover:bg-black/40"
                        }`}
                      >
                        {avatar}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 mb-4">
                    <ProfileBackgroundPickerGrid
                      variant="dark"
                      selectedKey={playerAvatarBackground}
                      onSelect={handleSelectProfileBackground}
                    />
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="bg-black/30 border border-white/10 rounded-lg p-3">
                    <div className="text-sm text-white/60 mb-1">שם שחקן</div>
                    <div className="text-lg font-bold text-white">{playerName || "שחקן"}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-black/30 border border-white/10 rounded-lg p-3">
                      <div className="text-xs text-white/60 mb-1">ניקוד שיא</div>
                      <div className="text-xl font-bold text-emerald-400">{bestScore}</div>
                    </div>
                    <div className="bg-black/30 border border-white/10 rounded-lg p-3">
                      <div className="text-xs text-white/60 mb-1">רצף שיא</div>
                      <div className="text-xl font-bold text-amber-400">{bestStreak}</div>
                    </div>
                    <div className="bg-black/30 border border-white/10 rounded-lg p-3">
                      <div className="text-xs text-white/60 mb-1">כוכבים</div>
                      <div className="text-xl font-bold text-yellow-400">⭐ {stars}</div>
                    </div>
                    <div className="bg-black/30 border border-white/10 rounded-lg p-3">
                      <div className="text-xs text-white/60 mb-1">רמת חוקר</div>
                      <div className="text-xl font-bold text-purple-400">רמה {playerLevel}</div>
                      {/* XP Progress Bar */}
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-white/60 mb-1">
                          <span>נק׳ ניסיון</span>
                          <span>{xp} / {playerLevel * 100}</span>
                        </div>
                        <div className="w-full bg-black/50 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, (xp / (playerLevel * 100)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Daily Streak */}
                  <div className="bg-black/30 border border-white/10 rounded-lg p-3">
                    <div className="text-sm text-white/60 mb-2">🔥 רצף יומי</div>
                    <div className="text-2xl font-bold text-orange-400">{dailyStreak.streak || 0} ימים</div>
                    {dailyStreak.streak >= 3 && (
                      <div className="text-xs text-white/60 mt-1">
                        {dailyStreak.streak >= 30 ? "👑 אלוף!" : dailyStreak.streak >= 14 ? "🌟 מצוין!" : dailyStreak.streak >= 7 ? "⭐ יופי!" : "🔥 המשך כך!"}
                      </div>
                    )}
                  </div>
                  
                  {/* Monthly Progress */}
                  <div className="bg-black/30 border border-white/10 rounded-lg p-3">
                    <div className="text-sm text-white/60 mb-2">התקדמות חודשית</div>
                    <div className="flex justify-between text-xs text-white/60 mb-1">
                      <span>{Math.round(monthlyPersistenceView?.currentMinutes ?? 0)} / {monthlyPersistenceView?.goalMinutes ?? "-"} דק׳</span>
                      <span>{monthlyPersistenceView?.progressPct ?? 0}%</span>
                    </div>
                    <div className="w-full bg-black/50 rounded-full h-3 mb-2">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-blue-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${monthlyPersistenceView?.progressPct ?? 0}%` }}
                      />
                    </div>
                    {monthlyPersistenceView?.encouragementHe ?? "טוען..."}
                  </div>

                  <div className="bg-black/30 border border-white/10 rounded-lg p-3">
                    <div className="text-sm text-white/60 mb-2">דיוק כללי</div>
                    <div className="text-2xl font-bold text-blue-400">{accuracy}%</div>
                    <div className="text-xs text-white/60 mt-1">
                      {correct} נכון מתוך {totalQuestions} שאלות
                    </div>
                  </div>

                  {Object.keys(progress).some((topicKey) => progress[topicKey]?.total > 0) && (
                    <div className="bg-black/30 border border-white/10 rounded-lg p-3">
                      <div className="text-sm text-white/60 mb-2">התקדמות לפי נושאים</div>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {Object.entries(progress)
                          .filter(([, data]) => (data?.total || 0) > 0)
                          .sort(([, a], [, b]) => (b?.total || 0) - (a?.total || 0))
                          .map(([topicKey, data]) => {
                            const topicAccuracy =
                              data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                            return (
                              <div
                                key={topicKey}
                                className="flex items-center justify-between text-xs"
                              >
                                <span className="text-white/80">{getTopicLabel(topicKey)}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-white/60">
                                    {data.correct}/{data.total}
                                  </span>
                                  <span
                                    className={`font-bold ${
                                      topicAccuracy >= 80
                                        ? "text-emerald-400"
                                        : topicAccuracy >= 60
                                        ? "text-yellow-400"
                                        : "text-red-400"
                                    }`}
                                  >
                                    {topicAccuracy}%
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-black/30 border border-white/10 rounded-lg p-3 mt-4">
                  <div className="text-sm text-white/60 mb-2">תגים</div>
                  {badges.length > 0 ? (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {badges.map((badge, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/30"
                        >
                          <div className="text-3xl">{badge.split(" ")[0]}</div>
                          <div className="flex-1 text-white font-semibold text-lg">
                            {badge}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-white/60 text-sm py-4">
                      עדיין לא הרווחת תגים. המשך לתרגל!
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setShowPlayerProfile(false)}
                  className="w-full px-4 py-2 rounded-lg bg-emerald-500/80 hover:bg-emerald-500 font-bold text-sm"
                >
                  סגור
                </button>
              </div>
            </div>
          )}

          {showHowTo && (
            <div
              role="dialog" aria-modal="true" className="fixed inset-0 bg-black/80 flex items-center justify-center z-[180] p-4"
              onClick={() => setShowHowTo(false)}
            >
              <div
                className="bg-gradient-to-br from-[#080c16] to-[#0a0f1d] border-2 border-emerald-400/60 rounded-2xl p-4 max-w-md w-full text-sm text-white"
                dir="rtl"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-extrabold mb-2 text-center">
                  📘 איך לומדים היסטוריה כאן?
                </h2>

                <p className="text-white/80 text-xs mb-3 text-center">
                  המטרה היא לתרגל היסטוריה בצורה משחקית, עם התאמה לכיתה, נושא ורמת קושי.
                </p>

                <ul className="list-disc pr-4 space-y-1 text-[13px] text-white/90">
                  <li>בחר כיתה, רמה ונושא (לדוגמה: גוף האדם, צמחים, בעלי חיים ועוד).</li>
                  <li>בחר מצב משחק: למידה, אתגר עם טיימר וחיים, מהירות או מרתון.</li>
                  <li>ענה על שאלות בחירה, נכון/לא נכון ותסריטי ניסוי.</li>
                  <li>נסה להגיע לרצף תשובות נכון ולקבל כוכבים ונקודות ניסיון.</li>
                </ul>

                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => setShowHowTo(false)}
                    className="px-5 py-2 rounded-lg bg-emerald-500/80 hover:bg-emerald-500 text-sm font-bold"
                  >
                    סגור
                  </button>
                </div>
              </div>
            </div>
          )}

          <SubjectDailyMissionsModal
            open={showDailyChallenge}
            onClose={() => setShowDailyChallenge(false)}
            dailyMissions={subjectDailyMissions}
            loading={subjectDailyMissionsLoading}
          />
        </div>
        <LearningMasterAdSlot MB={MB} />
      </div>
    </div>
    <TrackingDebugPanel
      subjectId="history"
      uiSelection={`topic=${topic}`}
      currentQuestion={currentQuestion}
      trackingRef={historyTrackingTopicKeyRef}
    />
    </Layout>
    </MasterSubjectAccessScreen>
  );
}
