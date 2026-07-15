import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Layout from "../../components/Layout";
import { useRouter } from "next/router";
import { useIOSViewportFix } from "../../hooks/useIOSViewportFix";
import {
  TOPICS,
  GRADES,
  getShapesForTopic,
  MODES,
  STORAGE_KEY,
} from "../../utils/geometry-constants";
import {
  getLevelForGrade,
  buildTop10ByScore,
  saveScoreEntry,
} from "../../utils/geometry-storage";
import {
  persistGeometryIntel,
  recordGeometryAnswerIntel,
  getGeometryTopicInsights,
  geometryQuestionFingerprint,
  geometryConceptLineageKey,
  newGeometryMistakeId,
  buildGeometryQuestionSnapshot,
} from "../../utils/geometry-learning-intel";
import { SessionAntiRepeatBuffer } from "../../utils/question-session-anti-repeat";
import { generateQuestion } from "../../utils/geometry-question-generator";
import { sanitizeQuestionForStudentDisplay } from "../../utils/student-question-stem-sanitizer";
import { resolveStudentQuestionDisplayParts } from "../../utils/student-question-display";
import StudentQuestionDisplay from "../../components/learning/StudentQuestionDisplay";
import {
  buildLearningMasterQuestionPressureLayout,
  LEARNING_MASTER_ANSWER_SURFACE_CLASS,
} from "../../utils/learning-master-question-pressure.client.js";
import {
  buildHebrewApprovedVerbalMcqGridClassName,
} from "../../utils/hebrew-approved-verbal-master-contract.client.js";
import {
  buildApprovedVerbalStemLayout,
  getHebrewApprovedSingleVerbalQuestionStyle,
  isApprovedVerbalTextStem,
} from "../../utils/math-geometry-verbal-visual-adapter.client.js";
import StudentNumericAnswerField, {
  useMobileEmbeddedNumericSubmit,
} from "../../components/learning/StudentNumericAnswerField";
import LearningBookIndexTile from "../../components/learning-book/LearningBookIndexTile";
import { getLearningBookIndexHref } from "../../lib/learning-book/learning-book-catalog-meta";
import { getGeometryBookHref } from "../../lib/learning-book/resolve-geometry-book-page";
import {
  consumeAnyGeometryBookLearningSnapshot,
  consumeAnyGeometryBookPracticePreset,
  isGeometryBookPracticeEntry,
  saveGeometryBookLearningSnapshot,
  withGeometryBookLearningReturn,
} from "../../lib/learning-book/geometry-book-nav";
import {
  buildBookContextClientMetaExtras,
  tryConsumeBookContextOnPracticeEntry,
} from "../../lib/learning-book/book-context-master-helper";
import {
  buildGeometryAnimationSteps,
  getErrorExplanation,
  getTheorySummary,
} from "../../utils/geometry-explanations";
import { trackGeometryTopicTime } from "../../utils/math-time-tracking";
import { useLearningVisibilityClock } from "../../hooks/useLearningVisibilityClock";
import { useLearningWrongAnswerAdvance } from "../../hooks/useLearningWrongAnswerAdvance";
import {
  LEARNING_CORRECT_ANSWER_ADVANCE_MS,
} from "../../utils/learning-wrong-answer-feedback-timing";
import { getLearningPrimaryAnswerButtonState } from "../../utils/learning-answer-primary-button";
import {
  beginMasterQuestionLedger,
  finalizeMasterQuestionLedger,
  isFairnessVisibilityLedgerActive,
  resolveMasterSessionDurationSeconds,
} from "../../utils/learning-time-credit";
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
  applyLearningMasterMobileShellLayoutVars,
  buildLearningMasterMobileNumericFieldProps,
} from "../../utils/learning-master-mobile.client.js";
import {
  LIVE_PRACTICE_CORRECT_HE,
  LIVE_PRACTICE_GAME_OVER_HE,
  LIVE_PRACTICE_WRONG_HE,
  formatLearningWrongFeedbackHe,
} from "../../utils/learning-live-feedback-he";
import { STEP_BY_STEP_AUTO_PLAY_DELAY_MS } from "../../utils/learning-step-by-step-config";
import TrackingDebugPanel from "../../components/TrackingDebugPanel";
import LearningPlannerRecommendationBlock from "../../components/LearningPlannerRecommendationBlock";
import { reportModeFromGameState } from "../../utils/report-track-meta";
import { learningMixedHebrewMathStyle } from "../../utils/learning-mixed-hebrew-math";
import { renderLearningMixedHebrewMathText } from "../../components/learning/LearningMixedHebrewMathText";
import { getGeometryDiagramSpec } from "../../utils/geometry-diagram-spec";
import { geometryQuestionUsesChoiceUi } from "../../utils/geometry-activity-answer-ui.js";
import GeometryExplanationDiagram from "../../components/learning/geometry/GeometryExplanationDiagram";
import StepGeometryStepPanel from "../../components/learning/geometry/StepGeometryStepPanel";
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
import LearningMasterMobileNavTitle from "../../components/learning/LearningMasterMobileNavTitle.jsx";
import LearningMasterMobileQuestionActionDock from "../../components/learning/LearningMasterMobileQuestionActionDock.jsx";
import { StepExerciseUiProvider } from "../../contexts/StepExerciseUiContext.jsx";
import { formatMathHudNumber } from "../../utils/math-master-hud-number.client.js";
import { useTouchPrimaryDevice } from "../../hooks/useTouchPrimaryDevice.js";
import {
  updateDailyStreak,
  getStreakReward,
} from "../../utils/daily-streak";
import { useGameAudio } from "../../hooks/useGameAudio";
import { startLearningMasterSessionAudio } from "../../lib/game-audio/learning-master-session-audio.js";
import { getQuestionFontStyle } from "../../utils/learning-question-font";
import { resolveLearningMcqChoiceClassName } from "../../utils/learning-mcq-choice-styles.client";
import { compareGeometryLearnerAnswer } from "../../utils/answer-compare";
import {
  computeMcqIndicesForQuestion,
  distractorFamilyFromOptionCell,
  extractDiagnosticMetadataFromQuestion,
  mergeDiagnosticIntoMistakeEntry,
} from "../../utils/diagnostic-mistake-metadata";
import { normalizeMistakeEvent } from "../../utils/mistake-event.js";
import { inferNormalizedTags } from "../../utils/fast-diagnostic-engine/infer-tags.js";
import {
  buildPendingProbeFromMistake,
  attachProbeMetaToQuestion,
  applyProbeOutcome,
  buildDiagnosticProbeClientMeta,
  clearActiveDiagnosticState,
  decrementPendingProbeExpiry,
  probeMatchesSession,
} from "../../utils/active-diagnostic-runtime/index.js";
import { geometryWrongActivatesProbe } from "../../utils/geometry-active-probe.js";
import {
  pickGeometryProbeConceptual,
  buildGeometryConceptQuestionFromRow,
} from "../../utils/geometry-probe-bank.js";
import {
  patchLearningDiagnosticDebug,
  installLearningDiagnosticDebugOnce,
} from "../../utils/learning-diagnostic-debug.js";
import {
  safeGetItem,
  safeSetItem,
  safeRemoveItem,
  safeGetJsonObject,
  safeGetJsonArray,
  safeSetJson,
} from "../../utils/safe-local-storage";
import {
  finishLearningSession,
  saveLearningAnswer,
  startLearningSession,
} from "../../lib/learning-client/learningActivityClient";
import { buildQuestionEngineMetadataFromQuestion } from "../../lib/learning/question-engine-metadata.js";
import { resolveGeometrySessionTopic } from "../../lib/learning/session-topic-helpers.js";
import { computeFreePracticeTiming } from "../../lib/learning/timing-policy.js";
import { scheduleAdaptivePlannerRecommendation } from "../../lib/learning-client/scheduleAdaptivePlannerRecommendation";
import { buildPlannerRecommendationViewModel } from "../../lib/learning-client/adaptive-planner-recommendation-view-model";
import {
  buildRecommendedPracticeFromViewModel,
  mapPlannerTargetDifficultyToTriLevel,
  mergePlannerSessionClientMeta,
} from "../../lib/learning-client/adaptive-planner-recommended-practice";
import {
  gradeKeyToNumber,
} from "../../lib/learning-student-defaults";
import { useSubjectSessionDefaults } from "../../hooks/useSubjectSessionDefaults";
import MasterSubjectAccessScreen from "../../components/learning/MasterSubjectAccessScreen.jsx";
import { notifyLearningSessionSaveFailure } from "../../lib/learning-client/learning-session-save-feedback.client.js";
import {
  STUDENT_GRADE_REQUIRED_MESSAGE_HE,
  STUDENT_SUBJECT_LOADING_MESSAGE_HE,
} from "../../lib/learning-client/student-subject-practice-gate.he.js";
import { useEscapeCloseModals } from "../../hooks/useEscapeCloseModals.js";
import { listVisibleTopicsForSelfPractice } from "../../lib/launch-readiness/topic-launch-policy.js";
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
import { useStudentDisplayLevelPractice } from "../../hooks/useStudentDisplayLevelPractice.js";
import { StudentDisplayLevelSelect } from "../../components/learning/StudentDisplayLevelSelect.js";
import {
  studentDisplayLevelKeys,
  studentDisplayLevelLabel,
} from "../../lib/learning-client/student-display-level-practice.js";

function loadLeaderboardTop10ByDisplayLevel(saved, displayLevel) {
  const sourceKeys = displayLevel === "advanced" ? ["hard"] : ["easy", "medium"];
  const merged = sourceKeys.flatMap((sk) => buildTop10ByScore(saved, sk));
  merged.sort((a, b) => (b.score || 0) - (a.score || 0));
  return merged.slice(0, 10);
}

/** Passed into compareGeometryLearnerAnswer — not defaulted inside answer-compare. */
const GEOMETRY_NUMERIC_SCALE_FLOOR = 1e-6;
const GEOMETRY_NUMERIC_RELATIVE_FACTOR = 1e-5;
const GEOMETRY_NUMERIC_MIN_TOLERANCE = 1e-9;

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

const GEOMETRY_BOOK_GRADES = new Set(["g1", "g2", "g3", "g4", "g5", "g6"]);

export default function GeometryMaster() {
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
  const learningExplBody = ui.learningExplBodyGeometry;
  const learningModalScrollBody = ui.learningModalScrollBody;
  const stepExerciseUi = ui.stepExerciseUi;
  const isTouchDevice = useTouchPrimaryDevice();
  const isMobileViewport = useMobileViewport();
  const mobileEmbeddedNumericSubmit = useMobileEmbeddedNumericSubmit("geometry");
  const router = useRouter();
  const wrapRef = useRef(null);
  const headerRef = useRef(null);
  const desktopHeaderRef = useRef(null);
  const gameRef = useRef(null);
  const controlsRef = useRef(null);
  const topicSelectRef = useRef(null);
  const sessionStartRef = useRef(null);
  const sessionSecondsRef = useRef(0);
  const questionTimeLedgerRef = useRef(null);
  const solvedCountRef = useRef(0);
  const learningSessionIdRef = useRef(null);
  const plannerResponseSeqRef = useRef(0);
  const plannerNextSessionClientMetaRef = useRef(null);
  const learningSessionStartPromiseRef = useRef(null);
  const geometryPendingDiagnosticProbeRef = useRef(null);
  const geometryHypothesisLedgerRef = useRef(null);
  const bookPracticePresetRef = useRef(null);
  const practiceForceKindRef = useRef(null);
  const learningProfileStudentIdRef = useRef(null);
  const learningProfileHydratedRef = useRef(false);
  const [serverAccountSubjectAccuracyPct, setServerAccountSubjectAccuracyPct] = useState(null);
  const [learningProfileHydrationTick, setLearningProfileHydrationTick] = useState(0);
  const scoresStoreRef = useRef({});
  const progressLoadedRef = useRef(false);

  // פונקציה עזר לקבלת מפתח תאריך
  const getTodayKey = () => {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  };

  const [mounted, setMounted] = useState(false);
  
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
  } = useSubjectSessionDefaults({ permissionKey: "geometry" });
  const safeGrade = grade || "g1";
  const visibleGeometryTopics = useMemo(
    () => listVisibleTopicsForSelfPractice("geometry", safeGrade, GRADES[safeGrade]?.topics ?? []),
    [safeGrade]
  );
  const geometryTopicSelectOptions = useMemo(() => {
    const curriculum = GRADES[safeGrade]?.topics ?? [];
    if (curriculum.includes("mixed")) return [...visibleGeometryTopics, "mixed"];
    return visibleGeometryTopics;
  }, [safeGrade, visibleGeometryTopics]);
  const guestTopics = useGuestPlayableTopics("geometry", visibleGeometryTopics);
  const [mode, setMode] = useState("practice");
  const [topic, setTopic] = useState("area");
  const bookTopicHref = useMemo(() => {
    if (!GEOMETRY_BOOK_GRADES.has(grade)) return null;
    return getGeometryBookHref({ grade, topic, kind: null });
  }, [grade, topic]);
  const [gameActive, setGameActive] = useState(false);
  const {
    displayLevel,
    sourceDifficulty: level,
    handleDisplayLevelChange: onDisplayLevelChange,
    buildSessionStartLevelFields,
    buildAnswerLevelFields,
    tagQuestion,
    applyAnswerAdaptive,
    hydrateFromResumeSnapshot,
    applyPlannerLevelKey,
    resetAdaptiveForSessionStart,
    label: displayLevelLabel,
  } = useStudentDisplayLevelPractice("geometry");
  const handleDisplayLevelChange = useCallback(
    (nextDisplayLevel) => {
      onDisplayLevelChange(nextDisplayLevel);
      setGameActive(false);
    },
    [onDisplayLevelChange]
  );
  const [adaptivePlannerRecommendationView, setAdaptivePlannerRecommendationView] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const questionBookHref = useMemo(() => {
    if (mode !== "learning" || !currentQuestion) return null;
    if (!GEOMETRY_BOOK_GRADES.has(grade)) return null;
    const params = currentQuestion.params || {};
    const ctx = {
      grade,
      topic: currentQuestion.topic || topic,
      kind: params.kind ?? null,
    };
    return getGeometryBookHref(ctx);
  }, [grade, mode, currentQuestion, topic]);

  /** שרטוט בזמן השאלה — מוסתר אם null, לא מציג placeholder */
  const questionDiagramSpec = useMemo(
    () =>
      currentQuestion && currentQuestion.params?.kind !== "no_question"
        ? getGeometryDiagramSpec(currentQuestion, { hideUnknownValues: true })
        : null,
    [currentQuestion]
  );

  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
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

  useLearningVisibilityClock({
    enabled: gameActive && isFairnessVisibilityLedgerActive(mode),
    ledger: questionTimeLedgerRef.current,
  });

  const [recentQuestions, setRecentQuestions] = useState(new Set());
  const [stars, setStars] = useState(0);
  const [badges, setBadges] = useState([]);
  const [showBadge, setShowBadge] = useState(null);
  const [showCorrectAnimation, setShowCorrectAnimation] = useState(false);
  const [showWrongAnimation, setShowWrongAnimation] = useState(false);
  const [celebrationEmoji, setCelebrationEmoji] = useState("🎉");
  const [playerAvatarBackground, setPlayerAvatarBackground] = useState(DEFAULT_PROFILE_BACKGROUND_KEY);
  const [showPlayerProfile, setShowPlayerProfile] = useState(false);
  const [playerAvatar, setPlayerAvatar] = useState("👤"); // אווטר ברירת מחדל
  const [playerAvatarImage, setPlayerAvatarImage] = useState(null); // תמונת אווטר מותאמת אישית
  const [playerLevel, setPlayerLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  
  // תרגול ממוקד
  const [focusedPracticeMode, setFocusedPracticeMode] = useState("normal"); // "normal", "mistakes", "graded"
  const [practiceFocus, setPracticeFocus] = useState("default");
  const [mistakes, setMistakes] = useState([]);
  const [learningIntel, setLearningIntel] = useState(() => ({
    topicStats: {},
    recentTail: [],
  }));
  const mistakeQueueRef = useRef([]);
  const mistakeCursorRef = useRef(0);
  const correctRef = useRef(0);
  const pendingGeometryTimeTrackMetaRef = useRef(null);
  const gameActiveRef = useRef(false);
  const focusedPracticeModeRef = useRef("normal");
  const mistakesRef = useRef([]);
  const geometryConceptLineageTailRef = useRef([]);
  const [showPracticeOptions, setShowPracticeOptions] = useState(false);
  const [progress, setProgress] = useState({
    area: { total: 0, correct: 0 },
    perimeter: { total: 0, correct: 0 },
    volume: { total: 0, correct: 0 },
    angles: { total: 0, correct: 0 },
    pythagoras: { total: 0, correct: 0 },
  });
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
  const [textAnswer, setTextAnswer] = useState("");
  const [showSolution, setShowSolution] = useState(false);
  const [showPreviousSolution, setShowPreviousSolution] = useState(false);
  const {
    scheduleWrongAnswerAdvance,
    clearWrongAnswerAdvanceTimer,
    clearWrongAnswerAdvanceState,
  } = useLearningWrongAnswerAdvance(showSolution, showPreviousSolution);
  const [previousExplanationQuestion, setPreviousExplanationQuestion] = useState(null);
  // Phase 2: tracks whether any explanation/hint/step-by-step was viewed for the current question
  const stepByStepViewedRef = useRef(false);
  const bookContextRef = useRef(null);
  const bookContextConsumedRef = useRef(false);
  const [animationStep, setAnimationStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const animationTimeoutsRef = useRef([]);
  const [showHowTo, setShowHowTo] = useState(false);
  const [errorExplanation, setErrorExplanation] = useState("");
  const [showTheoryHelp, setShowTheoryHelp] = useState(false);
  const [showMixedSelector, setShowMixedSelector] = useState(false);
  const [mixedTopics, setMixedTopics] = useState({
    area: true,
    perimeter: true,
    volume: false,
    angles: false,
    pythagoras: false,
  });
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const [leaderboardLevel, setLeaderboardLevel] = useState("regular");
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [showDiagramModal, setShowDiagramModal] = useState(false);
  const [referenceCategory, setReferenceCategory] = useState("shapes");
  
  // Daily Streak
  const [dailyStreak, setDailyStreak] = useState({ streak: 0, lastDate: null });
  const [showStreakReward, setShowStreakReward] = useState(null);
  const [monthlyPersistenceView, setMonthlyPersistenceView] = useState(null);
  /** Display-only: `payload.student.coin_balance` from GET /api/student/me (same source as student defaults). */
  const [childCoinBalance, setChildCoinBalance] = useState(0);
  const [subjectDailyMissions, setSubjectDailyMissions] = useState(null);
  const [subjectDailyMissionsLoading, setSubjectDailyMissionsLoading] = useState(false);
  
  // Sound system
  const audio = useGameAudio();
  
  const [playerName, setPlayerName] = useState(() => {
    if (typeof window !== "undefined") {
      return safeGetItem("mleo_player_name") || "";
    }
    return "";
  });

  const openBookFromLearning = useCallback(
    (href) => {
      if (!href) return;
      const snapshot = {
        gameActive: true,
        mode,
        grade,
        gradeNumber,
        level,
        topic,
        currentQuestion,
        score,
        streak,
        correct,
        wrong,
        selectedAnswer,
        textAnswer,
        feedback,
        questionStartTime,
      };
      if (!GEOMETRY_BOOK_GRADES.has(grade)) return;
      saveGeometryBookLearningSnapshot(grade, snapshot);
      router.push(withGeometryBookLearningReturn(href));
    },
    [
      mode,
      grade,
      gradeNumber,
      level,
      topic,
      currentQuestion,
      score,
      streak,
      correct,
      wrong,
      selectedAnswer,
      textAnswer,
      feedback,
      questionStartTime,
      router,
    ]
  );

  const applyBookPracticePreset = useCallback((preset) => {
    if (!preset || preset.mode !== "learning") return;
    const presetGrade = preset.grade;
    if (!GEOMETRY_BOOK_GRADES.has(presetGrade)) return;
    if (!GRADES[presetGrade]?.topics?.includes(preset.topic)) return;
    const presetVisible = listVisibleTopicsForSelfPractice(
      "geometry",
      presetGrade,
      GRADES[presetGrade]?.topics ?? []
    );
    const presetSelectable =
      GRADES[presetGrade]?.topics?.includes("mixed") &&
      preset.topic === "mixed"
        ? ["mixed", ...presetVisible]
        : presetVisible;
    if (!presetSelectable.includes(preset.topic)) return;
    bookPracticePresetRef.current = preset;
    setGrade(presetGrade);
    const presetGradeNumber = gradeKeyToNumber(presetGrade);
    if (presetGradeNumber) {
      setGradeNumber(presetGradeNumber);
    }
    setMode("learning");
    setTopic(preset.topic);
    practiceForceKindRef.current = preset.forceKind || null;
  }, []);

  const refreshMonthlyPersistenceView = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const profile = getCachedStudentLearningProfile();
      setMonthlyPersistenceView(buildSubjectMonthlyPersistenceViewFromProfile(profile));
    } catch {
      // ignore
    }
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
    const snap = consumeAnyGeometryBookLearningSnapshot();
    if (!snap || snap.gameActive !== true) return;
    setMode(typeof snap.mode === "string" ? snap.mode : "practice");
    if (typeof snap.grade === "string") setGrade(snap.grade);
    if (typeof snap.gradeNumber === "number") setGradeNumber(snap.gradeNumber);
    hydrateFromResumeSnapshot(snap);
    if (typeof snap.topic === "string") setTopic(snap.topic);
    setGameActive(true);
    if (snap.currentQuestion) setCurrentQuestion(snap.currentQuestion);
    setScore(typeof snap.score === "number" ? snap.score : 0);
    setStreak(typeof snap.streak === "number" ? snap.streak : 0);
    setCorrect(typeof snap.correct === "number" ? snap.correct : 0);
    setWrong(typeof snap.wrong === "number" ? snap.wrong : 0);
    setSelectedAnswer(snap.selectedAnswer ?? null);
    setTextAnswer(typeof snap.textAnswer === "string" ? snap.textAnswer : "");
    setFeedback(snap.feedback ?? null);
    setQuestionStartTime(
      typeof snap.questionStartTime === "number"
        ? snap.questionStartTime
        : Date.now()
    );
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    if (!isGeometryBookPracticeEntry(router.query)) return;
    const preset = consumeAnyGeometryBookPracticePreset();
    if (preset) {
      applyBookPracticePreset(preset);
    }
  }, [router.isReady, router.query, applyBookPracticePreset]);

  useEffect(() => {
    tryConsumeBookContextOnPracticeEntry(
      router,
      { subject: "geometry", grade },
      { bookContextRef, bookContextConsumedRef }
    );
  }, [router.isReady, router.query, grade]);

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
        const acc = mapSubjectAccountViewFromStudentProfile(profile, "geometry");
        const sub = profile.row.subjects?.geometry;
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
              topicStats:
                sub.intel.topicStats && typeof sub.intel.topicStats === "object"
                  ? sub.intel.topicStats
                  : {},
              recentTail: Array.isArray(sub.intel.recentTail) ? sub.intel.recentTail : [],
            });
          }
        }
        const ch = profile.row.challenges;
        const { daily: chDaily, weekly: chWeekly } = pickSubjectChallengeBlobs(ch, "geometry");
        if (chDaily) setDailyChallenge(chDaily);
        if (chWeekly) setWeeklyChallenge(chWeekly);
        setServerAccountSubjectAccuracyPct(accountAccuracyDisplayFromDerived(profile.derived, "geometry"));
        const st = profile.row.streaks?.geometry;
        if (st && typeof st === "object") setDailyStreak(st);
        applyLearningProfileAvatarRowToPlayerState(
          profile.row.profile,
          setPlayerAvatar,
          setPlayerAvatarImage,
          setPlayerAvatarBackground,
        );
        learningProfileHydratedRef.current = true;
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



  // טעינת אווטר מ-localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = safeGetItem("mleo_player_avatar");
      const savedImage = safeGetItem("mleo_player_avatar_image");
      
      if (savedImage) {
        setPlayerAvatarImage(savedImage);
        setPlayerAvatar(null);
      } else if (saved) {
        setPlayerAvatar(saved);
        setPlayerAvatarImage(null);
      }
    }
      setPlayerAvatarBackground(readProfileBackgroundFromLocalStorage());
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
        if (typeof window !== "undefined") {
          safeSetItem("mleo_player_avatar_image", dataUrl);
          safeRemoveItem("mleo_player_avatar");
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
        safeRemoveItem("mleo_player_avatar_image");
        safeSetItem("mleo_player_avatar", defaultAvatar);
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
    const todayKey = getTodayKey();
    if (dailyChallenge.date !== todayKey) {
      setDailyChallenge({ 
        date: todayKey, 
        bestScore: 0, 
        questions: 0, 
        correct: 0,
        completed: false 
      });
    }
  }, [dailyChallenge.date]);

  // שמירת progress ל-localStorage בכל עדכון
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!progressLoadedRef.current) return;
    try {
      const saved = safeGetJsonObject(STORAGE_KEY + "_progress");
      saved.progress = progress;
      safeSetJson(STORAGE_KEY + "_progress", saved);
    } catch {}
  }, [progress]);

  useEffect(() => {
    if (!learningProfileHydratedRef.current) return;
    if (!learningProfileStudentIdRef.current) return;
    const progressStore = { stars, badges, playerLevel, xp, progress };
    debounceStudentLearningProfilePatch("geometry-master-sync", () => {
      const base = {
        subjects: {
          geometry: {
            progressStore,
            scoresStore: scoresStoreRef.current,
            mistakes,
            intel: learningIntel,
          },
        },
        challenges: subjectChallengePatch("geometry", dailyChallenge, weeklyChallenge),
        streaks: { geometry: dailyStreak },
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
    persistGeometryIntel(learningIntel);
  }, [learningIntel]);

  useEffect(() => {
    correctRef.current = correct;
  }, [correct]);

  useEffect(() => {
    mistakesRef.current = mistakes;
  }, [mistakes]);

  useEffect(() => {
    gameActiveRef.current = gameActive;
  }, [gameActive]);

  useEffect(() => {
    focusedPracticeModeRef.current = focusedPracticeMode;
  }, [focusedPracticeMode]);

  const geometryInsights = useMemo(
    () => getGeometryTopicInsights(learningIntel.topicStats),
    [learningIntel.topicStats]
  );

  useEffect(() => {
    if (showLeaderboard && typeof window !== "undefined") {
      try {
        const fromRef = scoresStoreRef.current;
        const saved =
          fromRef && typeof fromRef === "object" && Object.keys(fromRef).length > 0
            ? fromRef
            : safeGetJsonObject(STORAGE_KEY);
        const topScores = loadLeaderboardTop10ByDisplayLevel(saved, leaderboardLevel);
        setLeaderboardData(topScores);
      } catch (e) {
        console.error("Error loading leaderboard:", e);
        setLeaderboardData([]);
      }
    }
  }, [showLeaderboard, leaderboardLevel]);

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
      logAccountTileSync("geometry", {
        tile: "personalBests",
        level,
        topic,
        playerName: playerName.trim(),
        displayedBestScore: maxScore,
        displayedBestStreak: maxStreak,
      });
    } catch {}
  }, [level, topic, playerName, learningProfileHydrationTick]);

  useEffect(() => {
    installLearningDiagnosticDebugOnce();
  }, []);

  useEffect(() => {
    clearActiveDiagnosticState(
      geometryPendingDiagnosticProbeRef,
      geometryHypothesisLedgerRef
    );
  }, [grade, level, topic, practiceFocus]);

  useEffect(() => {
    refreshMonthlyPersistenceView();
  }, [refreshMonthlyPersistenceView]);

  useEffect(() => {
    return () => {
      recordSessionProgress({ includePlannerRecommendation: false });
    };
  }, []);

  const applyGeometryTopicCreditFromClosed = useCallback(
    (closed, questionForTrack, metaHint) => {
      if (!questionForTrack?.topic || !closed || closed.creditedSecForTopic <= 0) {
        return;
      }
      trackGeometryTopicTime(
        questionForTrack.topic,
        grade,
        level,
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
              const meta = pendingGeometryTimeTrackMetaRef.current;
              pendingGeometryTimeTrackMetaRef.current = null;
              if (meta && meta.mode != null) {
                applyGeometryTopicCreditFromClosed(closed, questionForTrack, {
                  mode: meta.mode,
                  correct: meta.correct,
                  total: meta.total,
                });
              } else {
                applyGeometryTopicCreditFromClosed(closed, questionForTrack);
              }
            }
          : null
      );
      if (questionStartTime) setQuestionStartTime(null);
    },
    [currentQuestion, questionStartTime, applyGeometryTopicCreditFromClosed]
  );

  const accumulateQuestionTime = useCallback(() => {
    closeOpenQuestionLedger(false);
  }, [closeOpenQuestionLedger]);

  const beginGeometryQuestionLedger = useCallback(
    (questionObj) => {
      if (!questionObj) return;
      beginMasterQuestionLedger(questionTimeLedgerRef, {
        subjectId: "geometry",
        mode,
        question: questionObj,
      });
    },
    [mode]
  );

  function trackCurrentGeometryQuestionTime() {
    if (!questionStartTime && !questionTimeLedgerRef.current) return;
    closeOpenQuestionLedger(true);
  }

  const generateNewQuestion = () => {
    clearWrongAnswerAdvanceState();
    closeOpenQuestionLedger(true);
    // בדיקה שהכיתה קיימת
    if (!GRADES[grade]) {
      console.error("כיתה לא תקינה:", grade);
      setCurrentQuestion({
        question: "כיתה לא תקינה. אנא בחר כיתה אחרת.",
        correctAnswer: 0,
        answers: [0],
        params: { kind: "no_question" },
      });
      return;
    }

    if (
      gameActiveRef.current &&
      focusedPracticeModeRef.current === "mistakes" &&
      mistakeQueueRef.current.length > 0
    ) {
      const queue = mistakeQueueRef.current;
      const idx = mistakeCursorRef.current % queue.length;
      mistakeCursorRef.current += 1;
      const entry = queue[idx];
      const snap = entry?.snapshot;
      if (snap && Array.isArray(snap.answers) && snap.answers.length > 0) {
        const replayQ = {
          question: snap.question,
          correctAnswer: snap.correctAnswer,
          answers: [...snap.answers],
          topic: snap.topic,
          shape: snap.shape,
          params: { ...snap.params },
          _fromMistakeReplay: true,
          _mistakeId: entry.id,
        };
        const fpKey = geometryQuestionFingerprint(replayQ);
        const localRecent = new Set(recentQuestions);
        localRecent.add(fpKey);
        if (localRecent.size > 60) {
          const first = Array.from(localRecent)[0];
          localRecent.delete(first);
        }
        setRecentQuestions(localRecent);

        if (currentQuestion && currentQuestion.params?.kind !== "no_question") {
          setPreviousExplanationQuestion(currentQuestion);
        }
        setCurrentQuestion(tagQuestion(replayQ));
        setSelectedAnswer(null);
        setTextAnswer("");
        setFeedback(null);
        setQuestionStartTime(Date.now());
        beginGeometryQuestionLedger(replayQ);
        setShowSolution(false);
        setShowPreviousSolution(false);
        setShowTheoryHelp(false);
        setErrorExplanation("");
        return;
      }
    }

    if (
      gameActiveRef.current &&
      focusedPracticeModeRef.current === "mistakes" &&
      mistakeQueueRef.current.length === 0
    ) {
      setFocusedPracticeMode("normal");
      focusedPracticeModeRef.current = "normal";
    }

    const allowedTopics = geometryTopicSelectOptions;
    
    // בדיקה שיש נושאים זמינים
    if (allowedTopics.length === 0) {
      console.error("אין נושאים זמינים לכיתה:", grade);
      setCurrentQuestion({
        question: "אין נושאים זמינים עבור הכיתה הזו. אנא בחר כיתה אחרת.",
        correctAnswer: 0,
        answers: [0],
        params: { kind: "no_question" },
      });
      return;
    }
    
    // בדיקה שהנושא הנוכחי תקין, אם לא - נבחר נושא תקין
    let validTopic = topic;
    if (topic === "mixed") {
      const mixedAvailable = Object.keys(mixedTopics).filter(t => mixedTopics[t] && allowedTopics.includes(t));
      if (mixedAvailable.length === 0) {
        validTopic = allowedTopics.find(t => t !== "mixed") || allowedTopics[0];
        if (validTopic) setTopic(validTopic); // עדכון הנושא
      }
    } else if (!allowedTopics.includes(topic)) {
      // אם הנושא לא תקין, נבחר נושא תקין
      validTopic = allowedTopics.find(t => t !== "mixed") || allowedTopics[0];
      if (validTopic) {
        setTopic(validTopic); // עדכון הנושא
      } else {
        setCurrentQuestion({
          question: "אין נושאים זמינים עבור הכיתה הזו. אנא בחר כיתה אחרת.",
          correctAnswer: 0,
          answers: [0],
          params: { kind: "no_question" },
        });
        return;
      }
    }
    
    // בדיקה סופית שהנושא תקין
    if (!validTopic || !allowedTopics.includes(validTopic)) {
      setCurrentQuestion({
        question: "אין נושאים זמינים. אנא בחר נושא אחר.",
        correctAnswer: 0,
        answers: [0],
        params: { kind: "no_question" },
      });
      return;
    }
    
    const correctSoFar = correctRef.current;
    const effectiveLevelKey =
      focusedPracticeModeRef.current === "graded"
        ? correctSoFar < 5
          ? "easy"
          : correctSoFar < 15
            ? "medium"
            : level
        : level;
    const levelConfig = getLevelForGrade(effectiveLevelKey, grade);
    let question;
    let attempts = 0;
    const maxAttempts = 50;
    
    const localRecentQuestions = SessionAntiRepeatBuffer.fromIterable(recentQuestions);
    const probeAtSessionStart = geometryPendingDiagnosticProbeRef.current;

    do {
      const selectedTopics = validTopic === "mixed" 
        ? Object.keys(mixedTopics).filter(t => mixedTopics[t] && allowedTopics.includes(t))
        : [validTopic];
      
      if (selectedTopics.length === 0) {
        question = {
          question: "אין נושאים זמינים. אנא בחר נושא אחר.",
          correctAnswer: 0,
          answers: [0],
          params: { kind: "no_question" },
        };
        break;
      }
      
      const currentTopic = selectedTopics[Math.floor(Math.random() * selectedTopics.length)];
      question = null;
      // Use concrete rolled topic (not "mixed") so probe.topicId must match this draw — avoids unrelated probes in mixed mode.
      if (
        probeAtSessionStart &&
        probeMatchesSession(
          probeAtSessionStart,
          grade,
          effectiveLevelKey,
          currentTopic
        )
      ) {
        const pick = pickGeometryProbeConceptual({
          pendingProbe: probeAtSessionStart,
          gradeKey: grade,
          levelKey: effectiveLevelKey,
          topic: currentTopic,
          recentIds: localRecentQuestions,
        });
        if (pick.row) {
          let built = buildGeometryConceptQuestionFromRow(pick.row, {
            gradeKey: grade,
            levelKey: effectiveLevelKey,
            topic: currentTopic,
          });
          const exp = Array.isArray(built.params?.expectedErrorTags)
            ? [...built.params.expectedErrorTags]
            : undefined;
          built = attachProbeMetaToQuestion(built, {
            probeSnapshot: probeAtSessionStart,
            probeReason: pick.reason,
            expectedErrorTags: exp,
          });
          question = built;
          geometryPendingDiagnosticProbeRef.current = null;
          patchLearningDiagnosticDebug({
            lastProbeSelectionResult: {
              subjectId: "geometry",
              consumed: true,
              reason: pick.reason,
              at: Date.now(),
            },
          });
        }
      }
      if (!question) {
        question = generateQuestion(
          levelConfig,
          currentTopic,
          grade,
          validTopic === "mixed" ? mixedTopics : null,
          practiceForceKindRef.current
            ? { topic: currentTopic, forceKind: practiceForceKindRef.current }
            : null
        );
      }
      
      // אם אין שאלה זמינה, ננסה נושא אחר
      if (!question || question.params?.kind === "no_question") {
        const nextTopic = allowedTopics.find(t => t !== "mixed" && t !== currentTopic);
        if (nextTopic) {
          question = generateQuestion(levelConfig, nextTopic, grade, null);
        } else {
          // אם אין נושאים אחרים, נעצור
          question = {
            question: "אין שאלות זמינות עבור הנושא והכיתה שנבחרו.",
            correctAnswer: 0,
            answers: [0],
            params: { kind: "no_question" },
          };
          break;
        }
      }
      
      // בדיקה שהשאלה תקינה
      if (!question || !question.answers || question.answers.length === 0) {
        attempts++;
        continue;
      }

      if (practiceForceKindRef.current) {
        const want = practiceForceKindRef.current;
        const got = String(question.params?.kind || "").replace(/^story_/, "");
        if (got !== want) {
          attempts++;
          continue;
        }
      }
      
      attempts++;
      
      // בדיקה שהשאלה תקינה
      if (!question || !question.answers || question.answers.length === 0 || question.params?.kind === "no_question") {
        continue; // ננסה שוב
      }
      
      const questionKey =
        geometryQuestionFingerprint(question) ||
        `fallback|${question.question}|${question.correctAnswer}`;

      const conceptualKind =
        typeof question.params?.kind === "string" &&
        question.params.kind.startsWith("concept");
      const lineageKey = geometryConceptLineageKey(question);
      const lineageTail = geometryConceptLineageTailRef.current;
      const lineageRepeats = conceptualKind
        ? lineageTail.filter((x) => x === lineageKey).length
        : 0;
      const lineageBlock =
        conceptualKind && lineageRepeats >= 3 && attempts < maxAttempts - 2;

      if (
        localRecentQuestions.wouldAccept(questionKey, lineageKey) &&
        !lineageBlock
      ) {
        localRecentQuestions.record(questionKey, lineageKey);
        if (conceptualKind) {
          geometryConceptLineageTailRef.current = [...lineageTail, lineageKey].slice(
            -14
          );
        }
        break;
      }
      
      // אם הגענו למקסימום ניסיונות, נשתמש בשאלה האחרונה גם אם היא חוזרת
      if (attempts >= maxAttempts - 5) {
        break;
      }
    } while (attempts < maxAttempts);
    
    // עדכון state רק פעם אחת אחרי הלולאה
    if (attempts >= maxAttempts) {
      console.warn(
        `Too many attempts (${attempts}) to generate new question, softening anti-repeat buffer`
      );
      localRecentQuestions.softenOnExhaustion();
      geometryConceptLineageTailRef.current = geometryConceptLineageTailRef.current.slice(
        -6
      );
    }
    setRecentQuestions(localRecentQuestions.toSet());
    
    // בדיקה שהשאלה תקינה לפני הצגתה
    if (!question || !question.answers || question.answers.length === 0) {
      console.error("Failed to generate valid question");
      decrementPendingProbeExpiry(geometryPendingDiagnosticProbeRef);
      setCurrentQuestion({
        question: "שגיאה ביצירת שאלה. אנא נסה שוב או בחר נושא אחר.",
        correctAnswer: 0,
        answers: [0],
        params: { kind: "no_question" },
      });
      return;
    }
    
    if (currentQuestion && currentQuestion.params?.kind !== "no_question") {
      setPreviousExplanationQuestion(currentQuestion);
    }

    decrementPendingProbeExpiry(geometryPendingDiagnosticProbeRef);

    const displayQuestion = tagQuestion(sanitizeQuestionForStudentDisplay(question));
    setCurrentQuestion(displayQuestion);
    setSelectedAnswer(null);
    setTextAnswer("");
    setFeedback(null);
    setQuestionStartTime(Date.now());
    beginGeometryQuestionLedger(displayQuestion);
    setShowSolution(false);
    setShowPreviousSolution(false);
    setShowTheoryHelp(false);
    setShowDiagramModal(false);
    setErrorExplanation("");
    stepByStepViewedRef.current = false;
  };

  const recordSessionProgress = (opts = {}) => {
    const { includePlannerRecommendation = true } = opts;
    const sessionIdForFinish = learningSessionIdRef.current;
    const totalQuestionsForFinish = totalQuestions;
    const correctForFinish = correct;
    const wrongForFinish = wrong;
    const scoreForFinish = score;
    if (!sessionStartRef.current) return;
    trackCurrentGeometryQuestionTime();
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
    const durationMinutes = Number((totalMs / 60000).toFixed(2));
    const durationSeconds = resolveMasterSessionDurationSeconds(sessionSecondsRef);
    const accuracyForFinish =
      answered > 0 ? Math.round((Math.max(0, correctForFinish) / answered) * 100) : 0;
    void refreshStudentLearningProfileAfterSession().then((p) => {
      if (p?.ok) {
        refreshMonthlyPersistenceView();
        const acc = accountAccuracyDisplayFromDerived(p.derived, "geometry");
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
          source: "geometry-master",
          version: "phase-2d-b3",
        },
      }).catch(() => {
        notifyLearningSessionSaveFailure(setFeedback, "geometry-master");
      });
      if (includePlannerRecommendation) {
        const cid = (plannerResponseSeqRef.current += 1);
        scheduleAdaptivePlannerRecommendation(
          {
            learningSessionId: sessionIdForFinish,
            subject: "geometry",
            grade,
            topic,
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
  };

  function buildGeometrySessionStartPayload() {
    const baseMeta = {
      source: "geometry-master",
      version: "phase-4-display-level",
    };
    const plannerExtra = plannerNextSessionClientMetaRef.current;
    return {
      subject: "geometry",
      topic: resolveGeometrySessionTopic(currentQuestion?.topic || topic),
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
    const startPromise = startLearningSession(buildGeometrySessionStartPayload())
      .then((res) => {
        const id = res?.learningSessionId ? String(res.learningSessionId) : "";
        if (!id) return null;
        learningSessionIdRef.current = id;
        return id;
      })
      .catch((error) => {
        console.warn("[geometry-master] session start save failed", error);
        return null;
      })
      .finally(() => {
        learningSessionStartPromiseRef.current = null;
        plannerNextSessionClientMetaRef.current = null;
      });
    learningSessionStartPromiseRef.current = startPromise;
    return startPromise;
  }

  function saveGeometryAnswerInParallel({
    question,
    userAnswer,
    isCorrect,
    timeSpentMs,
    rawTimeSpentMs,
    creditedTimeMs,
    timingStatus,
    usedHint,
    diagnosticProbeMeta,
  }) {
    const questionFingerprint = geometryQuestionFingerprint(question) || null;
    const questionId = question?.id
      ? String(question.id)
      : questionFingerprint || `geometry-${Date.now()}`;
    const questionEngine = question
      ? buildQuestionEngineMetadataFromQuestion(question, {
          selectedValue: userAnswer,
          generatorSource: "geometry-master",
          afterStepByStep: stepByStepViewedRef.current,
        })
      : null;
    if (questionEngine) {
      questionEngine.difficulty =
        question?.sourceDifficulty || question?.difficulty || level || questionEngine.difficulty;
    }
    const answerLevelFields = buildAnswerLevelFields(
      question?.sourceDifficulty || level
    );
    ensureLearningSessionId()
      .then((learningSessionId) => {
        if (!learningSessionId) return;
        return saveLearningAnswer({
          learningSessionId,
          subject: "geometry",
          topic: resolveGeometrySessionTopic(question?.topic || topic),
          gameMode: reportModeFromGameState(mode, focusedPracticeMode),
          questionId,
          questionFingerprint,
          prompt: String(question?.question || ""),
          expectedAnswer:
            question?.correctAnswer != null ? String(question.correctAnswer) : null,
          userAnswer: userAnswer != null ? String(userAnswer) : "",
          questionEngine,
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
            source: "geometry-master",
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
        console.warn("[geometry-master] answer save failed", error);
      });
  }

  const advanceToNextQuestionManually = () => {
    clearWrongAnswerAdvanceState();
    setSelectedAnswer(null);
    setTextAnswer("");
    setFeedback(null);
    generateNewQuestion();
  };

  const handleGeometryPrimaryAnswerButtonClick = () => {
    const { action } = getLearningPrimaryAnswerButtonState({
      selectedAnswer,
      textAnswer,
    });
    if (action === "next") {
      advanceToNextQuestionManually();
      return;
    }
    if (textAnswer.trim() !== "") {
      handleAnswer(textAnswer.trim());
    }
  };

  const handleAnswer = (answer) => {
    if (selectedAnswer || !gameActive || !currentQuestion) return;
    const questionForSave = currentQuestion;
    const hintUsedForSave = false;
    const rawMs = questionStartTime ? Math.max(0, Date.now() - questionStartTime) : null;
    const timeSpentMs = rawMs;
    const { rawTimeSpentMs, creditedTimeMs, timingStatus } = computeFreePracticeTiming(rawMs, {
      creditedMs: questionTimeLedgerRef.current ? questionTimeLedgerRef.current.peekCreditedMs() : undefined,
      tierCapMs: questionTimeLedgerRef.current?.tierCapMs,
    });
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

    setSelectedAnswer(answer);
    solvedCountRef.current += 1;
    const { isCorrect } = compareGeometryLearnerAnswer({
      user: answer,
      correctAnswer: currentQuestion.correctAnswer,
      scaleFloor: GEOMETRY_NUMERIC_SCALE_FLOOR,
      relativeFactor: GEOMETRY_NUMERIC_RELATIVE_FACTOR,
      minTolerance: GEOMETRY_NUMERIC_MIN_TOLERANCE,
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
          topic: questionForSave.topic,
          topicOrOperation: questionForSave.topic,
          bucketKey: questionForSave.topic,
          grade,
          level,
          mode: reportModeFromGameState(mode, focusedPracticeMode),
          question: questionForSave.question || "",
          exerciseText: questionForSave.question || "",
          correctAnswer: questionForSave.correctAnswer,
          wrongAnswer: answer,
          userAnswer: answer,
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
          computeMcqIndicesForQuestion(questionForSave, answer)
        );
        const normalizedWrong = normalizeMistakeEvent(wrongEntry, "geometry");
        inferredTags = inferNormalizedTags(normalizedWrong, "geometry");
      }
      geometryHypothesisLedgerRef.current = applyProbeOutcome(
        geometryHypothesisLedgerRef.current,
        {
          isCorrect,
          inferredTags,
          probeMeta: questionForSave._probeMeta,
          now: probeAnsweredAt,
        }
      );
      diagnosticProbeMetaForSave = buildDiagnosticProbeClientMeta({
        probeMeta: questionForSave._probeMeta,
        ledger: geometryHypothesisLedgerRef.current,
        inferredTags,
        answeredAt: probeAnsweredAt,
        learningSessionId: learningSessionIdRef.current,
      });
      patchLearningDiagnosticDebug({
        hypothesisLedger: { geometry: geometryHypothesisLedgerRef.current },
        lastProbeOutcome: {
          subjectId: "geometry",
          at: Date.now(),
        },
      });
      setCurrentQuestion((prev) => {
        if (!prev || prev !== questionForSave) return prev;
        const { _diagnosticProbeAttempt: _a, _probeMeta: _b, ...rest } = prev;
        void _a;
        void _b;
        return rest;
      });
    }

    pendingGeometryTimeTrackMetaRef.current = {
      correct: isCorrect ? 1 : 0,
      total: 1,
      mode: reportModeFromGameState(mode, focusedPracticeMode),
    };
    applyAnswerAdaptive(isCorrect, { mode: focusedPracticeModeRef.current });
    saveGeometryAnswerInParallel({
      question: questionForSave,
      userAnswer: answer,
      isCorrect,
      timeSpentMs,
      rawTimeSpentMs,
      creditedTimeMs,
      timingStatus,
      usedHint: hintUsedForSave,
      diagnosticProbeMeta: diagnosticProbeMetaForSave,
    });

    if (isCorrect) {
      if (currentQuestion._fromMistakeReplay && currentQuestion._mistakeId) {
        setMistakes((prev) => {
          const next = prev.filter((m) => m.id !== currentQuestion._mistakeId);
          if (typeof window !== "undefined") {
            try {
              safeSetJson("mleo_geometry_mistakes", next);
            } catch {}
          }
          return next;
        });
        mistakeQueueRef.current = mistakeQueueRef.current.filter(
          (m) => m.id !== currentQuestion._mistakeId
        );
      }

      // חישוב נקודות לפי מצב
      let points = 10 + streak;
      if (mode === "speed") {
        const timeBonus = timeLeft ? Math.floor(timeLeft * 2) : 0;
        points += timeBonus; // בונוס זמן במצב מהירות
      }
      
      setScore((prev) => prev + points);
      setStreak((prev) => prev + 1);
      setCorrect((prev) => prev + 1);
      
      clearWrongAnswerAdvanceState();
      setErrorExplanation("");

      // עדכון התקדמות אישית
      const top = currentQuestion.topic;
      setProgress((prev) => ({
        ...prev,
        [top]: {
          total: (prev[top]?.total || 0) + 1,
          correct: (prev[top]?.correct || 0) + 1,
        },
      }));

      setLearningIntel((prev) => recordGeometryAnswerIntel(prev, top, true));

      // מערכת כוכבים - כוכב כל 5 תשובות נכונות
      const newCorrect = correct + 1;
      if (newCorrect % 5 === 0) {
        setStars((prev) => {
          const newStars = prev + 1;
          // שמירה ל-localStorage
          if (typeof window !== "undefined") {
            try {
              const saved = safeGetJsonObject(STORAGE_KEY + "_progress");
              saved.stars = newStars;
              safeSetJson(STORAGE_KEY + "_progress", saved);
            } catch {}
          }
          return newStars;
        });
      }

      // מערכת תגים
      const newStreak = streak + 1;
      if (newStreak === 10 && !badges.includes("🔥 Hot Streak")) {
        const newBadge = "🔥 Hot Streak";
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        audio.playSfx("sfx-badge");
        setTimeout(() => setShowBadge(null), 3000);
        if (typeof window !== "undefined") {
          try {
            const saved = safeGetJsonObject(STORAGE_KEY + "_progress");
            saved.badges = [...badges, newBadge];
            safeSetJson(STORAGE_KEY + "_progress", saved);
          } catch {}
        }
      } else if (newStreak === 25 && !badges.includes("⚡ Lightning Fast")) {
        const newBadge = "⚡ Lightning Fast";
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        audio.playSfx("sfx-badge");
        setTimeout(() => setShowBadge(null), 3000);
        if (typeof window !== "undefined") {
          try {
            const saved = safeGetJsonObject(STORAGE_KEY + "_progress");
            saved.badges = [...badges, newBadge];
            safeSetJson(STORAGE_KEY + "_progress", saved);
          } catch {}
        }
      } else if (newStreak === 50 && !badges.includes("🌟 אלוף") && !badges.includes("🌟 מאסטר") && !badges.includes("🌟 Master")) {
        const newBadge = "🌟 אלוף";
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        audio.playSfx("sfx-badge");
        setTimeout(() => setShowBadge(null), 3000);
        if (typeof window !== "undefined") {
          try {
            const saved = safeGetJsonObject(STORAGE_KEY + "_progress");
            saved.badges = [...badges, newBadge];
            safeSetJson(STORAGE_KEY + "_progress", saved);
          } catch {}
        }
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
                const saved = safeGetJsonObject(STORAGE_KEY + "_progress");
                saved.playerLevel = newLevel;
                saved.xp = newXp - xpNeeded;
                safeSetJson(STORAGE_KEY + "_progress", saved);
              } catch {}
            }
            return newLevel;
          });
          return newXp - xpNeeded;
        }
        
        if (typeof window !== "undefined") {
          try {
            const saved = safeGetJsonObject(STORAGE_KEY + "_progress");
            saved.xp = newXp;
            safeSetJson(STORAGE_KEY + "_progress", saved);
          } catch {}
        }
        return newXp;
      });

      // עדכון תחרות יומית
      setDailyChallenge((prev) => {
        const updated = {
          ...prev,
          bestScore: Math.max(prev.bestScore, score + points),
          questions: prev.questions + 1,
          correct: (prev.correct || 0) + 1,
        };
        if (typeof window !== "undefined") {
          try {
            safeSetJson("mleo_geometry_daily_challenge", updated);
          } catch {}
        }
        return updated;
      });

      // עדכון תחרות שבועית
      setWeeklyChallenge((prev) => {
        const newCurrent = (prev.current || 0) + 1;
        const updated = {
          ...prev,
          current: newCurrent,
          completed: newCurrent >= prev.target,
        };
        if (typeof window !== "undefined") {
          try {
            safeSetJson("mleo_weekly_challenge", updated);
          } catch {}
        }
        return updated;
      });

      // אנימציה ותגובה חזותית לתשובה נכונה
      const emojis = ["🎉", "✨", "🌟", "💫", "⭐", "🔥", "💪", "🎊", "👏", "🏆"];
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
      setCelebrationEmoji(randomEmoji);
      setShowCorrectAnimation(true);
      setTimeout(() => setShowCorrectAnimation(false), 1000);

      setFeedback(LIVE_PRACTICE_CORRECT_HE);
      
      // Play sound - different sound for streak milestones
      if ((streak + 1) % 5 === 0 && streak + 1 >= 5) {
        audio.playSfx("sfx-streak");
      } else {
        audio.playSfx("sfx-correct");
      }
      
      // Update daily streak
      const updatedStreak = updateDailyStreak("mleo_geometry_daily_streak");
      setDailyStreak(updatedStreak);
      
      // Show streak reward if applicable
      const reward = getStreakReward(updatedStreak.streak);
      if (reward && updatedStreak.streak > (dailyStreak.streak || 0)) {
        setShowStreakReward(reward);
        setTimeout(() => setShowStreakReward(null), 3000);
      }
      
      if ("vibrate" in navigator) navigator.vibrate?.(50);

      setTimeout(() => {
        generateNewQuestion();
        if (mode === "challenge") {
          setTimeLeft(20);
        } else if (mode === "speed") {
          setTimeLeft(10);
        } else {
          setTimeLeft(null);
        }
      }, LEARNING_CORRECT_ANSWER_ADVANCE_MS);
    } else {
      setWrong((prev) => prev + 1);
      setStreak(0);
      audio.playSfx("sfx-wrong");
      
      let errExpl = getErrorExplanation(
        currentQuestion,
        currentQuestion.topic,
        answer,
        grade,
        { mode }
      );
      if (
        mode === "learning" &&
        currentQuestion?.correctAnswer != null &&
        String(currentQuestion.correctAnswer) !== ""
      ) {
        const ans = `\u2066${currentQuestion.correctAnswer}\u2069`;
        if (errExpl && !errExpl.includes(String(currentQuestion.correctAnswer))) {
          errExpl = `${errExpl} התשובה הנכונה: ${ans}.`;
        } else if (!errExpl) {
          errExpl = `התשובה הנכונה: ${ans}.`;
        }
      }
      setErrorExplanation(errExpl);
      if (errExpl) stepByStepViewedRef.current = true;
      
      // עדכון התקדמות אישית
      const top = currentQuestion.topic;
      setProgress((prev) => ({
        ...prev,
        [top]: {
          total: (prev[top]?.total || 0) + 1,
          correct: prev[top]?.correct || 0,
        },
      }));

      if (!currentQuestion._fromMistakeReplay) {
        const snap = buildGeometryQuestionSnapshot(currentQuestion);
        if (snap && currentQuestion.params?.kind !== "no_question") {
          const fp = geometryQuestionFingerprint(currentQuestion);
          setMistakes((prev) => {
            const filtered = prev.filter(
              (m) => geometryQuestionFingerprint(m.snapshot) !== fp
            );
            const ts = Date.now();
            const prm = currentQuestion.params || {};
            let entry = {
              id: newGeometryMistakeId(),
              storedAt: ts,
              timestamp: ts,
              topic: currentQuestion.topic,
              topicOrOperation: currentQuestion.topic,
              bucketKey: currentQuestion.topic,
              mode: reportModeFromGameState(mode, focusedPracticeMode),
              kind: prm.kind != null ? String(prm.kind) : null,
              patternFamily:
                prm.patternFamily != null ? String(prm.patternFamily) : null,
              subtype: prm.subtype != null ? String(prm.subtype) : null,
              distractorFamily:
                prm.distractorFamily != null ? String(prm.distractorFamily) : null,
              conceptTag: prm.conceptTag != null ? String(prm.conceptTag) : null,
              answerMode:
                Array.isArray(currentQuestion.answers) &&
                currentQuestion.answers.length > 1
                  ? "choice"
                  : "numeric",
              isCorrect: false,
              grade,
              level,
              wrongAnswer: answer,
              correctAnswer: currentQuestion.correctAnswer,
              question: currentQuestion.question,
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
              computeMcqIndicesForQuestion(currentQuestion, answer)
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
              let normalized = normalizeMistakeEvent(entry, "geometry");
              const inferredTags = inferNormalizedTags(normalized, "geometry");
              patchLearningDiagnosticDebug({
                lastInferredTags: {
                  subjectId: "geometry",
                  tags: inferredTags,
                  at: Date.now(),
                },
              });
              if (geometryWrongActivatesProbe(normalized, inferredTags)) {
                geometryPendingDiagnosticProbeRef.current =
                  buildPendingProbeFromMistake(
                    normalized,
                    {
                      wrongAvoidKey: fp,
                      fallbackTopicId: currentQuestion.topic,
                      fallbackGrade: grade,
                      fallbackLevel: level,
                    },
                    "geometry"
                  );
                patchLearningDiagnosticDebug({
                  pendingProbe: {
                    geometry: geometryPendingDiagnosticProbeRef.current,
                  },
                });
              } else {
                geometryPendingDiagnosticProbeRef.current = null;
              }
            } catch {
              geometryPendingDiagnosticProbeRef.current = null;
            }
            const next = [...filtered, entry].slice(-80);
            if (typeof window !== "undefined") {
              try {
                safeSetJson("mleo_geometry_mistakes", next);
              } catch {}
            }
            return next;
          });
        }
      }
      setLearningIntel((prev) => recordGeometryAnswerIntel(prev, top, false));
      
      if ("vibrate" in navigator) navigator.vibrate?.(200);

      if (mode === "learning") {
        setFeedback(
          formatLearningWrongFeedbackHe(`\u2066${currentQuestion.correctAnswer}\u2069`)
        );
        scheduleWrongAnswerAdvance(() => {
          generateNewQuestion();
          setSelectedAnswer(null);
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
            gameActiveRef.current = false;
            setGameActive(false);
            setCurrentQuestion(null);
            setTimeLeft(0);
            setTimeout(() => {
              hardResetGame();
            }, 2000);
          } else {
            scheduleWrongAnswerAdvance(() => {
              generateNewQuestion();
              setSelectedAnswer(null);
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
          setFeedback(null);
          if (mode === "speed") {
            setTimeLeft(10);
          } else {
            setTimeLeft(null);
          }
        });
      }
    }
  };


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
        saved = safeGetJsonObject(STORAGE_KEY);
      }
      const key = `${level}_${topic}`;
      saveScoreEntry(saved, key, {
        playerName: playerName.trim(),
        bestScore: score,
        bestStreak: streak,
        timestamp: Date.now(),
      });
      safeSetJson(STORAGE_KEY, saved);
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
        const patchBody = { subjects: { geometry: { scoresStore: saved } } };
        void patchStudentLearningProfile(patchBody)
          .then((json) => {
            const acc = accountAccuracyDisplayFromDerived(json?.derived, "geometry");
            if (acc != null) setServerAccountSubjectAccuracyPct(acc);
            logAccountTileSync("geometry", {
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
    accumulateQuestionTime();
    questionTimeLedgerRef.current = null;
    clearActiveDiagnosticState(
      geometryPendingDiagnosticProbeRef,
      geometryHypothesisLedgerRef
    );
    // Stop background music when game resets
    audio.stopMusic();
    gameActiveRef.current = false;
    setGameActive(false);
    setCurrentQuestion(null);
    setScore(0);
    setStreak(0);
    setCorrect(0);
    setWrong(0);
    setTimeLeft(20);
    setSelectedAnswer(null);
    setFeedback(null);
    setLives(3);
    setTotalQuestions(0);
    setAvgTime(0);
    setQuestionStartTime(null);
  }


  function startGame(opts = {}) {
    if (guestTopics.isGuest && topic !== "mixed" && guestTopics.isLocked(topic)) {
      alert(GUEST_TOPIC_LOCK_MESSAGE_HE);
      return;
    }
    clearActiveDiagnosticState(
      geometryPendingDiagnosticProbeRef,
      geometryHypothesisLedgerRef
    );
    if (opts.focusedPracticeMode != null) {
      setFocusedPracticeMode(opts.focusedPracticeMode);
      focusedPracticeModeRef.current = opts.focusedPracticeMode;
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
    setRecentQuestions(new Set());
    geometryConceptLineageTailRef.current = [];
    setGameActive(true);
    gameActiveRef.current = true;

    if (
      focusedPracticeModeRef.current === "mistakes" &&
      mistakesRef.current.length > 0
    ) {
      mistakeQueueRef.current = [...mistakesRef.current].sort(
        () => Math.random() - 0.5
      );
      mistakeCursorRef.current = 0;
    } else {
      mistakeQueueRef.current = [];
      mistakeCursorRef.current = 0;
    }
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
    setShowSolution(false);
    setShowPreviousSolution(false);
    setShowTheoryHelp(false);
    setErrorExplanation("");
    stepByStepViewedRef.current = false;
    learningSessionIdRef.current = null;
    learningSessionStartPromiseRef.current = null;
    void ensureLearningSessionId();
    
    startLearningMasterSessionAudio(audio);
    
    if (mode === "challenge") {
      setTimeLeft(20);
    } else if (mode === "speed") {
      setTimeLeft(10);
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
    clearActiveDiagnosticState(
      geometryPendingDiagnosticProbeRef,
      geometryHypothesisLedgerRef
    );
    // Stop background music when game stops
    audio.stopMusic();
    recordSessionProgress();
    gameActiveRef.current = false;
    setGameActive(false);
    setCurrentQuestion(null);
    setFeedback(null);
    setSelectedAnswer(null);
    setTextAnswer("");
    saveRunToStorage();
  }

  function handleTimeUp() {
    recordSessionProgress();
    setWrong((prev) => prev + 1);
    setStreak(0);
    setFeedback("הזמן נגמר! המשחק נגמר! ⏰");
    audio.playSfx("sfx-game-over");
    gameActiveRef.current = false;
    setGameActive(false);
    setCurrentQuestion(null);
    setTimeLeft(0);
    saveRunToStorage();
    setTimeout(() => {
      hardResetGame();
    }, 2000);
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
        const saved = safeGetJsonObject(STORAGE_KEY);
        const key = `${level}_${topic}`;
        delete saved[key];
        safeSetJson(STORAGE_KEY, saved);
      } catch {}
    }
  }

  const backSafe = () => {
    router.push("/student/learning");
  };

  const getTopicName = (t) => {
    const meta = TOPICS[t];
    if (!meta) return "נושא";
    const icon = meta.icon ? `${meta.icon} ` : "";
    return `${icon}${meta.name || "נושא"}`.trim();
  };

  const isShowingAnySolution = showSolution || showPreviousSolution;
  const explanationQuestion = showPreviousSolution
    ? previousExplanationQuestion
    : currentQuestion;

  const geometryAnimationSteps = useMemo(() => {
    if (!isShowingAnySolution || !explanationQuestion) return null;
    let steps = buildGeometryAnimationSteps(
      explanationQuestion,
      explanationQuestion.topic,
      grade
    );
    if (!steps.length) {
      steps = [
        {
          id: "geometry-fallback",
          title: "הסבר",
          content: (
            <span
              style={{
                ...learningMixedHebrewMathStyle,
                display: "block",
              }}
            >
              אין כאן פירוט צעדים לשאלה זו. השתמשו בלוח הנוסחאות.
            </span>
          ),
          text: "",
          diagramEmphasis: "neutral",
          diagramReveal: [],
          animationPreset: "none",
          textHighlights: [],
        },
      ];
    }
    return steps;
  }, [isShowingAnySolution, explanationQuestion, grade]);

  useEffect(() => {
    animationTimeoutsRef.current.forEach(clearTimeout);
    animationTimeoutsRef.current = [];
    if (!isShowingAnySolution || !autoPlay || !geometryAnimationSteps) return;
    if (animationStep >= geometryAnimationSteps.length - 1) {
      setAutoPlay(false);
      return;
    }
    const id = setTimeout(() => {
      setAnimationStep((s) => {
        const next = s + 1;
        if (next >= geometryAnimationSteps.length - 1) {
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
  }, [isShowingAnySolution, autoPlay, animationStep, geometryAnimationSteps]);

  useEffect(() => {
    animationTimeoutsRef.current.forEach(clearTimeout);
    animationTimeoutsRef.current = [];
    if (
      isShowingAnySolution &&
      geometryAnimationSteps &&
      geometryAnimationSteps.length > 0
    ) {
      setAnimationStep(0);
      setAutoPlay(false);
    } else if (!isShowingAnySolution) {
      setAnimationStep(0);
      setAutoPlay(false);
    }
    return () => {
      animationTimeoutsRef.current.forEach(clearTimeout);
      animationTimeoutsRef.current = [];
    };
  }, [isShowingAnySolution, geometryAnimationSteps, explanationQuestion]);

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

  const profileSnap = getCachedStudentLearningProfile();
  const subjectView = useMemo(
    () =>
      buildStudentSubjectDashboardView({
        subject: "geometry",
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
    logStudentSubjectDashboardDiagnostics("geometry", subjectView, {
      hydrationComplete: !!learningProfileHydratedRef.current,
    });
  }, [subjectView, learningProfileHydrationTick]);
  useEscapeCloseModals([
    { open: showPlayerProfile, close: () => setShowPlayerProfile(false) },
    { open: showPracticeOptions, close: () => setShowPracticeOptions(false) },
    { open: showReferenceModal, close: () => setShowReferenceModal(false) },
    { open: showHowTo, close: () => setShowHowTo(false) },
    { open: showLeaderboard, close: () => setShowLeaderboard(false) },
    { open: showMixedSelector, close: () => setShowMixedSelector(false) },
  ]);



  if (!mounted || session.sessionLoading)
    return <SubjectMasterSessionShell shellClass={shellClass} shellBgStyle={shellBgStyle} />;
  if (!gradeReady)
    return <StudentLoadingPanel message={STUDENT_GRADE_REQUIRED_MESSAGE_HE} fullPage />;

  const accuracy =
    totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;

  const showGeometryTheoryHelp =
    mode === "learning" &&
    currentQuestion &&
    currentQuestion.params?.kind !== "no_question";

  const showMobileQuestionActions = Boolean(questionBookHref || showGeometryTheoryHelp);

  const isGeometryVerbalStem = Boolean(
    currentQuestion &&
      currentQuestion.params?.kind !== "no_question" &&
      isApprovedVerbalTextStem({
        question: currentQuestion.question,
        questionLabel: currentQuestion.questionLabel,
        exerciseText: currentQuestion.exerciseText,
      })
  );

  const geometryQuestionDisplayParts = currentQuestion
    ? resolveStudentQuestionDisplayParts({
        question: currentQuestion.question,
        questionLabel: currentQuestion.questionLabel,
        exerciseText: currentQuestion.exerciseText,
      })
    : null;

  const geometryBodyTextColor =
    currentQuestion &&
    currentQuestion.params?.kind !== "no_question" &&
    geometryQuestionDisplayParts?.bodyKind !== "equation"
      ? "#4338CA"
      : undefined;

  const verbalVisualLayout = currentQuestion
    ? buildApprovedVerbalStemLayout({
        MB,
        question: currentQuestion.question,
        questionLabel: currentQuestion.questionLabel,
        exerciseText: currentQuestion.exerciseText,
        answers: currentQuestion.options ?? currentQuestion.answers ?? [],
      })
    : null;

  const questionPressureLayout =
    currentQuestion && !isGeometryVerbalStem
      ? buildLearningMasterQuestionPressureLayout({
          MB,
          questionParts: [
            currentQuestion.question,
            currentQuestion.questionLabel,
            currentQuestion.exerciseText,
          ],
          answers: currentQuestion.options ?? currentQuestion.answers ?? [],
          hasFloatButtons: Boolean(
            questionBookHref ||
              (mode === "learning" &&
                currentQuestion.params?.kind !== "no_question")
          ),
        })
      : null;

  const geometryShowsNumericAnswer = Boolean(
    currentQuestion &&
      currentQuestion.params?.kind !== "no_question" &&
      (mode === "learning" || mode === "practice") &&
      !geometryQuestionUsesChoiceUi(currentQuestion.params)
  );

  return (
    <MasterSubjectAccessScreen permissionKey="geometry" titleHe="גאומטריה">
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
        @keyframes fadeIn {
          0% { opacity: 0; transform: scale(0.5); }
          100% { opacity: 1; transform: scale(1); }
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
        <div className="absolute inset-0 opacity-10 pointer-events-none">
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
          title="📐 גאומטריה"
          subtitle={`${playerName || "שחקן"} • ${GRADES[grade]?.name || ""} • ${displayLevelLabel()} • ${getTopicName(topic)} • ${MODES[mode].name}`}
          onBack={backSafe}
          onCurriculumClick={() => router.push("/learning/geometry-curriculum")}
          audio={audio}
        />

        <div className="md:hidden">
          <LearningMasterNavBar
            MB={MB}
            headerRef={headerRef}
            onCurriculumClick={() => router.push("/learning/geometry-curriculum")}
            onBack={backSafe}
            hideCurriculum
            compactHeader
            integratedTopRow
            centerSlot={<LearningMasterMobileNavTitle MB={MB} title="📐 גאומטריה" audio={audio} />}
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
          <div className={LEARNING_MASTER_MOBILE_SUBTITLE_ROW_CLASS}>
            <p className={`${MB.pageSub} max-md:leading-none max-md:mb-0`}>
              {playerName || "שחקן"} • {GRADES[grade]?.name || ""} • {displayLevelLabel()} • {getTopicName(topic)} • {MODES[mode].name}
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

          {showStreakReward && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none" dir="rtl">
              <div className="bg-gradient-to-br from-orange-400 to-red-500 text-white px-8 py-6 rounded-2xl shadow-2xl text-center animate-bounce">
                <div className="text-4xl mb-2">{showStreakReward.emoji}</div>
                <div className="text-xl font-bold">{showStreakReward.message}</div>
              </div>
            </div>
          )}

          {showBadge && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none" dir="rtl">
              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white px-8 py-6 rounded-2xl shadow-2xl text-center animate-bounce">
                <div className="text-4xl mb-2">🎉</div>
                <div className="text-2xl font-bold">תג חדש!</div>
                <div className="text-xl">{showBadge}</div>
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

                    {!gameActive ? (
            <div className="relative flex flex-col flex-1 min-h-0 w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl items-center justify-start md:gap-1">
              {getLearningBookIndexHref("geometry", grade) ? (
                <LearningBookIndexTile
                  subject="geometry"
                  grade={grade}
                  testId={`geometry-${grade}-book-index-button`}
                  mobileBottomClass={LEARNING_MASTER_MOBILE_BOOK_TILE_BOTTOM}
                  onClick={() =>
                    router.push(getLearningBookIndexHref("geometry", grade))
                  }
                />
              ) : null}
              <div className="w-full flex justify-center mb-3 md:mb-4 overflow-x-auto [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] px-0.5">
                <div
                  className="inline-flex flex-nowrap items-center justify-center gap-2 md:gap-2.5 lg:gap-3 w-max max-w-full min-w-0"
                  dir="rtl"
                >
                <div
                  data-testid="geometry-player-name"
                  className={MB.preGamePlayerBadge}
                  dir={playerName && /[\u0590-\u05FF]/.test(playerName) ? "rtl" : "ltr"}
                  title={playerName.trim() ? playerName.trim() : undefined}
                  aria-label={playerName.trim() ? `שם ילד/ה: ${playerName.trim()}` : "שם ילד/ה לא זמין"}
                >
                  {playerName.trim() ? playerName.trim() : "שחקן"}
                </div>
                <select
                  value={grade}
                  title={GRADES[grade]?.name}
                  disabled={!canPickGrade}
                  aria-disabled={!canPickGrade || undefined}
                  onChange={(e) => {
                    const newGrade = e.target.value;

                    // מעדכנים כיתה ומפסיקים משחק
                    setGrade(newGrade);
                    setGameActive(false);
                    setCurrentQuestion(null);
                    setFeedback(null);
                    setSelectedAnswer(null);
                    setShowSolution(false);

                    // בחירת נושא ברירת מחדל שמתאים לכיתה
                    const allowed = listVisibleTopicsForSelfPractice(
                      "geometry",
                      newGrade,
                      GRADES[newGrade]?.topics ?? []
                    );
                    const curriculum = GRADES[newGrade]?.topics ?? [];
                    const selectable =
                      curriculum.includes("mixed") ? [...allowed, "mixed"] : allowed;
                    const firstAllowed = selectable.find((t) => t !== "mixed") || selectable[0] || "area";
                    if (firstAllowed) {
                      setTopic(firstAllowed);
                    }

                    // עדכון נושאים זמינים למיקס לפי הכיתה החדשה
                    const availableTopics = allowed;
                    const newMixedTopics = {
                      area: availableTopics.includes("area"),
                      perimeter: availableTopics.includes("perimeter"),
                      volume: availableTopics.includes("volume"),
                      angles: availableTopics.includes("angles"),
                      pythagoras: availableTopics.includes("pythagoras"),
                    };
                    setMixedTopics(newMixedTopics);

                    // מאפס את רשימת השאלות האחרונות כדי שלא תהיה לולאה בניסיון למצוא "שאלה חדשה"
                    setRecentQuestions(new Set());
                  }}
                  className={`${MB.selectControl} shrink-0 min-w-0 w-[5.75rem] max-w-[6.25rem] md:w-[6.5rem] md:max-w-[7rem]`}
                >
                  {Object.keys(GRADES).map((g) => (
                    <option key={g} value={g}>
                      {GRADES[g].name}
                    </option>
                  ))}
                </select>
                <StudentDisplayLevelSelect
                  subjectId="geometry"
                  value={displayLevel}
                  title={displayLevelLabel()}
                  onChange={handleDisplayLevelChange}
                  className={`${MB.selectControl} shrink-0 min-w-0 w-[5rem] max-w-[5.5rem] md:w-[5.75rem] md:max-w-[6.25rem]`}
                />
                <div className="flex flex-1 min-w-0 md:flex-none md:max-w-[min(22rem,42vw)] items-center gap-1.5 md:gap-2 shrink">
                  {topic === "mixed" && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMixedSelector(true);
                      }}
                      className={MB.preGameGearBtn}
                      title="ערוך נושאים למיקס"
                    >
                      ⚙️
                    </button>
                  )}
                  <select
                    ref={topicSelectRef}
                    data-testid="geometry-topic-select"
                    value={topic}
                    title={getTopicName(topic)}
                    onChange={(e) => {
                      const newTopic = e.target.value;
                      if (guestTopics.isGuest && guestTopics.isLocked(newTopic)) {
                        alert(GUEST_TOPIC_LOCK_MESSAGE_HE);
                        return;
                      }
                      setGameActive(false);
                      if (newTopic === "mixed") {
                        setTopic(newTopic);
                        setShowMixedSelector(true);
                      } else {
                        setTopic(newTopic);
                        setShowMixedSelector(false);
                      }
                    }}
                    className={`${MB.selectControl} min-w-0 w-full md:w-[min(22rem,42vw)] md:max-w-[22rem]`}
                  >
                    {visibleGeometryTopics.map((t) => (
                      <option key={t} value={t} disabled={guestTopics.isLocked(t)}>
                        {guestTopics.label(t, getTopicName(t))}
                      </option>
                    ))}
                    {(GRADES[safeGrade]?.topics || []).includes("mixed") && (
                      <option value="mixed">{getTopicName("mixed")}</option>
                    )}
                  </select>
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


              <div className="mt-auto mb-2 w-full pt-3 md:pt-4 flex flex-col items-center gap-2 md:gap-3">
              <div className="flex items-center justify-center gap-1.5 md:gap-2.5 w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl flex-wrap px-1 md:px-2 mx-auto">
                <button
                  type="button"
                  data-testid="geometry-start-game"
                  onClick={startGame}
                  disabled={!playerName.trim()}
                  className={MB.btnPrimary}
                >
                  ▶️ התחל
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
                  ❓ איך לומדים גאומטריה כאן?
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
                    data-testid={`geometry-${grade}-book-topic-button`}
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
              {/* אנימציות חזותיות */}
              {showCorrectAnimation && (
                <div className="fixed inset-0 z-[190] flex items-center justify-center pointer-events-none">
                  <div className="text-8xl animate-celebrate">
                    {celebrationEmoji}
                  </div>
                </div>
              )}

              {showWrongAnimation && (
                <div className="fixed inset-0 z-[190] flex items-center justify-center pointer-events-none">
                  <div className="text-6xl animate-shake">
                    ❌
                  </div>
                </div>
              )}

              {currentQuestion && (
                <div
                  ref={gameRef}
                  className={LEARNING_MASTER_MOBILE_GAME_CLASS}
                >
                  {/* שכבת הודעות לא דוחפת פריסה */}
                  {(feedback || errorExplanation) && (
                    <div className="absolute top-0 left-0 right-0 z-[5] px-2 pt-1 pointer-events-none" role="status" aria-live="assertive" aria-atomic="true">
                      <div className="flex flex-col gap-2 items-stretch">
                        {feedback && (
                          <div
                            className={`px-4 py-2 rounded-lg text-sm font-semibold text-center ${
                              feedback.includes("Correct") ||
                              feedback.includes("∞") ||
                              feedback.includes("Start") ||
                              feedback.includes("נכון")
                                ? "bg-emerald-500/20 text-emerald-200"
                                : "bg-red-500/20 text-red-200"
                            }`}
                          >
                            {renderLearningMixedHebrewMathText(feedback)}
                          </div>
                        )}

                        {errorExplanation && (
                          <div
                            className="px-4 py-3 rounded-lg bg-[#0a1222]/95 border border-rose-300/60 shadow-xl backdrop-blur-sm text-sm leading-relaxed text-center w-full"
                            style={{ direction: "rtl", unicodeBidi: "isolate" }}
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

                  {/* אזור שאלה יציב למניעת קפיצות בפריסת התשובות - כמו math-master */}
                  <div
                    data-testid="geometry-question-surface"
                    className={`relative w-full flex-1 min-h-0 flex flex-col overflow-hidden px-2 ${showMobileQuestionActions ? "max-md:pb-11" : ""} ${questionPressureLayout?.questionStemInsetClass ?? ""}`.trim()}
                  >
                  {showGeometryTheoryHelp ? (
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
                        data-testid={`geometry-${grade}-book-question-button`}
                        onClick={() => openBookFromLearning(questionBookHref)}
                        className={`${MB.floatBtnHelper} ${MB.floatBtnBookColors}`}
                        title="הסבר בספר לנושא הנוכחי"
                      >
                        הסבר
                      </button>
                    </div>
                  ) : null}

                  {/* בדיקה אם יש שאלה תקינה */}
                  {currentQuestion.params?.kind === "no_question" ? (
                    <div
                      className="text-xl font-bold text-red-400 mb-4 text-center p-4 bg-red-500/20 rounded-lg border border-red-400/50"
                      style={{ direction: "rtl", unicodeBidi: "isolate" }}
                    >
                      {currentQuestion.question}
                    </div>
                  ) : (
                    <>
                      <StudentQuestionDisplay
                        testId="geometry-question-stem"
                        question={currentQuestion.question}
                        questionLabel={currentQuestion.questionLabel}
                        exerciseText={currentQuestion.exerciseText}
                        getQuestionFontStyle={getQuestionFontStyle}
                        resolveVerbalSingleStyle={
                          isGeometryVerbalStem
                            ? getHebrewApprovedSingleVerbalQuestionStyle
                            : undefined
                        }
                        bodyTextColor={geometryBodyTextColor}
                        leadClassName={
                          isGeometryVerbalStem
                            ? verbalVisualLayout?.questionLeadClassName ??
                              MB.questionLead
                            : questionPressureLayout?.questionLeadClassByPressure ??
                              MB.questionLead
                        }
                        formulaClassName={MB.questionFormula}
                        bodyClassName={
                          isGeometryVerbalStem
                            ? verbalVisualLayout?.questionBodyClassName ??
                              MB.questionBody
                            : questionPressureLayout?.questionBodyClassByPressure ??
                              MB.questionBody
                        }
                        leadStyle={{
                          lineHeight: isGeometryVerbalStem
                            ? verbalVisualLayout?.questionLineHeightByPressure
                            : questionPressureLayout?.questionLineHeightByPressure,
                        }}
                        bodyStyle={{
                          lineHeight: isGeometryVerbalStem
                            ? verbalVisualLayout?.questionLineHeightByPressure
                            : questionPressureLayout?.questionLineHeightByPressure,
                        }}
                        wrapperClassName={
                          isGeometryVerbalStem
                            ? undefined
                            : "w-full max-w-full flex flex-col items-center justify-center gap-2 px-1 pb-1"
                        }
                      />
                    </>
                  )}

                  <LearningMasterMobileQuestionActionDock
                    MB={MB}
                    show={showMobileQuestionActions}
                    testId="geometry-question-mobile-actions"
                    bookSlot={
                      questionBookHref ? (
                        <button
                          type="button"
                          data-testid={`geometry-${grade}-book-question-button`}
                          onClick={() => openBookFromLearning(questionBookHref)}
                          className={`${MB.questionActionBtn} ${MB.floatBtnBookColors}`}
                          title="הסבר בספר לנושא הנוכחי"
                        >
                          הסבר
                        </button>
                      ) : null
                    }
                    secondarySlot={
                      showGeometryTheoryHelp ? (
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

                  {questionDiagramSpec && (
                    <div
                      className="absolute bottom-0 left-1/2 z-[2] w-full max-w-[140px] max-h-[100px] -translate-x-1/2 pointer-events-none px-1 md:left-2 md:right-auto md:translate-x-0 sm:max-w-[180px] sm:max-h-[120px]"
                      data-testid="geometry-question-diagram"
                      dir="ltr"
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label="הגדל שרטוט"
                        onClick={() => setShowDiagramModal(true)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setShowDiagramModal(true);
                          }
                        }}
                        className="relative inline-block w-full max-h-full cursor-pointer rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 pointer-events-auto"
                      >
                        <GeometryExplanationDiagram
                          spec={questionDiagramSpec}
                          mini
                          question={currentQuestion}
                          emphasis="neutral"
                        />
                        <span
                          className="absolute bottom-0.5 left-0.5 text-[10px] leading-none bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 rounded px-1.5 py-px shadow pointer-events-none select-none"
                          aria-hidden
                        >
                          ⛶ הגדל
                        </span>
                      </div>
                    </div>
                  )}
                  </div>

                  <div
                      data-testid="geometry-answer-surface"
                      className={`${LEARNING_MASTER_ANSWER_SURFACE_CLASS} relative z-30`}
                    >
                      {currentQuestion.params?.kind !== "no_question" &&
                        ((mode === "learning" || mode === "practice") && !geometryQuestionUsesChoiceUi(currentQuestion.params) ? (
                          (() => {
                            const primaryBtn = getLearningPrimaryAnswerButtonState({
                              selectedAnswer,
                              textAnswer,
                            });
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
                                subject="geometry"
                                value={textAnswer}
                                onChange={setTextAnswer}
                                disabled={!!selectedAnswer}
                                testId="geometry-text-answer"
                                placeholder="תשובה"
                                autoFocus
                                inputClassName={
                                  isMobileViewport
                                    ? LEARNING_MASTER_MOBILE_NUMERIC_INPUT
                                    : isTouchDevice
                                      ? MB.inputMobile
                                      : MB.inputDesktop
                                }
                                {...buildLearningMasterMobileNumericFieldProps(isMobileViewport)}
                                onEnterSubmit={handleGeometryPrimaryAnswerButtonClick}
                                onSubmit={handleGeometryPrimaryAnswerButtonClick}
                                submitDisabled={primaryBtn.disabled}
                                submitLabel={primaryBtn.label}
                                submitTone={primaryBtn.action === "next" ? "blue" : "green"}
                                submitTestId="geometry-check-answer"
                              />
                            </div>
                            {!mobileEmbeddedNumericSubmit ? (
                              <div className="flex justify-center">
                                <button
                                  type="button"
                                  data-testid="geometry-check-answer"
                                  onClick={handleGeometryPrimaryAnswerButtonClick}
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
                          })()
                        ) : currentQuestion.answers ? (
                          <div
                            className={buildHebrewApprovedVerbalMcqGridClassName({
                              useNarrowMobileAnswerFallback:
                                verbalVisualLayout?.useNarrowMobileAnswerFallback,
                              isMobileViewport,
                            })}
                          >
                              {currentQuestion.answers.map((answer, idx) => {
                                const isSelected = selectedAnswer === answer;
                                const isCorrect = compareGeometryLearnerAnswer({
                                  user: answer,
                                  correctAnswer: currentQuestion.correctAnswer,
                                  scaleFloor: GEOMETRY_NUMERIC_SCALE_FLOOR,
                                  relativeFactor: GEOMETRY_NUMERIC_RELATIVE_FACTOR,
                                  minTolerance: GEOMETRY_NUMERIC_MIN_TOLERANCE,
                                }).isCorrect;
                                const isWrong = isSelected && !isCorrect;

                                return (
                                  <button
                                    type="button"
                                    key={idx}
                                    data-testid={`geometry-mcq-${idx}`}
                                    onClick={() => handleAnswer(answer)}
                                    disabled={!!selectedAnswer}
                                    className={`rounded-xl border-2 transition-all active:scale-95 disabled:opacity-50 ${verbalVisualLayout?.answerCardTextClass ?? ""} ${verbalVisualLayout?.answerCardNarrowClass ?? ""} ${resolveLearningMcqChoiceClassName({
                                      MB,
                                      isSelected,
                                      isCorrectChoice: isCorrect,
                                      isWrong,
                                      revealResults: selectedAnswer != null,
                                    })}`}
                                  >
                                    {answer}
                                  </button>
                                );
                              })}
                          </div>
                        ) : null)}

                      {/* כפתורי הסבר / עצירה */}
                      {currentQuestion && (
                        <div className="mt-2 flex flex-col gap-2 w-full">
                          <div className={MB.answerActionsBar} dir="rtl">
                            {mode === "learning" &&
                              currentQuestion.params?.kind !== "no_question" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    clearWrongAnswerAdvanceTimer();
                                    stepByStepViewedRef.current = true;
                                    setShowSolution((prev) => !prev);
                                  }}
                                  className={MB.btnStepByStep}
                                >
                                  📘 צעד-צעד
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
                              previousExplanationQuestion &&
                              currentQuestion.params?.kind !== "no_question" && (
                                <button
                                  type="button"
                                  onClick={openPreviousExplanation}
                                  className={MB.btnPrevExercise}
                                >
                                  🕘 תרגיל קודם
                                </button>
                              )}
                          </div>

                      {(mode === "learning" || mode === "practice") &&
                        currentQuestion.params?.kind !== "no_question" && (
                        <>

                      {/* חלון הסבר מלא - Modal גדול ומרכזי */}
                      {isShowingAnySolution &&
                        explanationQuestion &&
                        geometryAnimationSteps &&
                        geometryAnimationSteps.length > 0 &&
                        (() => {
                          const safeStepIndex = Math.max(
                            0,
                            Math.min(
                              animationStep || 0,
                              geometryAnimationSteps.length - 1
                            )
                          );
                          const activeStep = geometryAnimationSteps[safeStepIndex];
                          if (!activeStep) return null;
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

                                <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-3 sm:px-4 pb-2">
                                  <div className={`flex-shrink-0 mb-2 ${learningQuestionBox}`}>
                                    <div
                                      className={learningQuestionText}
                                      style={learningMixedHebrewMathStyle}
                                    >
                                      {renderLearningMixedHebrewMathText(
                                        explanationQuestion.question,
                                        learningQuestionText
                                      )}
                                    </div>
                                  </div>

                                  <StepExerciseUiProvider value={stepExerciseUi}>
                                  <div className={learningModalScrollBody} dir="rtl">
                                  {(() => {
                                    const diagramSpec =
                                      getGeometryDiagramSpec(explanationQuestion);
                                    if (!diagramSpec) return null;
                                    return (
                                      <div className="flex-shrink-0 w-full flex justify-center items-stretch min-h-[min(36svh,240px)] max-h-[min(48svh,340px)] py-2">
                                        <GeometryExplanationDiagram
                                          key={activeStep.id}
                                          spec={diagramSpec}
                                          question={explanationQuestion}
                                          emphasis={
                                            activeStep.diagramEmphasis ||
                                            "neutral"
                                          }
                                          reveal={activeStep.diagramReveal || []}
                                          animationPreset={
                                            activeStep.animationPreset || "none"
                                          }
                                          stepId={activeStep.id}
                                        />
                                      </div>
                                    );
                                  })()}

                                    <StepGeometryStepPanel
                                      key={activeStep.id}
                                      step={activeStep}
                                      titleClassName={`${learningExplTitle} sticky top-0 bg-gradient-to-b from-emerald-950/98 to-emerald-950/80 backdrop-blur-[2px] pb-1 -mb-1 z-[1]`}
                                      bodyClassName={learningExplBody}
                                    />
                                  </div>
                                  </StepExerciseUiProvider>
                                </div>

                                <div className={learningModalFooter}>
                                  <div
                                    className={learningStepNavRow}
                                    dir="rtl"
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setAnimationStep((s) =>
                                          s > 0 ? s - 1 : 0
                                        )
                                      }
                                      disabled={animationStep === 0}
                                      className={learningStepNavBtn}
                                    >
                                      קודם
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setAutoPlay((p) => !p)}
                                      className={learningStepNavBtnPlay}
                                    >
                                      {autoPlay ? "עצור" : "נגן"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setAnimationStep((s) =>
                                          s < geometryAnimationSteps.length - 1
                                            ? s + 1
                                            : s
                                        )
                                      }
                                      disabled={
                                        animationStep >=
                                        geometryAnimationSteps.length - 1
                                      }
                                      className={learningStepNavBtn}
                                    >
                                      הבא
                                    </button>
                                  </div>
                                  <div className={learningStepCounter}>
                                    צעד {animationStep + 1} מתוך{" "}
                                    {geometryAnimationSteps.length}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                        </>
                      )}

                          {showTheoryHelp &&
                            mode === "learning" &&
                            currentQuestion.params?.kind !== "no_question" && (
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
                                  <div
                                    className="text-sm text-white/90 leading-relaxed"
                                    style={learningMixedHebrewMathStyle}
                                  >
                                    {renderLearningMixedHebrewMathText(
                                      getTheorySummary(currentQuestion, currentQuestion.topic, grade)
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  </div>
              )}

            </div>
          )}

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

                <div className="flex gap-2 mb-4 justify-center" dir="rtl">
                  {studentDisplayLevelKeys("geometry").slice().reverse().map((dl) => (
                    <button
                      key={dl}
                      onClick={() => {
                        setLeaderboardLevel(dl);
                        if (typeof window !== "undefined") {
                          try {
                            const saved = safeGetJsonObject(STORAGE_KEY);
                            const topScores = loadLeaderboardTop10ByDisplayLevel(saved, dl);
                            setLeaderboardData(topScores);
                          } catch (e) {
                            console.error("שגיאה בטעינת לוח התוצאות:", e);
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
                            עדיין אין תוצאות ברמה {studentDisplayLevelLabel(leaderboardLevel)}
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

          {showMixedSelector && (
            <div
              role="dialog" aria-modal="true" className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4"
              onClick={() => {
                setShowMixedSelector(false);
                const hasSelected = Object.values(mixedTopics).some(
                  (selected) => selected
                );
                if (!hasSelected && topic === "mixed") {
                  const allowed = geometryTopicSelectOptions;
                  const firstAllowed = allowed.find((t) => t !== "mixed") || allowed[0];
                  if (firstAllowed) {
                    setTopic(firstAllowed);
                  }
                }
              }}
              dir="rtl"
            >
              <div
                className="bg-gradient-to-br from-[#080c16] to-[#0a0f1d] border-2 border-white/20 rounded-2xl p-6 max-w-md w-full max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center mb-4 flex-shrink-0">
                  <h2 className="text-2xl font-extrabold text-white mb-2">
                    🎲 בחר נושאים למיקס
                  </h2>
                  <p className="text-white/70 text-sm">
                    בחר אילו נושאים לכלול במיקס
                  </p>
                </div>

                <div className="space-y-3 mb-4 overflow-y-auto flex-1 min-h-0">
                  {visibleGeometryTopics.map((t) => (
                      <label
                        key={t}
                        className="flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-white/10 hover:bg-black/40 cursor-pointer transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={mixedTopics[t] || false}
                          onChange={(e) => {
                            setMixedTopics((prev) => ({
                              ...prev,
                              [t]: e.target.checked,
                            }));
                          }}
                          className="w-5 h-5 rounded"
                        />
                        <span className="text-white font-semibold text-lg">
                          {getTopicName(t)}
                        </span>
                      </label>
                    ))}
                </div>

                <div className="flex gap-2 flex-shrink-0" dir="rtl">
                  <button
                    onClick={() => {
                      const availableTopics = visibleGeometryTopics;
                      const allSelected = {};
                      availableTopics.forEach((t) => {
                        allSelected[t] = true;
                      });
                      setMixedTopics(allSelected);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-blue-500/80 hover:bg-blue-500 font-bold text-sm"
                  >
                    הכל
                  </button>
                  <button
                    onClick={() => {
                      const availableTopics = visibleGeometryTopics;
                      const noneSelected = {};
                      availableTopics.forEach((t) => {
                        noneSelected[t] = false;
                      });
                      setMixedTopics(noneSelected);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-gray-500/80 hover:bg-gray-500 font-bold text-sm"
                  >
                    בטל הכל
                  </button>
                  <button
                    onClick={() => {
                      const hasSelected = Object.values(mixedTopics).some(
                        (selected) => selected
                      );
                      if (hasSelected) {
                        setShowMixedSelector(false);
                      } else {
                        alert("אנא בחר לפחות נושא אחד");
                      }
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-emerald-500/80 hover:bg-emerald-500 font-bold text-sm"
                  >
                    שמור
                  </button>
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

          {/* Player Profile Modal */}
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

                {/* אווטר */}
                <div className="text-center mb-4">
                  <div className="text-6xl mb-3">
                    {playerAvatarImage ? (
                      <img 
                        src={playerAvatarImage} 
                        alt="אווטר" 
                        className="w-24 h-24 rounded-full object-cover mx-auto"
                      />
                    ) : (
                      playerAvatar
                    )}
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
                        id="avatar-image-upload-geometry"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => document.getElementById("avatar-image-upload-geometry").click()}
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
                          if (typeof window !== "undefined") {
                            safeSetItem("mleo_player_avatar", avatar);
                            safeRemoveItem("mleo_player_avatar_image");
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

                {/* סטטיסטיקות */}
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
                      <div className="text-xs text-white/60 mb-1">רמה</div>
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

                  {/* התקדמות לפי נושאים */}
                  {Object.keys(progress).some(topic => progress[topic].total > 0) && (
                    <div className="bg-black/30 border border-white/10 rounded-lg p-3">
                      <div className="text-sm text-white/60 mb-2">התקדמות לפי נושאים</div>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {Object.entries(progress)
                          .filter(([_, data]) => data.total > 0)
                          .sort(([_, a], [__, b]) => b.total - a.total)
                          .map(([topic, data]) => {
                            const topicAccuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                            return (
                              <div key={topic} className="flex items-center justify-between text-xs">
                                <span className="text-white/80">{getTopicName(topic)}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-white/60">{data.correct}/{data.total}</span>
                                  <span className={`font-bold ${topicAccuracy >= 80 ? "text-emerald-400" : topicAccuracy >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                                    {topicAccuracy}%
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {geometryInsights.weakest && geometryInsights.strongest && (
                    <div className="bg-black/30 border border-white/10 rounded-lg p-3">
                      <div className="text-sm text-white/60 mb-2">תובנות מהתרגול (מקומי)</div>
                      <div className="text-xs text-white/85 space-y-1">
                        <div>
                          <span className="text-amber-300 font-semibold">לחזק:</span>{" "}
                          {getTopicName(geometryInsights.weakest)}
                        </div>
                        <div>
                          <span className="text-emerald-300 font-semibold">חזק ביחס:</span>{" "}
                          {getTopicName(geometryInsights.strongest)}
                        </div>
                        <p className="text-[11px] text-white/50 mt-2">
                          לפחות 2 ניסיונות; נשמר בדפדפן בלבד.
                        </p>
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

                <div className="text-center">
                  <button
                    onClick={() => setShowPlayerProfile(false)}
                    className="px-6 py-2 rounded-lg bg-purple-500/80 hover:bg-purple-500 font-bold text-sm"
                  >
                    סגור
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Practice Options Modal */}
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
                        <div key={idx} className="text-xs text-white/80">
                          {mistake.question} = {mistake.wrongAnswer} ❌ (נכון: {mistake.correctAnswer})
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    setMistakes([]);
                    if (typeof window !== "undefined") {
                      safeSetJson("mleo_geometry_mistakes", []);
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

          {showHowTo && (
            <div
              role="dialog" aria-modal="true" className="fixed inset-0 bg-black/80 flex items-center justify-center z-[180] p-4"
              onClick={() => setShowHowTo(false)}
              dir="rtl"
            >
              <div
                className="bg-gradient-to-br from-[#080c16] to-[#0a0f1d] border-2 border-emerald-400/60 rounded-2xl p-4 max-w-md w-full text-sm text-white"
                dir="rtl"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-extrabold mb-2 text-center">
                  📘 איך לומדים גאומטריה כאן?
                </h2>

                <p className="text-white/80 text-xs mb-3 text-center">
                  המטרה היא לתרגל גאומטריה בצורה משחקית, עם התאמה לכיתה, נושא ורמת קושי.
                </p>

                <ul className="list-disc pr-4 space-y-1 text-[13px] text-white/90">
                  <li>בחר כיתה, רמת קושי ונושא (שטח, היקף, נפח, זוויות, פיתגורס ועוד).</li>
                  <li>בחר מצב משחק: למידה, אתגר עם טיימר וחיים, מהירות או מרתון.</li>
                  <li>קרא היטב את השאלה – לפעמים יש תרגילי מילים על גינות, גדרות וארגזים.</li>
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

          {/* לוח צורות ונוסחאות */}
          {/* מודל הגדלת שרטוט */}
          {showDiagramModal && questionDiagramSpec && currentQuestion && (
            <div
              role="dialog" aria-modal="true" className="fixed inset-0 bg-black/80 flex items-center justify-center z-[186] p-4"
              onClick={() => setShowDiagramModal(false)}
              role="dialog"
              aria-modal="true"
              aria-label="שרטוט מוגדל"
            >
              <div
                className="w-full max-w-[min(96vw,720px)] bg-gradient-to-br from-[#080c16] to-[#0a0f1d] border-2 border-emerald-500/50 rounded-2xl p-3 sm:p-4 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                dir="rtl"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-emerald-300 font-bold text-sm">שרטוט</span>
                  <button
                    type="button"
                    onClick={() => setShowDiagramModal(false)}
                    className="text-slate-400 hover:text-white text-lg leading-none px-1"
                    aria-label="סגור שרטוט"
                  >
                    ✕
                  </button>
                </div>
                <div dir="ltr">
                  <GeometryExplanationDiagram
                    spec={questionDiagramSpec}
                    question={currentQuestion}
                    emphasis="neutral"
                    expanded
                  />
                </div>
              </div>
            </div>
          )}

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
                  <h2 className="text-2xl font-extrabold">📐 לוח צורות ונוסחאות</h2>
                  <button
                    onClick={() => setShowReferenceModal(false)}
                    className="text-white/80 hover:text-white text-xl px-2"
                  >
                    ✖
                  </button>
                </div>
                <p className="text-sm text-white/70 mb-3">
                  בחר קטגוריה כדי לראות צורות, נוסחאות ומונחים חשובים בגאומטריה.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    { key: "shapes", label: "צורות" },
                    { key: "formulas", label: "נוסחאות" },
                    { key: "terms", label: "מונחים" },
                  ].map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setReferenceCategory(cat.key)}
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        referenceCategory === cat.key
                          ? "bg-blue-500/80 border-blue-300 text-white"
                          : "bg-white/5 border-white/20 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                <div className="space-y-3">
                  {referenceCategory === "shapes" && (
                    <>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">🔷 ריבוע</div>
                        <div className="text-sm text-white/80">4 צלעות שוות, 4 זוויות ישרות</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">⬜ מלבן</div>
                        <div className="text-sm text-white/80">2 זוגות של צלעות שוות, 4 זוויות ישרות</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">🔺 משולש</div>
                        <div className="text-sm text-white/80">3 צלעות, 3 זוויות</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">⭕ מעגל</div>
                        <div className="text-sm text-white/80">צורה עגולה, כל הנקודות במרחק שווה מהמרכז</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">📦 תיבה</div>
                        <div className="text-sm text-white/80">גוף תלת-מימדי עם 6 פאות מלבניות</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">🔲 קובייה</div>
                        <div className="text-sm text-white/80">תיבה עם כל הצלעות שוות</div>
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
                        <div className="font-bold text-lg mb-2">📏 היקף ריבוע</div>
                        <div className="text-sm text-white/80">4 × צלע</div>
                        <div className="text-xs text-white/60 mt-1"><span dir="ltr" style={{ display: 'inline-block' }}>P = 4a</span></div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">📏 היקף מלבן</div>
                        <div className="text-sm text-white/80">2 × (אורך + רוחב)</div>
                        <div className="text-xs text-white/60 mt-1"><span dir="ltr" style={{ display: 'inline-block' }}>P = 2(a + b)</span></div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">📦 נפח תיבה</div>
                        <div className="text-sm text-white/80">אורך × רוחב × גובה</div>
                        <div className="text-xs text-white/60 mt-1"><span dir="ltr" style={{ display: 'inline-block' }}>V = a × b × c</span></div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">📦 נפח קובייה</div>
                        <div className="text-sm text-white/80">צלע × צלע × צלע</div>
                        <div className="text-xs text-white/60 mt-1"><span dir="ltr" style={{ display: 'inline-block' }}>V = a³</span></div>
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
                        <div className="font-bold text-lg mb-2">📐 שטח</div>
                        <div className="text-sm text-white/80">המקום שצורה תופסת במישור</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">📏 היקף</div>
                        <div className="text-sm text-white/80">אורך הקו המקיף את הצורה</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">📦 נפח</div>
                        <div className="text-sm text-white/80">המקום שגוף תופס במרחב</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">📐 זווית</div>
                        <div className="text-sm text-white/80">המקום בין שתי קרניים היוצאות מאותה נקודה</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">📐 זווית ישרה</div>
                        <div className="text-sm text-white/80">90 מעלות</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">📐 זווית חדה</div>
                        <div className="text-sm text-white/80">פחות מ-90 מעלות</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">📐 זווית קהה</div>
                        <div className="text-sm text-white/80">יותר מ-90 מעלות</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">📐 מקבילות</div>
                        <div className="text-sm text-white/80">קווים שלא נפגשים לעולם</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">📐 מאונכות</div>
                        <div className="text-sm text-white/80">קווים שנפגשים בזווית ישרה</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">📐 אלכסון</div>
                        <div className="text-sm text-white/80">קו המחבר שני קודקודים לא סמוכים</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">📐 סימטרייה</div>
                        <div className="text-sm text-white/80">כאשר צורה נראית זהה משני צדדים</div>
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
      subjectId="geometry"
      uiSelection={`topic=${topic}`}
      currentQuestion={currentQuestion}
      trackingRef={null}
    />
    </Layout>
    </MasterSubjectAccessScreen>
  );
}



