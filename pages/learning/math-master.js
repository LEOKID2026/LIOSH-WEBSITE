import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Layout from "../../components/Layout";
import { useRouter } from "next/router";
import { useIOSViewportFix } from "../../hooks/useIOSViewportFix";
import {
  LEVELS,
  GRADE_LEVELS,
  GRADES,
  OPERATIONS,
  MODES,
  STORAGE_KEY,
} from "../../utils/math-constants";
import {
  getLevelConfig,
  getLevelForGrade,
  buildTop10ByScore,
  saveScoreEntry,
} from "../../utils/math-storage";
import { generateQuestion } from "../../utils/math-question-generator";
import { sanitizeQuestionForStudentDisplay } from "../../utils/student-question-stem-sanitizer";
import StudentQuestionDisplay from "../../components/learning/StudentQuestionDisplay";
import MathScratchpadSlot from "../../components/math-scratchpad/MathScratchpadSlot";
import { ScratchpadVirtualInputProvider } from "../../components/math-scratchpad/scratchpad-virtual-input";
import { isMathScratchpadV1Enabled } from "../../utils/math-scratchpad/feature-flag";
import { getScratchpadType } from "../../utils/math-scratchpad/scratchpad-registry";
import { extractScratchpadOperands } from "../../utils/math-scratchpad/extract-operands";
import VirtualAnswerKeyboard from "../../components/learning/VirtualAnswerKeyboard.jsx";
import { resolveVirtualAnswerKeyboard } from "../../lib/learning/virtual-answer-keyboard-policy.js";
import { useTouchPrimaryDevice } from "../../hooks/useTouchPrimaryDevice.js";
import { resolveStudentQuestionDisplayParts } from "../../utils/student-question-display";
import StudentNumericAnswerField, {
  useMobileEmbeddedNumericSubmit,
} from "../../components/learning/StudentNumericAnswerField";
import {
  loadMathIntel,
  persistMathIntel,
  recordMathAnswerIntel,
  getMathOperationInsights,
  mathQuestionFingerprint,
  newMathMistakeId,
  buildMathQuestionSnapshot,
} from "../../utils/math-learning-intel";
import { SessionAntiRepeatBuffer } from "../../utils/question-session-anti-repeat";
import {
  getSolutionSteps,
  getErrorExplanation,
  getAdditionStepsColumn,
  buildStepExplanation,
} from "../../utils/math-explanations";
import { trackOperationTime, buildMathReportStorageKey } from "../../utils/math-time-tracking";
import { useMobileViewport } from "../../hooks/useMobileViewport";
import {
  LEARNING_MASTER_MOBILE_WRAP_CLASS,
  LEARNING_MASTER_MOBILE_CONTENT_SCROLL_CLASS,
  LEARNING_MASTER_MOBILE_SUBTITLE_ROW_CLASS,
  LEARNING_MASTER_MOBILE_HUD_CLASS,
  LEARNING_MASTER_MOBILE_MODE_ROW_CLASS,
  LEARNING_MASTER_MOBILE_GAME_CLASS,
  LEARNING_MASTER_MOBILE_ANSWER_SCALE_CLASS,
  LEARNING_MASTER_MOBILE_BOOK_TILE_BOTTOM,
  LEARNING_MASTER_MOBILE_NUMERIC_INPUT,
  LEARNING_MASTER_MOBILE_VK_KEY,
  LEARNING_MASTER_MOBILE_VK_SUBMIT_GREEN,
  LEARNING_MASTER_MOBILE_VK_SUBMIT_BLUE,
  LEARNING_MASTER_MOBILE_VK_CLEAR,
  LEARNING_MASTER_MOBILE_VK_SPACER,
  LEARNING_MASTER_MOBILE_VK_ROW_GAP,
  LEARNING_MASTER_MOBILE_VK_KEYBOARD_SHELL,
  applyLearningMasterMobileShellLayoutVars,
  buildLearningMasterMobileNumericFieldProps,
} from "../../utils/learning-master-mobile.client.js";

import {
  buildLearningMasterQuestionPressureLayout,
  LEARNING_MASTER_ANSWER_SURFACE_CLASS,
} from "../../utils/learning-master-question-pressure.client.js";
import { STEP_BY_STEP_AUTO_PLAY_DELAY_MS } from "../../utils/learning-step-by-step-config";
import TrackingDebugPanel from "../../components/TrackingDebugPanel";
import LearningPlannerRecommendationBlock from "../../components/LearningPlannerRecommendationBlock";
import { reportModeFromGameState } from "../../utils/report-track-meta";
import {
  buildVerticalOperation,
  convertMissingNumberEquation,
  buildAdditionOrSubtractionAnimation,
  buildAnimationForOperation,
} from "../../utils/math-animations";
import { learningMixedHebrewMathStyle } from "../../utils/learning-mixed-hebrew-math";
import {
  LIVE_PRACTICE_CORRECT_HE,
  LIVE_PRACTICE_GAME_OVER_HE,
  LIVE_PRACTICE_WRONG_HE,
  formatLearningWrongFeedbackHe,
} from "../../utils/learning-live-feedback-he";
import { renderLearningMixedHebrewMathText } from "../../components/learning/LearningMixedHebrewMathText";
import {
  MathFractionExpression,
  renderMaybeStackedFractionText,
  renderMaybeStackedFractionOrMixed,
} from "../../components/learning/MathFractionExpression";
import { hasStackedFractionToken } from "../../utils/math-fraction-expression-parse";
import {
  MATH_FRACTIONS_QUESTION_STEM_SIZE_CLASS,
  shouldHideFractionsMcqTrailingBlank,
  stripRedundantTrailingAnswerBlank,
} from "../../utils/math-fraction-question-display";
import MathLtrIsland from "../../components/learning/MathLtrIsland";
import StepExerciseViewRouter from "../../components/learning/StepExerciseViewRouter";
import StepWordProblemExerciseView from "../../components/learning/StepWordProblemExerciseView";
import {
  EXERCISE_VIEWS,
  shouldShowStandaloneExerciseView,
} from "../../utils/learning-step-exercise-types";
import { finalizeAnimationSteps } from "../../utils/learning-step-animation-pipeline";
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
import LearningMasterMobileNavTitle from "../../components/learning/LearningMasterMobileNavTitle.jsx";
import LearningMasterDesktopHeader from "../../components/learning/LearningMasterDesktopHeader.jsx";
import LearningMasterAdSlot from "../../components/learning/LearningMasterAdSlot.jsx";
import { StepExerciseUiProvider } from "../../contexts/StepExerciseUiContext.jsx";
import { formatMathHudNumber } from "../../utils/math-master-hud-number.client.js";
import {
  loadDailyStreak,
  updateDailyStreak,
  getStreakReward,
} from "../../utils/daily-streak";
import { useGameAudio } from "../../hooks/useGameAudio";
import { startLearningMasterSessionAudio } from "../../lib/game-audio/learning-master-session-audio.js";
import { getQuestionFontStyle, getVerbalInstructionStyle } from "../../utils/learning-question-font";
import { resolveLearningMcqChoiceClassName } from "../../utils/learning-mcq-choice-styles.client";
import {
  buildHebrewApprovedVerbalMcqGridClassName,
} from "../../utils/hebrew-approved-verbal-master-contract.client.js";
import {
  buildApprovedVerbalStemLayout,
  getHebrewApprovedSingleVerbalQuestionStyle,
  isApprovedVerbalTextStem,
} from "../../utils/math-geometry-verbal-visual-adapter.client.js";
import {
  compareAnswers,
  compareMathLearnerAnswer,
} from "../../utils/answer-compare";
import {
  embedComparisonSignInRtlProse,
  finalizeComparisonSignMcq,
  isComparisonSignToken,
  resolveCanonicalComparisonSignAnswer,
} from "../../utils/comparison-sign-mcq";
import {
  computeMcqIndicesForQuestion,
  distractorFamilyFromOptionCell,
  extractDiagnosticMetadataFromQuestion,
  mergeDiagnosticIntoMistakeEntry,
} from "../../utils/diagnostic-mistake-metadata";
import {
  startLearningSession,
  saveLearningAnswer,
  finishLearningSession,
} from "../../lib/learning-client/learningActivityClient";
import { buildQuestionEngineMetadataFromQuestion } from "../../lib/learning/question-engine-metadata.js";
import { resolveMathSessionTopic } from "../../lib/learning/session-topic-helpers.js";
import { computeFreePracticeTiming } from "../../lib/learning/timing-policy.js";
import { useLearningVisibilityClock } from "../../hooks/useLearningVisibilityClock";
import {
  beginMasterQuestionLedger,
  finalizeMasterQuestionLedger,
  isFairnessVisibilityLedgerActive,
  resolveMasterSessionDurationSeconds,
} from "../../utils/learning-time-credit";
import { getMathG1BookHref } from "../../lib/learning-book/resolve-math-g1-book-page";
import { getMathG2BookHref } from "../../lib/learning-book/resolve-math-g2-book-page";
import { getMathG3BookHref } from "../../lib/learning-book/resolve-math-g3-book-page";
import { getMathG4BookHref } from "../../lib/learning-book/resolve-math-g4-book-page";
import { getMathG5BookHref } from "../../lib/learning-book/resolve-math-g5-book-page";
import { getMathG6BookHref } from "../../lib/learning-book/resolve-math-g6-book-page";
import { getLearningBookIndexHref } from "../../lib/learning-book/learning-book-catalog-meta";
import LearningBookIndexTile from "../../components/learning-book/LearningBookIndexTile";
import { MATH_G1_BOOK_META } from "../../lib/learning-book/math-g1-registry";
import { MATH_G2_BOOK_META } from "../../lib/learning-book/math-g2-registry";
import {
  consumeMathG1BookLearningSnapshot,
  consumeMathG1BookPracticePreset,
  isMathG1BookPracticeEntry,
  saveMathG1BookLearningSnapshot,
  withMathG1BookLearningReturn,
} from "../../lib/learning-book/math-g1-book-nav";
import {
  consumeMathG2BookLearningSnapshot,
  consumeMathG2BookPracticePreset,
  isMathG2BookPracticeEntry,
  saveMathG2BookLearningSnapshot,
  withMathG2BookLearningReturn,
} from "../../lib/learning-book/math-g2-book-nav";
import {
  consumeMathG3BookLearningSnapshot,
  consumeMathG3BookPracticePreset,
  isMathG3BookPracticeEntry,
  saveMathG3BookLearningSnapshot,
  withMathG3BookLearningReturn,
} from "../../lib/learning-book/math-g3-book-nav";
import {
  consumeMathG4BookLearningSnapshot,
  consumeMathG4BookPracticePreset,
  isMathG4BookPracticeEntry,
  saveMathG4BookLearningSnapshot,
  withMathG4BookLearningReturn,
} from "../../lib/learning-book/math-g4-book-nav";
import {
  consumeMathG5BookLearningSnapshot,
  consumeMathG5BookPracticePreset,
  isMathG5BookPracticeEntry,
  saveMathG5BookLearningSnapshot,
  withMathG5BookLearningReturn,
} from "../../lib/learning-book/math-g5-book-nav";
import {
  consumeMathG6BookLearningSnapshot,
  consumeMathG6BookPracticePreset,
  isMathG6BookPracticeEntry,
  saveMathG6BookLearningSnapshot,
  withMathG6BookLearningReturn,
} from "../../lib/learning-book/math-g6-book-nav";
import {
  buildBookContextClientMetaExtras,
  tryConsumeBookContextOnPracticeEntry,
} from "../../lib/learning-book/book-context-master-helper";
import { scheduleAdaptivePlannerRecommendation } from "../../lib/learning-client/scheduleAdaptivePlannerRecommendation";
import { buildPlannerRecommendationViewModel } from "../../lib/learning-client/adaptive-planner-recommendation-view-model";
import {
  buildRecommendedPracticeFromViewModel,
  mapPlannerTargetDifficultyToTriLevel,
  mergePlannerSessionClientMeta,
} from "../../lib/learning-client/adaptive-planner-recommended-practice";
import {
  applyStudentAdaptiveAnswer,
  buildStudentAnswerLevelFields,
  buildStudentSessionStartLevelFields,
  createStudentAdaptiveState,
  isStudentAdaptiveActive,
  mapPlannerTargetToDisplayLevel,
  mapPlannerTargetToSourceDifficulty,
  migratePracticeResumeSnapshot,
  resolveSourceDifficultyForPractice,
  studentDisplayLevelKeys,
  studentDisplayLevelLabel,
  tagQuestionWithLevelFields,
} from "../../lib/learning-client/student-display-level-practice.js";
import { StudentDisplayLevelSelect } from "../../components/learning/StudentDisplayLevelSelect.js";
import {
  gradeKeyToNumber,
} from "../../lib/learning-student-defaults";
import { isStudentIdentityDiagnosticsEnabled } from "../../lib/dev-student-identity-client";
import { useSubjectSessionDefaults } from "../../hooks/useSubjectSessionDefaults";
import MasterSubjectAccessScreen from "../../components/learning/MasterSubjectAccessScreen.jsx";
import { notifyLearningSessionSaveFailure } from "../../lib/learning-client/learning-session-save-feedback.client.js";
import {
  STUDENT_GRADE_REQUIRED_MESSAGE_HE,
  STUDENT_SUBJECT_LOADING_MESSAGE_HE,
} from "../../lib/learning-client/student-subject-practice-gate.he.js";
import { useEscapeCloseModals } from "../../hooks/useEscapeCloseModals.js";
import { normalizeMistakeEvent } from "../../utils/mistake-event.js";
import { inferNormalizedTags } from "../../utils/fast-diagnostic-engine/infer-tags.js";
import {
  buildPendingProbeFromMistake,
  attachProbeMetaToQuestion,
  applyProbeOutcome,
  buildDiagnosticProbeClientMeta,
  clearActiveDiagnosticState,
  decrementPendingProbeExpiry,
} from "../../utils/active-diagnostic-runtime/index.js";
import { mathWrongActivatesProbe } from "../../utils/math-active-probe.js";
import {
  patchLearningDiagnosticDebug,
  installLearningDiagnosticDebugOnce,
} from "../../utils/learning-diagnostic-debug.js";
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
import {
  MATH_CORRECT_ANSWER_ADVANCE_MS,
  MATH_WRONG_ANSWER_FEEDBACK_MS,
  shouldPauseWrongAnswerAutoAdvance,
} from "../../utils/math-wrong-answer-feedback-timing";
import { getMathPrimaryAnswerButtonState } from "../../utils/math-answer-primary-button";
import { getMathReportBucketDisplayName } from "../../utils/math-report-generator";
import { listVisibleTopicsForSelfPractice } from "../../lib/launch-readiness/topic-launch-policy.js";

/** Passed into compareMathLearnerAnswer — tolerance is not defaulted inside answer-compare. */
const MATH_NUMERIC_TOLERANCE = 0.01;

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

const REFERENCE_CATEGORIES = {
  operations: { label: "פעולות מתמטיקה", icon: "➕" },
  formulas: { label: "נוסחאות", icon: "📐" },
  terms: { label: "מונחים", icon: "📚" },
};

const REFERENCE_CATEGORY_KEYS = Object.keys(REFERENCE_CATEGORIES);

function normalizeMistakeQueue(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m) =>
        m.snapshot &&
        Array.isArray(m.snapshot.answers) &&
        m.snapshot.answers.length > 0 &&
        m.id
    )
    .map((m) => ({ ...m }))
    .sort(() => Math.random() - 0.5);
}

const MATH_BOOK_GRADES = new Set(["g1", "g2", "g3", "g4", "g5", "g6"]);

function getMathBookHref(gradeKey, ctx) {
  switch (gradeKey) {
    case "g1":
      return getMathG1BookHref(ctx);
    case "g2":
      return getMathG2BookHref(ctx);
    case "g3":
      return getMathG3BookHref(ctx);
    case "g4":
      return getMathG4BookHref(ctx);
    case "g5":
      return getMathG5BookHref(ctx);
    case "g6":
      return getMathG6BookHref(ctx);
    default:
      return null;
  }
}

function saveMathBookLearningSnapshot(gradeKey, snapshot) {
  switch (gradeKey) {
    case "g6":
      saveMathG6BookLearningSnapshot(snapshot);
      return;
    case "g5":
      saveMathG5BookLearningSnapshot(snapshot);
      return;
    case "g4":
      saveMathG4BookLearningSnapshot(snapshot);
      return;
    case "g3":
      saveMathG3BookLearningSnapshot(snapshot);
      return;
    case "g2":
      saveMathG2BookLearningSnapshot(snapshot);
      return;
    default:
      saveMathG1BookLearningSnapshot(snapshot);
  }
}

function withMathBookLearningReturn(gradeKey, href) {
  switch (gradeKey) {
    case "g6":
      return withMathG6BookLearningReturn(href);
    case "g5":
      return withMathG5BookLearningReturn(href);
    case "g4":
      return withMathG4BookLearningReturn(href);
    case "g3":
      return withMathG3BookLearningReturn(href);
    case "g2":
      return withMathG2BookLearningReturn(href);
    default:
      return withMathG1BookLearningReturn(href);
  }
}

function consumeMathBookLearningSnapshot() {
  return (
    consumeMathG6BookLearningSnapshot() ||
    consumeMathG5BookLearningSnapshot() ||
    consumeMathG4BookLearningSnapshot() ||
    consumeMathG3BookLearningSnapshot() ||
    consumeMathG2BookLearningSnapshot() ||
    consumeMathG1BookLearningSnapshot()
  );
}

function isMathBookPracticeEntry(query) {
  return (
    isMathG6BookPracticeEntry(query) ||
    isMathG5BookPracticeEntry(query) ||
    isMathG4BookPracticeEntry(query) ||
    isMathG3BookPracticeEntry(query) ||
    isMathG2BookPracticeEntry(query) ||
    isMathG1BookPracticeEntry(query)
  );
}

function consumeMathBookPracticePreset() {
  return (
    consumeMathG6BookPracticePreset() ||
    consumeMathG5BookPracticePreset() ||
    consumeMathG4BookPracticePreset() ||
    consumeMathG3BookPracticePreset() ||
    consumeMathG2BookPracticePreset() ||
    consumeMathG1BookPracticePreset()
  );
}

function loadLeaderboardTop10ByDisplayLevel(saved, displayLevel) {
  const sourceKeys = displayLevel === "advanced" ? ["hard"] : ["easy", "medium"];
  const merged = sourceKeys.flatMap((sk) => buildTop10ByScore(saved, sk));
  merged.sort((a, b) => (b.score || 0) - (a.score || 0));
  return merged.slice(0, 10);
}

/** Horizontal display only — mobile slightly smaller; desktop capped lower. */
function getMathHorizontalEquationFontStyle(opts = {}, isMobileViewport = true) {
  if (isMobileViewport) {
    return getQuestionFontStyle({
      mobileMinPx: 28,
      mobileMaxPx: 42,
      vwScale: 0.92,
      ...opts,
    });
  }
  return getQuestionFontStyle({
    mobileMinPx: 22,
    mobileMaxPx: 32,
    vwScale: 0.38,
    maxVw: 4.2,
    ...opts,
  });
}

function getMathHorizontalQuestionFontStyle(opts = {}, isMobileViewport = true) {
  if (opts.kind === "label") {
    return getQuestionFontStyle(opts);
  }
  return getMathHorizontalEquationFontStyle(opts, isMobileViewport);
}

/** Same reading-tone body color as geometry verbal stems (e.g. „ריבוע עם צלע 8”). */
const MATH_NUMERIC_QUESTION_BODY_COLOR = "#163A5F";

function boostHorizontalQuestionBodyClass(className, isMobileViewport = true) {
  if (isMobileViewport) {
    return String(className || "")
      .replace(/\btext-4xl\b/g, "text-5xl")
      .replace(/\btext-3xl\b/g, "text-4xl")
      .replace(/\btext-2xl\b/g, "text-3xl")
      .replace(/\btext-xl\b/g, "text-2xl")
      .replace(/\btext-lg\b/g, "text-xl");
  }
  return String(className || "")
    .replace(/\btext-4xl\b/g, "text-3xl")
    .replace(/\btext-3xl\b/g, "text-2xl")
    .replace(/\btext-2xl\b/g, "text-xl")
    .replace(/\btext-xl\b/g, "text-lg")
    .replace(/\btext-lg\b/g, "text-base");
}

export default function MathMaster() {
  useIOSViewportFix();
  const { MB, ui, shellClass, shellBgStyle } = useLearningMasterUi();
  const learningModalOverlay = ui.learningModalOverlay;
  const learningModalPanel = ui.learningModalPanel;
  const learningModalHeader = ui.learningModalHeader;
  const learningModalCloseBtn = ui.learningModalCloseBtn;
  const learningModalTitle = ui.learningModalTitle;
  const learningModalFooter = ui.learningModalFooter;
  const learningStepNavRow = ui.learningStepNavRow;
  const learningStepNavBtn = ui.learningStepNavBtn;
  const learningStepNavBtnPlay = ui.learningStepNavBtnPlay;
  const learningStepCounter = ui.learningStepCounter;
  const learningQuestionBox = ui.learningQuestionBox;
  const learningQuestionText = ui.learningQuestionText;
  const learningExplTitle = ui.learningExplTitle;
  const learningExplBody = ui.learningExplBody;
  const learningStepSection = ui.learningStepSection;
  const learningModalScrollBody = ui.learningModalScrollBody;
  const stepExerciseUi = ui.stepExerciseUi;
  const learningPrimaryCloseBtn = ui.learningPrimaryCloseBtn;
  const learningExplainOpenBtn = ui.learningExplainOpenBtn;
  const mobileEmbeddedNumericSubmit = useMobileEmbeddedNumericSubmit("math");
  const isTouchDevice = useTouchPrimaryDevice();
  const isMobileViewport = useMobileViewport();
  const mathVkPolicy = resolveVirtualAnswerKeyboard({
    subject: "math",
    hasTextInput: true,
    isTouch: isTouchDevice,
  });
  const router = useRouter();
  const wrapRef = useRef(null);
  const headerRef = useRef(null);
  const desktopHeaderRef = useRef(null);
  const gameRef = useRef(null);
  const answerAreaRef = useRef(null);
  const scratchpadOverlayTopRef = useRef(null);
  const desktopScratchpadAnchorRef = useRef(null);
  const mobileScratchpadAnchorRef = useRef(null);
  const controlsRef = useRef(null);
  const operationSelectRef = useRef(null);
  const sessionStartRef = useRef(null);
  const solvedCountRef = useRef(0);
  const sessionSecondsRef = useRef(0);
  const questionTimeLedgerRef = useRef(null);
  const learningSessionIdRef = useRef(null);
  const learningSessionStartPromiseRef = useRef(null);
  const plannerResponseSeqRef = useRef(0);
  const plannerNextSessionClientMetaRef = useRef(null);
  const mathPendingDiagnosticProbeRef = useRef(null);
  const mathHypothesisLedgerRef = useRef(null);
  const bookPracticePresetRef = useRef(null);
  const practiceForceKindRef = useRef(null);
  const learningProfileStudentIdRef = useRef(null);
  const learningProfileHydratedRef = useRef(false);
  const [serverAccountSubjectAccuracyPct, setServerAccountSubjectAccuracyPct] = useState(null);
  const [learningProfileHydrationTick, setLearningProfileHydrationTick] = useState(0);
  /** Leaderboard / best-score blob (mirrors legacy STORAGE_KEY JSON). */
  const scoresStoreRef = useRef({});

  const [mounted, setMounted] = useState(false);

  const [mode, setMode] = useState("practice");

  const [displayLevel, setDisplayLevel] = useState("regular");
  const [level, setLevel] = useState("easy");
  const displayLevelRef = useRef("regular");
  const regularAdaptiveRef = useRef(createStudentAdaptiveState("math"));
  const syncPracticeSourceDifficulty = useCallback((nextDisplayLevel = displayLevelRef.current) => {
    const sd = resolveSourceDifficultyForPractice("math", nextDisplayLevel, regularAdaptiveRef.current);
    setLevel(sd);
  }, []);
  const handleDisplayLevelChange = useCallback(
    (nextDisplayLevel) => {
      displayLevelRef.current = nextDisplayLevel;
      setDisplayLevel(nextDisplayLevel);
      setGameActive(false);
      syncPracticeSourceDifficulty(nextDisplayLevel);
    },
    [syncPracticeSourceDifficulty]
  );
  const [operation, setOperation] = useState("addition"); // לא mixed כברירת מחדל כדי שה-modal לא יפתח אוטומטית
  const {
    session,
    grade,
    setGrade,
    gradeNumber,
    setGradeNumber,
    gradeReady,
    canPickGrade,
    fullName: sessionFullName,
    coinBalance: sessionCoinBalance,
  } = useSubjectSessionDefaults({ permissionKey: "math" });

  // Policy-filtered topic list for the current grade.
  // Excludes HIDE topics (per launch registry) and always excludes "mixed"
  // (mixed is a child-only pseudo-option handled separately in the UI, not a registry topic).
  const safeGrade = grade || "g1";
  const visibleMathOps = listVisibleTopicsForSelfPractice(
    "math",
    safeGrade,
    GRADES[safeGrade]?.operations ?? []
  );
  const guestTopics = useGuestPlayableTopics("math", visibleMathOps);
  const bookIndexHref = grade ? getLearningBookIndexHref("math", grade) : null;
  const bookTopicHref = useMemo(() => {
    if (!MATH_BOOK_GRADES.has(grade)) return null;
    return getMathBookHref(grade, { grade, operation, kind: null });
  }, [grade, operation]);
  const [gameActive, setGameActive] = useState(false);
  const [adaptivePlannerRecommendationView, setAdaptivePlannerRecommendationView] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const questionBookHref = useMemo(() => {
    if (mode !== "learning" || !currentQuestion) return null;
    if (!MATH_BOOK_GRADES.has(grade)) return null;
    const params = currentQuestion.params || {};
    const ctx = {
      grade,
      operation: currentQuestion.operation || operation,
      kind: params.kind ?? null,
    };
    return getMathBookHref(grade, ctx);
  }, [grade, mode, currentQuestion, operation]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [textAnswer, setTextAnswer] = useState(""); // תשובה בקלט טקסט למצבי למידה ותרגול
  const [feedback, setFeedback] = useState(null);
  const [bestScore, setBestScore] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  // NEW: lives (for Challenge mode)
  const [lives, setLives] = useState(3);

  // Progress stats (אפשר להרחיב בעתיד)
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [avgTime, setAvgTime] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(null);

  useLearningVisibilityClock({
    enabled: gameActive && isFairnessVisibilityLedgerActive(mode),
    ledger: questionTimeLedgerRef.current,
  });

  // מניעת שאלות חוזרות
  const [recentQuestions, setRecentQuestions] = useState(new Set());

  /** תצוגת תרגיל: מאוזן (ברירת מחדל) / מאונך — רק לסשן הפעיל; לא נשמר בשרת או ב-localStorage קבוע. מתאפס ב startGame / stopGame / hardResetGame. */
  const [isVerticalDisplay, setIsVerticalDisplay] = useState(false);

  const openBookFromLearning = useCallback(
    (href) => {
      if (!href) return;
      const snapshot = {
        gameActive: true,
        mode,
        grade,
        gradeNumber,
        level,
        operation,
        currentQuestion,
        score,
        streak,
        correct,
        wrong,
        selectedAnswer,
        textAnswer,
        feedback,
        isVerticalDisplay,
        questionStartTime,
      };
      if (!MATH_BOOK_GRADES.has(grade)) return;
      saveMathBookLearningSnapshot(grade, snapshot);
      router.push(withMathBookLearningReturn(grade, href));
    },
    [
      mode,
      grade,
      gradeNumber,
      level,
      operation,
      currentQuestion,
      score,
      streak,
      correct,
      wrong,
      selectedAnswer,
      textAnswer,
      feedback,
      isVerticalDisplay,
      questionStartTime,
      router,
    ]
  );

  // מערכת כוכבים ותגים
  const [stars, setStars] = useState(0);
  const [badges, setBadges] = useState([]);
  const [showBadge, setShowBadge] = useState(null);

  // מערכת רמות עם XP
  const [playerLevel, setPlayerLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);

  // אנימציות ומשוב חזותי
  const [showCorrectAnimation, setShowCorrectAnimation] = useState(false);
  const [showWrongAnimation, setShowWrongAnimation] = useState(false);
  const [celebrationEmoji, setCelebrationEmoji] = useState("🎉");
  const [showPlayerProfile, setShowPlayerProfile] = useState(false);
  const [playerAvatar, setPlayerAvatar] = useState("👤"); // אווטר ברירת מחדל
  const [playerAvatarImage, setPlayerAvatarImage] = useState(null); // תמונת אווטר מותאמת אישית
  const [playerAvatarBackground, setPlayerAvatarBackground] = useState(DEFAULT_PROFILE_BACKGROUND_KEY);
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

  // מערכת התקדמות אישית
  const progressLoadedRef = useRef(false); // עוקב אחרי טעינת progress
  const progressStringRef = useRef(""); // עוקב אחרי הגרסה האחרונה שנשמרה
  const [progress, setProgress] = useState({
    addition: { total: 0, correct: 0 },
    subtraction: { total: 0, correct: 0 },
    multiplication: { total: 0, correct: 0 },
    division: { total: 0, correct: 0 },
    fractions: { total: 0, correct: 0 },
    percentages: { total: 0, correct: 0 },
    sequences: { total: 0, correct: 0 },
    decimals: { total: 0, correct: 0 },
    rounding: { total: 0, correct: 0 },
    equations: { total: 0, correct: 0 },
    compare: { total: 0, correct: 0 },
    number_sense: { total: 0, correct: 0 },
    factors_multiples: { total: 0, correct: 0 },
    word_problems: { total: 0, correct: 0 },
  });

  // תחרויות יומיות
  // אתגר יומי - שאלות יומיות
  const getTodayKey = () => {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  };

  const [dailyChallenge, setDailyChallenge] = useState(() => {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    return {
      date: todayKey,
      questions: 0,
      correct: 0,
      bestScore: 0,
      completed: false,
    };
  });

  const [weeklyChallenge, setWeeklyChallenge] = useState(() => {
    const today = new Date();
    return {
      week: `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`,
      target: 100,
      current: 0,
      completed: false,
    };
  });

  const [showDailyChallenge, setShowDailyChallenge] = useState(false);

  // Daily Streak
  const [dailyStreak, setDailyStreak] = useState({ streak: 0, lastDate: null });
  const [showStreakReward, setShowStreakReward] = useState(null);
  
  // Sound system
  const audio = useGameAudio();
  
  // תרגול ממוקד - שמירת שגיאות ותרגול מדורג
  const [mistakes, setMistakes] = useState([]);
  const [learningIntel, setLearningIntel] = useState(() => ({
    opStats: {},
    recentTail: [],
  }));
  const correctRef = useRef(0);
  /** Parent Report V2: last-answer meta consumed when logging time for the previous question */
  const pendingTimeTrackMetaRef = useRef(null);
  /** Real operation bucket for the question on screen (avoids stale currentQuestion in async / transitions) */
  const mathTrackingOperationKeyRef = useRef(null);
  const mistakesRef = useRef([]);
  const remainingMistakesRef = useRef([]);
  const focusedPracticeModeRef = useRef("normal");
  const [focusedPracticeMode, setFocusedPracticeMode] = useState("normal"); // "normal", "mistakes", "graded"
  const [remainingMistakes, setRemainingMistakes] = useState([]); // שגיאות שנותרו לתיקון
  const [currentMistakeIndex, setCurrentMistakeIndex] = useState(0); // אינדקס השגיאה הנוכחית
  const [showPracticeOptions, setShowPracticeOptions] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [referenceCategory, setReferenceCategory] = useState(REFERENCE_CATEGORY_KEYS[0]);

  // הסבר מפורט לשאלה
  const [showSolution, setShowSolution] = useState(false);
  const [showPreviousSolution, setShowPreviousSolution] = useState(false);
  // Phase 2: tracks whether any explanation/hint/step-by-step was viewed for the current question
  const stepByStepViewedRef = useRef(false);
  const bookContextRef = useRef(null);
  const bookContextConsumedRef = useRef(false);
  const [previousExplanationQuestion, setPreviousExplanationQuestion] = useState(null);
  const [animationStep, setAnimationStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [scratchpadCloseSignal, setScratchpadCloseSignal] = useState(0);
  const [scratchpadOpen, setScratchpadOpen] = useState(false);
  const [activeScratchpadCell, setActiveScratchpadCell] = useState(null);
  const sharedScratchpadKeyboard =
    scratchpadOpen && mathVkPolicy.enabled && isTouchDevice;

  const handleScratchpadOpenChange = useCallback((isOpen) => {
    setScratchpadOpen(isOpen);
    if (!isOpen) setActiveScratchpadCell(null);
  }, []);
  
  // Ref לשמירת timeouts לניקוי - מונע תקיעות
  const animationTimeoutsRef = useRef([]);
  const wrongAnswerAdvanceTimerRef = useRef(null);
  const wrongAnswerAdvanceCallbackRef = useRef(null);
  const wrongAnswerPendingRef = useRef(false);
  const showSolutionRef = useRef(false);
  const showPreviousSolutionRef = useRef(false);
  
  // בדיקה אם התרגיל יכול להיות מאונך
  const canDisplayVertically = useMemo(() => {
    if (!currentQuestion) return false;
    const op = currentQuestion.operation;
    const params = currentQuestion.params || {};
    
    // בדיקה אם יש לנו את הנתונים הדרושים לתצוגה מאונכת
    if (op === "addition" || op === "subtraction") {
      return typeof currentQuestion.a === "number" && typeof currentQuestion.b === "number";
    }
    if (op === "multiplication") {
      return typeof currentQuestion.a === "number" && typeof currentQuestion.b === "number";
    }
    if (op === "division") {
      return (params.dividend && params.divisor) || (typeof currentQuestion.a === "number" && typeof currentQuestion.b === "number");
    }
    if (op === "decimals") {
      return params.a && params.b;
    }
    return false;
  }, [currentQuestion]);

  // פונקציה שבונה את התרגיל המאונך
  const getVerticalExercise = () => {
    if (!currentQuestion || !canDisplayVertically) return null;
    
    const op = currentQuestion.operation;
    const params = currentQuestion.params || {};
    
    if (op === "addition") {
      const a = currentQuestion.a;
      const b = currentQuestion.b;
      return buildVerticalOperation(a, b, "+");
    }
    if (op === "subtraction") {
      const a = currentQuestion.a;
      const b = currentQuestion.b;
      return buildVerticalOperation(a, b, "-");
    }
    if (op === "multiplication") {
      const a = currentQuestion.a;
      const b = currentQuestion.b;
      return buildVerticalOperation(a, b, "×");
    }
    if (op === "division" || op === "division_with_remainder") {
      const dividend = params.dividend || currentQuestion.a;
      const divisor = params.divisor || currentQuestion.b;
      // בחילוק ארוך: המחלק משמאל, המחולק מימין - אז מעבירים הפוך
      return buildVerticalOperation(divisor, dividend, "÷");
    }
    if (op === "decimals") {
      const a = params.a;
      const b = params.b;
      const kind = params.kind;
      const places = params.places || 2;
      
      // רק חיבור וחיסור יכולים להיות מאונכים
      // נשמור על הפורמט העשרוני עם toFixed
      if (kind === "dec_add") {
        return buildVerticalOperation(a.toFixed(places), b.toFixed(places), "+");
      } else if (kind === "dec_sub") {
        return buildVerticalOperation(a.toFixed(places), b.toFixed(places), "-");
      }
      
      return null;
    }
    
    return null;
  };
  
  const isShowingAnySolution = showSolution || showPreviousSolution;
  const explanationQuestion =
    showPreviousSolution && previousExplanationQuestion
      ? previousExplanationQuestion
      : currentQuestion;

  // Memoize explanation to avoid recalculating on every render
  const stepExplanation = useMemo(
    () =>
      isShowingAnySolution && explanationQuestion
        ? buildStepExplanation(finalizeComparisonSignMcq(explanationQuestion))
        : null,
    [isShowingAnySolution, explanationQuestion]
  );

  // בניית צעדי אנימציה
  const animationSteps = useMemo(() => {
    if (!isShowingAnySolution || !explanationQuestion) return null;

    const explanationQuestionResolved = finalizeComparisonSignMcq(explanationQuestion);

    const p = explanationQuestionResolved.params || {};
    const op = explanationQuestionResolved.operation;
    let effectiveOp = op;
    let top = p.a ?? explanationQuestionResolved.a;
    let bottom = p.b ?? explanationQuestionResolved.b;
    
    const answer = explanationQuestionResolved.correctAnswer !== undefined
      ? explanationQuestionResolved.correctAnswer
      : explanationQuestionResolved.answer;
    
    // טיפול כללי בתרגילי השלמה
    const missingConversion = convertMissingNumberEquation(op, p.kind, p);
    if (missingConversion) {
      effectiveOp = missingConversion.effectiveOp;
      top = missingConversion.top;
      bottom = missingConversion.bottom;
    }
    // טיפול במספר שלילי בחיבור (רק אם זה לא תרגיל השלמה)
    else if (op === "addition" && typeof bottom === "number" && bottom < 0) {
      effectiveOp = "subtraction";
      bottom = Math.abs(bottom);
    }
    
    // חיבור וחיסור - אנימציה מיוחדת עם תרגיל בעמודה (קוד מקורי - לא לשנות!)
    if ((effectiveOp === "addition" || effectiveOp === "subtraction") && 
        typeof top === "number" && typeof bottom === "number") {
      return finalizeAnimationSteps(
        buildAdditionOrSubtractionAnimation(top, bottom, answer, effectiveOp),
        explanationQuestionResolved,
        effectiveOp
      );
    }
    
    // שאר הנושאים - אנימציה כללית (רק אם זה לא חיבור/חיסור)
    const built = buildAnimationForOperation(explanationQuestionResolved, op, grade);
    if (built && Array.isArray(built) && built.length > 0) {
      return finalizeAnimationSteps(built, explanationQuestionResolved, op);
    }

    // Fallback: אם אין אנימציה מובנית לנושא - עדיין נותנים "צעדים" עם ניווט,
    // על בסיס getSolutionSteps (React nodes) כדי שכל הנושאים יעבדו כמו בכפל.
    try {
      const fallbackSteps = getSolutionSteps(
        explanationQuestionResolved,
        explanationQuestionResolved.params?.op || op,
        grade
      );
      if (fallbackSteps && Array.isArray(fallbackSteps) && fallbackSteps.length > 0) {
        return fallbackSteps.map((node, idx) => ({
          id: `fallback-${idx + 1}`,
          title: `שלב ${idx + 1}`,
          content: node,
          text: "",
        }));
      }

      // fallback נוסף אם אין params/אין צעדים מפורטים: לפחות שיהיה תמיד הסבר בסיסי עם ניווט
      const qText = explanationQuestionResolved.exerciseText || explanationQuestionResolved.question || "";
      const ansText =
        explanationQuestionResolved.correctAnswer !== undefined
          ? String(explanationQuestionResolved.correctAnswer)
          : (explanationQuestionResolved.answer !== undefined ? String(explanationQuestionResolved.answer) : "");
      return [
        {
          id: "fallback-basic-1",
          title: "שלב 1: נבין את השאלה",
          content: qText ? renderMaybeStackedFractionOrMixed(qText) : (
            <span>נסתכל על התרגיל.</span>
          ),
          text: "",
        },
        { id: "fallback-basic-2", title: "שלב 2: איך ניגשים?", content: <span>נפתור לפי הכללים של הנושא.</span>, text: "" },
        { id: "fallback-basic-3", title: "שלב 3: התשובה", content: ansText ? <span>התשובה היא: {renderMaybeStackedFractionText(ansText)}</span> : <span>נבדוק את התשובה.</span>, text: "" },
      ];
    } catch {}

    return null;
  }, [isShowingAnySolution, explanationQuestion, grade]);

  // אנימציה אוטומטית - עם ניקוי תקין של timeouts
  useEffect(() => {
    // ניקוי כל ה-timeouts הקודמים
    animationTimeoutsRef.current.forEach(clearTimeout);
    animationTimeoutsRef.current = [];
    
    if (!isShowingAnySolution || !autoPlay || !animationSteps) return;
    if (animationStep >= animationSteps.length - 1) {
      setAutoPlay(false);
      return;
    }

    const id = setTimeout(() => {
      setAnimationStep((s) => {
        const next = s + 1;
        if (next >= animationSteps.length - 1) {
          setAutoPlay(false);
        }
        return next;
      });
    }, STEP_BY_STEP_AUTO_PLAY_DELAY_MS);
    
    animationTimeoutsRef.current.push(id);

    return () => {
      animationTimeoutsRef.current.forEach(clearTimeout);
      animationTimeoutsRef.current = [];
    };
  }, [isShowingAnySolution, autoPlay, animationStep, animationSteps]);

  // איפוס צעד האנימציה כשפותחים את המודל או כשהשאלה משתנה
  useEffect(() => {
    // ניקוי timeouts כשסוגרים את המודל או משנים שאלה
    animationTimeoutsRef.current.forEach(clearTimeout);
    animationTimeoutsRef.current = [];
    
    if (isShowingAnySolution && animationSteps && animationSteps.length > 0) {
      setAnimationStep(0);
      setAutoPlay(false);
    } else if (isShowingAnySolution && (!animationSteps || animationSteps.length === 0)) {
      // אם אין אנימציה, נאפס את הצעד
      setAnimationStep(0);
    } else if (!isShowingAnySolution) {
      // כשסוגרים את המודל - ניקוי מלא
      setAnimationStep(0);
      setAutoPlay(false);
    }
    
    // cleanup כשסוגרים את המודל או משנים שאלה
    return () => {
      animationTimeoutsRef.current.forEach(clearTimeout);
      animationTimeoutsRef.current = [];
    };
  }, [isShowingAnySolution, animationSteps, explanationQuestion]);

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
        const acc = mapSubjectAccountViewFromStudentProfile(profile, "math");
        const sub = profile.row.subjects?.math;
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
          if (sub.intel && typeof sub.intel === "object") {
            setLearningIntel({
              opStats:
                sub.intel.opStats && typeof sub.intel.opStats === "object"
                  ? sub.intel.opStats
                  : {},
              recentTail: Array.isArray(sub.intel.recentTail) ? sub.intel.recentTail : [],
            });
          }
        }
        const ch = profile.row.challenges;
        const { daily: chDaily, weekly: chWeekly } = pickSubjectChallengeBlobs(ch, "math");
        if (chDaily) setDailyChallenge(chDaily);
        if (chWeekly) setWeeklyChallenge(chWeekly);
        setServerAccountSubjectAccuracyPct(accountAccuracyDisplayFromDerived(profile.derived, "math"));
        const st = profile.row.streaks?.math;
        if (st && typeof st === "object") setDailyStreak(st);
        applyLearningProfileAvatarRowToPlayerState(
          profile.row.profile,
          setPlayerAvatar,
          setPlayerAvatarImage,
          setPlayerAvatarBackground,
        );
        learningProfileHydratedRef.current = true;
        try {
          const pr = profile.row.subjects?.math?.progressStore?.progress;
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

  // הסבר לטעות אחרונה
  const [errorExplanation, setErrorExplanation] = useState("");

  // תרגול ממוקד (רק במצב Practice)
  const [practiceFocus, setPracticeFocus] = useState("default"); // default | add_to_20 | times_6_8

  // מצב story questions
  const [useStoryQuestions, setUseStoryQuestions] = useState(false);
  const [storyOnly, setStoryOnly] = useState(false); // שאלות מילוליות בלבד

  const applyBookPracticePreset = useCallback((preset) => {
    if (!preset || preset.mode !== "learning") return;
    const presetGrade = preset.grade;
    if (!MATH_BOOK_GRADES.has(presetGrade)) return;
    if (!GRADES[presetGrade]?.operations?.includes(preset.operation)) return;
    bookPracticePresetRef.current = preset;
    setGrade(presetGrade);
    const presetGradeNumber = gradeKeyToNumber(presetGrade);
    if (presetGradeNumber) {
      setGradeNumber(presetGradeNumber);
    }
    setMode("learning");
    setOperation(preset.operation);
    practiceForceKindRef.current = preset.forceKind || null;
    setUseStoryQuestions(false);
    setStoryOnly(false);
  }, []);

  // בחירת פעולות למיקס
  const [showMixedSelector, setShowMixedSelector] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [mixedOperations, setMixedOperations] = useState({
    addition: true,
    subtraction: true,
    multiplication: false,
    division: false,
    fractions: false,
    percentages: false,
    sequences: false,
    decimals: false,
    rounding: false,
    equations: false,
    compare: false,
    number_sense: false,
    factors_multiples: false,
    word_problems: false,
  });

  const [showMultiplicationTable, setShowMultiplicationTable] = useState(false);
  const [practiceRow, setPracticeRow] = useState(null); // שורה לתרגול ממוקד
  const [practiceCol, setPracticeCol] = useState(null); // עמודה לתרגול ממוקד
  const [practiceMode, setPracticeMode] = useState(false); // מצב תרגול
  const [practiceQuestion, setPracticeQuestion] = useState(null); // שאלת תרגול
  const [practiceAnswer, setPracticeAnswer] = useState(""); // תשובת התרגול
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const [leaderboardLevel, setLeaderboardLevel] = useState("regular");
  const [leaderboardData, setLeaderboardData] = useState([]);
  useEffect(() => {
    if (!grade) return;
    if (!GRADES[grade].operations.includes("word_problems")) {
      setUseStoryQuestions(false);
      setStoryOnly(false);
    }
  }, [grade]);
  const [playerName, setPlayerName] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("mleo_player_name") || "";
      } catch {
        return "";
      }
    }
    return "";
  });

  useEffect(() => {
    displayLevelRef.current = displayLevel;
  }, [displayLevel]);

  useEffect(() => {
    const snap = consumeMathBookLearningSnapshot();
    if (!snap || snap.gameActive !== true) return;
    const migrated = migratePracticeResumeSnapshot(snap, "math");
    setMode(typeof migrated.mode === "string" ? migrated.mode : "practice");
    if (typeof migrated.grade === "string") setGrade(migrated.grade);
    if (typeof migrated.gradeNumber === "number") setGradeNumber(migrated.gradeNumber);
    if (typeof migrated.displayLevel === "string") {
      displayLevelRef.current = migrated.displayLevel;
      setDisplayLevel(migrated.displayLevel);
    }
    if (migrated.adaptiveState) regularAdaptiveRef.current = migrated.adaptiveState;
    if (typeof migrated.level === "string") setLevel(migrated.level);
    if (typeof snap.operation === "string") setOperation(snap.operation);
    setGameActive(true);
    if (snap.currentQuestion) setCurrentQuestion(snap.currentQuestion);
    setScore(typeof snap.score === "number" ? snap.score : 0);
    setStreak(typeof snap.streak === "number" ? snap.streak : 0);
    setCorrect(typeof snap.correct === "number" ? snap.correct : 0);
    setWrong(typeof snap.wrong === "number" ? snap.wrong : 0);
    setSelectedAnswer(snap.selectedAnswer ?? null);
    setTextAnswer(typeof snap.textAnswer === "string" ? snap.textAnswer : "");
    setFeedback(snap.feedback ?? null);
    setIsVerticalDisplay(Boolean(snap.isVerticalDisplay));
    setQuestionStartTime(
      typeof snap.questionStartTime === "number"
        ? snap.questionStartTime
        : Date.now()
    );
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    if (!isMathBookPracticeEntry(router.query)) {
      return;
    }
    const preset = consumeMathBookPracticePreset();
    if (preset) {
      applyBookPracticePreset(preset);
    }
  }, [router.isReady, router.query, applyBookPracticePreset]);

  useEffect(() => {
    tryConsumeBookContextOnPracticeEntry(
      router,
      { subject: "math", grade },
      { bookContextRef, bookContextConsumedRef }
    );
  }, [router.isReady, router.query, grade]);

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
    installLearningDiagnosticDebugOnce();
  }, []);

  useEffect(() => {
    clearActiveDiagnosticState(
      mathPendingDiagnosticProbeRef,
      mathHypothesisLedgerRef
    );
  }, [grade, level, operation, practiceFocus]);

  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedCol, setSelectedCol] = useState(null);
  const [highlightedAnswer, setHighlightedAnswer] = useState(null);
  const [tableMode, setTableMode] = useState("multiplication"); // "multiplication" or "division"
  const [selectedResult, setSelectedResult] = useState(null); // For division mode
  const [selectedDivisor, setSelectedDivisor] = useState(null); // For division mode
  const [selectedCell, setSelectedCell] = useState(null); // {row, col, value}

  // טעינת אווטר מ-localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mleo_player_avatar");
      const savedImage = localStorage.getItem("mleo_player_avatar_image");
      
      if (savedImage) {
        setPlayerAvatarImage(savedImage);
        setPlayerAvatar(null);
      } else if (saved) {
        setPlayerAvatar(saved);
        setPlayerAvatarImage(null);
      }
      setPlayerAvatarBackground(readProfileBackgroundFromLocalStorage());
    }
  }, []);

  // טיפול בהעלאת תמונת אווטר (דחיסה + שמירה בפרופיל ללמידה — סנכרון בין מכשירים)
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
        if (typeof window !== "undefined") {
          localStorage.setItem("mleo_player_avatar_image", dataUrl);
          localStorage.removeItem("mleo_player_avatar");
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
      if (typeof window !== "undefined") {
        localStorage.removeItem("mleo_player_avatar_image");
        localStorage.setItem("mleo_player_avatar", defaultAvatar);
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
    return () => {
      recordSessionProgress({ includePlannerRecommendation: false });
    };
  }, []);

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
      const key = `${level}_${operation}`;
      const { maxScore, maxStreak } = maxBestForPlayerInKey(saved, key, playerName);
      setBestScore(maxScore);
      setBestStreak(maxStreak);
      logAccountTileSync("math", {
        tile: "personalBests",
        level,
        operation,
        playerName: playerName.trim(),
        loadedFromServerScoresStoreKey: key,
        displayedBestScore: maxScore,
        displayedBestStreak: maxStreak,
      });
    } catch {}
  }, [level, operation, playerName, learningProfileHydrationTick]);

  // לוודא שהפעולה שתבחר קיימת לכיתה שנבחרה
  useEffect(() => {
    if (!grade) return;
    // אל תשנה אם ה-modal פתוח
    if (showMixedSelector) return;
    
    const allowed = listVisibleTopicsForSelfPractice("math", grade, GRADES[grade].operations);
    if (!allowed.includes(operation) && operation !== "mixed") {
      // מצא את הנושא הראשון שזמין לפי מדיניות ההשקה
      const firstAllowed = allowed[0] || GRADES[grade].operations.find(op => op !== "mixed") || "addition";
      setOperation(firstAllowed);
    }
  }, [grade]); // רק כשהכיתה משתנה, לא כשהפעולה משתנה

  useEffect(() => {
    if (!guestTopics.loaded || !guestTopics.isGuest || showMixedSelector) return;
    if (operation !== "mixed" && guestTopics.isLocked(operation)) {
      const next = guestTopics.firstPlayable(visibleMathOps, visibleMathOps[0]);
      if (next) setOperation(next);
    }
  }, [guestTopics.loaded, guestTopics.isGuest, grade, operation, showMixedSelector, visibleMathOps]);

  // עדכון mixedOperations לפי הכיתה
  useEffect(() => {
    if (!grade) return;
    const availableOps = listVisibleTopicsForSelfPractice("math", grade, GRADES[grade].operations);
    const newMixedOps = {};
    for (const op of availableOps) {
      newMixedOps[op] = true;
    }
    setMixedOperations(newMixedOps);
  }, [grade]);

  // לא צריך useEffect - ה-modal נפתח ישירות ב-onChange

  // בדיקה אם זה יום חדש לתחרות יומית (אחרי טעינת מצב מהשרת)
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
  }, [dailyChallenge.date]);

  // לא צריך event listener - ה-modal נפתח רק ב-onChange או דרך כפתור ⚙️

  // שמירת progress ל-localStorage בכל עדכון - רק אחרי טעינה ראשונית
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!progressLoadedRef.current) return; // אל תשמור לפני שהטעינה הראשונית הסתיימה
    
    const currentProgressStr = JSON.stringify(progress);
    // אם לא השתנה, אל תשמור - זה מונע לולאה אינסופית
    if (currentProgressStr === progressStringRef.current) return;
    progressStringRef.current = currentProgressStr;
    
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY + "_progress") || "{}");
      saved.progress = progress;
      localStorage.setItem(STORAGE_KEY + "_progress", JSON.stringify(saved));
    } catch {}
  }, [progress]);

  useEffect(() => {
    if (!learningProfileHydratedRef.current) return;
    if (!learningProfileStudentIdRef.current) return;
    const progressStore = { stars, badges, playerLevel, xp, progress };
    debounceStudentLearningProfilePatch("math-master-sync", () => {
      const base = {
        subjects: {
          math: {
            progressStore,
            scoresStore: scoresStoreRef.current,
            mistakes,
            intel: learningIntel,
          },
        },
        challenges: subjectChallengePatch("math", dailyChallenge, weeklyChallenge),
        streaks: { math: dailyStreak },
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
    learningIntel,
    dailyChallenge,
    weeklyChallenge,
    dailyStreak,
    playerAvatar,
    playerAvatarImage,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    persistMathIntel(learningIntel);
  }, [learningIntel]);

  useEffect(() => {
    correctRef.current = correct;
  }, [correct]);

  useEffect(() => {
    focusedPracticeModeRef.current = focusedPracticeMode;
  }, [focusedPracticeMode]);

  useEffect(() => {
    mistakesRef.current = mistakes;
  }, [mistakes]);

  useEffect(() => {
    remainingMistakesRef.current = remainingMistakes;
  }, [remainingMistakes]);

  const mistakesMigratedRef = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined" || mistakesMigratedRef.current) return;
    mistakesMigratedRef.current = true;
    setMistakes((prev) => {
      if (!prev?.length) return prev;
      let changed = false;
      const next = prev
        .map((m, i) => {
          const snap =
            m.snapshot ||
            (m.originalQuestion
              ? buildMathQuestionSnapshot({
                  ...m.originalQuestion,
                  operation:
                    m.originalQuestion.operation || m.operation,
                })
              : null);
          const id = m.id || `legacy_${m.timestamp || m.storedAt || 0}_${i}`;
          if (!m.snapshot && snap) changed = true;
          if (!m.id) changed = true;
          return { ...m, id, snapshot: snap || m.snapshot };
        })
        .filter(
          (m) =>
            m.snapshot &&
            Array.isArray(m.snapshot.answers) &&
            m.snapshot.answers.length > 0
        );
      if (changed || next.length !== prev.length) {
        try {
          localStorage.setItem("mleo_mistakes", JSON.stringify(next));
        } catch {}
        return next;
      }
      return prev;
    });
  }, []);

  const mathInsights = useMemo(
    () => getMathOperationInsights(learningIntel.opStats),
    [learningIntel.opStats]
  );

  // Load leaderboard data when modal opens or level changes
  useEffect(() => {
    if (showLeaderboard && typeof window !== "undefined") {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        const topScores = loadLeaderboardTop10ByDisplayLevel(saved, leaderboardLevel);
        setLeaderboardData(topScores);
      } catch (e) {
        console.error("Error loading leaderboard:", e);
        setLeaderboardData([]);
      }
    }
  }, [showLeaderboard, leaderboardLevel]);

  // Dynamic layout: --game-h from wrap clientHeight (shared learning shell)
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
    if (!mounted) return;
    const syncScratchpadAnchor = () => {
      const isDesktop =
        typeof window !== "undefined" &&
        window.matchMedia("(min-width: 768px)").matches;
      scratchpadOverlayTopRef.current = isDesktop
        ? desktopScratchpadAnchorRef.current
        : mobileScratchpadAnchorRef.current;
    };
    syncScratchpadAnchor();
    window.addEventListener("resize", syncScratchpadAnchor, { passive: true });
    return () => window.removeEventListener("resize", syncScratchpadAnchor);
  }, [mounted, gameActive, grade, level, operation, mode]);

  // Timer countdown (רק במצב Challenge או Speed)
  useEffect(() => {
    if (!gameActive || (mode !== "challenge" && mode !== "speed")) return;
    if (timeLeft == null) return;

    if (timeLeft <= 0) {
      handleTimeUp();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => (prev != null ? prev - 1 : prev));
    }, 1000);

    return () => clearTimeout(timer);
  }, [gameActive, mode, timeLeft]);

  // שמירת ריצה נוכחית אל localStorage + עדכון Best & Leaderboard
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
      const key = `${level}_${operation}`;

      saveScoreEntry(saved, key, {
        playerName: playerName.trim(),
        bestScore: score,
        bestStreak: streak,
        timestamp: Date.now(),
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      scoresStoreRef.current = saved;

      const playerScores = (saved[key] || []).filter(
        (s) => s.playerName === playerName.trim()
      );
      const maxScore = Math.max(
        ...playerScores.map((s) => s.bestScore || 0),
        0
      );
      const maxStreak = Math.max(
        ...playerScores.map((s) => s.bestStreak || 0),
        0
      );
      setBestScore(maxScore);
      setBestStreak(maxStreak);

      if (showLeaderboard) {
        const topScores = loadLeaderboardTop10ByDisplayLevel(saved, leaderboardLevel);
        setLeaderboardData(topScores);
      }

      if (learningProfileStudentIdRef.current && learningProfileHydratedRef.current) {
        const patchBody = { subjects: { math: { scoresStore: saved } } };
        void patchStudentLearningProfile(patchBody)
          .then((json) => {
            const acc = accountAccuracyDisplayFromDerived(json?.derived, "math");
            if (acc != null) setServerAccountSubjectAccuracyPct(acc);
            logAccountTileSync("math", {
              tile: "finishPatch",
              patchSubjects: Object.keys(patchBody.subjects || {}),
              responseAccuracy: acc,
              displayedBestScore: maxScore,
              displayedBestStreak: maxStreak,
            });
          })
          .catch(() => {});
      }
    } catch {}
  }

  function hardResetGame() {
    clearWrongAnswerAdvanceTimer();
    wrongAnswerPendingRef.current = false;
    wrongAnswerAdvanceCallbackRef.current = null;
    accumulateQuestionTime();
    questionTimeLedgerRef.current = null;
    // Stop background music when game ends
    audio.stopMusic();
    setGameActive(false);
    mathTrackingOperationKeyRef.current = null;
    setCurrentQuestion(null);
    setScore(0);
    setStreak(0);
    setCorrect(0);
    setWrong(0);
    setTimeLeft(20);
    setSelectedAnswer(null);
    setTextAnswer("");
    setFeedback(null);
    setLives(3);
    setTotalQuestions(0);
    setAvgTime(0);
    setQuestionStartTime(null);
    setShowPreviousSolution(false);
    setPreviousExplanationQuestion(null);
    setIsVerticalDisplay(false);
    clearActiveDiagnosticState(
      mathPendingDiagnosticProbeRef,
      mathHypothesisLedgerRef
    );
  }

  useEffect(() => {
    showSolutionRef.current = showSolution;
  }, [showSolution]);

  useEffect(() => {
    showPreviousSolutionRef.current = showPreviousSolution;
  }, [showPreviousSolution]);

  useEffect(() => {
    if (shouldPauseWrongAnswerAutoAdvance({ showSolution, showPreviousSolution })) {
      if (wrongAnswerAdvanceTimerRef.current != null) {
        clearTimeout(wrongAnswerAdvanceTimerRef.current);
        wrongAnswerAdvanceTimerRef.current = null;
      }
      return;
    }
    if (
      wrongAnswerPendingRef.current &&
      wrongAnswerAdvanceCallbackRef.current &&
      wrongAnswerAdvanceTimerRef.current == null
    ) {
      const callback = wrongAnswerAdvanceCallbackRef.current;
      wrongAnswerAdvanceTimerRef.current = setTimeout(() => {
        wrongAnswerAdvanceTimerRef.current = null;
        if (
          shouldPauseWrongAnswerAutoAdvance({
            showSolution: showSolutionRef.current,
            showPreviousSolution: showPreviousSolutionRef.current,
          })
        ) {
          return;
        }
        wrongAnswerPendingRef.current = false;
        wrongAnswerAdvanceCallbackRef.current = null;
        callback();
      }, MATH_WRONG_ANSWER_FEEDBACK_MS);
    }
  }, [showSolution, showPreviousSolution]);

  useEffect(
    () => () => {
      if (wrongAnswerAdvanceTimerRef.current != null) {
        clearTimeout(wrongAnswerAdvanceTimerRef.current);
        wrongAnswerAdvanceTimerRef.current = null;
      }
    },
    []
  );

  function clearWrongAnswerAdvanceTimer() {
    if (wrongAnswerAdvanceTimerRef.current != null) {
      clearTimeout(wrongAnswerAdvanceTimerRef.current);
      wrongAnswerAdvanceTimerRef.current = null;
    }
  }

  function scheduleWrongAnswerAdvance(callback) {
    clearWrongAnswerAdvanceTimer();
    wrongAnswerPendingRef.current = true;
    wrongAnswerAdvanceCallbackRef.current = callback;
    wrongAnswerAdvanceTimerRef.current = setTimeout(() => {
      wrongAnswerAdvanceTimerRef.current = null;
      if (
        shouldPauseWrongAnswerAutoAdvance({
          showSolution: showSolutionRef.current,
          showPreviousSolution: showPreviousSolutionRef.current,
        })
      ) {
        return;
      }
      wrongAnswerPendingRef.current = false;
      wrongAnswerAdvanceCallbackRef.current = null;
      callback();
    }, MATH_WRONG_ANSWER_FEEDBACK_MS);
  }

  function advanceToNextQuestionManually() {
    clearWrongAnswerAdvanceTimer();
    wrongAnswerPendingRef.current = false;
    wrongAnswerAdvanceCallbackRef.current = null;
    setSelectedAnswer(null);
    setTextAnswer("");
    setFeedback(null);
    generateNewQuestion();
  }

  function handleMathPrimaryAnswerButtonClick() {
    const { action } = getMathPrimaryAnswerButtonState({
      selectedAnswer,
      textAnswer,
    });
    if (action === "next") {
      advanceToNextQuestionManually();
      return;
    }
    if (textAnswer.trim() !== "") {
      handleAnswer(textAnswer);
    }
  }

  function closeExplanationModal() {
    setShowSolution(false);
    setShowPreviousSolution(false);
  }

  function openPreviousExplanation() {
    clearWrongAnswerAdvanceTimer();
    setShowSolution(false);
    setShowPreviousSolution(true);
    stepByStepViewedRef.current = true;
  }

  const applyMathTopicCreditFromClosed = useCallback(
    (closed, questionForTrack, metaHint) => {
      if (!questionForTrack || !closed || closed.creditedSecForTopic <= 0) return;
      const baseOp =
        mathTrackingOperationKeyRef.current ?? questionForTrack?.operation;
      const storageKey = buildMathReportStorageKey(baseOp, questionForTrack);
      if (!storageKey) return;
      trackOperationTime(
        storageKey,
        grade,
        level,
        closed.creditedSecForTopic,
        metaHint ?? {
          mode: reportModeFromGameState(mode, focusedPracticeMode),
          total: 1,
          correct: undefined,
          baseOperation: baseOp,
          kind: questionForTrack?.params?.kind,
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
              const meta = pendingTimeTrackMetaRef.current;
              pendingTimeTrackMetaRef.current = null;
              if (meta && meta.mode != null) {
                applyMathTopicCreditFromClosed(closed, questionForTrack, {
                  mode: meta.mode,
                  correct: meta.correct,
                  total: meta.total,
                  baseOperation:
                    mathTrackingOperationKeyRef.current ??
                    questionForTrack?.operation,
                  kind: questionForTrack?.params?.kind,
                });
              } else {
                applyMathTopicCreditFromClosed(closed, questionForTrack);
              }
            }
          : null
      );
      if (questionStartTime) setQuestionStartTime(null);
    },
    [
      currentQuestion,
      questionStartTime,
      applyMathTopicCreditFromClosed,
    ]
  );

  const accumulateQuestionTime = useCallback(() => {
    closeOpenQuestionLedger(false);
  }, [closeOpenQuestionLedger]);

  const beginMathQuestionLedger = useCallback(
    (questionObj) => {
      if (!questionObj) return;
      beginMasterQuestionLedger(questionTimeLedgerRef, {
        subjectId: "math",
        mode,
        question: questionObj,
      });
    },
    [mode]
  );

  function generateNewQuestion() {
    clearWrongAnswerAdvanceTimer();
    wrongAnswerPendingRef.current = false;
    wrongAnswerAdvanceCallbackRef.current = null;
    closeOpenQuestionLedger(true);
    const levelConfig = getLevelConfig(gradeNumber, level);
    if (!levelConfig) {
      console.error("Invalid level config for grade", gradeNumber, "level", level);
      return;
    }

    let question;
    let attempts = 0;
    const maxAttempts = 50; // מקסימום ניסיונות למצוא שאלה חדשה

    const supportsWordProblems = GRADES[grade].operations.includes("word_problems");

    // ✅ התאמה לפי מצב תרגול ממוקד (Practice)
    let operationForState = operation;
    const levelConfigCopy = { ...levelConfig }; // עותק כדי לא לשנות את המקורי

    // תרגול ממוקד — רק שחזור מלא מ-snapshot (לא יוצרים שאלה דומה)
    const mistakeList =
      remainingMistakesRef.current.length > 0
        ? remainingMistakesRef.current
        : remainingMistakes;
    if (focusedPracticeModeRef.current === "mistakes" && mistakeList.length > 0) {
      const idx =
        currentMistakeIndex >= 0 && currentMistakeIndex < mistakeList.length
          ? currentMistakeIndex
          : 0;
      const currentMistake = mistakeList[idx];
      if (currentMistake) {
        const snap =
          currentMistake.snapshot ||
          (currentMistake.originalQuestion
            ? buildMathQuestionSnapshot({
                ...currentMistake.originalQuestion,
                operation:
                  currentMistake.originalQuestion.operation ||
                  currentMistake.operation,
              })
            : null);
        if (snap && Array.isArray(snap.answers) && snap.answers.length > 0) {
          const replay = {
            question: snap.question,
            questionLabel: snap.questionLabel,
            exerciseText: snap.exerciseText,
            correctAnswer: snap.correctAnswer,
            answers: [...snap.answers],
            operation: snap.operation,
            params: { ...snap.params },
            a: snap.a,
            b: snap.b,
            isStory: snap.isStory,
            _fromMistakeReplay: true,
            _mistakeId: currentMistake.id,
          };
          const fp = mathQuestionFingerprint(replay);
          const localRecent = new Set(recentQuestions);
          if (fp) localRecent.add(fp);
          if (localRecent.size > 60) {
            const first = Array.from(localRecent)[0];
            localRecent.delete(first);
          }
          setRecentQuestions(localRecent);

          mathTrackingOperationKeyRef.current = replay.operation;
          if (currentQuestion) setPreviousExplanationQuestion(currentQuestion);
          setCurrentQuestion(replay);
          setSelectedAnswer(null);
          setTextAnswer("");
          setFeedback(null);
          setQuestionStartTime(Date.now());
          beginMathQuestionLedger(replay);
          closeExplanationModal();
          setErrorExplanation("");
          stepByStepViewedRef.current = false;
          return;
        }
      }
    }

    // תרגול מדורג — לפי מונה נכונות בסשן (לא סגירה על state ישן)
    if (focusedPracticeModeRef.current === "graded") {
      const c = correctRef.current;
      const gradedLevel = c < 5 ? "easy" : c < 15 ? "medium" : level;
      const gradedLevelConfig = getLevelConfig(gradeNumber, gradedLevel);
      if (gradedLevelConfig) {
        Object.assign(levelConfigCopy, gradedLevelConfig);
      }
    }

    if (mode === "practice") {
      if (practiceFocus === "add_to_20") {
        // תרגול חיבור עד 20 – מתאים בעיקר לקטנים
        operationForState = "addition";
        if (levelConfigCopy.addition) {
          levelConfigCopy.addition = {
            ...levelConfigCopy.addition,
            max: Math.min(levelConfigCopy.addition.max || 20, 20),
          };
        }
      } else if (practiceFocus === "times_6_8") {
        // תרגול טבלת כפל 6–8
        operationForState = "multiplication";
        if (levelConfigCopy.multiplication) {
          // מבטיחים שהטווח יכלול לפחות 8
          levelConfigCopy.multiplication = {
            ...levelConfigCopy.multiplication,
            max: Math.max(levelConfigCopy.multiplication.max || 8, 8),
          };
        }
      }
    }

    const localRecentQuestions = SessionAntiRepeatBuffer.fromIterable(recentQuestions);

    const probeAtStart = mathPendingDiagnosticProbeRef.current;
    const probeMetaHolder = { current: null };

    do {
      let opForQuestion = operationForState;
      if (supportsWordProblems) {
        if (storyOnly) {
          opForQuestion = "word_problems";
        } else if (useStoryQuestions && operation !== "word_problems") {
          opForQuestion =
            Math.random() < 0.5 ? "word_problems" : operation;
        }
      }

      question = generateQuestion(
        levelConfigCopy,
        opForQuestion,
        grade,
        opForQuestion === "mixed" ? mixedOperations : null,
        {
          pendingProbe: probeAtStart,
          probeMetaHolder,
          forceKind: practiceForceKindRef.current,
        }
      );
      attempts++;

      const questionKey =
        mathQuestionFingerprint(question) ||
        `fallback|${question.question}|${question.correctAnswer}`;

      if (localRecentQuestions.wouldAccept(questionKey)) {
        localRecentQuestions.record(questionKey);
        break;
      }
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      console.warn(
        `Too many attempts (${attempts}) to generate new question, softening anti-repeat buffer`
      );
      localRecentQuestions.softenOnExhaustion();
    }
    setRecentQuestions(localRecentQuestions.toSet());

    if (probeMetaHolder.current) {
      question = attachProbeMetaToQuestion(question, probeMetaHolder.current);
    }
    let mathProbeRetainedInMixed = false;
    if (probeAtStart) {
      const pk = String(question.params?.kind || "");
      const consumed =
        probeMetaHolder.current != null ||
        pk.startsWith("math_probe_") ||
        pk.startsWith("frac_probe_");
      if (consumed) {
        mathPendingDiagnosticProbeRef.current = null;
      }
      mathProbeRetainedInMixed =
        operation === "mixed" &&
        !!mathPendingDiagnosticProbeRef.current &&
        !consumed;
      patchLearningDiagnosticDebug({
        lastProbeSelectionResult: {
          subjectId: "math",
          consumed,
          kind: pk || null,
          at: Date.now(),
        },
      });
    }

    if (!mathProbeRetainedInMixed) {
      decrementPendingProbeExpiry(mathPendingDiagnosticProbeRef);
    }

    mathTrackingOperationKeyRef.current = question.operation;
    if (currentQuestion) setPreviousExplanationQuestion(currentQuestion);
    const displayQuestion = tagQuestionWithLevelFields(
      sanitizeQuestionForStudentDisplay(question),
      displayLevelRef.current,
      level
    );
    setCurrentQuestion(displayQuestion);
    setSelectedAnswer(null);
    setTextAnswer("");
    setFeedback(null);
    setQuestionStartTime(Date.now());
    beginMathQuestionLedger(displayQuestion);
    closeExplanationModal();
    setErrorExplanation("");
    stepByStepViewedRef.current = false;
  }

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
    const durationSeconds = resolveMasterSessionDurationSeconds(sessionSecondsRef);
    const accuracyForFinish =
      answered > 0 ? Math.round((Math.max(0, correct) / answered) * 100) : 0;
    void refreshStudentLearningProfileAfterSession().then((p) => {
      if (p?.ok) {
        refreshMonthlyPersistenceView();
        const acc = accountAccuracyDisplayFromDerived(p.derived, "math");
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
          source: "math-master",
          version: "phase-2d-b2",
        },
      }).catch(() => {
        notifyLearningSessionSaveFailure(setFeedback, "math-master");
      });
      if (includePlannerRecommendation) {
        const cid = (plannerResponseSeqRef.current += 1);
        scheduleAdaptivePlannerRecommendation(
          {
            learningSessionId: sessionIdForFinish,
            subject: "math",
            grade,
            topic: mathTrackingOperationKeyRef.current ?? currentQuestion?.operation ?? "",
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
    setQuestionStartTime(null);
  }

  function buildMathSessionStartPayload() {
    const baseMeta = {
      source: "math-master",
      version: "phase-4-display-level",
    };
    const plannerExtra = plannerNextSessionClientMetaRef.current;
    const levelFields = buildStudentSessionStartLevelFields(
      "math",
      displayLevelRef.current,
      regularAdaptiveRef.current
    );
    return {
      subject: "math",
      topic: resolveMathSessionTopic(mathTrackingOperationKeyRef.current || operation),
      mode: reportModeFromGameState(mode, focusedPracticeMode),
      gradeLevel: String(grade || ""),
      ...levelFields,
      clientMeta:
        plannerExtra && typeof plannerExtra === "object"
          ? mergePlannerSessionClientMeta(baseMeta, plannerExtra)
          : baseMeta,
    };
  }

  async function ensureLearningSessionId() {
    if (learningSessionIdRef.current) return learningSessionIdRef.current;
    if (learningSessionStartPromiseRef.current) {
      return learningSessionStartPromiseRef.current;
    }
    const startPromise = startLearningSession(buildMathSessionStartPayload())
      .then((res) => {
        const id = res?.learningSessionId ? String(res.learningSessionId) : "";
        if (id) {
          learningSessionIdRef.current = id;
          return id;
        }
        return null;
      })
      .catch((error) => {
        console.warn("[math-master] session start save failed", error);
        return null;
      })
      .finally(() => {
        learningSessionStartPromiseRef.current = null;
        plannerNextSessionClientMetaRef.current = null;
      });
    learningSessionStartPromiseRef.current = startPromise;
    return startPromise;
  }

  function saveAnswerInParallel({
    question,
    userAnswer,
    isCorrect,
    expectedAnswer,
    prompt,
    questionFingerprint,
    questionId,
    topic,
    timeSpentMs,
    rawTimeSpentMs,
    creditedTimeMs,
    timingStatus,
    diagnosticProbeMeta,
  }) {
    const questionEngine = question
      ? buildQuestionEngineMetadataFromQuestion(question, {
          selectedValue: userAnswer,
          generatorSource: "math-master",
          afterStepByStep: stepByStepViewedRef.current,
        })
      : null;
    if (questionEngine) {
      questionEngine.difficulty =
        question?.sourceDifficulty || question?.difficulty || level || questionEngine.difficulty;
    }
    const answerLevelFields = buildStudentAnswerLevelFields(
      "math",
      displayLevelRef.current,
      question?.sourceDifficulty || level,
      regularAdaptiveRef.current
    );
    ensureLearningSessionId()
      .then((learningSessionId) => {
        if (!learningSessionId) return;
        return saveLearningAnswer({
          learningSessionId,
          subject: "math",
          topic,
          gameMode: reportModeFromGameState(mode, focusedPracticeMode),
          questionId,
          questionFingerprint,
          prompt,
          expectedAnswer,
          userAnswer,
          questionEngine,
          isCorrect,
          hintsUsed: 0,
          // Phase 3: send both raw and credited time
          timeSpentMs: rawTimeSpentMs ?? timeSpentMs,
          rawTimeSpentMs: rawTimeSpentMs ?? timeSpentMs,
          creditedTimeMs,
          timingStatus,
          gradeLevel: String(grade || ""),
          ...answerLevelFields,
          clientMeta: {
            source: "math-master",
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
        console.warn("[math-master] answer save failed", error);
      });
  }

  function startGame(opts = {}) {
    if (guestTopics.isGuest && operation !== "mixed" && guestTopics.isLocked(operation)) {
      alert(GUEST_TOPIC_LOCK_MESSAGE_HE);
      return;
    }
    if (opts.focusedPracticeMode != null) {
      setFocusedPracticeMode(opts.focusedPracticeMode);
      focusedPracticeModeRef.current = opts.focusedPracticeMode;
    }
    if (opts.fromAdaptivePlannerRecommendedPractice && opts.plannerSessionMeta && typeof opts.plannerSessionMeta === "object") {
      plannerNextSessionClientMetaRef.current = opts.plannerSessionMeta;
      const plannerDisplay = mapPlannerTargetToDisplayLevel(opts.appliedLevelKey, "math");
      const plannerSource = mapPlannerTargetToSourceDifficulty(opts.appliedLevelKey);
      if (plannerDisplay) {
        displayLevelRef.current = plannerDisplay;
        setDisplayLevel(plannerDisplay);
      }
      if (plannerSource === "easy" || plannerSource === "medium") {
        regularAdaptiveRef.current = createStudentAdaptiveState("math", { internalState: plannerSource });
      }
      if (plannerDisplay === "advanced") {
        setLevel("hard");
      } else if (plannerSource) {
        setLevel(plannerSource);
      }
    } else {
      plannerNextSessionClientMetaRef.current = null;
      if (displayLevelRef.current === "regular") {
        regularAdaptiveRef.current = createStudentAdaptiveState("math");
        setLevel("easy");
      }
    }
    recordSessionProgress({ includePlannerRecommendation: false });
    setAdaptivePlannerRecommendationView(null);
    sessionStartRef.current = Date.now();
    solvedCountRef.current = 0;
    sessionSecondsRef.current = 0;
    questionTimeLedgerRef.current = null;
    clearActiveDiagnosticState(
      mathPendingDiagnosticProbeRef,
      mathHypothesisLedgerRef
    );
    setRecentQuestions(new Set()); // איפוס ההיסטוריה
    clearWrongAnswerAdvanceTimer();
    wrongAnswerPendingRef.current = false;
    wrongAnswerAdvanceCallbackRef.current = null;
    setIsVerticalDisplay(false); // סשן חדש: תמיד מאוזן כברירת מחדל
    setGameActive(true);
    setScore(0);
    setStreak(0);
    setCorrect(0);
    setWrong(0);
    setTotalQuestions(0);
    setAvgTime(0);
    setQuestionStartTime(null);
    setFeedback(null);
    setSelectedAnswer(null);
    setTextAnswer("");
    setLives(mode === "challenge" ? 3 : 0);
    setShowBadge(null);
    setShowLevelUp(false);
    stepByStepViewedRef.current = false;
    
    startLearningMasterSessionAudio(audio);
    closeExplanationModal();
    setErrorExplanation("");
    learningSessionIdRef.current = null;
    learningSessionStartPromiseRef.current = null;
    void ensureLearningSessionId();

    if (focusedPracticeModeRef.current === "mistakes") {
      const q = normalizeMistakeQueue(mistakesRef.current);
      remainingMistakesRef.current = q;
      setRemainingMistakes(q);
      setCurrentMistakeIndex(0);
    } else {
      remainingMistakesRef.current = [];
      setRemainingMistakes([]);
      setCurrentMistakeIndex(0);
    }

    // הגדרת טיימר לפי מצב
    if (mode === "challenge") {
      setTimeLeft(20);
    } else if (mode === "speed") {
      setTimeLeft(10); // טיימר קצר יותר למצב מהירות
    } else {
      setTimeLeft(null);
    }

    generateNewQuestion();
  }

  function handleAdaptivePlannerRecommendedPractice() {
    try {
      const vm = adaptivePlannerRecommendationView;
      const out = buildRecommendedPracticeFromViewModel(vm);
      if (!out.ok) return;
      setAdaptivePlannerRecommendationView(null);
      const appliedLevelKey =
        mapPlannerTargetToDisplayLevel(out.startOptions.targetDifficulty, "math") ||
        mapPlannerTargetDifficultyToTriLevel(out.startOptions.targetDifficulty);
      startGame({
        fromAdaptivePlannerRecommendedPractice: true,
        appliedLevelKey: appliedLevelKey || out.startOptions.targetDifficulty,
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
    recordSessionProgress();
    clearActiveDiagnosticState(
      mathPendingDiagnosticProbeRef,
      mathHypothesisLedgerRef
    );
    setGameActive(false);
    mathTrackingOperationKeyRef.current = null;
    setCurrentQuestion(null);
    setShowPreviousSolution(false);
    setFeedback(null);
    setSelectedAnswer(null);
    setTextAnswer("");
    setIsVerticalDisplay(false);

    // Stop background music when game stops
    audio.stopMusic();
    
    saveRunToStorage();
  }

  function handleTimeUp() {
    // Time up – במצב Challenge או Speed
    recordSessionProgress();
    setWrong((prev) => prev + 1);
    setStreak(0);
      setFeedback("הזמן נגמר! המשחק נגמר! ⏰");
    audio.playSfx("sfx-game-over");
    setGameActive(false);
    mathTrackingOperationKeyRef.current = null;
    setCurrentQuestion(null);
    setTimeLeft(0);
    saveRunToStorage();

    setTimeout(() => {
      hardResetGame();
    }, 2000);
  }

  // פונקציה עזר לשמירת תג
  const saveBadge = (badge) => {
    if (typeof window !== "undefined") {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY + "_progress") || "{}");
        saved.badges = [...badges, badge];
        localStorage.setItem(STORAGE_KEY + "_progress", JSON.stringify(saved));
      } catch {}
    }
  };

  // פונקציות לתרגול ממוקד בלוח הכפל
  const generatePracticeQuestion = (row = null, col = null) => {
    let selectedRow = row || practiceRow;
    let selectedCol = col || practiceCol;
    
    if (selectedRow && !selectedCol) {
      // תרגול שורה - בחר עמודה אקראית
      selectedCol = Math.floor(Math.random() * 12) + 1;
    } else if (selectedCol && !selectedRow) {
      // תרגול עמודה - בחר שורה אקראית
      selectedRow = Math.floor(Math.random() * 12) + 1;
    } else if (!selectedRow && !selectedCol) {
      // תרגול אקראי
      selectedRow = Math.floor(Math.random() * 12) + 1;
      selectedCol = Math.floor(Math.random() * 12) + 1;
    }
    
    setPracticeQuestion({
      row: selectedRow,
      col: selectedCol,
      answer: selectedRow * selectedCol
    });
    setPracticeAnswer("");
  };

  const checkPracticeAnswer = () => {
    if (!practiceQuestion) return;

    const { isCorrect } = compareAnswers({
      mode: "exact_integer",
      user: practiceAnswer,
      expected: practiceQuestion.answer,
    });

    if (isCorrect) {
      // תשובה נכונה - אנימציה והצגת שאלה חדשה
      setShowCorrectAnimation(true);
      setTimeout(() => setShowCorrectAnimation(false), 1000);
      setTimeout(() => {
        generatePracticeQuestion();
      }, 1500);
    } else {
      // תשובה שגויה - אנימציה
      setShowWrongAnimation(true);
      setTimeout(() => setShowWrongAnimation(false), 1000);
    }
  };

  function handleAnswer(answer) {
    if (selectedAnswer || !gameActive || !currentQuestion) return;
    setScratchpadCloseSignal((n) => n + 1);
    const questionForSave = currentQuestion;
    const hintUsedForSave = false;

    // סטטיסטיקה – ספירת שאלה וזמן
    setTotalQuestions((prevCount) => {
      const newCount = prevCount + 1;
      if (questionStartTime) {
        const elapsed = (Date.now() - questionStartTime) / 1000;
        setAvgTime((prevAvg) =>
          prevCount === 0 ? elapsed : (prevAvg * prevCount + elapsed) / newCount
        );
      }
      return newCount;
    });

    const {
      isCorrect,
      rejectInvalidNumber,
      selectedValue: numericAnswer,
    } = compareLearnerAnswerForQuestion(
      finalizeComparisonSignMcq(currentQuestion),
      answer
    );
    if (rejectInvalidNumber) {
      setFeedback("נא להזין מספר תקין");
      setTimeout(() => setFeedback(null), 2000);
      return;
    }

    const rawMs = questionStartTime ? Math.max(0, Date.now() - questionStartTime) : null;
    const timeSpentMs = rawMs;
    const { rawTimeSpentMs, creditedTimeMs, timingStatus } = computeFreePracticeTiming(rawMs, {
      creditedMs: questionTimeLedgerRef.current ? questionTimeLedgerRef.current.peekCreditedMs() : undefined,
      tierCapMs: questionTimeLedgerRef.current?.tierCapMs,
    });

    let diagnosticProbeMetaForSave = null;
    if (
      questionForSave._diagnosticProbeAttempt === true &&
      questionForSave._probeMeta
    ) {
      let inferredTags = [];
      const probeAnsweredAt = Date.now();
      if (!isCorrect) {
        const prm = questionForSave.params || {};
        let wrongEntry = {
          topic: questionForSave.operation,
          topicOrOperation: questionForSave.operation,
          bucketKey: questionForSave.operation,
          grade,
          level,
          mode: reportModeFromGameState(mode, focusedPracticeMode),
          question:
            questionForSave.exerciseText ||
            questionForSave.question ||
            "",
          exerciseText:
            questionForSave.exerciseText ||
            questionForSave.question ||
            "",
          correctAnswer: questionForSave.correctAnswer,
          wrongAnswer: numericAnswer,
          userAnswer: numericAnswer,
          isCorrect: false,
          patternFamily:
            prm.patternFamily != null ? String(prm.patternFamily) : null,
          conceptTag: prm.conceptTag != null ? String(prm.conceptTag) : null,
          kind: prm.kind != null ? String(prm.kind) : null,
          answerMode:
            Array.isArray(questionForSave.answers) &&
            questionForSave.answers.length > 1
              ? "choice"
              : "typed",
        };
        wrongEntry = mergeDiagnosticIntoMistakeEntry(
          wrongEntry,
          extractDiagnosticMetadataFromQuestion(questionForSave, {
            responseMs: timeSpentMs,
            hintUsed: hintUsedForSave,
          })
        );
        wrongEntry = mergeDiagnosticIntoMistakeEntry(
          wrongEntry,
          computeMcqIndicesForQuestion(questionForSave, numericAnswer)
        );
        const normalizedWrong = normalizeMistakeEvent(wrongEntry, "math");
        inferredTags = inferNormalizedTags(normalizedWrong, "math");
      }
      mathHypothesisLedgerRef.current = applyProbeOutcome(
        mathHypothesisLedgerRef.current,
        {
          isCorrect,
          inferredTags,
          probeMeta: questionForSave._probeMeta,
          now: probeAnsweredAt,
        }
      );
      diagnosticProbeMetaForSave = buildDiagnosticProbeClientMeta({
        probeMeta: questionForSave._probeMeta,
        ledger: mathHypothesisLedgerRef.current,
        inferredTags,
        answeredAt: probeAnsweredAt,
        learningSessionId: learningSessionIdRef.current,
      });
      patchLearningDiagnosticDebug({
        hypothesisLedger: { math: mathHypothesisLedgerRef.current },
        lastProbeOutcome: { subjectId: "math", at: Date.now() },
      });
      setCurrentQuestion((prev) => {
        if (!prev || prev !== questionForSave) return prev;
        const { _diagnosticProbeAttempt: _a, _probeMeta: _b, ...rest } = prev;
        void _a;
        void _b;
        return rest;
      });
    }

    setSelectedAnswer(numericAnswer);
    const resolvedTopic = resolveMathSessionTopic(
      mathTrackingOperationKeyRef.current ?? currentQuestion.operation ?? operation
    );
    const questionFingerprint = mathQuestionFingerprint(currentQuestion) || null;
    const questionId = currentQuestion.id
      ? String(currentQuestion.id)
      : questionFingerprint || `math-${Date.now()}`;
    if (
      isStudentAdaptiveActive("math", {
        displayLevel: displayLevelRef.current,
        mode: focusedPracticeModeRef.current,
      })
    ) {
      regularAdaptiveRef.current = applyStudentAdaptiveAnswer(
        "math",
        regularAdaptiveRef.current,
        isCorrect,
        { displayLevel: displayLevelRef.current, mode: focusedPracticeModeRef.current }
      );
      if (displayLevelRef.current === "regular") {
        setLevel(regularAdaptiveRef.current.internalState);
      }
    }
    saveAnswerInParallel({
      question: currentQuestion,
      userAnswer: numericAnswer,
      isCorrect,
      expectedAnswer: currentQuestion.correctAnswer,
      prompt: currentQuestion.exerciseText || currentQuestion.question || "",
      questionFingerprint,
      questionId,
      topic: resolvedTopic,
      timeSpentMs,
      rawTimeSpentMs,
      creditedTimeMs,
      timingStatus,
      diagnosticProbeMeta: diagnosticProbeMetaForSave,
    });

    pendingTimeTrackMetaRef.current = {
      correct: isCorrect ? 1 : 0,
      total: 1,
      mode: reportModeFromGameState(mode, focusedPracticeMode),
    };

    if (isCorrect) {
      // חישוב נקודות לפי מצב
      let points = 10 + streak;
      if (mode === "speed") {
        const timeBonus = timeLeft ? Math.floor(timeLeft * 2) : 0;
        points += timeBonus; // בונוס זמן במצב מהירות
      }
      
      setScore((prev) => prev + points);
      setStreak((prev) => prev + 1);
      setCorrect((prev) => prev + 1);
      
      clearWrongAnswerAdvanceTimer();
      wrongAnswerPendingRef.current = false;
      wrongAnswerAdvanceCallbackRef.current = null;
      setErrorExplanation("");

      // אם במצב תרגול שגיאות — הסר לפי מזהה + סנכרון localStorage
      if (
        focusedPracticeMode === "mistakes" &&
        remainingMistakes.length > 0 &&
        currentQuestion._mistakeId
      ) {
        const mid = currentQuestion._mistakeId;
        const updatedRemaining = remainingMistakes.filter((m) => m.id !== mid);
        remainingMistakesRef.current = updatedRemaining;
        setRemainingMistakes(updatedRemaining);
        setMistakes((prev) => {
          const next = prev.filter((m) => m.id !== mid);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("mleo_mistakes", JSON.stringify(next));
            } catch {}
          }
          return next;
        });
        
        // אם אין עוד שגיאות - אפס את הרשימה
        if (updatedRemaining.length === 0) {
          setMistakes([]);
          if (typeof window !== "undefined") {
            localStorage.setItem("mleo_mistakes", JSON.stringify([]));
          }
          setFocusedPracticeMode("normal");
          focusedPracticeModeRef.current = "normal";
          setFeedback("🎉 כל השגיאות תוקנו! מעולה!");
          setTimeout(() => {
            setFeedback(null);
            setGameActive(false);
            setIsVerticalDisplay(false);
          }, 3000);
          return;
        }
        
        const nextIndex = Math.min(
          currentMistakeIndex,
          Math.max(0, updatedRemaining.length - 1)
        );
        setCurrentMistakeIndex(nextIndex);
        
        // עבור לשגיאה הבאה אחרי 1.5 שניות
        setTimeout(() => {
          generateNewQuestion();
        }, 1500);
        return; // אל תמשיך עם generateNewQuestion הרגיל
      }

      // עדכון התקדמות אישית
      const op = currentQuestion.operation;
      setProgress((prev) => ({
        ...prev,
        [op]: {
          total: (prev[op]?.total || 0) + 1,
          correct: (prev[op]?.correct || 0) + 1,
        },
      }));

      setLearningIntel((prev) => recordMathAnswerIntel(prev, op, true));

      // משתנים משותפים למערכת תגים וכוכבים
      const newCorrect = correct + 1;
      const newStreak = streak + 1;
      const newScore = score + points;
      const opProgress = progress[op] || { total: 0, correct: 0 };
      const newOpCorrect = opProgress.correct + 1;

      // מערכת כוכבים - כוכב כל 5 תשובות נכונות
      if (newCorrect % 5 === 0) {
        setStars((prev) => {
          const newStars = prev + 1;
          // שמירה ל-localStorage
          if (typeof window !== "undefined") {
            try {
              const saved = JSON.parse(localStorage.getItem(STORAGE_KEY + "_progress") || "{}");
              saved.stars = newStars;
              localStorage.setItem(STORAGE_KEY + "_progress", JSON.stringify(saved));
            } catch {}
          }
          return newStars;
        });
      }

      // מערכת תגים משופרת
      
      // תגים לפי רצף
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
      } else if (newStreak === 50 && !badges.includes("🌟 אלוף") && !badges.includes("🌟 מאסטר")) {
        const newBadge = "🌟 אלוף";
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        audio.playSfx("sfx-badge");
        setTimeout(() => setShowBadge(null), 3000);
        saveBadge(newBadge);
      } else if (newStreak === 100 && !badges.includes("👑 מלך החשבון")) {
        const newBadge = "👑 מלך החשבון";
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        audio.playSfx("sfx-badge");
        setTimeout(() => setShowBadge(null), 3000);
        saveBadge(newBadge);
      }
      
      // תגים לפי פעולות ספציפיות
      const opName = getOperationName(op);
      if (newOpCorrect === 50 && !badges.includes(`🧮 מלך ה${opName}`)) {
        const newBadge = `🧮 מלך ה${opName}`;
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        audio.playSfx("sfx-badge");
        setTimeout(() => setShowBadge(null), 3000);
        saveBadge(newBadge);
      } else if (newOpCorrect === 100 && !badges.includes(`🏆 גאון ה${opName}`)) {
        const newBadge = `🏆 גאון ה${opName}`;
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        audio.playSfx("sfx-badge");
        setTimeout(() => setShowBadge(null), 3000);
        saveBadge(newBadge);
      }
      
      // תגים לפי ניקוד
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
      
      // תגים לפי מספר תשובות נכונות
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

      // מערכת XP ורמות
      const xpGain = 10;
      setXp((prev) => {
        const newXp = prev + xpGain;
        const xpNeeded = playerLevel * 100;
        
        if (newXp >= xpNeeded) {
          setPlayerLevel((prevLevel) => {
            const newLevel = prevLevel + 1;
            setShowLevelUp(true);
            audio.playSfx("sfx-level-up");
            setTimeout(() => setShowLevelUp(false), 3000);
            if (typeof window !== "undefined") {
              try {
                const saved = JSON.parse(localStorage.getItem(STORAGE_KEY + "_progress") || "{}");
                saved.playerLevel = newLevel;
                saved.xp = newXp - xpNeeded;
                localStorage.setItem(STORAGE_KEY + "_progress", JSON.stringify(saved));
              } catch {}
            }
            return newLevel;
          });
          return newXp - xpNeeded;
        }
        
        if (typeof window !== "undefined") {
          try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY + "_progress") || "{}");
            saved.xp = newXp;
            localStorage.setItem(STORAGE_KEY + "_progress", JSON.stringify(saved));
          } catch {}
        }
        return newXp;
      });

      // עדכון תחרות יומית
      setDailyChallenge((prev) => ({
        ...prev,
        bestScore: Math.max(prev.bestScore, score + points),
        questions: prev.questions + 1,
        correct: (prev.correct || 0) + 1,
      }));

      // אנימציה ותגובה חזותית לתשובה נכונה
      const emojis = ["🎉", "✨", "🌟", "💫", "⭐", "🔥", "💪", "🎊", "👏", "🏆"];
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
      setCelebrationEmoji(randomEmoji);
      setShowCorrectAnimation(true);
      setTimeout(() => setShowCorrectAnimation(false), 1000);
      
      // משוב דינמי לפי רצף
      let feedbackText = "נכון! ";
      if (streak + 1 >= 50) {
        feedbackText = `מדהים! רצף של ${streak + 1}! `;
      } else if (streak + 1 >= 25) {
        feedbackText = `מצוין! רצף של ${streak + 1}! `;
      } else if (streak + 1 >= 10) {
        feedbackText = `כל הכבוד! רצף של ${streak + 1}! `;
      } else if (streak + 1 >= 5) {
        feedbackText = `יופי! רצף של ${streak + 1}! `;
      }
      setFeedback(`${feedbackText}${randomEmoji}`);
      
      // Play sound - different sound for streak milestones
      if ((streak + 1) % 5 === 0 && streak + 1 >= 5) {
        audio.playSfx("sfx-streak");
      } else {
        audio.playSfx("sfx-correct");
      }
      
      // Update daily streak
      const updatedStreak = updateDailyStreak("mleo_math_daily_streak");
      setDailyStreak(updatedStreak);
      
      // Show streak reward if applicable
      const reward = getStreakReward(updatedStreak.streak);
      if (reward && updatedStreak.streak > (dailyStreak.streak || 0)) {
        setShowStreakReward(reward);
        setTimeout(() => setShowStreakReward(null), 3000);
      }
      
      if ("vibrate" in navigator) navigator.vibrate?.(50);
      
      // איפוס השדה הטקסט מיד אחרי תשובה נכונה
      if (mode === "learning" || mode === "practice") {
        setTextAnswer("");
      }

      setTimeout(() => {
        generateNewQuestion();
        if (mode === "challenge") {
          setTimeLeft(20);
        } else if (mode === "speed") {
          setTimeLeft(10);
        } else {
          setTimeLeft(null);
        }
      }, MATH_CORRECT_ANSWER_ADVANCE_MS);
    } else {
      setWrong((prev) => prev + 1);
      setStreak(0);
      
      if (!currentQuestion._fromMistakeReplay) {
        const snap = buildMathQuestionSnapshot(currentQuestion);
        if (
          snap &&
          snap.answers?.length > 0 &&
          currentQuestion.params?.kind !== "no_question"
        ) {
          const fp = mathQuestionFingerprint(currentQuestion);
          const ts = Date.now();
          const baseOp =
            mathTrackingOperationKeyRef.current ?? currentQuestion.operation;
          const bucketKey =
            buildMathReportStorageKey(baseOp, currentQuestion) || baseOp;
          const prm = currentQuestion.params || {};
          let entry = {
            id: newMathMistakeId(),
            storedAt: ts,
            timestamp: ts,
            operation: currentQuestion.operation,
            topicOrOperation: baseOp,
            bucketKey,
            mode: reportModeFromGameState(mode, focusedPracticeMode),
            kind: prm.kind != null ? String(prm.kind) : null,
            patternFamily:
              prm.patternFamily != null
                ? String(prm.patternFamily)
                : prm.semanticFamily != null
                  ? String(prm.semanticFamily)
                  : null,
            subtype: prm.subtype != null ? String(prm.subtype) : null,
            distractorFamily:
              prm.distractorFamily != null ? String(prm.distractorFamily) : null,
            conceptTag: prm.conceptTag != null ? String(prm.conceptTag) : null,
            answerMode:
              Array.isArray(currentQuestion.answers) &&
              currentQuestion.answers.length > 1
                ? "choice"
                : "numeric",
            total: totalQuestions + 1,
            correctCountInSession: correctRef.current,
            isCorrect: false,
            questionLabel: currentQuestion.questionLabel || null,
            question:
              currentQuestion.exerciseText ||
              currentQuestion.question ||
              "",
            correctAnswer: currentQuestion.correctAnswer,
            wrongAnswer: numericAnswer,
            grade,
            level,
            snapshot: snap,
          };
          entry = mergeDiagnosticIntoMistakeEntry(
            entry,
            extractDiagnosticMetadataFromQuestion(currentQuestion, {
              responseMs: timeSpentMs,
              hintUsed: hintUsedForSave,
            })
          );
          entry = mergeDiagnosticIntoMistakeEntry(
            entry,
            computeMcqIndicesForQuestion(currentQuestion, numericAnswer)
          );
          if (
            !entry.distractorFamily &&
            entry.selectedOptionIndex != null &&
            Array.isArray(currentQuestion.answers)
          ) {
            const cell = currentQuestion.answers[entry.selectedOptionIndex];
            const dfOpt = distractorFamilyFromOptionCell(cell);
            if (dfOpt) {
              entry = mergeDiagnosticIntoMistakeEntry(entry, {
                distractorFamily: dfOpt,
              });
            }
          }
          try {
            let normalized = normalizeMistakeEvent(entry, "math");
            if (normalized && entry.operation === "fractions") {
              normalized = {
                ...normalized,
                bucketKey: "fractions",
                topicOrOperation: "fractions",
              };
            }
            const inferredTags = inferNormalizedTags(normalized, "math");
            patchLearningDiagnosticDebug({
              lastInferredTags: { subjectId: "math", tags: inferredTags, at: Date.now() },
            });
            if (mathWrongActivatesProbe(normalized, inferredTags)) {
              const fallbackTopic =
                normalized.bucketKey ||
                normalized.topicOrOperation ||
                baseOp ||
                "addition";
              mathPendingDiagnosticProbeRef.current = buildPendingProbeFromMistake(
                normalized,
                {
                  wrongAvoidKey: fp,
                  fallbackTopicId: fallbackTopic,
                  fallbackGrade: grade,
                  fallbackLevel: level,
                },
                "math"
              );
              patchLearningDiagnosticDebug({
                pendingProbe: { math: mathPendingDiagnosticProbeRef.current },
              });
            } else {
              mathPendingDiagnosticProbeRef.current = null;
            }
          } catch {
            mathPendingDiagnosticProbeRef.current = null;
          }
          setMistakes((prev) => {
            const filtered = prev.filter(
              (m) => mathQuestionFingerprint(m.snapshot) !== fp
            );
            const updated = [...filtered, entry].slice(-80);
            if (typeof window !== "undefined") {
              localStorage.setItem("mleo_mistakes", JSON.stringify(updated));
            }
            return updated;
          });
        }
      }

      setLearningIntel((prev) =>
        recordMathAnswerIntel(prev, currentQuestion.operation, false)
      );
      
      const errExpl = getErrorExplanation(
        finalizeComparisonSignMcq(currentQuestion),
        currentQuestion.operation === "compare" ||
          currentQuestion.params?.kind === "cmp"
          ? "compare"
          : currentQuestion.operation,
        numericAnswer,
        grade,
        { mode }
      );
      setErrorExplanation(errExpl);
      if (errExpl) stepByStepViewedRef.current = true;
      
      // עדכון התקדמות אישית
      const op = currentQuestion.operation;
      setProgress((prev) => ({
        ...prev,
        [op]: {
          total: (prev[op]?.total || 0) + 1,
          correct: prev[op]?.correct || 0,
        },
      }));
      
      // אנימציה ותגובה חזותית לתשובה שגויה
      setShowWrongAnimation(true);
      setTimeout(() => setShowWrongAnimation(false), 1000);
      
      // Play sound
      audio.playSfx("sfx-wrong");
      
      if ("vibrate" in navigator) navigator.vibrate?.(200);

      if (mode === "learning") {
        setFeedback(
          formatLearningWrongFeedbackHe(
            currentQuestion.operation === "compare"
              ? formatCompareFeedbackSign(compareCorrectSignForDisplay(currentQuestion))
              : `\u2066${currentQuestion.correctAnswer}\u2069`
          )
        );
        scheduleWrongAnswerAdvance(() => {
          generateNewQuestion();
          setSelectedAnswer(null);
          setTextAnswer("");
          solvedCountRef.current += 1;
          setFeedback(null);
          setTimeLeft(null);
        });
      } else if (mode === "challenge") {
        setFeedback(`${LIVE_PRACTICE_WRONG_HE} (-1 ❤️)`);
        setLives((prevLives) => {
          const nextLives = prevLives - 1;

          if (nextLives <= 0) {
            setFeedback(LIVE_PRACTICE_GAME_OVER_HE);
            audio.playSfx("sfx-game-over");
            recordSessionProgress();
            saveRunToStorage();
            setGameActive(false);
            mathTrackingOperationKeyRef.current = null;
            setCurrentQuestion(null);
            setTimeLeft(0);
            setTimeout(() => {
              hardResetGame();
            }, 2000);
          } else {
            scheduleWrongAnswerAdvance(() => {
              generateNewQuestion();
              setSelectedAnswer(null);
              setTextAnswer("");
              setFeedback(null);
              setTimeLeft(20);
            });
          }

          return nextLives;
        });
      } else {
        setFeedback(LIVE_PRACTICE_WRONG_HE);
        scheduleWrongAnswerAdvance(() => {
          generateNewQuestion();
          setSelectedAnswer(null);
          setTextAnswer("");
          setFeedback(null);
          if (mode === "speed") {
            setTimeLeft(10);
          } else {
            setTimeLeft(null);
          }
        });
      }
    }
  }

  function resetStats() {
    setScore(0);
    setStreak(0);
    setCorrect(0);
    setWrong(0);
    setBestScore(0);
    setBestStreak(0);
    if (typeof window !== "undefined") {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        const key = `${level}_${operation}`;
        delete saved[key];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      } catch {}
    }
  }

  const backSafe = () => {
    router.push("/student/learning");
  };

  // Unified operation name resolver — delegates to the canonical report label map.
  // Falls back to "נושא" for any unknown key to prevent raw English leaking to the UI.
  const getOperationName = (op) => {
    if (!op) return "נושא";
    const name = getMathReportBucketDisplayName(String(op));
    return name && name !== String(op) ? name : "נושא";
  };

  const profileSnap = getCachedStudentLearningProfile();
  const subjectView = useMemo(
    () =>
      buildStudentSubjectDashboardView({
        subject: "math",
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
        topicScopeKey: `${level}_${operation}`,
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
      operation,
      monthlyPersistenceView,
      mode,
      playerAvatar,
      playerAvatarImage,
      dailyChallenge,
      weeklyChallenge,
    ]
  );

  useEffect(() => {
    logStudentSubjectDashboardDiagnostics("math", subjectView, {
      hydrationComplete: !!learningProfileHydratedRef.current,
    });
  }, [subjectView, learningProfileHydrationTick]);
  useEscapeCloseModals([
    { open: showPlayerProfile, close: () => setShowPlayerProfile(false) },
    { open: showPracticeOptions, close: () => setShowPracticeOptions(false) },
    { open: showReferenceModal, close: () => setShowReferenceModal(false) },
    { open: showHowTo, close: () => setShowHowTo(false) },
    { open: showMultiplicationTable, close: () => setShowMultiplicationTable(false) },
    { open: showLeaderboard, close: () => setShowLeaderboard(false) },
    { open: showMixedSelector, close: () => setShowMixedSelector(false) },
  ]);



  if (!mounted || session.sessionLoading)
    return <SubjectMasterSessionShell shellClass={shellClass} shellBgStyle={shellBgStyle} />;
  if (!gradeReady)
    return <StudentLoadingPanel message={STUDENT_GRADE_REQUIRED_MESSAGE_HE} fullPage />;

  const accuracy =
    totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
  const gradeSupportsWordProblems = GRADES[grade].operations.includes("word_problems");

  // ✅ הסבר מלא לשאלה הנוכחית
  const solutionSteps =
    currentQuestion && currentQuestion.operation
      ? getSolutionSteps(currentQuestion, currentQuestion.params?.op || currentQuestion.operation, grade)
      : [];

  // זיהוי "שאלה מילולית" גם אם היא לא תחת operation=word_problems (למשל wp_shop_discount)
  const isWordyQuestion =
    !!currentQuestion?.isStory ||
    currentQuestion?.operation === "word_problems" ||
    (typeof currentQuestion?.params?.kind === "string" &&
      currentQuestion.params.kind.startsWith("wp_"));

  // התאמת גודל האותיות בשאלה (בכל הנושאים) בדיוק כמו בשאלות מילוליות:
  // מקטינים רק טקסט שיש בו אותיות, בלי להזיז Layout (transform לא משפיע על שטח).
  const hasLetters = (t) => typeof t === "string" && /[A-Za-z\u0590-\u05FF]/.test(t);
  const shouldScaleQuestionText =
    isWordyQuestion ||
    hasLetters(currentQuestion?.questionLabel) ||
    hasLetters(currentQuestion?.question) ||
    hasLetters(currentQuestion?.exerciseText);
  const QUESTION_TEXT_SCALE = 0.605;

  const compareLearnerAnswerForQuestion = (question, user) =>
    compareMathLearnerAnswer({
      user,
      correctAnswer: question.correctAnswer,
      numericTolerance: MATH_NUMERIC_TOLERANCE,
      params: question.params,
      a: question.a,
      b: question.b,
      operation: question.operation,
    });

  const formatCompareFeedbackSign = (sign) =>
    isComparisonSignToken(sign)
      ? embedComparisonSignInRtlProse(sign)
      : String(sign ?? "");

  const compareCorrectSignForDisplay = (question) => {
    const sign = resolveCanonicalComparisonSignAnswer(
      finalizeComparisonSignMcq(question)
    );
    return sign ?? question?.correctAnswer;
  };

  // תשובות עם מלל – מקטינים את האותיות בתוך הכפתור כמו בשאלות מילוליות
  const renderAnswerLabel = (ans) => {
    const s = typeof ans === "string" ? ans : String(ans ?? "");
    if (hasStackedFractionToken(s)) {
      return <MathFractionExpression text={s} />;
    }
    const mathyPlain =
      typeof ans === "string" &&
      (/^\d+\s*\/\s*\d+/.test(s) ||
        /\d\s*\/\s*\d/.test(s) ||
        (/[0-9]/.test(s) && /[+\-×÷*/=√π²³]/.test(s)));
    if (hasLetters(s)) {
      return (
        <span style={{ ...learningMixedHebrewMathStyle }}>
          {s}
        </span>
      );
    }
    if (mathyPlain) {
      return (
        <span
          style={{
            display: "inline-block",
            direction: "ltr",
            unicodeBidi: "isolate",
          }}
        >
          {s}
        </span>
      );
    }
    if (isComparisonSignToken(s)) {
      return (
        <span
          style={{
            display: "inline-block",
            direction: "ltr",
            unicodeBidi: "isolate",
          }}
        >
          {s}
        </span>
      );
    }
    return ans;
  };

  const mathHasFloatButtons =
    !scratchpadOpen &&
    Boolean(
      canDisplayVertically ||
        questionBookHref ||
        (mode === "learning" &&
          currentQuestion &&
          (currentQuestion.operation === "multiplication" ||
            currentQuestion.operation === "division"))
    );

  const mathScratchpadOperands = currentQuestion
    ? extractScratchpadOperands(currentQuestion)
    : null;
  const mathScratchpadAvailable =
    !!currentQuestion &&
    isMathScratchpadV1Enabled() &&
    Boolean(
      getScratchpadType(grade, currentQuestion.operation || operation, {
        a: mathScratchpadOperands?.a,
        b: mathScratchpadOperands?.b,
      })
    );

  const mathShowMultiplicationTableButton =
    mode === "learning" &&
    currentQuestion &&
    (currentQuestion.operation === "multiplication" ||
      currentQuestion.operation === "division");

  const mathShowMobileQuestionActions =
    !scratchpadOpen &&
    Boolean(
      canDisplayVertically ||
        mathScratchpadAvailable ||
        questionBookHref ||
        mathShowMultiplicationTableButton
    );

  const questionPressureLayout = currentQuestion
    ? buildLearningMasterQuestionPressureLayout({
        MB,
        questionParts: [
          currentQuestion.question,
          currentQuestion.questionLabel,
          currentQuestion.exerciseText,
          isVerticalDisplay && canDisplayVertically
            ? getVerticalExercise() || currentQuestion.exerciseText
            : null,
        ],
        answers: currentQuestion.answers ?? [],
        hasFloatButtons: mathHasFloatButtons,
      })
    : null;

  const isMathVerbalHorizontalStem = Boolean(
    currentQuestion &&
      isApprovedVerbalTextStem({
        question: currentQuestion.question,
        questionLabel: currentQuestion.questionLabel,
        exerciseText: currentQuestion.exerciseText,
        isVerticalDisplay,
        canDisplayVertically,
      })
  );

  const verbalVisualLayout = currentQuestion
    ? buildApprovedVerbalStemLayout({
        MB,
        question: currentQuestion.question,
        questionLabel: currentQuestion.questionLabel,
        exerciseText: currentQuestion.exerciseText,
        answers: currentQuestion.answers ?? [],
      })
    : null;

  const isFractionsQuestionStem =
    currentQuestion?.operation === "fractions";
  /** Fractions MCQ — trailing BLANK is a redundant placeholder (shared helper). */
  const hideFractionsMcqTrailingBlank = shouldHideFractionsMcqTrailingBlank(
    currentQuestion,
    {
      usesChoiceUi:
        Array.isArray(currentQuestion?.answers) &&
        currentQuestion.answers.length >= 2,
    }
  );
  const displayQuestionForStem = hideFractionsMcqTrailingBlank
    ? stripRedundantTrailingAnswerBlank(currentQuestion.question)
    : currentQuestion?.question;
  const displayExerciseTextForStem = hideFractionsMcqTrailingBlank
    ? stripRedundantTrailingAnswerBlank(currentQuestion.exerciseText)
    : currentQuestion?.exerciseText;

  return (
    <MasterSubjectAccessScreen permissionKey="math" titleHe="מתמטיקה">
    <Layout>
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        @keyframes celebrate {
          0% { transform: scale(0) rotate(0deg); opacity: 0; }
          50% { transform: scale(1.2) rotate(180deg); opacity: 1; }
          100% { transform: scale(1) rotate(360deg); opacity: 0; }
        }
        .animate-celebrate {
          animation: celebrate 1s ease-out;
        }
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti 2s ease-out forwards;
        }
      `}</style>
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
        <div className="absolute inset-0 opacity-0 pointer-events-none hidden">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />
        </div>

        <LearningMasterDesktopHeader
          MB={MB}
          desktopHeaderRef={desktopHeaderRef}
          titleAnchorRef={desktopScratchpadAnchorRef}
          title="🧮 מתמטיקה"
          subtitle={`${playerName || "שחקן"} • ${GRADES[grade].name} • ${studentDisplayLevelLabel(displayLevel)} • ${getOperationName(operation)} • ${MODES[mode].name}`}
          onBack={backSafe}
          onCurriculumClick={() => router.push("/learning/curriculum?subject=math")}
          audio={audio}
        />

        <div className="md:hidden">
          <LearningMasterNavBar
            MB={MB}
            headerRef={headerRef}
            onCurriculumClick={() => router.push("/learning/curriculum?subject=math")}
            onBack={backSafe}
            hideCurriculum
            compactHeader
            integratedTopRow
            centerSlot={
              <LearningMasterMobileNavTitle MB={MB} title="🧮 מתמטיקה" audio={audio} />
            }
          />
        </div>

        <div
          className={LEARNING_MASTER_MOBILE_CONTENT_SCROLL_CLASS}
          style={{
            height: "100%",
            maxHeight: "100%",
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
          }}
        >
          <div className={LEARNING_MASTER_MOBILE_SUBTITLE_ROW_CLASS} ref={mobileScratchpadAnchorRef}>
            <p className={`${MB.pageSub} max-md:leading-none max-md:mb-0`}>
              {playerName || "שחקן"} • {GRADES[grade].name} •{" "}
              {studentDisplayLevelLabel(displayLevel)} • {getOperationName(operation)} •{" "}
              {MODES[mode].name}
            </p>
          </div>

          <LearningMasterHud
            MB={MB}
            controlsRef={controlsRef}
            className={LEARNING_MASTER_MOBILE_HUD_CLASS}
            topHud={subjectView.topHud}
            lives={lives}
            mode={mode}
            gameActive={gameActive}
            timeLeft={timeLeft}
            onAvatarClick={() => setShowPlayerProfile(true)}
            playerAvatar={playerAvatar}
            playerAvatarImage={playerAvatarImage}
            playerAvatarBackground={playerAvatarBackground}
          />

          {/* בחירת מצב (תרגול / למידה / מהירות / מרתון / אתגר) */}
          <div
            className={LEARNING_MASTER_MOBILE_MODE_ROW_CLASS}
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

          {/* הודעות מיוחדות */}
          {showBadge && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none" dir="rtl">
              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white px-8 py-6 rounded-2xl shadow-2xl text-center animate-bounce">
                <div className="text-4xl mb-2">🎉</div>
                <div className="text-2xl font-bold">תג חדש!</div>
                <div className="text-xl">{showBadge}</div>
              </div>
            </div>
          )}

          {showStreakReward && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none" dir="rtl">
              <div className="bg-gradient-to-br from-orange-400 to-red-500 text-white px-8 py-6 rounded-2xl shadow-2xl text-center animate-bounce">
                <div className="text-4xl mb-2">{showStreakReward.emoji}</div>
                <div className="text-xl font-bold">{showStreakReward.message}</div>
              </div>
            </div>
          )}

          {showLevelUp && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none" dir="rtl">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white px-8 py-6 rounded-2xl shadow-2xl text-center animate-pulse">
                <div className="text-4xl mb-2">🌟</div>
                <div className="text-2xl font-bold">עלית רמה!</div>
                <div className="text-base">עכשיו אתה ברמה {playerLevel}!</div>
              </div>
            </div>
          )}

          {/* פרופיל שחקן */}
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
                style={{ 
                  scrollbarGutter: "stable",
                  scrollbarWidth: "thin"
                }}
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

                {/* אווטר ונתונים בשורה */}
                <div className="bg-black/30 border border-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-3 mb-3">
                      <StudentLearningAvatar
                        avatarEmoji={playerAvatar || "👤"}
                        avatarCustomDataUrl={playerAvatarImage || ""}
                        avatarBackgroundKey={playerAvatarBackground}
                        sizeClass="h-16 w-16 text-5xl"
                      />
                      <div className="flex-1">
                        <div className="text-sm text-white/60 mb-1">שם שחקן</div>
                        <div className="text-lg font-bold text-white">{playerName || "שחקן"}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-black/40 border border-white/10 rounded-lg p-2">
                        <div className="text-xs text-white/60 mb-1">ניקוד שיא</div>
                        <div className="text-lg font-bold text-emerald-400">{bestScore}</div>
                      </div>
                      <div className="bg-black/40 border border-white/10 rounded-lg p-2">
                        <div className="text-xs text-white/60 mb-1">רצף שיא</div>
                        <div className="text-lg font-bold text-amber-400">{bestStreak}</div>
                      </div>
                      <div className="bg-black/40 border border-white/10 rounded-lg p-2">
                        <div className="text-xs text-white/60 mb-1">כוכבים</div>
                        <div className="text-lg font-bold text-yellow-400">⭐ {stars}</div>
                      </div>
                      <div className="bg-black/40 border border-white/10 rounded-lg p-2">
                        <div className="text-xs text-white/60 mb-1">רמה</div>
                        <div className="text-lg font-bold text-purple-400">רמה {playerLevel}</div>
                      </div>
                    </div>
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
                    <div className="mt-3">
                      <div className="text-xs text-white/60 mb-2">בחר אווטר:</div>
                      
                      {/* כפתור לבחירת תמונה */}
                      <div className="mb-3">
                        <label className="block w-full">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarImageUpload}
                            className="hidden"
                            id="avatar-image-upload"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => document.getElementById("avatar-image-upload").click()}
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
                      
                      <div className="grid grid-cols-6 gap-2">
                        {AVATAR_OPTIONS.map((avatar) => (
                          <button
                            key={avatar}
                            onClick={() => {
                              setPlayerAvatar(avatar);
                              setPlayerAvatarImage(null);
                              if (typeof window !== "undefined") {
                                localStorage.setItem("mleo_player_avatar", avatar);
                                localStorage.removeItem("mleo_player_avatar_image");
                              }
                            }}
                            className={`text-2xl p-1.5 rounded-lg transition-all ${
                              !playerAvatarImage && playerAvatar === avatar
                                ? "bg-yellow-500/40 border-2 border-yellow-400 scale-110"
                                : "bg-black/30 border border-white/10 hover:bg-black/40"
                            }`}
                          >
                            {avatar}
                          </button>
                        ))}
                      </div>

                      <div className="mt-3">
                        <ProfileBackgroundPickerGrid
                          variant="dark"
                          selectedKey={playerAvatarBackground}
                          onSelect={handleSelectProfileBackground}
                        />
                      </div>
                    </div>
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

                  {/* התקדמות לפי פעולות */}
                  {Object.keys(progress).some(op => progress[op].total > 0) && (
                    <div className="bg-black/30 border border-white/10 rounded-lg p-3">
                      <div className="text-sm text-white/60 mb-2">התקדמות לפי פעולות</div>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {Object.entries(progress)
                          .filter(([_, data]) => data.total > 0)
                          .sort(([_, a], [__, b]) => b.total - a.total)
                          .map(([op, data]) => {
                            const opAccuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                            return (
                              <div key={op} className="flex items-center justify-between text-xs">
                                <span className="text-white/80">{getOperationName(op)}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-white/60">{data.correct}/{data.total}</span>
                                  <span className={`font-bold ${opAccuracy >= 80 ? "text-emerald-400" : opAccuracy >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                                    {opAccuracy}%
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {mathInsights.weakest && mathInsights.strongest && (
                    <div className="bg-black/30 border border-white/10 rounded-lg p-3">
                      <div className="text-sm text-white/60 mb-2">תובנות מהתרגול (מקומי)</div>
                      <div className="text-xs text-white/85 space-y-1">
                        <div>
                          <span className="text-amber-300 font-semibold">לחזק:</span>{" "}
                          {getOperationName(mathInsights.weakest)}
                        </div>
                        <div>
                          <span className="text-emerald-300 font-semibold">חזק ביחס:</span>{" "}
                          {getOperationName(mathInsights.strongest)}
                        </div>
                        <p className="text-[11px] text-white/50 mt-2">
                          לפחות 2 ניסיונות; נשמר בדפדפן בלבד.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="bg-black/30 border border-white/10 rounded-lg p-3">
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
                  className="w-full px-4 py-2 rounded-lg bg-emerald-500/80 hover:bg-emerald-500 font-bold text-sm mt-4"
                >
                  סגור
                </button>
              </div>
            </div>
          )}

          {/* מודל תרגול ממוקד */}
          {showPracticeOptions && (
            <div
              role="dialog" aria-modal="true" className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4"
              onClick={() => setShowPracticeOptions(false)}
              dir="rtl"
            >
              <div
                className="bg-gradient-to-br from-[#080c16] to-[#0a0f1d] border-2 border-white/20 rounded-2xl p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-2xl font-extrabold text-white mb-4 text-center">
                  תרגול ממוקד
                </h2>

                <div className="space-y-3 mb-4">
                  <button
                    onClick={() => {
                      setShowPracticeOptions(false);
                      if (mistakes.length > 0) {
                        startGame({ focusedPracticeMode: "mistakes" });
                      }
                    }}
                    disabled={mistakes.length === 0}
                    className={`w-full p-4 rounded-lg border transition-all text-right ${
                      mistakes.length > 0
                        ? "bg-purple-500/20 border-purple-400/50 hover:bg-purple-500/30"
                        : "bg-gray-500/20 border-gray-400/30 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div className="text-lg font-bold text-white mb-1">
                      🔄 חזרה על שגיאות
                    </div>
                    <div className="text-sm text-white/70">
                      {mistakes.length > 0
                        ? `תרגל את ${mistakes.length} השגיאות שעשית`
                        : "אין שגיאות לתרגל"}
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShowPracticeOptions(false);
                      startGame({ focusedPracticeMode: "graded" });
                    }}
                    className="w-full p-4 rounded-lg bg-blue-500/20 border border-blue-400/50 hover:bg-blue-500/30 transition-all text-right"
                  >
                    <div className="text-lg font-bold text-white mb-1">
                      📈 תרגול מדורג
                    </div>
                    <div className="text-sm text-white/70">
                      תרגול מדורג - מתחיל ברמה נמוכה ומתקדם לרמה שבחרת
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      setFocusedPracticeMode("normal");
                      focusedPracticeModeRef.current = "normal";
                      setShowPracticeOptions(false);
                    }}
                    className="w-full p-4 rounded-lg bg-emerald-500/20 border border-emerald-400/50 hover:bg-emerald-500/30 transition-all text-right"
                  >
                    <div className="text-lg font-bold text-white mb-1">
                      🎮 תרגול רגיל
                    </div>
                    <div className="text-sm text-white/70">
                      חזור לתרגול רגיל
                    </div>
                  </button>
                </div>

                {mistakes.length > 0 && (
                  <div className="bg-black/30 border border-white/10 rounded-lg p-3 mb-4">
                    <div className="text-sm text-white/60 mb-2">שגיאות אחרונות:</div>
                    <div className="space-y-1 max-h-[150px] overflow-y-auto">
                      {mistakes.slice(-5).reverse().map((mistake, idx) => (
                        <div key={mistake.id || idx} className="text-xs text-white/80">
                          <span dir="ltr" style={{ display: 'inline-block' }}>{mistake.question}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    setMistakes([]);
                    if (typeof window !== "undefined") {
                      localStorage.setItem("mleo_mistakes", JSON.stringify([]));
                    }
                  }}
                  className="w-full px-4 py-2 rounded-lg bg-red-500/80 hover:bg-red-500 font-bold text-sm mb-2"
                >
                  🗑️ נקה שגיאות
                </button>

                <button
                  onClick={() => setShowPracticeOptions(false)}
                  className="w-full px-4 py-2 rounded-lg bg-emerald-500/80 hover:bg-emerald-500 font-bold text-sm"
                >
                  סגור
                </button>
              </div>
            </div>
          )}

          {!gameActive ? (
            <div className="relative flex flex-col flex-1 min-h-0 w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl items-center justify-start md:gap-1">
              {bookIndexHref ? (
                <LearningBookIndexTile
                  subject="math"
                  grade={grade}
                  testId={`math-${grade}-book-index-button`}
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
                  data-testid="math-player-name"
                  className={MB.preGamePlayerBadge}
                  dir={playerName && /[\u0590-\u05FF]/.test(playerName) ? "rtl" : "ltr"}
                  title={playerName.trim() ? playerName.trim() : undefined}
                  aria-label={playerName.trim() ? `שם ילד/ה: ${playerName.trim()}` : "שם ילד/ה לא זמין"}
                >
                  {playerName.trim() ? playerName.trim() : "שחקן"}
                </div>
                <select
                  data-testid="math-grade-select"
                  value={gradeNumber}
                  title={`כיתה ${["א", "ב", "ג", "ד", "ה", "ו"][gradeNumber - 1]}`}
                  disabled={!canPickGrade}
                  aria-disabled={!canPickGrade || undefined}
                  onChange={(e) => {
                    const newGradeNum = Number(e.target.value);
                    setGradeNumber(newGradeNum);
                    setGrade(`g${newGradeNum}`);
                    setGameActive(false);
                  }}
                  className={`${MB.selectControl} shrink-0 min-w-0 w-[5.75rem] max-w-[6.25rem] md:w-[6.5rem] md:max-w-[7rem]`}
                >
                  {[1, 2, 3, 4, 5, 6].map((g) => (
                    <option key={g} value={g}>
                      {`כיתה ${["א","ב","ג","ד","ה","ו"][g - 1]}`}
                    </option>
                  ))}
                </select>
                <StudentDisplayLevelSelect
                  subjectId="math"
                  value={displayLevel}
                  title={studentDisplayLevelLabel(displayLevel)}
                  onChange={handleDisplayLevelChange}
                  className={`${MB.selectControl} shrink-0 min-w-0 w-[5rem] max-w-[5.5rem] md:w-[5.75rem] md:max-w-[6.25rem]`}
                />
                <div className="flex flex-1 min-w-0 md:flex-none md:max-w-[min(22rem,42vw)] items-center gap-1.5 md:gap-2 shrink">
                  <select
                    ref={operationSelectRef}
                    data-testid="math-operation-select"
                    value={operation}
                    title={getOperationName(operation)}
                    onChange={(e) => {
                      const newOp = e.target.value;
                      if (guestTopics.isGuest && guestTopics.isLocked(newOp)) {
                        alert(GUEST_TOPIC_LOCK_MESSAGE_HE);
                        return;
                      }
                      setGameActive(false);
                      if (newOp === "mixed") {
                        setOperation(newOp);
                        setShowMixedSelector(true);
                      } else {
                        setOperation(newOp);
                        setShowMixedSelector(false);
                      }
                    }}
                    className={`${MB.selectControl} min-w-0 w-full md:w-[min(22rem,42vw)] md:max-w-[22rem]`}
                  >
                    <optgroup label="נושאים">
                      {visibleMathOps.map((op) => (
                        <option key={op} value={op} disabled={guestTopics.isLocked(op)}>
                          {guestTopics.label(op, getOperationName(op))}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="תרגול מעורב">
                      <option value="mixed">🔀 ערבוב נושאים</option>
                    </optgroup>
                  </select>
                  {operation === "mixed" && (
                    <button
                      type="button"
                      onClick={() => setShowMixedSelector(true)}
                      className={MB.preGameGearBtn}
                      title="ערוך פעולות למיקס"
                    >
                      ⚙️
                    </button>
                  )}
                </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5 md:gap-2 lg:gap-2.5 mb-3 md:mb-4 w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto" dir="rtl">
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
              

              <div className="mt-auto mb-2 max-[420px]:mb-1 w-full pt-3 max-[420px]:pt-2 md:pt-4 flex flex-col items-center gap-2.5 max-[420px]:gap-2 md:gap-3">
              <div className="flex items-center justify-center gap-1.5 md:gap-2.5 w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl flex-wrap px-1 md:px-2 mx-auto">
                <button
                  type="button"
                  data-testid="math-start-game"
                  onClick={startGame}
                  disabled={!playerName.trim()}
                  className={MB.btnPrimary}
                >
                  ▶️ התחל
                </button>
                <button
                  onClick={() => setShowMultiplicationTable(true)}
                  className={`${MB.btnAction} ${MB.btnActionBlue}`}
                >
                  📊 לוח כפל
                </button>
                <button
                  onClick={() => setShowLeaderboard(true)}
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
                  ❓ איך לומדים מתמטיקה כאן?
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
                    data-testid={`math-${grade}-book-topic-button`}
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
            <div className={`flex flex-col flex-1 min-h-0 w-full items-center${currentQuestion ? " max-md:-mt-1" : ""}`}>
              {/* אנימציה לתשובה נכונה */}
              {showCorrectAnimation && (
                <div className="fixed inset-0 pointer-events-none z-[300] flex items-center justify-center">
                  <div className="text-8xl animate-bounce animate-pulse">
                    {celebrationEmoji}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-6xl animate-ping opacity-75">
                      ✨
                    </div>
                  </div>
                </div>
              )}

              {/* אנימציה לתשובה שגויה */}
              {showWrongAnimation && (
                <div className="fixed inset-0 pointer-events-none z-[300] flex items-center justify-center">
                  <div className="text-6xl animate-shake">
                    😔
                  </div>
                </div>
              )}

              {currentQuestion && (
                <ScratchpadVirtualInputProvider onActiveCellChange={setActiveScratchpadCell}>
                <div
                  ref={gameRef}
                  className={LEARNING_MASTER_MOBILE_GAME_CLASS}
                >
                  {/* שכבת הודעות שלא משנה פריסה (אין מקום שמור / אין מיקרו-סק롤) */}
                  {(feedback || errorExplanation) && (
                    <div className="absolute top-0 left-0 right-0 z-[5] px-2 pt-1 pointer-events-none" role="status" aria-live="assertive" aria-atomic="true">
                      <div className="flex flex-col gap-2 items-stretch">
                        {feedback && (
                          <div
                            className={`px-4 py-2 rounded-lg text-sm font-semibold text-center transition-all duration-300 ${
                              showCorrectAnimation
                                ? MB.feedbackOkAnim
                                : showWrongAnimation
                                ? MB.feedbackBadAnim
                                : feedback.includes("נכון") ||
                                  feedback.includes("∞") ||
                                  feedback.includes("Start")
                                ? MB.feedbackOk
                                : MB.feedbackBad
                            }`}
                          >
                            {renderMaybeStackedFractionOrMixed(feedback)}
                          </div>
                        )}

                        {errorExplanation && (
                          <div className={MB.errorBox}>
                            <div className={MB.errorTitle}>
                              למה הטעות קרתה?
                            </div>
                            <div className={MB.errorBody}>
                              {renderMaybeStackedFractionOrMixed(errorExplanation)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* אזור שאלה יציב למניעת קפיצות בפריסת התשובות */}
                  <div
                    data-testid="math-question-surface"
                    className={`relative w-full flex-1 min-h-0 flex flex-col overflow-hidden px-2 ${mathShowMobileQuestionActions ? "max-md:pb-11" : ""} ${questionPressureLayout?.questionStemInsetClass ?? ""}`.trim()}
                  >
                    {canDisplayVertically && !scratchpadOpen && (
                      <button
                        type="button"
                        onClick={() => setIsVerticalDisplay((prev) => !prev)}
                        className={`${MB.floatBtn} ${MB.floatBtnPurple} ${MB.floatBtnCornerLeft} max-md:hidden pointer-events-auto`}
                        title={isVerticalDisplay ? "הצג מאוזן" : "הצג מאונך"}
                      >
                        {isVerticalDisplay ? "↔️ מאוזן" : "↕️ מאונך"}
                      </button>
                    )}

                    {!scratchpadOpen &&
                    (questionBookHref || mathShowMultiplicationTableButton) ? (
                      <div className={`${MB.floatBtnStack} max-md:hidden`}>
                        {questionBookHref ? (
                          <button
                            type="button"
                            data-testid={`math-${grade}-book-question-button`}
                            onClick={() => openBookFromLearning(questionBookHref)}
                            className={`${MB.floatBtnHelper} ${MB.floatBtnBookColors}`}
                            title="הסבר בספר לנושא הנוכחי"
                          >
                            הסבר
                          </button>
                        ) : null}
                        {mathShowMultiplicationTableButton ? (
                          <button
                            type="button"
                            onClick={() => {
                              setShowMultiplicationTable(true);
                              setTableMode(
                                currentQuestion.operation === "multiplication"
                                  ? "multiplication"
                                  : "division"
                              );
                              if (currentQuestion.operation === "multiplication") {
                                const a = currentQuestion.a;
                                const b = currentQuestion.b;
                                if (a >= 1 && a <= 12 && b >= 1 && b <= 12) {
                                  const value = a * b;
                                  setSelectedCell({ row: a, col: b, value });
                                  setSelectedRow(null);
                                  setSelectedCol(null);
                                  setSelectedResult(null);
                                  setSelectedDivisor(null);
                                }
                              } else {
                                const { a, b } = currentQuestion;
                                const value = a;
                                if (b >= 1 && b <= 12) {
                                  setSelectedCell({ row: 1, col: b, value });
                                  setSelectedResult(value);
                                  setSelectedDivisor(b);
                                  setSelectedRow(null);
                                  setSelectedCol(null);
                                }
                              }
                            }}
                            className={`${MB.floatBtnHelper} ${MB.floatBtnTable}`}
                          >
                            📊 לוח הכפל
                          </button>
                        ) : null}
                      </div>
                    ) : null}

                    {mathShowMobileQuestionActions ? (
                      <div
                        className={MB.questionMobileActionDock}
                        data-testid="math-question-mobile-actions"
                      >
                        <div className="pointer-events-auto justify-self-stretch min-w-0 flex flex-col items-stretch gap-1.5">
                          {questionBookHref ? (
                            <button
                              type="button"
                              data-testid={`math-${grade}-book-question-button`}
                              onClick={() => openBookFromLearning(questionBookHref)}
                              className={`${MB.questionActionBtn} ${MB.floatBtnBookColors}`}
                              title="הסבר בספר לנושא הנוכחי"
                            >
                              הסבר
                            </button>
                          ) : null}
                          {mathShowMultiplicationTableButton ? (
                            <button
                              type="button"
                              onClick={() => {
                                setShowMultiplicationTable(true);
                                setTableMode(
                                  currentQuestion.operation === "multiplication"
                                    ? "multiplication"
                                    : "division"
                                );
                                if (currentQuestion.operation === "multiplication") {
                                  const a = currentQuestion.a;
                                  const b = currentQuestion.b;
                                  if (a >= 1 && a <= 12 && b >= 1 && b <= 12) {
                                    const value = a * b;
                                    setSelectedCell({ row: a, col: b, value });
                                    setSelectedRow(null);
                                    setSelectedCol(null);
                                    setSelectedResult(null);
                                    setSelectedDivisor(null);
                                  }
                                } else {
                                  const { a, b } = currentQuestion;
                                  const value = a;
                                  if (b >= 1 && b <= 12) {
                                    setSelectedCell({ row: 1, col: b, value });
                                    setSelectedResult(value);
                                    setSelectedDivisor(b);
                                    setSelectedRow(null);
                                    setSelectedCol(null);
                                  }
                                }
                              }}
                              className={`${MB.questionActionBtn} ${MB.floatBtnTable}`}
                            >
                              📊 לוח הכפל
                            </button>
                          ) : null}
                          {!questionBookHref && !mathShowMultiplicationTableButton ? (
                            <span className="block h-8 w-full" aria-hidden="true" />
                          ) : null}
                        </div>
                        <div className="pointer-events-auto justify-self-center min-w-0 flex justify-center">
                          {mathScratchpadAvailable ? (
                            <button
                              type="button"
                              onClick={() => handleScratchpadOpenChange(true)}
                              className={`${MB.questionActionBtn} ${MB.floatBtnScratchpad} w-auto px-3`}
                              data-testid="math-scratchpad-open"
                            >
                              דף טיוטה
                            </button>
                          ) : null}
                        </div>
                        <div className="pointer-events-auto justify-self-stretch min-w-0">
                          {canDisplayVertically ? (
                            <button
                              type="button"
                              onClick={() => setIsVerticalDisplay((prev) => !prev)}
                              className={`${MB.questionActionBtn} ${MB.floatBtnPurple}`}
                              title={isVerticalDisplay ? "הצג מאוזן" : "הצג מאונך"}
                              data-testid="activity-math-layout-toggle"
                            >
                              {isVerticalDisplay ? "↔️ מאוזן" : "↕️ מאונך"}
                            </button>
                          ) : (
                            <span className="block h-8 w-full" aria-hidden="true" />
                          )}
                        </div>
                      </div>
                    ) : null}
                    <MathScratchpadSlot
                      gradeKey={grade}
                      operation={currentQuestion.operation || operation}
                      question={currentQuestion}
                      questionKey={
                        mathQuestionFingerprint(currentQuestion) ||
                        `${currentQuestion.question}|${currentQuestion.correctAnswer}`
                      }
                      forceClose={isShowingAnySolution}
                      closeSignal={scratchpadCloseSignal}
                      onOpenChange={handleScratchpadOpenChange}
                      open={scratchpadOpen}
                      overlayTopRef={scratchpadOverlayTopRef}
                      overlayWidthRef={controlsRef}
                      answerAnchorRef={answerAreaRef}
                      exerciseHeadlineOverride={
                        isVerticalDisplay &&
                        canDisplayVertically &&
                        currentQuestion.exerciseText
                          ? getVerticalExercise() || currentQuestion.exerciseText
                          : undefined
                      }
                      getQuestionFontStyle={getQuestionFontStyle}
                      openButtonClassName={MB.scratchpadOpenBtn}
                      openButtonWrapClassName="max-md:hidden"
                    >

                    {/* הפרדה בין שורת השאלה לשורת התרגיל */}
                    {isVerticalDisplay &&
                    canDisplayVertically &&
                    currentQuestion.exerciseText ? (
                      <div className="relative w-full pr-2 pl-2 pt-0">
                        {(() => {
                          const displayParts = resolveStudentQuestionDisplayParts({
                            question: currentQuestion.question,
                            questionLabel: currentQuestion.questionLabel,
                            exerciseText: currentQuestion.exerciseText,
                          });
                          return displayParts.leadText ? (
                            <p
                              className={
                                questionPressureLayout?.questionLeadClassByPressure ??
                                MB.questionLead
                              }
                              dir="rtl"
                              data-testid="student-question-lead"
                              style={{
                                direction: "rtl",
                                unicodeBidi: "isolate",
                                lineHeight:
                                  questionPressureLayout?.questionLineHeightByPressure,
                                ...getQuestionFontStyle({
                                  text: displayParts.leadText,
                                  kind: "label",
                                }),
                                ...getVerbalInstructionStyle({
                                  text: displayParts.leadText,
                                  isMobileViewport,
                                  className:
                                    questionPressureLayout?.questionLeadClassByPressure ??
                                    MB.questionLead,
                                }),
                              }}
                            >
                              {displayParts.leadText}
                            </p>
                          ) : null;
                        })()}

                        <div
                          className="flex justify-center w-full max-w-full px-2 overflow-x-hidden"
                          data-testid="student-question-body"
                          dir="ltr"
                        >
                          <pre
                            className={
                              questionPressureLayout?.verticalPreClassByPressure ??
                              MB.questionPre
                            }
                            style={{
                              direction: "ltr",
                              unicodeBidi: "isolate",
                              color: MATH_NUMERIC_QUESTION_BODY_COLOR,
                              lineHeight:
                                questionPressureLayout?.questionLineHeightByPressure,
                              ...getQuestionFontStyle({
                                text:
                                  getVerticalExercise() ||
                                  currentQuestion.exerciseText,
                              }),
                            }}
                          >
                            {getVerticalExercise() || currentQuestion.exerciseText}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <StudentQuestionDisplay
                        question={displayQuestionForStem}
                        questionLabel={currentQuestion.questionLabel}
                        exerciseText={displayExerciseTextForStem}
                        stackedFractions={
                          currentQuestion.operation === "fractions" ||
                          hasStackedFractionToken(
                            displayExerciseTextForStem ||
                              displayQuestionForStem ||
                              ""
                          )
                        }
                        getQuestionFontStyle={(opts) =>
                          getMathHorizontalQuestionFontStyle(opts, isMobileViewport)
                        }
                        getEquationFontStyle={(opts) =>
                          getMathHorizontalEquationFontStyle(opts, isMobileViewport)
                        }
                        resolveVerbalSingleStyle={
                          isMathVerbalHorizontalStem
                            ? getHebrewApprovedSingleVerbalQuestionStyle
                            : undefined
                        }
                        wrapperClassName={
                          isMathVerbalHorizontalStem
                            ? undefined
                            : "relative w-full max-w-full pr-2 pl-2 pt-0 flex flex-col items-center justify-center gap-1"
                        }
                        leadClassName={
                          isMathVerbalHorizontalStem
                            ? verbalVisualLayout?.questionLeadClassName ??
                              MB.questionLead
                            : questionPressureLayout?.questionLeadClassByPressure ??
                              MB.questionLead
                        }
                        bodyClassName={
                          isMathVerbalHorizontalStem
                            ? `${verbalVisualLayout?.questionBodyClassName ?? MB.questionBody}${
                                currentQuestion.operation === "sequences"
                                  ? " whitespace-normal break-words overflow-wrap-anywhere"
                                  : ""
                              }${
                                isFractionsQuestionStem
                                  ? MATH_FRACTIONS_QUESTION_STEM_SIZE_CLASS
                                  : ""
                              }`
                            : `${boostHorizontalQuestionBodyClass(
                                questionPressureLayout?.questionBodyClassByPressure ??
                                  MB.questionBody,
                                isMobileViewport
                              )} ${
                                currentQuestion.operation === "sequences"
                                  ? "whitespace-normal break-words overflow-wrap-anywhere"
                                  : ""
                              }${
                                isFractionsQuestionStem
                                  ? MATH_FRACTIONS_QUESTION_STEM_SIZE_CLASS
                                  : ""
                              }`
                        }
                        formulaClassName={
                          isFractionsQuestionStem
                            ? `${MB.questionFormula}${MATH_FRACTIONS_QUESTION_STEM_SIZE_CLASS}`
                            : `${MB.questionFormula} text-4xl md:text-3xl`
                        }
                        leadStyle={{
                          lineHeight: isMathVerbalHorizontalStem
                            ? verbalVisualLayout?.questionLineHeightByPressure
                            : questionPressureLayout?.questionLineHeightByPressure,
                        }}
                        bodyStyle={{
                          lineHeight: isMathVerbalHorizontalStem
                            ? verbalVisualLayout?.questionLineHeightByPressure
                            : questionPressureLayout?.questionLineHeightByPressure,
                        }}
                        bodyTextColor={
                          isMathVerbalHorizontalStem
                            ? undefined
                            : MATH_NUMERIC_QUESTION_BODY_COLOR
                        }
                      />
                    )}
                    </MathScratchpadSlot>
                  </div>

                  {/* אזור התשובות/בקרים (קבוע בתחתית) - נשאר חשוף מעל overlay */}
                  <div
                    ref={answerAreaRef}
                    data-testid="math-answer-surface"
                    className={`${LEARNING_MASTER_ANSWER_SURFACE_CLASS} relative z-30`}
                  >
                    {/* בדיקה אם צריך להציג כפתורי בחירה או שדה קלט */}
                    {(() => {
                    // נושאים שצריכים כפתורי בחירה: שברים, יחס, השוואה, קנה מידה, גורמים וכפולות, חילוק עם שארית
                    const needsChoiceButtons = 
                      currentQuestion.operation === "fractions" ||
                      currentQuestion.operation === "ratio" ||
                      currentQuestion.operation === "scale" ||
                      currentQuestion.operation === "compare" ||
                      currentQuestion.operation === "factors_multiples" ||
                      currentQuestion.operation === "division_with_remainder" ||
                      // בדיקה אם יש תשובות שאינן מספרים
                      (currentQuestion.answers && currentQuestion.answers.some(ans => {
                        if (typeof ans === "string") {
                          // בדיקה אם המחרוזת מכילה שבר או תווים שאינם מספרים
                          return ans.includes("/") || ans.includes(" ") || isNaN(parseFloat(ans));
                        }
                        return false;
                      })) ||
                      // בדיקה אם התשובה הנכונה היא מחרוזת שאינה מספר
                      (typeof currentQuestion.correctAnswer === "string" && 
                       (currentQuestion.correctAnswer.includes("/") || 
                        currentQuestion.correctAnswer.includes(" ") || 
                        isNaN(parseFloat(currentQuestion.correctAnswer))));

                    // מצבים שצריכים כפתורי בחירה: challenge, speed, marathon, או נושאים מיוחדים
                    const shouldShowChoiceButtons = 
                      mode === "challenge" || 
                      mode === "speed" || 
                      mode === "marathon" || 
                      needsChoiceButtons;

                    if (shouldShowChoiceButtons) {
                      // כפתורי בחירה
                      // בנושא השוואה - 3 עמודות, כפתורים קטנים יותר
                      const isCompare = currentQuestion.operation === "compare";
                      const mcqGridClassName = isCompare
                        ? `grid grid-cols-3 gap-3 w-full mb-3 max-[420px]:gap-2 max-[420px]:mb-2 ${
                            isMobileViewport
                              ? LEARNING_MASTER_MOBILE_ANSWER_SCALE_CLASS
                              : ""
                          }`
                        : buildHebrewApprovedVerbalMcqGridClassName({
                            useNarrowMobileAnswerFallback:
                              verbalVisualLayout?.useNarrowMobileAnswerFallback,
                            isMobileViewport,
                          });
                      const mcqCardSizeClass = isCompare
                        ? "px-3 py-3 max-[420px]:px-2.5 max-[420px]:py-2.5 text-lg max-[420px]:text-base leading-snug"
                        : `${verbalVisualLayout?.answerCardTextClass ?? ""} ${verbalVisualLayout?.answerCardNarrowClass ?? ""}`.trim();

                      return (
                          <div
                            className={mcqGridClassName}
                            dir={isCompare ? "ltr" : undefined}
                            style={
                              isCompare
                                ? { direction: "ltr", unicodeBidi: "isolate" }
                                : undefined
                            }
                          >
                            {currentQuestion.answers.map((answer, idx) => {
                              const isSelected = selectedAnswer === answer;
                              const isCorrect = compareLearnerAnswerForQuestion(
                                currentQuestion,
                                answer
                              ).isCorrect;
                              const isWrong = isSelected && !isCorrect;

                              return (
                                <button
                                  key={idx}
                                  onClick={() => handleAnswer(answer)}
                                  disabled={!!selectedAnswer}
                                  className={`rounded-xl border-2 transition-all active:scale-95 disabled:opacity-50 ${mcqCardSizeClass} ${resolveLearningMcqChoiceClassName(
                                    {
                                      MB,
                                      isSelected,
                                      isCorrectChoice: isCorrect,
                                      isWrong,
                                      revealResults: selectedAnswer != null,
                                    }
                                  )}`}
                                >
                                  {renderAnswerLabel(answer)}
                                </button>
                              );
                            })}
                          </div>
                      );
                    } else if ((mode === "learning" || mode === "practice") && !practiceMode) {
                      // שדה קלט טקסט למצבי למידה ותרגול
                      const primaryBtn = getMathPrimaryAnswerButtonState({
                        selectedAnswer,
                        textAnswer,
                      });
                      const embeddedSubmitButton = mobileEmbeddedNumericSubmit
                        ? {
                            label: primaryBtn.label,
                            onClick: handleMathPrimaryAnswerButtonClick,
                            disabled: primaryBtn.disabled,
                            testId: "math-check-answer",
                          }
                        : null;
                      return (
                        <div className={MB.answerWrap}>
                          <div
                            className={`text-center ${
                              mobileEmbeddedNumericSubmit
                                ? isMobileViewport
                                  ? "mb-0"
                                  : "mb-1 max-[420px]:mb-0.5"
                                : "mb-3 max-[420px]:mb-2"
                            }`}
                          >
                            <StudentNumericAnswerField
                              subject="math"
                              value={textAnswer}
                              onChange={setTextAnswer}
                              disabled={!!selectedAnswer}
                              testId="math-text-answer"
                              placeholder="תשובה"
                              autoFocus={!scratchpadOpen}
                              inputClassName={
                                isMobileViewport
                                  ? LEARNING_MASTER_MOBILE_NUMERIC_INPUT
                                  : isTouchDevice
                                    ? MB.inputMobile
                                    : MB.inputDesktop
                              }
                              suppressEmbeddedKeyboard={sharedScratchpadKeyboard}
                              {...buildLearningMasterMobileNumericFieldProps(isMobileViewport)}
                              onInputFocus={() => setActiveScratchpadCell(null)}
                              onEnterSubmit={handleMathPrimaryAnswerButtonClick}
                              onSubmit={handleMathPrimaryAnswerButtonClick}
                              submitDisabled={primaryBtn.disabled}
                              submitLabel={primaryBtn.label}
                              submitTone={primaryBtn.action === "next" ? "blue" : "green"}
                              submitTestId="math-check-answer"
                            />
                          </div>
                          {sharedScratchpadKeyboard ? (
                            <VirtualAnswerKeyboard
                              layout={mathVkPolicy.layout || "numeric"}
                              value={
                                activeScratchpadCell
                                  ? activeScratchpadCell.value
                                  : textAnswer
                              }
                              onChange={(next) => {
                                if (activeScratchpadCell) {
                                  activeScratchpadCell.onChange(next);
                                } else {
                                  setTextAnswer(next);
                                }
                              }}
                              disabled={!!selectedAnswer}
                              compact={isMobileViewport || isTouchDevice}
                              variant="default"
                              className={
                                isMobileViewport
                                  ? LEARNING_MASTER_MOBILE_VK_KEYBOARD_SHELL
                                  : MB.vkPad
                              }
                              keyClassName={
                                isMobileViewport
                                  ? LEARNING_MASTER_MOBILE_VK_KEY
                                  : isTouchDevice
                                    ? MB.vkKeyCompact
                                    : MB.vkKey
                              }
                              actionKeyClassName={
                                isMobileViewport
                                  ? LEARNING_MASTER_MOBILE_VK_KEY
                                  : isTouchDevice
                                    ? `${MB.vkKeyCompact} text-sm`
                                    : MB.vkKey
                              }
                              clearKeyClassName={
                                isMobileViewport ? LEARNING_MASTER_MOBILE_VK_CLEAR : undefined
                              }
                              submitClassName={
                                isMobileViewport
                                  ? primaryBtn.action === "next"
                                    ? LEARNING_MASTER_MOBILE_VK_SUBMIT_BLUE
                                    : LEARNING_MASTER_MOBILE_VK_SUBMIT_GREEN
                                  : primaryBtn.action === "next"
                                    ? MB.vkSubmitBlue
                                    : MB.vkSubmitGreen
                              }
                              spacerClassName={
                                isMobileViewport ? LEARNING_MASTER_MOBILE_VK_SPACER : undefined
                              }
                              rowGapClassName={
                                isMobileViewport ? LEARNING_MASTER_MOBILE_VK_ROW_GAP : undefined
                              }
                              colGapClassName={
                                isMobileViewport ? LEARNING_MASTER_MOBILE_VK_ROW_GAP : undefined
                              }
                              submitButton={embeddedSubmitButton}
                              submitTone={primaryBtn.action === "next" ? "blue" : "green"}
                            />
                          ) : null}
                          {!mobileEmbeddedNumericSubmit ? (
                            <div className="flex justify-center">
                              <button
                                type="button"
                                data-testid="math-check-answer"
                                onClick={handleMathPrimaryAnswerButtonClick}
                                disabled={primaryBtn.disabled}
                                className={`${
                                  primaryBtn.action === "next" ? MB.checkBtnNext : MB.checkBtn
                                } disabled:cursor-not-allowed`}
                              >
                                {primaryBtn.label}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    } else {
                      // ברירת מחדל - כפתורי בחירה
                      // בנושא השוואה - 3 עמודות, כפתורים קטנים יותר
                      const isCompare = currentQuestion.operation === "compare";
                      const mcqGridClassName = isCompare
                        ? `grid grid-cols-3 gap-3 w-full mb-3 max-[420px]:gap-2 max-[420px]:mb-2 ${
                            isMobileViewport
                              ? LEARNING_MASTER_MOBILE_ANSWER_SCALE_CLASS
                              : ""
                          }`
                        : buildHebrewApprovedVerbalMcqGridClassName({
                            useNarrowMobileAnswerFallback:
                              verbalVisualLayout?.useNarrowMobileAnswerFallback,
                            isMobileViewport,
                          });
                      const mcqCardSizeClass = isCompare
                        ? "px-3 py-3 max-[420px]:px-2.5 max-[420px]:py-2.5 text-lg max-[420px]:text-base leading-snug"
                        : `${verbalVisualLayout?.answerCardTextClass ?? ""} ${verbalVisualLayout?.answerCardNarrowClass ?? ""}`.trim();

                      return (
                          <div
                            className={mcqGridClassName}
                            dir={isCompare ? "ltr" : undefined}
                            style={
                              isCompare
                                ? { direction: "ltr", unicodeBidi: "isolate" }
                                : undefined
                            }
                          >
                            {currentQuestion.answers.map((answer, idx) => {
                              const isSelected = selectedAnswer === answer;
                              const isCorrect = compareLearnerAnswerForQuestion(
                                currentQuestion,
                                answer
                              ).isCorrect;
                              const isWrong = isSelected && !isCorrect;

                              return (
                                <button
                                  key={idx}
                                  onClick={() => handleAnswer(answer)}
                                  disabled={!!selectedAnswer}
                                  className={`rounded-xl border-2 transition-all active:scale-95 disabled:opacity-50 ${mcqCardSizeClass} ${resolveLearningMcqChoiceClassName(
                                    {
                                      MB,
                                      isSelected,
                                      isCorrectChoice: isCorrect,
                                      isWrong,
                                      revealResults: selectedAnswer != null,
                                    }
                                  )}`}
                                >
                                  {renderAnswerLabel(answer)}
                                </button>
                              );
                            })}
                          </div>
                      );
                    }
                  })()}

                  {/* כפתורי הסבר / עצירה */}
                  {currentQuestion && (
                    <div className="mt-2 flex flex-col gap-2 w-full">
                      <div className={MB.answerActionsBar} dir="rtl">
                        {mode === "learning" && (
                          <button
                            type="button"
                            onClick={() => {
                              clearWrongAnswerAdvanceTimer();
                              stepByStepViewedRef.current = true;
                              setShowSolution((prev) => !prev);
                            }}
                            className={MB.btnStepByStep}
                          >
                            📖 צעד-צעד
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
                              className={MB.btnPrevExercise}
                            >
                              🕘 תרגיל קודם
                            </button>
                          )}
                  </div>

                      {/* חלון הסבר מלא - Modal גדול ומרכזי - למידה/תרגול קודם */}
                      {(((mode === "learning" && showSolution && currentQuestion) ||
                        ((mode === "learning" || mode === "practice") &&
                          showPreviousSolution &&
                          previousExplanationQuestion)) &&
                        explanationQuestion) && (() => {
                        const p = explanationQuestion.params || {};
                        const op = explanationQuestion.operation;
                        let effectiveOp = op;
                        let aEff = p.a ?? explanationQuestion.a;
                        let bEff = p.b ?? explanationQuestion.b;
                        
                        // טיפול כללי בתרגילי השלמה
                        const missingConversion = convertMissingNumberEquation(op, p.kind, p);
                        if (missingConversion) {
                          effectiveOp = missingConversion.effectiveOp;
                          aEff = missingConversion.top;
                          bEff = missingConversion.bottom;
                        }
                        // טיפול במספר שלילי בחיבור (רק אם זה לא תרגיל השלמה)
                        else if (op === "addition" && typeof bEff === "number" && bEff < 0) {
                          effectiveOp = "subtraction";
                          bEff = Math.abs(bEff);
                        }
                        
                        const answer = explanationQuestion.correctAnswer !== undefined
                          ? explanationQuestion.correctAnswer
                          : explanationQuestion.answer;
                        
                        // בדיקה אם יש תצוגה מאונכת - חיבור, חיסור, כפל, חילוק, עשרוניים
                        const hasAnimation = (effectiveOp === "addition" || effectiveOp === "subtraction" || 
                                             effectiveOp === "multiplication" || effectiveOp === "division" || effectiveOp === "division_with_remainder" ||
                                             op === "decimals") && 
                                            typeof aEff === "number" && typeof bEff === "number";
                        
                        // מודל עם אנימציה - בדיקה ראשונית
                        if (!animationSteps || !Array.isArray(animationSteps) || animationSteps.length === 0) {
                          // אין אנימציה - חזרה למודל הישן
                          const info = stepExplanation;
                          if (!info) return null;
                          
                          return (
                            <div
                              className={learningModalOverlay}
                              onClick={closeExplanationModal}
                            >
                              <div
                                className={learningModalPanel}
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
                                  <h3 className={learningModalTitle} dir="rtl">
                                    {showPreviousSolution
                                      ? "פתרון התרגיל הקודם"
                                      : "\u200Fאיך פותרים את התרגיל?"}
                                  </h3>
                                  <span className="w-10 shrink-0" aria-hidden />
                                </div>
                                
                                <StepExerciseUiProvider value={stepExerciseUi}>
                                <div className={learningModalScrollBody} dir="rtl">
                                  <div className={`mb-3 ${learningQuestionBox}`} dir="ltr">
                                    <div
                                      className={`${learningQuestionText} text-center`}
                                      style={{
                                        direction: "ltr",
                                        unicodeBidi: "isolate",
                                        wordBreak: "break-word",
                                        overflowWrap: "break-word",
                                      }}
                                    >
                                      {renderMaybeStackedFractionText(info.exercise || explanationQuestion.exerciseText || explanationQuestion.question)}
                                    </div>
                                  </div>
                                  {info.vertical && (
                                    <div className={MB.explVertical}>
                                      <pre
                                        dir="ltr"
                                        className="text-center font-mono text-base leading-relaxed whitespace-pre text-slate-800"
                                      >
                                        {info.vertical}
                                      </pre>
                                    </div>
                                  )}
                                  <div
                                    className="space-y-2"
                                    style={{ direction: "rtl", unicodeBidi: "isolate" }}
                                  >
                                    {info.steps.map((step, idx) => (
                                      <div key={idx} className={learningExplBody}>
                                        {step}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                </StepExerciseUiProvider>
                                
                                <div className={learningModalFooter}>
                                  <div className="flex justify-center">
                                    <button
                                      type="button"
                                      onClick={closeExplanationModal}
                                      className={learningPrimaryCloseBtn}
                                    >
                                      סגור
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        
                        // וודא ש-animationStep בטווח תקין
                        const safeStepIndex = Math.max(0, Math.min(animationStep || 0, animationSteps.length - 1));
                        const activeStep = animationSteps[safeStepIndex];
                        
                        if (!activeStep) {
                          return null;
                        }
                        
                        // תצוגה מאונכת - חיבור, חיסור, כפל, חילוק, עשרוניים
                        if (hasAnimation) {
                          // קביעת הערכים לפי סוג הפעולה
                          let aVal = aEff;
                          let bVal = bEff;
                          let answerVal = answer;
                          let opSymbol = effectiveOp === "addition" ? "+" : 
                                        effectiveOp === "subtraction" ? "−" : 
                                        effectiveOp === "multiplication" ? "×" : 
                                        (effectiveOp === "division" || effectiveOp === "division_with_remainder") ? "÷" : "";
                          
                          // טיפול בעשרוניים
                          if (op === "decimals" && currentQuestion.params) {
                            const p = currentQuestion.params;
                            aVal = (p.a ?? aEff);
                            bVal = (p.b ?? bEff);
                            answerVal = answer;
                            opSymbol = p.kind === "dec_add" ? "+" : "−";
                          }
                          
                          // טיפול בכפל
                          if (effectiveOp === "multiplication" && currentQuestion.params) {
                            aVal = currentQuestion.params.a;
                            bVal = currentQuestion.params.b;
                            answerVal = answer;
                            opSymbol = "×";
                          }
                          
                          // טיפול בחילוק
                          if ((effectiveOp === "division" || effectiveOp === "division_with_remainder") && currentQuestion.params) {
                            aVal = (currentQuestion.params.dividend ?? aEff);
                            bVal = (currentQuestion.params.divisor ?? bEff);
                            answerVal = (currentQuestion.params.quotient ?? answer);
                            opSymbol = "÷";
                          }

                          const isDecimal = op === "decimals";

                          const layoutProps = {
                            topValue: aVal,
                            bottomValue: bVal,
                            answerValue: answerVal,
                            operator: opSymbol,
                            isDecimal,
                          };

                          const exerciseRouter = shouldShowStandaloneExerciseView(
                            activeStep,
                            explanationQuestion,
                            layoutProps
                          ) ? (
                            <StepExerciseViewRouter
                              key={activeStep?.id ?? `step-${safeStepIndex}`}
                              step={activeStep}
                              question={explanationQuestion}
                              layoutProps={layoutProps}
                              stepIndex={safeStepIndex}
                            />
                          ) : null;
                          
                          // חיבור, חיסור, כפל, חילוק — router אחיד
                          return (
                            <div
                              className={learningModalOverlay}
                              onClick={closeExplanationModal}
                              dir="rtl"
                            >
                              <div
                                className={learningModalPanel}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* כותרת - קבועה */}
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
                                      : "\u200Fאיך פותרים את התרגיל?"}
                                  </h3>
                                  <span className="w-10 shrink-0" aria-hidden />
                                </div>
                                
                                {/* תוכן - גלילה */}
                                <StepExerciseUiProvider value={stepExerciseUi}>
                                <div className={learningModalScrollBody}>
                                  {exerciseRouter}
                                  
                                  {/* טקסט ההסבר */}
                                  <div className={learningStepSection} dir="rtl">
                                    <h4 className={learningExplTitle}>{activeStep.title}</h4>
                                    {activeStep.content ? (
                                      <div className={learningExplBody}>{activeStep.content}</div>
                                    ) : (
                                      renderMaybeStackedFractionOrMixed(
                                        activeStep.runs || activeStep.text,
                                        learningExplBody
                                      )
                                    )}
                                  </div>
                                </div>
                                </StepExerciseUiProvider>
                                
                                {/* כפתורים ואינדיקטור - קבועים בתחתית */}
                                <div className={learningModalFooter}>
                                  {/* שליטה באנימציה */}
                                  <div className={learningStepNavRow} dir="rtl">
                                    <button
                                      onClick={() => setAnimationStep((s) => (s > 0 ? s - 1 : 0))}
                                      disabled={animationStep === 0}
                                      className={learningStepNavBtn}
                                    >
                                      קודם
                                    </button>
                                    <button
                                      onClick={() => setAutoPlay((p) => !p)}
                                      className={learningStepNavBtnPlay}
                                    >
                                      {autoPlay ? "עצור" : "נגן"}
                                    </button>
                                    <button
                                      onClick={() => setAnimationStep((s) => (s < animationSteps.length - 1 ? s + 1 : s))}
                                      disabled={animationStep >= animationSteps.length - 1}
                                      className={learningStepNavBtn}
                                    >
                                      הבא
                                    </button>
                                  </div>
                                  
                                  {/* אינדיקטור צעדים */}
                                  <div className={learningStepCounter}>
                                    צעד {animationStep + 1} מתוך {animationSteps.length}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        
                        // שאר הנושאים - אנימציה כללית עם כפתורי ניווט
                        return (
                          <div
                            className={learningModalOverlay}
                            onClick={closeExplanationModal}
                            dir="rtl"
                          >
                            <div
                              className={learningModalPanel}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* כותרת - קבועה */}
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
                                    : "\u200Fאיך פותרים את התרגיל?"}
                                </h3>
                                <span className="w-10 shrink-0" aria-hidden />
                              </div>
                              
                              {/* תוכן - גלילה */}
                              <StepExerciseUiProvider value={stepExerciseUi}>
                              <div className={learningModalScrollBody}>
                                {/* הצגת התרגיל/שאלה (תמיד LTR כמו תרגיל חשבון) */}
                                <div className={`mb-3 ${learningQuestionBox}`} dir="ltr">
                                  <div
                                    className={`${learningQuestionText} mb-0`}
                                    style={{ unicodeBidi: "isolate" }}
                                  >
                                    {renderMaybeStackedFractionText(explanationQuestion.exerciseText || explanationQuestion.question)}
                                  </div>
                                </div>
                                
                                {/* טקסט ההסבר */}
                                <div className={learningStepSection} dir="rtl">
                                  <h4 className={learningExplTitle}>{activeStep.title || "הסבר"}</h4>
                                  {shouldShowStandaloneExerciseView(
                                    activeStep,
                                    explanationQuestion,
                                    {}
                                  ) && (
                                    <div className="mt-2 mb-3">
                                      <StepExerciseViewRouter
                                        key={activeStep?.id ?? `step-${safeStepIndex}`}
                                        step={activeStep}
                                        question={explanationQuestion}
                                        layoutProps={{}}
                                        stepIndex={safeStepIndex}
                                      />
                                    </div>
                                  )}
                                  {(activeStep.exerciseView === EXERCISE_VIEWS.wordProblem ||
                                    activeStep.type === "word_problems") &&
                                  !activeStep.pre ? (
                                    <StepWordProblemExerciseView step={activeStep} />
                                  ) : activeStep.content ? (
                                    <div className={learningExplBody}>{activeStep.content}</div>
                                  ) : (
                                    renderMaybeStackedFractionOrMixed(
                                      activeStep.runs || activeStep.text || "",
                                      learningExplBody
                                    )
                                  )}
                                </div>
                              </div>
                              </StepExerciseUiProvider>
                              
                              {/* כפתורים ואינדיקטור - קבועים בתחתית */}
                              <div className={learningModalFooter}>
                                {/* שליטה באנימציה */}
                                <div className={learningStepNavRow} dir="rtl">
                                  <button
                                    onClick={() => setAnimationStep((s) => (s > 0 ? s - 1 : 0))}
                                    disabled={animationStep === 0}
                                    className={learningStepNavBtn}
                                  >
                                    קודם
                                  </button>
                                  <button
                                    onClick={() => setAutoPlay((p) => !p)}
                                    className={learningStepNavBtnPlay}
                                  >
                                    {autoPlay ? "עצור" : "נגן"}
                                  </button>
                                  <button
                                    onClick={() => setAnimationStep((s) => (s < animationSteps.length - 1 ? s + 1 : s))}
                                    disabled={animationStep >= animationSteps.length - 1}
                                    className={learningStepNavBtn}
                                  >
                                    הבא
                                  </button>
                                </div>
                                
                                {/* אינדיקטור צעדים */}
                                <div className={learningStepCounter}>
                                  צעד {animationStep + 1} מתוך {animationSteps.length}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  </div>
                </div>
                </ScratchpadVirtualInputProvider>
              )}
            </div>
          )}

          {/* Multiplication Table Modal */}
          {showMultiplicationTable && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir="rtl">
              <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => {
                  setShowMultiplicationTable(false);
                  setSelectedRow(null);
                  setSelectedCol(null);
                  setHighlightedAnswer(null);
                  setTableMode("multiplication");
                  setSelectedResult(null);
                  setSelectedDivisor(null);
                  setSelectedCell(null);
                }}
              />
              <div className="relative w-full max-w-md max-h-[80svh] overflow-y-auto bg-gradient-to-b from-[#0a0f1d] to-[#141928] rounded-2xl border-2 border-white/20 shadow-2xl">
                <div className="sticky top-0 bg-gradient-to-b from-[#0a0f1d] to-[#141928] border-b border-white/10 px-4 py-3 flex items-center justify-between z-10">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShowMultiplicationTable(false);
                        setSelectedRow(null);
                        setSelectedCol(null);
                        setHighlightedAnswer(null);
                        setTableMode("multiplication");
                        setSelectedResult(null);
                        setSelectedDivisor(null);
                        setSelectedCell(null);
                      }}
                      className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-lg flex items-center justify-center"
                    >
                      ×
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRow(null);
                        setSelectedCol(null);
                        setHighlightedAnswer(null);
                        setSelectedResult(null);
                        setSelectedDivisor(null);
                        setSelectedCell(null);
                      }}
                      className="px-2 py-1 rounded text-xs font-bold bg-white/10 hover:bg-white/20 text-white"
                    >
                      איפוס
                    </button>
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    📊 לוח הכפל
                  </h2>
                </div>
                <div className="p-4">
                  {/* Mode toggle */}
                  <div className="mb-4 flex gap-2 justify-center flex-wrap" dir="rtl">
                    <button
                      onClick={() => {
                        setTableMode("division");
                        setSelectedRow(null);
                        setSelectedCol(null);
                        setHighlightedAnswer(null);
                        setSelectedResult(null);
                        setSelectedDivisor(null);
                        setSelectedCell(null);
                        setPracticeMode(false);
                        setPracticeQuestion(null);
                        setPracticeAnswer("");
                      }}
                      className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                        tableMode === "division"
                          ? "bg-purple-500/80 text-white"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      }`}
                    >
                      ÷ חילוק
                    </button>
                    <button
                      onClick={() => {
                        setTableMode("multiplication");
                        setSelectedRow(null);
                        setSelectedCol(null);
                        setHighlightedAnswer(null);
                        setSelectedResult(null);
                        setSelectedDivisor(null);
                        setSelectedCell(null);
                        setPracticeMode(false);
                        setPracticeQuestion(null);
                        setPracticeAnswer("");
                      }}
                      className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                        tableMode === "multiplication"
                          ? "bg-blue-500/80 text-white"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      }`}
                    >
                      × כפל
                    </button>
                    <button
                      onClick={() => {
                        setPracticeMode(!practiceMode);
                        if (!practiceMode) {
                          generatePracticeQuestion();
                        } else {
                          setPracticeQuestion(null);
                          setPracticeAnswer("");
                          setPracticeRow(null);
                          setPracticeCol(null);
                        }
                      }}
                      className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                        practiceMode
                          ? "bg-emerald-500/80 text-white"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      }`}
                    >
                      🎯 תרגול
                    </button>
                  </div>

                  {/* מצב תרגול */}
                  {practiceMode && practiceQuestion && (
                    <div className="mb-4 p-4 rounded-lg bg-emerald-500/20 border border-emerald-400/50">
                      <div className="text-center mb-3">
                        <MathLtrIsland className="text-2xl font-bold text-white mb-2 block w-full">
                          {practiceQuestion.row} × {practiceQuestion.col} = ?
                        </MathLtrIsland>
                        <input
                          type="number"
                          value={practiceAnswer}
                          onChange={(e) => setPracticeAnswer(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              checkPracticeAnswer();
                            }
                          }}
                          placeholder="הכנס תשובה"
                          className="w-full max-w-[200px] px-4 py-2 rounded-lg bg-black/40 border border-white/20 text-white text-xl font-bold text-center"
                          autoFocus
                        />
                      </div>
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={checkPracticeAnswer}
                          className="px-4 py-2 rounded-lg bg-emerald-500/80 hover:bg-emerald-500 font-bold text-sm"
                        >
                          בדוק
                        </button>
                        <button
                          onClick={() => generatePracticeQuestion()}
                          className="px-4 py-2 rounded-lg bg-blue-500/80 hover:bg-blue-500 font-bold text-sm"
                        >
                          שאלה חדשה
                        </button>
                      </div>
                    </div>
                  )}

                  {/* בחירת שורה/עמודה לתרגול ממוקד */}
                  {practiceMode && !practiceQuestion && (
                    <div className="mb-4 p-4 rounded-lg bg-blue-500/20 border border-blue-400/50">
                      <div className="text-center mb-3">
                        <div className="text-sm text-white/80 mb-2">בחר שורה או עמודה לתרגול:</div>
                        <div className="flex gap-2 justify-center flex-wrap">
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                            <button
                              key={num}
                              onClick={() => {
                                setPracticeRow(num);
                                setPracticeCol(null);
                                generatePracticeQuestion(num, null);
                              }}
                              className={`px-3 py-1 rounded-lg text-sm font-bold transition-all ${
                                practiceRow === num
                                  ? "bg-yellow-500/80 text-white"
                                  : "bg-white/10 text-white/70 hover:bg-white/20"
                              }`}
                            >
                              שורה {num}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2 justify-center flex-wrap mt-2">
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                            <button
                              key={num}
                              onClick={() => {
                                setPracticeCol(num);
                                setPracticeRow(null);
                                generatePracticeQuestion(null, num);
                              }}
                              className={`px-3 py-1 rounded-lg text-sm font-bold transition-all ${
                                practiceCol === num
                                  ? "bg-yellow-500/80 text-white"
                                  : "bg-white/10 text-white/70 hover:bg-white/20"
                              }`}
                            >
                              עמודה {num}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => {
                            setPracticeRow(null);
                            setPracticeCol(null);
                            generatePracticeQuestion();
                          }}
                          className="mt-2 px-4 py-2 rounded-lg bg-emerald-500/80 hover:bg-emerald-500 font-bold text-sm"
                        >
                          תרגול אקראי
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Result window */}
                  <div className="mb-3 min-h-[30px] w-full flex items-center justify-center">
                    {tableMode === "division" &&
                      selectedCell &&
                      (selectedRow || selectedCol) &&
                      selectedResult &&
                      selectedDivisor &&
                      selectedResult % selectedDivisor !== 0 && (
                        <div className="w-full px-4 py-1 rounded-lg bg-red-500/20 border border-red-400/50 text-center flex items-center justify-center gap-2">
                          <span className="text-sm text-red-200 font-semibold">
                            ⚠️ שגיאה:{" "}
                            <MathLtrIsland>
                              {selectedResult} ÷ {selectedDivisor}
                            </MathLtrIsland>{" "}
                            הוא לא מספר שלם!
                          </span>
                          <span className="text-xs text-red-300">
                            (
                            {Math.floor(selectedResult / selectedDivisor)}{" "}
                            שארית {selectedResult % selectedDivisor})
                          </span>
                        </div>
                      )}

                    {tableMode === "multiplication" &&
                      selectedCell &&
                      (selectedRow || selectedCol) && (
                        <div
                          className={`w-full px-4 py-1 rounded-lg border text-center flex items-center justify-center gap-3 ${
                            (selectedRow || selectedCell.row) *
                              (selectedCol || selectedCell.col) ===
                            selectedCell.value
                              ? "bg-emerald-500/20 border-emerald-400/50"
                              : "bg-red-500/20 border-red-400/50"
                          }`}
                        >
                          <MathLtrIsland className="text-base text-white/80">
                            {selectedRow || selectedCell.row} ×{" "}
                            {selectedCol || selectedCell.col} ={" "}
                            <span
                              className={`text-xl font-bold ${
                                (selectedRow || selectedCell.row) *
                                  (selectedCol || selectedCell.col) ===
                                selectedCell.value
                                  ? "text-emerald-300"
                                  : "text-red-300"
                              }`}
                            >
                              {selectedCell.value}
                            </span>
                            {(selectedRow || selectedCell.row) *
                              (selectedCol || selectedCell.col) !==
                              selectedCell.value && (
                              <span className="text-xs text-red-300 font-semibold">
                                {" "}
                                ⚠️ Should be{" "}
                                {(selectedRow || selectedCell.row) *
                                  (selectedCol || selectedCell.col)}
                              </span>
                            )}
                          </MathLtrIsland>
                        </div>
                      )}

                    {tableMode === "division" &&
                      selectedResult &&
                      selectedDivisor &&
                      selectedResult % selectedDivisor === 0 && (
                        <div className="w-full px-4 py-1 rounded-lg bg-purple-500/20 border border-purple-400/50 text-center flex items-center justify-center gap-3">
                          <MathLtrIsland className="text-base text-white/80">
                            {selectedResult} ÷ {selectedDivisor} ={" "}
                            <span className="text-xl font-bold text-purple-300">
                              {selectedResult / selectedDivisor}
                            </span>
                          </MathLtrIsland>
                        </div>
                      )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-center">
                      <thead>
                        <tr>
                          <th className="font-bold text-white/80 p-2 bg-black/30 rounded">
                            ×
                          </th>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(
                            (num) => {
                              const isColSelected =
                                (tableMode === "multiplication" &&
                                  selectedCol &&
                                  num === selectedCol) ||
                                (tableMode === "multiplication" &&
                                  selectedCell &&
                                  selectedRow &&
                                  num === selectedCell.col);
                              const isColInvalid =
                                tableMode === "division" &&
                                selectedCell &&
                                selectedResult &&
                                selectedResult % num !== 0;
                              return (
                                <th
                                  key={num}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (tableMode === "multiplication") {
                                      if (selectedCol === num) {
                                        setSelectedCol(null);
                                      } else {
                                        setSelectedCol(num);
                                      }
                                    } else {
                                      if (selectedResult && selectedCell) {
                                        const quotient =
                                          selectedResult / num;
                                        if (
                                          quotient ===
                                            Math.floor(quotient) &&
                                          quotient > 0
                                        ) {
                                          if (selectedDivisor === num) {
                                            setSelectedDivisor(null);
                                            setSelectedCol(null);
                                          } else {
                                            setSelectedDivisor(num);
                                            setSelectedRow(null);
                                            setSelectedCol(num);
                                          }
                                        }
                                      }
                                    }
                                  }}
                                  className={`font-bold text-white/80 p-2 rounded min-w-[40px] cursor-pointer transition-all ${
                                    isColSelected
                                      ? tableMode === "multiplication"
                                        ? "bg-yellow-500/40 border-2 border-yellow-400"
                                        : "bg-purple-500/40 border-2 border-purple-400"
                                      : isColInvalid
                                      ? "bg-red-500/20 border border-red-400/30 opacity-50 cursor-not-allowed"
                                      : "bg-black/30 hover:bg-black/40"
                                  }`}
                                  style={{ pointerEvents: "auto", zIndex: 10 }}
                                >
                                  {num}
                                </th>
                              );
                            }
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(
                          (row) => (
                            <tr key={row}>
                              <td
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (tableMode === "multiplication") {
                                    if (selectedRow === row) {
                                      setSelectedRow(null);
                                    } else {
                                      setSelectedRow(row);
                                    }
                                  } else {
                                    if (selectedResult && selectedCell) {
                                      const quotient =
                                        selectedResult / row;
                                      if (
                                        quotient ===
                                          Math.floor(quotient) &&
                                        quotient > 0
                                      ) {
                                        if (selectedDivisor === row) {
                                          setSelectedDivisor(null);
                                          setSelectedRow(null);
                                        } else {
                                          setSelectedDivisor(row);
                                          setSelectedCol(null);
                                          setSelectedRow(row);
                                        }
                                      }
                                    }
                                  }
                                }}
                                className={`font-bold text-white/80 p-2 rounded cursor-pointer transition-all ${
                                  (tableMode === "multiplication" &&
                                    selectedRow &&
                                    row === selectedRow) ||
                                  (tableMode === "multiplication" &&
                                    selectedCell &&
                                    selectedCol &&
                                    row === selectedCell.row)
                                    ? "bg-yellow-500/40 border-2 border-yellow-400"
                                    : tableMode === "division" &&
                                      selectedCell &&
                                      selectedResult &&
                                      selectedResult % row !== 0
                                    ? "bg-red-500/20 border border-red-400/30 opacity-50 cursor-not-allowed"
                                    : "bg-black/30 hover:bg-black/40"
                                }`}
                                style={{ pointerEvents: "auto", zIndex: 10 }}
                              >
                                {row}
                              </td>
                              {Array.from({ length: 12 }, (_, i) => i + 1).map(
                                (col) => {
                                  const value = row * col;
                                  const isCellSelected =
                                    selectedCell &&
                                    selectedCell.row === row &&
                                    selectedCell.col === col;

                                  const isRowSelected =
                                    tableMode === "multiplication" &&
                                    selectedRow &&
                                    row === selectedRow;
                                  const isColSelected =
                                    tableMode === "multiplication" &&
                                    selectedCol &&
                                    col === selectedCol;

                                  const isAnswerCellMultiplication =
                                    tableMode === "multiplication" &&
                                    selectedRow &&
                                    selectedCol &&
                                    row === selectedRow &&
                                    col === selectedCol;

                                  const isDivisionIntersection =
                                    tableMode === "division" &&
                                    selectedCell &&
                                    selectedResult &&
                                    selectedDivisor &&
                                    ((selectedRow &&
                                      row === selectedRow &&
                                      col === selectedCell.col) ||
                                      (selectedCol &&
                                        row === selectedCell.row &&
                                        col === selectedCol));

                                  let isAnswerCell = false;
                                  if (
                                    tableMode === "division" &&
                                    selectedCell &&
                                    selectedResult &&
                                    selectedDivisor &&
                                    selectedResult % selectedDivisor === 0
                                  ) {
                                    const answer =
                                      selectedResult / selectedDivisor;
                                    if (answer >= 1 && answer <= 12) {
                                      if (
                                        selectedRow &&
                                        selectedRow === selectedDivisor &&
                                        row === selectedDivisor &&
                                        col === answer
                                      ) {
                                        isAnswerCell = true;
                                      }
                                      if (
                                        selectedCol &&
                                        selectedCol === selectedDivisor &&
                                        col === selectedDivisor &&
                                        row === answer
                                      ) {
                                        isAnswerCell = true;
                                      }
                                      if (
                                        value === answer &&
                                        ((selectedRow &&
                                          row === selectedDivisor) ||
                                          (selectedCol &&
                                            col === selectedDivisor))
                                      ) {
                                        isAnswerCell = true;
                                      }
                                    }
                                  }

                                  return (
                                    <td
                                      key={`${row}-${col}`}
                                      onClick={() => {
                                        if (practiceMode) {
                                          // במצב תרגול - לא ניתן ללחוץ על תאים
                                          return;
                                        }
                                        if (tableMode === "multiplication") {
                                          setSelectedCell({
                                            row,
                                            col,
                                            value,
                                          });
                                          setSelectedRow(null);
                                          setSelectedCol(null);
                                          setHighlightedAnswer(null);
                                        } else {
                                          setSelectedResult(value);
                                          setSelectedDivisor(null);
                                          setSelectedRow(null);
                                          setSelectedCol(null);
                                          setSelectedCell({
                                            row,
                                            col,
                                            value,
                                          });
                                        }
                                      }}
                                      className={`p-2 rounded border text-white text-sm min-w-[40px] transition-all ${
                                        practiceMode && practiceQuestion && 
                                        row === practiceQuestion.row && col === practiceQuestion.col
                                          ? "bg-yellow-500/60 border-2 border-yellow-400 animate-pulse cursor-default"
                                          : "cursor-pointer"
                                      } ${
                                        isCellSelected
                                          ? tableMode === "multiplication"
                                            ? "bg-emerald-500/40 border-2 border-emerald-400 text-emerald-200 font-bold text-base"
                                            : "bg-purple-500/40 border-2 border-purple-400 text-purple-200 font-bold text-base"
                                          : isAnswerCellMultiplication
                                          ? "bg-emerald-500/40 border-2 border-emerald-400 text-emerald-200 font-bold text-base"
                                          : isAnswerCell
                                          ? "bg-purple-500/40 border-2 border-purple-400 text-purple-200 font-bold text-base"
                                          : isRowSelected || isColSelected
                                          ? "bg-yellow-500/20 border border-yellow-400/30"
                                          : isDivisionIntersection &&
                                            !isCellSelected
                                          ? "bg-purple-500/30 border border-purple-400/50"
                                          : "bg-black/20 border border-white/5 hover:bg-black/30"
                                      }`}
                                      style={{ pointerEvents: "auto" }}
                                    >
                                      {value}
                                    </td>
                                  );
                                }
                              )}
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 text-center space-y-2">
                    <div className="text-xs text-white/60 mb-2 text-center">
                      {tableMode === "multiplication"
                        ? "לחץ על מספר מהטבלה, ואז על מספר שורה או עמודה"
                        : "לחץ על מספר תוצאה, ואז על מספר שורה/עמודה כדי לראות את החילוק"}
                    </div>
                    <button
                      onClick={() => {
                        setShowMultiplicationTable(false);
                        setSelectedRow(null);
                        setSelectedCol(null);
                        setHighlightedAnswer(null);
                        setSelectedResult(null);
                        setSelectedDivisor(null);
                        setSelectedCell(null);
                      }}
                      className="px-6 py-2 rounded-lg bg-blue-500/80 hover:bg-blue-500 font-bold text-sm"
                    >
                      סגור
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Leaderboard Modal */}
          {showLeaderboard && (
            <div
              role="dialog" aria-modal="true" className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
              onClick={() => setShowLeaderboard(false)}
              dir="rtl"
            >
              <div
                className="bg-gradient-to-br from-[#080c16] to-[#0a0f1d] border-2 border-white/20 rounded-2xl p-4 max-w-md w-full max-h-[85svh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-extrabold text-white mb-1">
                    🏆 לוח תוצאות
                  </h2>
                  <p className="text-white/70 text-xs">שיאים מקומיים</p>
                </div>

                {/* Level Selection */}
                <div className="flex gap-2 mb-4 justify-center" dir="rtl">
                  {studentDisplayLevelKeys("math").slice().reverse().map((dl) => (
                    <button
                      key={dl}
                      onClick={() => {
                        setLeaderboardLevel(dl);
                        if (typeof window !== "undefined") {
                          try {
                            const saved = JSON.parse(
                              localStorage.getItem(STORAGE_KEY) || "{}"
                            );
                            const sourceKeys = dl === "advanced" ? ["hard"] : ["easy", "medium"];
                            const merged = sourceKeys.flatMap((sk) => buildTop10ByScore(saved, sk));
                            merged.sort((a, b) => (b.score || 0) - (a.score || 0));
                            setLeaderboardData(merged.slice(0, 10));
                          } catch (e) {
                            console.error(
                              "שגיאה בטעינת לוח התוצאות:",
                              e
                            );
                          }
                        }
                      }}
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

                {/* Leaderboard Table */}
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
                          <td
                            colSpan={4}
                            className="text-white/60 p-4 text-sm"
                          >
                            עדיין אין תוצאות ברמה{" "}
                            {studentDisplayLevelLabel(leaderboardLevel)}
                          </td>
                        </tr>
                      ) : (
                        leaderboardData.map((score, idx) => (
                          <tr
                            key={`${score.name}-${score.timestamp}-${idx}`}
                            className={`border-b border-white/10 ${
                              score.placeholder
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
                              {score.placeholder
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
                              {score.name}
                            </td>
                            <td className="text-emerald-400 p-2 text-sm font-bold">
                              {score.bestScore}
                            </td>
                            <td className="text-amber-400 p-2 text-sm font-bold">
                              🔥{score.bestStreak}
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

          {/* Mixed Operations Selector Modal */}
          {showMixedSelector && (
            <div
              role="dialog" aria-modal="true" className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4"
              onClick={() => {
                setShowMixedSelector(false);
                // אם לא נבחרו פעולות, חזור לפעולה הקודמת
                const hasSelected = Object.values(mixedOperations).some(
                  (selected) => selected
                );
                if (!hasSelected && operation === "mixed") {
                  const allowed = listVisibleTopicsForSelfPractice("math", grade, GRADES[grade].operations);
                  setOperation(allowed[0] || GRADES[grade].operations.find(op => op !== "mixed") || "addition");
                }
              }}
              dir="rtl"
            >
              <div
                className="bg-gradient-to-br from-[#080c16] to-[#0a0f1d] border-2 border-white/20 rounded-lg p-2 max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
                style={{ width: '130px', maxWidth: '130px', minWidth: '130px' }}
              >
                <div className="text-center mb-2 flex-shrink-0">
                  <h2 className="text-base font-extrabold text-white mb-0.5">
                    🎲 בחר פעולות
                  </h2>
                  <p className="text-white/70 text-[10px] leading-tight">
                    בחר פעולות
                  </p>
                </div>

                <div className="space-y-1.5 mb-2 overflow-y-auto flex-1 min-h-0">
                  {visibleMathOps
                    .map((op) => (
                      <label
                        key={op}
                        className="flex items-center gap-1.5 p-1.5 rounded bg-black/30 border border-white/10 hover:bg-black/40 cursor-pointer transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={mixedOperations[op] || false}
                          onChange={(e) => {
                            setMixedOperations((prev) => ({
                              ...prev,
                              [op]: e.target.checked,
                            }));
                          }}
                          className="w-3.5 h-3.5 rounded flex-shrink-0"
                        />
                        <span className="text-white font-semibold text-xs leading-tight">
                          {getOperationName(op)}
                        </span>
                      </label>
                    ))}
                </div>

                <div className="flex flex-col gap-1.5 flex-shrink-0" dir="rtl">
                  <button
                    onClick={() => {
                      // בדוק שיש לפחות פעולה אחת נבחרת
                      const hasSelected = Object.values(mixedOperations).some(
                        (selected) => selected
                      );
                      if (hasSelected) {
                        setShowMixedSelector(false);
                      } else {
                        alert("אנא בחר לפחות פעולה אחת");
                      }
                    }}
                    className="w-full px-2 py-1 rounded bg-emerald-500/80 hover:bg-emerald-500 font-bold text-[10px]"
                  >
                    שמור
                  </button>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        // בטל הכל
                        const availableOps = listVisibleTopicsForSelfPractice("math", grade, GRADES[grade].operations);
                        const noneSelected = {};
                        availableOps.forEach((op) => {
                          noneSelected[op] = false;
                        });
                        setMixedOperations(noneSelected);
                      }}
                      className="flex-1 px-1.5 py-1 rounded bg-gray-500/80 hover:bg-gray-500 font-bold text-[10px]"
                    >
                      בטל
                    </button>
                    <button
                      onClick={() => {
                        // בחר הכל
                        const availableOps = listVisibleTopicsForSelfPractice("math", grade, GRADES[grade].operations);
                        const allSelected = {};
                        availableOps.forEach((op) => {
                          allSelected[op] = true;
                        });
                        setMixedOperations(allSelected);
                      }}
                      className="flex-1 px-1.5 py-1 rounded bg-blue-500/80 hover:bg-blue-500 font-bold text-[10px]"
                    >
                      הכל
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Daily Challenge Modal */}
          <SubjectDailyMissionsModal
            open={showDailyChallenge}
            onClose={() => setShowDailyChallenge(false)}
            dailyMissions={subjectDailyMissions}
            loading={subjectDailyMissionsLoading}
          />

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
                  📘 איך לומדים מתמטיקה כאן?
                </h2>

                <p className="text-white/80 text-xs mb-3 text-center">
                  המטרה היא לתרגל מתמטיקה בצורה משחקית, עם התאמה לכיתה, נושא ורמת קושי.
                </p>

                <ul className="list-disc pr-4 space-y-1 text-[13px] text-white/90">
                  <li>בחר כיתה, רמת קושי ופעולה (חיבור, חיסור, כפל, חילוק, שברים, אחוזים ועוד).</li>
                  <li>בחר מצב משחק: למידה, אתגר עם טיימר וחיים, מהירות או מרתון.</li>
                  <li>קרא היטב את השאלה – לפעמים יש תרגילי מילים שצריך להבין את הסיפור.</li>
                  <li>ניקוד גבוה, רצף תשובות נכון, כוכבים ו Badges עוזרים לך לעלות רמה כשחקן.</li>
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
          {/* Reference Modal - לוח עזרה */}
          {showReferenceModal && (
            <div
              role="dialog" aria-modal="true" className="fixed inset-0 bg-black/80 flex items-center justify-center z-[185] p-4"
              onClick={() => setShowReferenceModal(false)}
            >
              <div
                className="bg-gradient-to-br from-[#080c16] to-[#0a0f1d] border-2 border-blue-400/60 rounded-2xl p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto text-white"
                dir="rtl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-2xl font-extrabold">📚 לוח עזרה במתמטיקה</h2>
                  <button
                    onClick={() => setShowReferenceModal(false)}
                    className="text-white/80 hover:text-white text-xl px-2"
                  >
                    ✖
                  </button>
                </div>
                <p className="text-sm text-white/70 mb-3">
                  בחר קטגוריה כדי לראות פעולות, נוסחאות ומונחים חשובים במתמטיקה.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {REFERENCE_CATEGORY_KEYS.map((key) => (
                    <button
                      key={key}
                      onClick={() => setReferenceCategory(key)}
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        referenceCategory === key
                          ? "bg-blue-500/80 border-blue-300 text-white"
                          : "bg-white/5 border-white/20 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      {REFERENCE_CATEGORIES[key].icon} {REFERENCE_CATEGORIES[key].label}
                    </button>
                  ))}
                </div>
                <div className="space-y-3">
                  {referenceCategory === "operations" && (
                    <>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">➕ חיבור</div>
                        <div className="text-sm text-white/80">חיבור מספרים: <span style={{ direction: 'ltr', unicodeBidi: 'bidi-override', display: 'inline-block' }}>a + b = c</span></div>
                        <div className="text-xs text-white/60 mt-1">דוגמה: <span dir="ltr" style={{ display: 'inline-block', textAlign: 'left', unicodeBidi: 'isolate' }}>5 + 3 = 8</span></div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">➖ חיסור</div>
                        <div className="text-sm text-white/80">חיסור מספרים: <span dir="ltr" style={{ display: 'inline-block', textAlign: 'left', unicodeBidi: 'isolate' }}>a - b = c</span></div>
                        <div className="text-xs text-white/60 mt-1">דוגמה: <span dir="ltr" style={{ display: 'inline-block', textAlign: 'left', unicodeBidi: 'isolate' }}>8 - 3 = 5</span></div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">✖️ כפל</div>
                        <div className="text-sm text-white/80">כפל מספרים: <span dir="ltr" style={{ display: 'inline-block', textAlign: 'left', unicodeBidi: 'isolate' }}>a × b = c</span></div>
                        <div className="text-xs text-white/60 mt-1">דוגמה: <span dir="ltr" style={{ display: 'inline-block', textAlign: 'left', unicodeBidi: 'isolate' }}>4 × 3 = 12</span></div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">➗ חילוק</div>
                        <div className="text-sm text-white/80">חילוק מספרים: <span dir="ltr" style={{ display: 'inline-block', textAlign: 'left', unicodeBidi: 'isolate' }}>a ÷ b = c</span></div>
                        <div className="text-xs text-white/60 mt-1">דוגמה: <span dir="ltr" style={{ display: 'inline-block', textAlign: 'left', unicodeBidi: 'isolate' }}>12 ÷ 3 = 4</span></div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">🔢 שברים</div>
                        <div className="text-sm text-white/80">מספר המייצג חלק משלם: <span dir="ltr" style={{ display: 'inline-block', textAlign: 'left', unicodeBidi: 'isolate' }}>1/2, 3/4</span></div>
                        <div className="text-xs text-white/60 mt-1">דוגמה: <span dir="ltr" style={{ display: 'inline-block', textAlign: 'left', unicodeBidi: 'isolate' }}>1/2 = 0.5</span></div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">% אחוזים</div>
                        <div className="text-sm text-white/80">חלק מתוך 100: <span dir="ltr" style={{ display: 'inline-block', textAlign: 'left', unicodeBidi: 'isolate' }}>% = חלק/שלם × 100</span></div>
                        <div className="text-xs text-white/60 mt-1">דוגמה: <span dir="ltr" style={{ display: 'inline-block', textAlign: 'left', unicodeBidi: 'isolate' }}>50% = 0.5</span></div>
                      </div>
                    </>
                  )}
                  {referenceCategory === "formulas" && (
                    <>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">📐 שטח ריבוע</div>
                        <div className="text-sm text-white/80">צלע × צלע</div>
                        <div className="text-xs text-white/60 mt-1"><span dir="ltr" style={{ display: 'inline-block' }}>S = a²</span></div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">📐 שטח מלבן</div>
                        <div className="text-sm text-white/80">אורך × רוחב</div>
                        <div className="text-xs text-white/60 mt-1"><span dir="ltr" style={{ display: 'inline-block' }}>S = a × b</span></div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">📐 שטח משולש</div>
                        <div className="text-sm text-white/80">(בסיס × גובה) ÷ 2</div>
                        <div className="text-xs text-white/60 mt-1"><span dir="ltr" style={{ display: 'inline-block' }}>S = (b × h) ÷ 2</span></div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">⭕ היקף מעגל</div>
                        <div className="text-sm text-white/80">2 × π × רדיוס</div>
                        <div className="text-xs text-white/60 mt-1"><span dir="ltr" style={{ display: 'inline-block' }}>P = 2πr</span></div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">⭕ שטח מעגל</div>
                        <div className="text-sm text-white/80">π × רדיוס²</div>
                        <div className="text-xs text-white/60 mt-1"><span dir="ltr" style={{ display: 'inline-block' }}>S = πr²</span></div>
                      </div>
                    </>
                  )}
                  {referenceCategory === "terms" && (
                    <>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">➕ סכום</div>
                        <div className="text-sm text-white/80">תוצאת החיבור של מספרים</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">➖ הפרש</div>
                        <div className="text-sm text-white/80">תוצאת החיסור של מספרים</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">✖️ מכפלה</div>
                        <div className="text-sm text-white/80">תוצאת הכפל של מספרים</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">➗ מנה</div>
                        <div className="text-sm text-white/80">תוצאת החילוק של מספרים</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">🔢 מספר זוגי</div>
                        <div className="text-sm text-white/80">מספר המתחלק ב-2 ללא שארית (2, 4, 6, 8...)</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">🔢 מספר אי-זוגי</div>
                        <div className="text-sm text-white/80">מספר שלא מתחלק ב-2 ללא שארית (1, 3, 5, 7...)</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">🔢 מספר ראשוני</div>
                        <div className="text-sm text-white/80">מספר המתחלק רק ב-1 ובעצמו (2, 3, 5, 7, 11...)</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">🔢 מספר שלם</div>
                        <div className="text-sm text-white/80">מספר ללא שבר (0, 1, 2, 3, -1, -2...)</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">🔢 שבר</div>
                        <div className="text-sm text-white/80">מספר המייצג חלק משלם (1/2, 3/4, 2/3...)</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">% אחוז</div>
                        <div className="text-sm text-white/80">חלק מתוך 100 (50% = חצי, 25% = רבע)</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <LearningMasterAdSlot MB={MB} />
      </div>
    </div>
    <TrackingDebugPanel
      subjectId="math"
      uiSelection={`operation=${operation}`}
      currentQuestion={currentQuestion}
      trackingRef={mathTrackingOperationKeyRef}
    />
  </Layout>
    </MasterSubjectAccessScreen>
);
}




