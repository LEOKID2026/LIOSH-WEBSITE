import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import Layout from "../../components/Layout";
import { useRouter } from "next/router";
import { useIOSViewportFix } from "../../hooks/useIOSViewportFix";
import {
  BLANK,
  GRADE_LEVELS,
  GRADES,
  TOPICS,
  MODES,
  STORAGE_KEY,
} from "../../utils/hebrew-constants";
import {
  getLevelConfig,
  getLevelForGrade,
  buildTop10ByScore,
  saveScoreEntry,
} from "../../utils/hebrew-storage";
import { generateQuestion } from "../../utils/hebrew-question-generator";
import { sanitizeQuestionForStudentDisplay } from "../../utils/student-question-stem-sanitizer";
import StudentQuestionDisplay from "../../components/learning/StudentQuestionDisplay";
import {
  hebrewQuestionFingerprint,
  hebrewNearDuplicateKey,
  hebrewCognitiveTemplateKey,
  hebrewTaskShapeKey,
} from "../../utils/hebrew-learning-intel";
import { SessionAntiRepeatBuffer } from "../../utils/question-session-anti-repeat";
import {
  getSolutionSteps,
  getErrorExplanation,
  buildStepExplanation,
} from "../../utils/hebrew-explanations";
import { trackHebrewTopicTime } from "../../utils/hebrew-time-tracking";
import { useMobileViewport } from "../../hooks/useMobileViewport";
import {
  applyLearningMasterMobileShellLayoutVars,
  LEARNING_MASTER_MOBILE_ANSWER_SCALE_CLASS,
  LEARNING_MASTER_MOBILE_BOOK_TILE_BOTTOM,
  LEARNING_MASTER_MOBILE_CONTENT_SCROLL_CLASS,
  LEARNING_MASTER_MOBILE_GAME_CLASS,
  LEARNING_MASTER_MOBILE_HUD_CLASS,
  LEARNING_MASTER_MOBILE_MODE_ROW_CLASS,
  LEARNING_MASTER_MOBILE_SUBTITLE_ROW_CLASS,
  LEARNING_MASTER_MOBILE_TYPING_INPUT_CLASS,
  LEARNING_MASTER_MOBILE_WRAP_CLASS,
} from "../../utils/learning-master-mobile.client";
import {
  LIVE_PRACTICE_GAME_OVER_HE,
  LIVE_PRACTICE_WRONG_HE,
  formatLearningWrongFeedbackHe,
} from "../../utils/learning-live-feedback-he";
import { STEP_BY_STEP_AUTO_PLAY_DELAY_MS } from "../../utils/learning-step-by-step-config";
import TrackingDebugPanel from "../../components/TrackingDebugPanel";
import LearningPlannerRecommendationBlock from "../../components/LearningPlannerRecommendationBlock";
import { reportModeFromGameState } from "../../utils/report-track-meta";
import {
  updateDailyStreak,
  getStreakReward,
} from "../../utils/daily-streak";
import { useGameAudio } from "../../hooks/useGameAudio";
import { startLearningMasterSessionAudio } from "../../lib/game-audio/learning-master-session-audio.js";
import { getQuestionFontStyle, getVerbalInstructionStyle } from "../../utils/learning-question-font";
import { resolveLearningMcqChoiceClassName } from "../../utils/learning-mcq-choice-styles.client";
import { compareAnswers } from "../../utils/answer-compare";
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
  probeMatchesSession,
  bankQuestionProbeMatch,
  attachProbeMetaToQuestion,
  applyProbeOutcome,
  buildDiagnosticProbeClientMeta,
  clearActiveDiagnosticState,
  decrementPendingProbeExpiry,
} from "../../utils/active-diagnostic-runtime/index.js";
import {
  hebrewScriptLikely,
  isChildHebrewNiqqudGradeKey,
  stripHebrewNiqqudMarks,
  textAlreadyHasNiqqud,
} from "../../utils/hebrew-dicta-nakdan";
import {
  spellingStemForNiqqudDetect,
  isSpellingTargetWordInQuotesContextFromStem,
  stripNiqqudInsideQuotedHebrewWordSpans,
} from "../../utils/hebrew-spelling-niqqud";
import { isHebrewFullCompetitiveScoringGrade } from "../../utils/hebrew-scoring-policy";
import { attachHebrewAudioToQuestion } from "../../utils/hebrew-audio-build1";
import {
  isG1G2RuntimePracticeEligible,
  isLowerGradeG1G2Key,
  sanitizeLowerGradeChildFacingText,
} from "../../utils/lower-grade-practice-runtime-quality";
import { validateAudioStem } from "../../utils/audio-task-contract";
import HebrewAudioBuild1Panel from "../../components/HebrewAudioBuild1Panel";
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
import { useLearningVisibilityClock } from "../../hooks/useLearningVisibilityClock";
import { useStudentDisplayLevelPractice } from "../../hooks/useStudentDisplayLevelPractice.js";
import { StudentDisplayLevelSelect } from "../../components/learning/StudentDisplayLevelSelect.js";
import {
  studentDisplayLevelKeys,
  studentDisplayLevelLabel,
} from "../../lib/learning-client/student-display-level-practice.js";
import { useLearningWrongAnswerAdvance } from "../../hooks/useLearningWrongAnswerAdvance";
import {
  LEARNING_CORRECT_ANSWER_ADVANCE_MS,
} from "../../utils/learning-wrong-answer-feedback-timing";
import {
  beginMasterQuestionLedger,
  finalizeMasterQuestionLedger,
  isFairnessVisibilityLedgerActive,
  resolveMasterSessionDurationSeconds,
} from "../../utils/learning-time-credit";
import { computeFreePracticeTiming } from "../../lib/learning/timing-policy.js";
import { getLearningBookIndexHref } from "../../lib/learning-book/learning-book-catalog-meta";
import LearningBookIndexTile from "../../components/learning-book/LearningBookIndexTile";
import { getHebrewBookHref } from "../../lib/learning-book/resolve-hebrew-book-page";
import {
  HEBREW_BOOK_GRADES,
  consumeAnyHebrewBookLearningSnapshot,
  consumeAnyHebrewBookPracticePreset,
  isHebrewBookPracticeEntry,
  saveHebrewBookLearningSnapshot,
  withHebrewBookLearningReturn,
} from "../../lib/learning-book/hebrew-book-nav";
import {
  buildBookContextClientMetaExtras,
  tryConsumeBookContextOnPracticeEntry,
} from "../../lib/learning-book/book-context-master-helper";
import {
  dismissHebrewG1BookFirstSoftGateClient,
  getHebrewG1BookFirstRecommendationCopy,
  getHebrewG1LiteracyFoundationBookHref,
  readHebrewG1LiteracyProgressClient,
  recordHebrewG1LiteracyPageViewClient,
  shouldShowHebrewG1BookFirstSoftGate,
} from "../../lib/learning-book/hebrew-g1-literacy-progress";
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
import LearningMasterMobileQuestionActionDock from "../../components/learning/LearningMasterMobileQuestionActionDock.jsx";
import { StepExerciseUiProvider } from "../../contexts/StepExerciseUiContext.jsx";
import { formatMathHudNumber } from "../../utils/math-master-hud-number.client.js";

function loadLeaderboardTop10ByDisplayLevel(saved, displayLevel) {
  const sourceKeys = displayLevel === "advanced" ? ["hard"] : ["easy", "medium"];
  const merged = sourceKeys.flatMap((sk) => buildTop10ByScore(saved, sk));
  merged.sort((a, b) => (b.score || 0) - (a.score || 0));
  return merged.slice(0, 10);
}

const HEBREW_BOOK_GRADE_SET = new Set(HEBREW_BOOK_GRADES);

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
  grammar: { label: "דקדוק", icon: "✏️" },
  vocabulary: { label: "אוצר מילים", icon: "📚" },
  reading: { label: "קריאה והבנה", icon: "📖" },
};

const REFERENCE_CATEGORY_KEYS = Object.keys(REFERENCE_CATEGORIES);

/** Matches `utils/math-report-generator.js` and parent-report mistake readers. */
const HEBREW_MISTAKES_KEY = "mleo_hebrew_mistakes";

export default function HebrewMaster() {
  useIOSViewportFix();
  const isMobileViewport = useMobileViewport();
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
  const router = useRouter();
  const wrapRef = useRef(null);
  const headerRef = useRef(null);
  const desktopHeaderRef = useRef(null);
  const gameRef = useRef(null);
  const controlsRef = useRef(null);
  const operationSelectRef = useRef(null);
  const sessionStartRef = useRef(null);
  const sessionSecondsRef = useRef(0);
  const questionTimeLedgerRef = useRef(null);
  const solvedCountRef = useRef(0);
  const learningSessionIdRef = useRef(null);
  const learningSessionStartPromiseRef = useRef(null);
  const plannerResponseSeqRef = useRef(0);
  const plannerNextSessionClientMetaRef = useRef(null);
  const pendingHebrewTrackMetaRef = useRef(null);
  /** Real topic/operation bucket for the question on screen (avoids stale currentQuestion) */
  const hebrewTrackingTopicKeyRef = useRef(null);
  /** עוצר לולאות של אותה משפחת תבנית בזו אחר זו */
  const hebrewPatternFamilyTailRef = useRef([]);
  const hebrewNearDuplicateTailRef = useRef([]);
  const hebrewCognitiveTemplateTailRef = useRef([]);
  /** כיתה א׳–ב׳: מגביל חזרה על אותה צורת משימה (לא רק patternFamily) */
  const hebrewTaskShapeTailRef = useRef([]);
  const hebrewPendingDiagnosticProbeRef = useRef(null);
  const hebrewHypothesisLedgerRef = useRef(null);
  const learningProfileStudentIdRef = useRef(null);
  const learningProfileHydratedRef = useRef(false);
  const [serverAccountSubjectAccuracyPct, setServerAccountSubjectAccuracyPct] = useState(null);
  const [learningProfileHydrationTick, setLearningProfileHydrationTick] = useState(0);
  const scoresStoreRef = useRef({});
  const progressLoadedRef = useRef(false);
  const progressStringRef = useRef("");
  /** עדכני אל handleAnswer (משוב שגוי) כדי להציג תשובה נכונה מנוקדת כשה map כבר הגיע */
  const niqqudByIdRef = useRef({});
  /** cache ניקוד ברמת session: text → vocalized — שומר ניקוד שנטען מ-API גם אם ה-API נכשל אחר כך */
  const niqqudSessionCacheRef = useRef(new Map());
  const audioBuild1CounterRef = useRef(0);
  const currentQuestionRef = useRef(null);
  const bookPracticePresetRef = useRef(null);
  const practiceForceKindRef = useRef(null);
  const practiceForceSkillIdRef = useRef(null);

  const [mounted, setMounted] = useState(false);

  /** לפני ציור ראשון — מונע מצב שבו הדף נשאר על ״טוען...׳ בלי hydration מלא (נראה בבדיקות אוטומטיות ובמקרי קצה). */
  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  // NEW: grade & mode
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
  } = useSubjectSessionDefaults({ permissionKey: "hebrew" });
  const bookIndexHref = grade ? getLearningBookIndexHref("hebrew", grade) : null;
  const [mode, setMode] = useState("practice");

  const [operation, setOperation] = useState("reading"); // לא mixed כברירת מחדל כדי שה-modal לא יפתח אוטומטית
  const hebrewTopicsForGuest = useMemo(
    () => (GRADES[grade]?.topics ?? []).filter((t) => t !== "mixed"),
    [grade]
  );
  const guestTopics = useGuestPlayableTopics("hebrew", hebrewTopicsForGuest);
  const bookTopicHref = useMemo(() => {
    if (!HEBREW_BOOK_GRADE_SET.has(grade)) return null;
    return getHebrewBookHref({ grade, operation, kind: null });
  }, [grade, operation]);
  const g1FoundationBookHref = useMemo(
    () => (grade === "g1" ? getHebrewG1LiteracyFoundationBookHref() : null),
    [grade]
  );
  const g1BookFirstCopy = useMemo(() => getHebrewG1BookFirstRecommendationCopy(), []);
  const [g1LiteracyProgress, setG1LiteracyProgress] = useState(() =>
    typeof window !== "undefined" ? readHebrewG1LiteracyProgressClient() : { viewedPageIds: [], dismissedTopics: [] }
  );
  const showG1BookFirstSoftGate = useMemo(
    () =>
      shouldShowHebrewG1BookFirstSoftGate({
        gradeKey: grade,
        topic: operation,
        progressState: g1LiteracyProgress,
      }),
    [grade, operation, g1LiteracyProgress]
  );
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
  } = useStudentDisplayLevelPractice("hebrew");
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
    if (!HEBREW_BOOK_GRADE_SET.has(grade)) return null;
    const params = currentQuestion.params || {};
    return getHebrewBookHref({
      grade,
      operation: currentQuestion.operation || currentQuestion.topic || operation,
      kind: params.subtopicId ?? params.kind ?? null,
      subtopicId: params.subtopicId ?? null,
      patternFamily: params.patternFamily ?? currentQuestion.patternFamily ?? null,
      subtype: params.subtype ?? currentQuestion.subtype ?? null,
    });
  }, [grade, mode, currentQuestion, operation]);

  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  /** תצוגת ניקוד (כיתות א׳–ב׳) — מפתח → טקסט אחרי Nakdan */
  const [niqqudById, setNiqqudById] = useState({});
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

  // מצב תצוגה מאוזן/מאונך
  const [isVerticalDisplay, setIsVerticalDisplay] = useState(false);

  // מערכת כוכבים ותגים
  const [stars, setStars] = useState(0);
  const [badges, setBadges] = useState([]);
  const [showBadge, setShowBadge] = useState(null);
  
  // Daily Streak
  const [dailyStreak, setDailyStreak] = useState({ streak: 0, lastDate: null });
  const [showStreakReward, setShowStreakReward] = useState(null);
  
  // Sound system
  const audio = useGameAudio();

  // מערכת רמות עם XP
  const [playerLevel, setPlayerLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);

  // אנימציות ומשוב חזותי
  const [showCorrectAnimation, setShowCorrectAnimation] = useState(false);
  const [showWrongAnimation, setShowWrongAnimation] = useState(false);
  const [celebrationEmoji, setCelebrationEmoji] = useState("🎉");
  const [playerAvatarBackground, setPlayerAvatarBackground] = useState(DEFAULT_PROFILE_BACKGROUND_KEY);
  const [showPlayerProfile, setShowPlayerProfile] = useState(false);
  const [playerAvatar, setPlayerAvatar] = useState("👤"); // אווטר ברירת מחדל
  const [playerAvatarImage, setPlayerAvatarImage] = useState(null); // תמונת אווטר מותאמת אישית
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
  const [progress, setProgress] = useState({
    reading: { total: 0, correct: 0 },
    comprehension: { total: 0, correct: 0 },
    writing: { total: 0, correct: 0 },
    grammar: { total: 0, correct: 0 },
    vocabulary: { total: 0, correct: 0 },
    speaking: { total: 0, correct: 0 },
  });

  // תחרויות יומיות
  // אתגר יומי - שאלות יומיות
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
  
  // תרגול ממוקד - שמירת שגיאות ותרגול מדורג
  const [mistakes, setMistakes] = useState([]);
  const [focusedPracticeMode, setFocusedPracticeMode] = useState("normal"); // "normal", "mistakes", "graded"
  const [showPracticeOptions, setShowPracticeOptions] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [referenceCategory, setReferenceCategory] = useState(REFERENCE_CATEGORY_KEYS[0]);

  // הסבר מפורט לשאלה
  const [showSolution, setShowSolution] = useState(false);
  const [showPreviousSolution, setShowPreviousSolution] = useState(false);
  const {
    scheduleWrongAnswerAdvance,
    clearWrongAnswerAdvanceTimer,
    clearWrongAnswerAdvanceState,
  } = useLearningWrongAnswerAdvance(showSolution, showPreviousSolution);
  const [previousExplanationQuestion, setPreviousExplanationQuestion] = useState(null);
  const [animationStep, setAnimationStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  // Phase 2: tracks whether any explanation/hint/step-by-step was viewed for the current question
  const stepByStepViewedRef = useRef(false);
  const bookContextRef = useRef(null);
  const bookContextConsumedRef = useRef(false);
  
  // Ref לשמירת timeouts לניקוי - מונע תקיעות
  const animationTimeoutsRef = useRef([]);
  
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
    if (op === "division") {
      const dividend = params.dividend || currentQuestion.a;
      const divisor = params.divisor || currentQuestion.b;
      return buildVerticalOperation(dividend, divisor, "÷");
    }
    if (op === "decimals") {
      const a = params.a;
      const b = params.b;
      // לעשרוניים נצטרך לוגיקה מיוחדת - בינתיים נחזיר null
      return null;
    }
    
    return null;
  };
  
  // Memoize explanation to avoid recalculating on every render
  const stepExplanation = useMemo(
    () => showSolution && currentQuestion ? buildStepExplanation(currentQuestion) : null,
    [showSolution, currentQuestion]
  );

  // בניית צעדי הסבר (לא אנימציות - שאלות טקסטואליות)
  const animationSteps = useMemo(() => {
    if (!showSolution || !currentQuestion) return null;
    
    // עבור שאלות טקסטואליות, נחזיר את צעדי ההסבר
    const steps = getSolutionSteps(currentQuestion, currentQuestion.topic || currentQuestion.operation, grade);
    if (!steps || steps.length === 0) return null;
    
    // נחזיר מערך של צעדים פשוטים
    return steps.map((step, index) => ({
      step: index + 1,
      text: step,
      highlights: []
    }));
  }, [showSolution, currentQuestion, grade]);

  // אנימציה אוטומטית - עם ניקוי תקין של timeouts
  useEffect(() => {
    // ניקוי כל ה-timeouts הקודמים
    animationTimeoutsRef.current.forEach(clearTimeout);
    animationTimeoutsRef.current = [];
    
    if (!showSolution || !autoPlay || !animationSteps) return;
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
  }, [showSolution, autoPlay, animationStep, animationSteps]);

  // איפוס צעד האנימציה כשפותחים את המודל או כשהשאלה משתנה
  useEffect(() => {
    // ניקוי timeouts כשסוגרים את המודל או משנים שאלה
    animationTimeoutsRef.current.forEach(clearTimeout);
    animationTimeoutsRef.current = [];
    
    if (showSolution && animationSteps && animationSteps.length > 0) {
      setAnimationStep(0);
      setAutoPlay(false);
    } else if (showSolution && (!animationSteps || animationSteps.length === 0)) {
      // אם אין אנימציה, נאפס את הצעד
      setAnimationStep(0);
    } else if (!showSolution) {
      // כשסוגרים את המודל - ניקוי מלא
      setAnimationStep(0);
      setAutoPlay(false);
    }
    
    // cleanup כשסוגרים את המודל או משנים שאלה
    return () => {
      animationTimeoutsRef.current.forEach(clearTimeout);
      animationTimeoutsRef.current = [];
    };
  }, [showSolution, animationSteps, currentQuestion]);

  useEffect(() => {
    refreshMonthlyPersistenceView();
  }, [refreshMonthlyPersistenceView]);

  // הסבר לטעות אחרונה
  const [errorExplanation, setErrorExplanation] = useState("");

  // תרגול ממוקד (רק במצב Practice)
  const [practiceFocus, setPracticeFocus] = useState("default"); // default | add_to_20 | times_6_8

  // מצב story questions
  const [useStoryQuestions, setUseStoryQuestions] = useState(false);
  const [storyOnly, setStoryOnly] = useState(false); // שאלות מילוליות בלבד

  // מעקב אחר עיגולים שעברו (רק לכיתה א')
  const [movedCirclesA, setMovedCirclesA] = useState(0); // כמה עיגולים עברו מ-a
  const [movedCirclesB, setMovedCirclesB] = useState(0); // כמה עיגולים עברו מ-b

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
  // No word problems for Hebrew - all topics are text-based
  useEffect(() => {
    setUseStoryQuestions(false);
    setStoryOnly(false);
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

  const openBookFromLearning = useCallback(
    (href) => {
      if (!href) return;
      if (!HEBREW_BOOK_GRADE_SET.has(grade)) return;
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
        typedAnswer,
        feedback,
        questionStartTime,
      };
      saveHebrewBookLearningSnapshot(grade, snapshot);
      router.push(withHebrewBookLearningReturn(href));
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
      typedAnswer,
      feedback,
      questionStartTime,
      router,
    ]
  );

  const applyBookPracticePreset = useCallback((preset) => {
    if (!preset || preset.mode !== "learning") return;
    const presetGrade = preset.grade;
    if (!HEBREW_BOOK_GRADE_SET.has(presetGrade)) return;
    const op = preset.operation || preset.topic;
    if (!GRADES[presetGrade]?.topics?.includes(op)) return;
    bookPracticePresetRef.current = preset;
    setGrade(presetGrade);
    const presetGradeNumber = gradeKeyToNumber(presetGrade);
    if (presetGradeNumber) {
      setGradeNumber(presetGradeNumber);
    }
    setMode("learning");
    setOperation(op);
    practiceForceKindRef.current = preset.forceKind || null;
    practiceForceSkillIdRef.current = preset.skillId || null;
    if (presetGrade === "g1" && preset.pageId) {
      setG1LiteracyProgress(recordHebrewG1LiteracyPageViewClient(preset.pageId));
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setG1LiteracyProgress(readHebrewG1LiteracyProgressClient());
  }, [grade]);

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
    const snap = consumeAnyHebrewBookLearningSnapshot();
    if (!snap || snap.gameActive !== true) return;
    setMode(typeof snap.mode === "string" ? snap.mode : "practice");
    if (typeof snap.grade === "string") setGrade(snap.grade);
    if (typeof snap.gradeNumber === "number") setGradeNumber(snap.gradeNumber);
    hydrateFromResumeSnapshot(snap);
    if (typeof snap.operation === "string") setOperation(snap.operation);
    setGameActive(true);
    if (snap.currentQuestion) setCurrentQuestion(snap.currentQuestion);
    setScore(typeof snap.score === "number" ? snap.score : 0);
    setStreak(typeof snap.streak === "number" ? snap.streak : 0);
    setCorrect(typeof snap.correct === "number" ? snap.correct : 0);
    setWrong(typeof snap.wrong === "number" ? snap.wrong : 0);
    setSelectedAnswer(snap.selectedAnswer ?? null);
    setTypedAnswer(typeof snap.typedAnswer === "string" ? snap.typedAnswer : "");
    setFeedback(snap.feedback ?? null);
    setQuestionStartTime(
      typeof snap.questionStartTime === "number"
        ? snap.questionStartTime
        : Date.now()
    );
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    if (!isHebrewBookPracticeEntry(router.query)) return;
    const preset = consumeAnyHebrewBookPracticePreset();
    if (preset) {
      applyBookPracticePreset(preset);
    }
  }, [router.isReady, router.query, applyBookPracticePreset]);

  useEffect(() => {
    tryConsumeBookContextOnPracticeEntry(
      router,
      { subject: "hebrew", grade },
      { bookContextRef, bookContextConsumedRef }
    );
  }, [router.isReady, router.query, grade]);

  useEffect(() => {
    clearActiveDiagnosticState(
      hebrewPendingDiagnosticProbeRef,
      hebrewHypothesisLedgerRef
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
        const acc = mapSubjectAccountViewFromStudentProfile(profile, "hebrew");
        const sub = profile.row.subjects?.hebrew;
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
        }
        const ch = profile.row.challenges;
        const { daily: chDaily, weekly: chWeekly } = pickSubjectChallengeBlobs(ch, "hebrew");
        if (chDaily) setDailyChallenge(chDaily);
        if (chWeekly) setWeeklyChallenge(chWeekly);
        setServerAccountSubjectAccuracyPct(accountAccuracyDisplayFromDerived(profile.derived, "hebrew"));
        const st = profile.row.streaks?.hebrew;
        if (st && typeof st === "object") setDailyStreak(st);
        applyLearningProfileAvatarRowToPlayerState(
          profile.row.profile,
          setPlayerAvatar,
          setPlayerAvatarImage,
          setPlayerAvatarBackground,
        );
        learningProfileHydratedRef.current = true;
        try {
          const pr = profile.row.subjects?.hebrew?.progressStore?.progress;
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
    debounceStudentLearningProfilePatch("hebrew-master-sync", () => {
      const base = {
        subjects: {
          hebrew: {
            progressStore,
            scoresStore: scoresStoreRef.current,
            mistakes,
            intel: {},
          },
        },
        challenges: subjectChallengePatch("hebrew", dailyChallenge, weeklyChallenge),
        streaks: { hebrew: dailyStreak },
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
  ]);

  useEffect(() => {
    return () => {
      recordSessionProgress({ includePlannerRecommendation: false });
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!learningProfileHydratedRef.current) return;
    try {
      const saved =
        scoresStoreRef.current && typeof scoresStoreRef.current === "object"
          ? scoresStoreRef.current
          : {};
      const key = `${level}_${operation || "reading"}`;
      const { maxScore, maxStreak } = maxBestForPlayerInKey(saved, key, playerName);
      setBestScore(maxScore);
      setBestStreak(maxStreak);
      logAccountTileSync("hebrew", {
        tile: "personalBests",
        level,
        operation,
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
    
    const allowed = GRADES[grade].topics;
    if (!allowed.includes(operation)) {
      // מצא את הנושא הראשון שזמין (לא mixed)
      const firstAllowed = allowed.find(topic => topic !== "mixed") || allowed[0];
      setOperation(firstAllowed);
    }
  }, [grade]); // רק כשהכיתה משתנה, לא כשהפעולה משתנה

  // עדכון mixedOperations לפי הכיתה
  useEffect(() => {
    if (!grade) return;
    const availableTopics = GRADES[grade].topics.filter(
      (topic) => topic !== "mixed"
    );
    const newMixedOps = {};
    availableTopics.forEach(topic => {
      newMixedOps[topic] = true;
    });
    setMixedOperations(newMixedOps);
  }, [grade]);

  // לא צריך useEffect - ה-modal נפתח ישירות ב-onChange

  // בדיקה אם זה יום חדש לתחרות יומית
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

  // טעינת נתונים מ-localStorage — נטען מהשרת ב-fetchStudentLearningProfile

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

  // Load leaderboard data when modal opens or level changes
  useEffect(() => {
    if (showLeaderboard && typeof window !== "undefined") {
      try {
        const fromRef = scoresStoreRef.current;
        const saved =
          fromRef && typeof fromRef === "object" && Object.keys(fromRef).length > 0
            ? fromRef
            : JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        const topScores = loadLeaderboardTop10ByDisplayLevel(saved, leaderboardLevel);
        setLeaderboardData(topScores);
      } catch (e) {
        console.error("Error loading leaderboard:", e);
        setLeaderboardData([]);
      }
    }
  }, [showLeaderboard, leaderboardLevel]);

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
    niqqudByIdRef.current = niqqudById;
  }, [niqqudById]);

  // ניקוד לתצוגה בלבד — כיתות א׳–ב׳, דרך Nakdan (Dicta); handleAnswer נשאר על המחרוזות המקוריות מהבנק
  useEffect(() => {
    if (typeof window === "undefined") return;
    setNiqqudById({});

    const eff = String(grade || "").toLowerCase();
    if (!isChildHebrewNiqqudGradeKey(eff) || !currentQuestion) return;

    const q = currentQuestion;
    const entries = [];
    const sessionCache = niqqudSessionCacheRef.current;
    const preMap = {};
    const pushIf = (id, text) => {
      const s = String(text ?? "").trim();
      if (!s) return;
      if (!hebrewScriptLikely(s)) return;
      // אם הטקסט המקורי כבר מנוקד — השתמש בו ישירות כ-fallback מנוקד
      if (textAlreadyHasNiqqud(s)) {
        preMap[id] = s;
      }
      const stripped = stripHebrewNiqqudMarks(s).trim();
      if (!stripped) return;
      if (!hebrewScriptLikely(stripped)) return;
      // אם הטקסט נמצא ב-session cache — השתמש בו ישירות
      const cached = sessionCache.get(stripped);
      if (cached) {
        preMap[id] = cached;
        return;
      }
      entries.push({ id, text: stripped });
    };

    pushIf("questionLabel", q.questionLabel);
    pushIf("exerciseText", q.exerciseText);
    pushIf("question", q.question);
    if (Array.isArray(q.answers)) {
      q.answers.forEach((a, i) => {
        pushIf(`answer_${i}`, a);
      });
    }

    // אם כל הטקסטים נמצאו ב-cache או כבר מנוקדים — אפשר להציג מיד בלי API
    if (entries.length === 0) {
      if (Object.keys(preMap).length > 0) setNiqqudById(preMap);
      return;
    }

    // הצגה מהירה של מה שכבר ידוע (מ-cache / pre-vocalized) תוך המתנה ל-API
    if (Object.keys(preMap).length > 0) setNiqqudById(preMap);

    const ac = new AbortController();
    let cancelled = false;
    const t = setTimeout(() => {
      (async () => {
        try {
          const fetchOnce = () =>
            fetch("/api/hebrew-nakdan", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ entries }),
              signal: ac.signal,
            });
          let res = await fetchOnce();
          if (!res.ok && !cancelled) {
            await new Promise((r) => setTimeout(r, 400));
            if (!cancelled) res = await fetchOnce();
          }
          if (!res.ok) return;
          const data = await res.json();
          if (cancelled) return;
          const map = {};
          for (const e of data.entries || []) {
            if (e?.id) map[e.id] = e.text;
          }

          const retryEntries = [];
          for (const { id, text } of entries) {
            const rendered = map[id];
            if (!rendered) continue;
            const lettersOnly = stripHebrewNiqqudMarks(rendered).replace(
              /[^\u0590-\u05FF]/g,
              ""
            );
            if (
              lettersOnly.length >= 2 &&
              hebrewScriptLikely(rendered) &&
              !textAlreadyHasNiqqud(rendered)
            ) {
              retryEntries.push({
                id,
                text: stripHebrewNiqqudMarks(String(text ?? "")).trim(),
              });
            }
          }

          if (retryEntries.length > 0 && !cancelled) {
            try {
              const res2 = await fetch("/api/hebrew-nakdan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ entries: retryEntries }),
                signal: ac.signal,
              });
              if (res2.ok) {
                const data2 = await res2.json();
                for (const e of data2.entries || []) {
                  if (e?.id && e.text) map[e.id] = e.text;
                }
              }
            } catch {
              /* keep first-pass map */
            }
          }

          const stemN = spellingStemForNiqqudDetect(q);
          if (isSpellingTargetWordInQuotesContextFromStem(stemN)) {
            for (const id of ["questionLabel", "exerciseText", "question"]) {
              if (map[id])
                map[id] = stripNiqqudInsideQuotedHebrewWordSpans(map[id]);
            }
          }
          // שמירת תוצאות ה-API ב-session cache לשימוש עתידי בלי API
          for (const { id, text } of entries) {
            const vocalized = map[id];
            if (vocalized) sessionCache.set(text, vocalized);
          }
          setNiqqudById({ ...preMap, ...map });
        } catch (e) {
          if (e?.name === "AbortError") return;
          if (!cancelled) {
            // כשל API — השתמש ב-preMap (cache + pre-vocalized) במקום למחוק את הניקוד
            setNiqqudById(preMap);
          }
        }
      })();
    }, 60);

    return () => {
      cancelled = true;
      clearTimeout(t);
      ac.abort();
    };
  }, [currentQuestion, grade]);

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
      if (!isHebrewFullCompetitiveScoringGrade(grade)) {
        if (showLeaderboard) {
          const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
          setLeaderboardData(loadLeaderboardTop10ByDisplayLevel(saved, leaderboardLevel));
        }
        return;
      }

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
      const key = `${level}_${operation || "reading"}`;

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
        const patchBody = { subjects: { hebrew: { scoresStore: saved } } };
        void patchStudentLearningProfile(patchBody)
          .then((json) => {
            const acc = accountAccuracyDisplayFromDerived(json?.derived, "hebrew");
            if (acc != null) setServerAccountSubjectAccuracyPct(acc);
            logAccountTileSync("hebrew", {
              tile: "finishPatch",
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
    // Stop background music when game resets
    audio.stopMusic();
    clearActiveDiagnosticState(
      hebrewPendingDiagnosticProbeRef,
      hebrewHypothesisLedgerRef
    );
    setGameActive(false);
    hebrewTrackingTopicKeyRef.current = null;
    setCurrentQuestion(null);
    setScore(0);
    setStreak(0);
    setCorrect(0);
    setWrong(0);
    setTimeLeft(20);
    setSelectedAnswer(null);
    setTypedAnswer("");
    setFeedback(null);
    setLives(3);
    setTotalQuestions(0);
    setAvgTime(0);
    setQuestionStartTime(null);
    setShowSolution(false);
    setShowPreviousSolution(false);
    setPreviousExplanationQuestion(null);
  }

  const applyHebrewTopicCreditFromClosed = useCallback(
    (closed, questionForTrack, metaHint) => {
      if (!closed || closed.creditedSecForTopic <= 0) return;
      const topic =
        hebrewTrackingTopicKeyRef.current ??
        questionForTrack?.topic ??
        questionForTrack?.operation ??
        "mixed";
      if (!topic) return;
      const qGrade = questionForTrack?.gradeKey || `g${grade}`;
      const qLevel = questionForTrack?.levelKey || level;
      trackHebrewTopicTime(
        topic,
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
              const meta = pendingHebrewTrackMetaRef.current;
              pendingHebrewTrackMetaRef.current = null;
              if (meta && meta.mode != null) {
                applyHebrewTopicCreditFromClosed(closed, questionForTrack, {
                  mode: meta.mode,
                  correct: meta.correct,
                  total: meta.total,
                });
              } else {
                applyHebrewTopicCreditFromClosed(closed, questionForTrack);
              }
            }
          : null
      );
      if (questionStartTime) setQuestionStartTime(null);
    },
    [currentQuestion, questionStartTime, applyHebrewTopicCreditFromClosed]
  );

  const accumulateQuestionTime = useCallback(() => {
    closeOpenQuestionLedger(false);
  }, [closeOpenQuestionLedger]);

  const beginHebrewQuestionLedger = useCallback(
    (questionObj) => {
      if (!questionObj) return;
      beginMasterQuestionLedger(questionTimeLedgerRef, {
        subjectId: "hebrew",
        mode,
        question: questionObj,
      });
    },
    [mode]
  );

  function generateNewQuestion() {
    clearWrongAnswerAdvanceState();
    closeOpenQuestionLedger(true);
    const levelConfig = getLevelConfig(gradeNumber, level);
    if (!levelConfig) {
      console.error("Invalid level config for grade", gradeNumber, "level", level);
      return;
    }

    let question;
    let attempts = 0;
    const maxAttempts = 50; // מקסימום ניסיונות למצוא שאלה חדשה

    // No word problems for Hebrew - all topics are text-based
    const supportsWordProblems = false;

    // ✅ התאמה לפי מצב תרגול ממוקד (Practice)
    let operationForState = operation;
    const levelConfigCopy = { ...levelConfig }; // עותק כדי לא לשנות את המקורי

    // תרגול ממוקד - חזרה על שגיאות
    if (focusedPracticeMode === "mistakes" && mistakes.length > 0) {
      // בחר שגיאה אקראית מהרשימה
      const randomMistake = mistakes[Math.floor(Math.random() * mistakes.length)];
      operationForState = randomMistake.operation;
      // נסה ליצור שאלה דומה
      if (randomMistake.grade) {
        const mistakeGrade = randomMistake.grade;
        const mistakeLevel = randomMistake.level || "easy";
        const mistakeLevelConfig = getLevelConfig(
          parseInt(mistakeGrade.replace("g", "")) || gradeNumber,
          mistakeLevel
        );
        if (mistakeLevelConfig) {
          Object.assign(levelConfigCopy, mistakeLevelConfig);
        }
      }
    }
    
    // תרגול מדורג - התחלה קל והתקדמות
    if (focusedPracticeMode === "graded") {
      // התחל עם רמה קלה יותר
      const gradedLevel = correct < 5 ? "easy" : correct < 15 ? "medium" : level;
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

    const probeAtStart = hebrewPendingDiagnosticProbeRef.current;
    const probeCandidate =
      !!(probeAtStart && probeAtStart.subjectId === "hebrew");
    let probeBiasDisabled = false;
    let probeBiasAttempts = 0;
    const maxProbeBiasAttempts = 22;
    let probeAttachOpts = null;

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
          excludeFingerprints: localRecentQuestions.toSet(),
          forceKind: practiceForceKindRef.current,
          forceSkillId: practiceForceSkillIdRef.current,
        }
      );
      attempts++;

      const qTopic =
        String(question.topic || question.operation || opForQuestion || "").trim() ||
        operationForState;
      let probeBiasMode =
        !probeBiasDisabled &&
        probeCandidate &&
        probeMatchesSession(probeAtStart, grade, level, qTopic);

      const questionKey = hebrewQuestionFingerprint(question);
      const nearKey = hebrewNearDuplicateKey(question);
      const nearTail = hebrewNearDuplicateTailRef.current;
      const nearRepeats = nearTail.filter((x) => x === nearKey).length;
      const earlyHebrewChild = isChildHebrewNiqqudGradeKey(String(grade || "").toLowerCase());
      const nearBlock = nearRepeats >= (earlyHebrewChild ? 1 : 2);

      const cogKey = hebrewCognitiveTemplateKey(question);
      const cogTail = hebrewCognitiveTemplateTailRef.current;
      const cogRepeats = cogTail.filter((x) => x === cogKey).length;
      const cogBlock = earlyHebrewChild && cogRepeats >= 1;

      const pf = question.params?.patternFamily || "";
      const tail = hebrewPatternFamilyTailRef.current;
      const recentSamePf = tail.filter((x) => x === pf).length;
      const pfCooldownBlock = pf && recentSamePf >= (earlyHebrewChild ? 2 : 3);

      const taskShapeKey = hebrewTaskShapeKey(question);
      const taskShapeTail = hebrewTaskShapeTailRef.current;
      const taskShapeRepeats = taskShapeTail.filter((x) => x === taskShapeKey).length;
      const taskShapeBlock = earlyHebrewChild && taskShapeRepeats >= 2;

      const baseOk =
        localRecentQuestions.wouldAccept(questionKey, nearKey) &&
        !pfCooldownBlock &&
        !nearBlock &&
        !cogBlock &&
        !taskShapeBlock;

      let probeAccept = true;
      if (probeBiasMode && baseOk) {
        const matchResult = bankQuestionProbeMatch(question, probeAtStart);
        const richMatch = question._fromRich === true && matchResult.matches;
        if (!richMatch) {
          probeBiasAttempts++;
          if (probeBiasAttempts < maxProbeBiasAttempts) {
            probeAccept = false;
          } else {
            probeBiasDisabled = true;
            probeAccept = true;
          }
        }
      }

      if (baseOk && probeAccept) {
        if (isLowerGradeG1G2Key(grade)) {
          audioBuild1CounterRef.current += 1;
          attachHebrewAudioToQuestion(question, {
            gradeKey: grade,
            topic: question.topic || question.operation || opForQuestion,
            sequenceIndex: audioBuild1CounterRef.current,
          });
          sanitizeLowerGradeChildFacingText(question);
          const displayProbe = sanitizeQuestionForStudentDisplay(question);
          if (
            !isG1G2RuntimePracticeEligible(displayProbe, {
              gradeKey: grade,
              subject: "hebrew",
            })
          ) {
            continue;
          }
        }

        if (probeBiasMode && question._fromRich) {
          const m = bankQuestionProbeMatch(question, probeAtStart);
          if (m.matches) {
            probeAttachOpts = {
              probeSnapshot: probeAtStart,
              probeReason: m.reason,
              expectedErrorTags: Array.isArray(question.params?.expectedErrorTags)
                ? [...question.params.expectedErrorTags]
                : undefined,
            };
          }
        }
        localRecentQuestions.record(questionKey, nearKey);
        hebrewPatternFamilyTailRef.current = [...tail, pf || "gen"].slice(-12);
        hebrewNearDuplicateTailRef.current = [...nearTail, nearKey].slice(-16);
        hebrewCognitiveTemplateTailRef.current = [...cogTail, cogKey].slice(-12);
        hebrewTaskShapeTailRef.current = [...taskShapeTail, taskShapeKey || "gen"].slice(-10);
        break;
      }
    } while (attempts < maxAttempts);

    decrementPendingProbeExpiry(hebrewPendingDiagnosticProbeRef);
    if (probeAtStart) {
      hebrewPendingDiagnosticProbeRef.current = null;
    }

    // עדכון state רק פעם אחת אחרי הלולאה
    if (attempts >= maxAttempts) {
      console.warn(
        `Too many attempts (${attempts}) to generate new question, softening anti-repeat buffer`
      );
      localRecentQuestions.softenOnExhaustion();
      hebrewPatternFamilyTailRef.current = hebrewPatternFamilyTailRef.current.slice(-4);
      hebrewNearDuplicateTailRef.current = hebrewNearDuplicateTailRef.current.slice(-6);
      hebrewCognitiveTemplateTailRef.current = hebrewCognitiveTemplateTailRef.current.slice(-4);
      hebrewTaskShapeTailRef.current = hebrewTaskShapeTailRef.current.slice(-4);
    }
    setRecentQuestions(localRecentQuestions.toSet());

    if (currentQuestion) {
      setPreviousExplanationQuestion(currentQuestion);
    }
    let questionOut = question;
    if (probeAttachOpts) {
      questionOut = attachProbeMetaToQuestion(questionOut, probeAttachOpts);
    }

    hebrewTrackingTopicKeyRef.current =
      questionOut.topic || questionOut.operation || "mixed";
    if (!isLowerGradeG1G2Key(grade)) {
      audioBuild1CounterRef.current += 1;
      attachHebrewAudioToQuestion(questionOut, {
        gradeKey: grade,
        topic: questionOut.topic || questionOut.operation || operationForState,
        sequenceIndex: audioBuild1CounterRef.current,
      });
    }
    let displayQuestion = sanitizeQuestionForStudentDisplay(questionOut);
    if (isLowerGradeG1G2Key(grade)) {
      let qualityRetries = 0;
      const maxQualityRetries = 80;
      while (
        !isG1G2RuntimePracticeEligible(displayQuestion, {
          gradeKey: grade,
          subject: "hebrew",
        }) &&
        qualityRetries < maxQualityRetries
      ) {
        qualityRetries += 1;
        const recoveryQ = generateQuestion(
          levelConfigCopy,
          operationForState,
          grade,
          operationForState === "mixed" ? mixedOperations : null,
          { excludeFingerprints: new Set() }
        );
        audioBuild1CounterRef.current += 1;
        attachHebrewAudioToQuestion(recoveryQ, {
          gradeKey: grade,
          topic:
            recoveryQ.topic || recoveryQ.operation || operationForState,
          sequenceIndex: audioBuild1CounterRef.current,
        });
        sanitizeLowerGradeChildFacingText(recoveryQ);
        questionOut = recoveryQ;
        displayQuestion = sanitizeQuestionForStudentDisplay(questionOut);
      }
      if (
        !isG1G2RuntimePracticeEligible(displayQuestion, {
          gradeKey: grade,
          subject: "hebrew",
        })
      ) {
        console.warn(
          "[hebrew][g1g2] display quality guard exhausted - regenerating question"
        );
        generateNewQuestion();
        return;
      }
    }
    setCurrentQuestion(tagQuestion(displayQuestion));
    setSelectedAnswer(null);
    setTypedAnswer("");
    setFeedback(null);
    setQuestionStartTime(Date.now());
    beginHebrewQuestionLedger(displayQuestion);
    setShowSolution(false);
    setShowPreviousSolution(false);
    setErrorExplanation("");
    stepByStepViewedRef.current = false;
    setIsVerticalDisplay(false); // איפוס למצב מאוזן בכל שאלה חדשה
    // איפוס עיגולים שעברו כשמשנים שאלה
    setMovedCirclesA(0);
    setMovedCirclesB(0);
  }

  function recordSessionProgress(opts = {}) {
    const { includePlannerRecommendation = true } = opts;
    const sessionIdForFinish = learningSessionIdRef.current;
    const totalQuestionsForFinish = totalQuestions;
    const correctForFinish = correct;
    const wrongForFinish = wrong;
    const scoreForFinish = score;
    if (!sessionStartRef.current) return;
    closeOpenQuestionLedger(true);
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
        const acc = accountAccuracyDisplayFromDerived(p.derived, "hebrew");
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
          source: "hebrew-master",
          version: "phase-2d-b5",
        },
      }).catch(() => {
        notifyLearningSessionSaveFailure(setFeedback, "hebrew-master");
      });
      if (includePlannerRecommendation) {
        const cid = (plannerResponseSeqRef.current += 1);
        scheduleAdaptivePlannerRecommendation(
          {
            learningSessionId: sessionIdForFinish,
            subject: "hebrew",
            grade,
            topic:
              hebrewTrackingTopicKeyRef.current ??
              currentQuestion?.topic ??
              currentQuestion?.operation ??
              "",
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

  function buildHebrewSessionStartPayload() {
    const baseMeta = {
      source: "hebrew-master",
      version: "phase-4-display-level",
    };
    const plannerExtra = plannerNextSessionClientMetaRef.current;
    return {
      subject: "hebrew",
      topic: String(
        hebrewTrackingTopicKeyRef.current ||
          currentQuestion?.topic ||
          currentQuestion?.operation ||
          operation ||
          "reading"
      ),
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
    const startPromise = startLearningSession(buildHebrewSessionStartPayload())
      .then((res) => {
        const id = res?.learningSessionId ? String(res.learningSessionId) : "";
        if (!id) return null;
        learningSessionIdRef.current = id;
        return id;
      })
      .catch((error) => {
        console.warn("[hebrew-master] session start save failed", error);
        return null;
      })
      .finally(() => {
        learningSessionStartPromiseRef.current = null;
        plannerNextSessionClientMetaRef.current = null;
      });
    learningSessionStartPromiseRef.current = startPromise;
    return startPromise;
  }

  function saveHebrewAnswerInParallel({
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
    const questionFingerprint = hebrewQuestionFingerprint(question) || null;
    const questionId = question?.id
      ? String(question.id)
      : questionFingerprint || `hebrew-${Date.now()}`;
    const expectedValue =
      Array.isArray(question?.acceptedAnswers) && question.acceptedAnswers.length > 0
        ? question.acceptedAnswers.join(" | ")
        : question?.correctAnswer != null
          ? String(question.correctAnswer)
          : null;
    const questionEngine = question
      ? buildQuestionEngineMetadataFromQuestion(question, {
          selectedValue: userAnswer,
          generatorSource: "hebrew-master",
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
          subject: "hebrew",
          topic: String(question?.topic || question?.operation || operation || "reading"),
          gameMode: reportModeFromGameState(mode, focusedPracticeMode),
          questionId,
          questionFingerprint,
          prompt: String(question?.exerciseText || question?.question || ""),
          expectedAnswer: expectedValue,
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
            source: "hebrew-master",
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
        console.warn("[hebrew-master] answer save failed", error);
      });
  }

  function startGame(opts = {}) {
    if (guestTopics.isGuest && operation !== "mixed" && guestTopics.isLocked(operation)) {
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
    clearActiveDiagnosticState(
      hebrewPendingDiagnosticProbeRef,
      hebrewHypothesisLedgerRef
    );
    setRecentQuestions(new Set()); // איפוס ההיסטוריה
    hebrewPatternFamilyTailRef.current = [];
    hebrewNearDuplicateTailRef.current = [];
    hebrewCognitiveTemplateTailRef.current = [];
    hebrewTaskShapeTailRef.current = [];
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
    setTypedAnswer("");
    setLives(mode === "challenge" ? 3 : 0);
    setShowBadge(null);
    setShowLevelUp(false);
    setShowSolution(false);
    setShowPreviousSolution(false);
    setPreviousExplanationQuestion(null);
    setErrorExplanation("");
    stepByStepViewedRef.current = false;
    learningSessionIdRef.current = null;
    learningSessionStartPromiseRef.current = null;

    // הגדרת טיימר לפי מצב
    if (mode === "challenge") {
      setTimeLeft(20);
    } else if (mode === "speed") {
      setTimeLeft(10); // טיימר קצר יותר למצב מהירות
    } else {
      setTimeLeft(null);
    }

    startLearningMasterSessionAudio(audio);
    void ensureLearningSessionId();
    
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
    // Stop background music when game stops
    audio.stopMusic();
    clearActiveDiagnosticState(
      hebrewPendingDiagnosticProbeRef,
      hebrewHypothesisLedgerRef
    );
    recordSessionProgress();
    setGameActive(false);
    hebrewTrackingTopicKeyRef.current = null;
    setCurrentQuestion(null);
    setFeedback(null);
    setSelectedAnswer(null);
    setTypedAnswer("");
    setShowSolution(false);
    setShowPreviousSolution(false);
    setPreviousExplanationQuestion(null);
    saveRunToStorage();
  }

  function handleTimeUp() {
    audio.playSfx("sfx-game-over");
    // Time up – במצב Challenge או Speed
    recordSessionProgress();
    setWrong((prev) => prev + 1);
    setStreak(0);
      setFeedback("הזמן נגמר! המשחק נגמר! ⏰");
    setGameActive(false);
    hebrewTrackingTopicKeyRef.current = null;
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

  function trackCurrentQuestionTime() {
    if (!questionStartTime && !questionTimeLedgerRef.current) return;
    closeOpenQuestionLedger(true);
  }

  /** הקלטה ידנית ראשונה — ללא ציון אוטומטי; רק ספירת שאלה + מעבר הלאה */
  function finishAudioRecordedManualNeutral() {
    if (!gameActive) return;
    const cq = currentQuestionRef.current;
    if (!cq || cq.answerMode !== "hebrew_audio_recorded_manual") return;
    trackCurrentQuestionTime();
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
    const topicKey = cq.topic || cq.operation || "reading";
    setProgress((prev) => {
      const updated = {
        ...prev,
        [topicKey]: {
          total: (prev[topicKey]?.total || 0) + 1,
          correct: prev[topicKey]?.correct || 0,
        },
      };
      if (typeof window !== "undefined") {
        try {
          const saved = JSON.parse(localStorage.getItem(STORAGE_KEY + "_progress") || "{}");
          saved.progress = updated;
          localStorage.setItem(STORAGE_KEY + "_progress", JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
    pendingHebrewTrackMetaRef.current = {
      correct: undefined,
      total: 1,
      mode: reportModeFromGameState(mode, focusedPracticeMode),
    };
    setDailyChallenge((prev) => ({
      ...prev,
      questions: prev.questions + 1,
      bestScore: prev.bestScore,
    }));
    setFeedback("נשמר לבדיקה ידנית - אין ציון אוטומטי לדיבור בשלב זה.");
    setSelectedAnswer("__guided_done__");
    setTimeout(() => {
      generateNewQuestion();
      setSelectedAnswer(null);
      setTypedAnswer("");
      setFeedback(null);
      setShowSolution(false);
      if (mode === "challenge") setTimeLeft(20);
      else if (mode === "speed") setTimeLeft(10);
      else setTimeLeft(null);
    }, 1400);
  }

  function handleAnswer(answer) {
    if (selectedAnswer || !gameActive || !currentQuestion) return;
    if (currentQuestion.answerMode === "hebrew_audio_recorded_manual") return;
    const questionForSave = currentQuestion;
    const hintUsedForSave = false;
    const rawMs = questionStartTime ? Math.max(0, Date.now() - questionStartTime) : null;
    const timeSpentMs = rawMs;
    const { rawTimeSpentMs, creditedTimeMs, timingStatus } = computeFreePracticeTiming(rawMs, {
      creditedMs: questionTimeLedgerRef.current ? questionTimeLedgerRef.current.peekCreditedMs() : undefined,
      tierCapMs: questionTimeLedgerRef.current?.tierCapMs,
    });

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

    setSelectedAnswer(answer);
    const gradeKeyEff = String(grade || "").toLowerCase();
    const correctAnswerDisplay =
      isChildHebrewNiqqudGradeKey(gradeKeyEff) &&
      Array.isArray(currentQuestion.answers)
        ? (() => {
            const ci = currentQuestion.answers.findIndex(
              (a) => a === currentQuestion.correctAnswer
            );
            if (ci < 0) return currentQuestion.correctAnswer;
            const mapped = niqqudByIdRef.current?.[`answer_${ci}`];
            return mapped || currentQuestion.correctAnswer;
          })()
        : currentQuestion.correctAnswer;

    const acceptedAnswers =
      Array.isArray(currentQuestion.acceptedAnswers) &&
      currentQuestion.acceptedAnswers.length > 0
        ? currentQuestion.acceptedAnswers
        : [currentQuestion.correctAnswer];
    const strictNiqqudSpelling = isSpellingTargetWordInQuotesContextFromStem(
      spellingStemForNiqqudDetect(currentQuestion)
    );
    const { isCorrect } = compareAnswers({
      mode: strictNiqqudSpelling ? "hebrew_niqqud_strict" : "hebrew_relaxed_text",
      user: answer,
      acceptedList: acceptedAnswers,
    });

    let diagnosticProbeMetaForSave = null;
    if (
      questionForSave._diagnosticProbeAttempt === true &&
      questionForSave._probeMeta
    ) {
      let inferredTags = [];
      const probeAnsweredAt = Date.now();
      if (!isCorrect) {
        const topicKeyProbe =
          currentQuestion.topic || currentQuestion.operation || "reading";
        const hbPrm = currentQuestion.params || {};
        let wrongEntry = {
          topic: topicKeyProbe,
          topicOrOperation: topicKeyProbe,
          bucketKey: topicKeyProbe,
          grade,
          level,
          mode: reportModeFromGameState(mode, focusedPracticeMode),
          question: currentQuestion.exerciseText || currentQuestion.question || "",
          exerciseText: currentQuestion.exerciseText || currentQuestion.question || "",
          correctAnswer: currentQuestion.correctAnswer,
          wrongAnswer: answer,
          userAnswer: answer,
          isCorrect: false,
          kind: hbPrm.kind != null ? String(hbPrm.kind) : null,
          patternFamily:
            hbPrm.patternFamily != null ? String(hbPrm.patternFamily) : null,
          subtype: hbPrm.subtype != null ? String(hbPrm.subtype) : null,
          distractorFamily:
            hbPrm.distractorFamily != null ? String(hbPrm.distractorFamily) : null,
          conceptTag: hbPrm.conceptTag != null ? String(hbPrm.conceptTag) : null,
          answerMode:
            Array.isArray(currentQuestion.answers) &&
            currentQuestion.answers.length > 1
              ? "choice"
              : "typed",
        };
        wrongEntry = mergeDiagnosticIntoMistakeEntry(
          wrongEntry,
          extractDiagnosticMetadataFromQuestion(currentQuestion, {
            responseMs: timeSpentMs,
            hintUsed: hintUsedForSave,
          })
        );
        wrongEntry = mergeDiagnosticIntoMistakeEntry(
          wrongEntry,
          computeMcqIndicesForQuestion(currentQuestion, answer)
        );
        const normalizedWrong = normalizeMistakeEvent(wrongEntry, "hebrew");
        inferredTags = inferNormalizedTags(normalizedWrong, "hebrew");
      }
      hebrewHypothesisLedgerRef.current = applyProbeOutcome(
        hebrewHypothesisLedgerRef.current,
        {
          isCorrect,
          inferredTags,
          probeMeta: questionForSave._probeMeta,
          now: probeAnsweredAt,
        }
      );
      diagnosticProbeMetaForSave = buildDiagnosticProbeClientMeta({
        probeMeta: questionForSave._probeMeta,
        ledger: hebrewHypothesisLedgerRef.current,
        inferredTags,
        answeredAt: probeAnsweredAt,
        learningSessionId: learningSessionIdRef.current,
      });
      setCurrentQuestion((prev) => {
        if (!prev || prev !== questionForSave) return prev;
        const { _diagnosticProbeAttempt: _a, _probeMeta: _b, ...rest } = prev;
        void _a;
        void _b;
        return rest;
      });
    }

    applyAnswerAdaptive(isCorrect, { mode: focusedPracticeMode });
    saveHebrewAnswerInParallel({
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
    pendingHebrewTrackMetaRef.current = {
      correct: isCorrect ? 1 : 0,
      total: 1,
      mode: reportModeFromGameState(mode, focusedPracticeMode),
    };

    if (isCorrect) {
      const hebrewCompetitiveScoring = isHebrewFullCompetitiveScoringGrade(grade);
      // חישוב נקודות לפי מצב (כיתות ג׳+ — לא מצטברות אל score)
      let points = 10 + streak;
      if (mode === "speed") {
        const timeBonus = timeLeft ? Math.floor(timeLeft * 2) : 0;
        points += timeBonus; // בונוס זמן במצב מהירות
      }

      if (hebrewCompetitiveScoring) {
        setScore((prev) => prev + points);
      }
      setStreak((prev) => prev + 1);
      setCorrect((prev) => prev + 1);
      
      clearWrongAnswerAdvanceState();
      setErrorExplanation("");

      // עדכון התקדמות אישית
      const topicKey = currentQuestion.topic || currentQuestion.operation || "reading";
      setProgress((prev) => {
        const updated = {
          ...prev,
          [topicKey]: {
            total: (prev[topicKey]?.total || 0) + 1,
            correct: (prev[topicKey]?.correct || 0) + 1,
          },
        };
        // שמירה מיידית ל-localStorage
        if (typeof window !== "undefined") {
          try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY + "_progress") || "{}");
            saved.progress = updated;
            localStorage.setItem(STORAGE_KEY + "_progress", JSON.stringify(saved));
          } catch {}
        }
        return updated;
      });

      // משתנים משותפים למערכת תגים וכוכבים
      const newCorrect = correct + 1;
      const newStreak = streak + 1;
      const newScore = hebrewCompetitiveScoring ? score + points : score;
      const opProgress = progress[topicKey] || { total: 0, correct: 0 };
      const newOpCorrect = opProgress.correct + 1;

      // מערכת כוכבים - כוכב כל 5 תשובות נכונות (כיתות א׳–ב׳ בלבד)
      if (hebrewCompetitiveScoring && newCorrect % 5 === 0) {
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
      } else if (newStreak === 100 && !badges.includes("👑 מלך העברית")) {
        const newBadge = "👑 מלך העברית";
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        audio.playSfx("sfx-badge");
        setTimeout(() => setShowBadge(null), 3000);
        saveBadge(newBadge);
      }
      
      // תגים לפי פעולות ספציפיות
      const opName = getOperationName(topicKey);
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
      
      // תגים לפי ניקוד (כיתות א׳–ב׳ בלבד)
      if (
        hebrewCompetitiveScoring &&
        newScore >= 1000 &&
        newScore - points < 1000 &&
        !badges.includes("💎 אלף נקודות")
      ) {
        const newBadge = "💎 אלף נקודות";
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        audio.playSfx("sfx-badge");
        setTimeout(() => setShowBadge(null), 3000);
        saveBadge(newBadge);
      } else if (
        hebrewCompetitiveScoring &&
        newScore >= 5000 &&
        newScore - points < 5000 &&
        !badges.includes("🎯 חמשת אלפים")
      ) {
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

      // מערכת XP ורמות (כיתות א׳–ב׳ בלבד)
      if (hebrewCompetitiveScoring) {
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
                  const saved = JSON.parse(
                    localStorage.getItem(STORAGE_KEY + "_progress") || "{}"
                  );
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
      }

      // עדכון תחרות יומית
      setDailyChallenge((prev) => ({
        ...prev,
        bestScore: hebrewCompetitiveScoring
          ? Math.max(prev.bestScore, score + points)
          : prev.bestScore,
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
      
      // Play sound - different sound for streak milestones (כוכבים רק בכיתות א׳–ב׳)
      if (
        hebrewCompetitiveScoring &&
        (streak + 1) % 5 === 0 &&
        streak + 1 >= 5
      ) {
        audio.playSfx("sfx-streak");
      } else {
        audio.playSfx("sfx-correct");
      }
      
      // Update daily streak
      const updatedStreak = updateDailyStreak("mleo_hebrew_daily_streak");
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
      
      // Play sound for wrong answer
      audio.playSfx("sfx-wrong");
      
      // שמירת שגיאה לתרגול ממוקד
      const topicKey = currentQuestion.topic || currentQuestion.operation || "reading";
      const hbPrm = currentQuestion.params || {};
      const ts = Date.now();
      let mistake = {
        operation: topicKey,
        topic: topicKey,
        topicOrOperation: topicKey,
        bucketKey: topicKey,
        mode: reportModeFromGameState(mode, focusedPracticeMode),
        question: currentQuestion.exerciseText || currentQuestion.question || "",
        exerciseText: currentQuestion.exerciseText || currentQuestion.question || "",
        correctAnswer: currentQuestion.correctAnswer,
        wrongAnswer: answer,
        userAnswer: answer,
        isCorrect: false,
        grade: grade,
        level: level,
        timestamp: ts,
        storedAt: ts,
        kind: hbPrm.kind != null ? String(hbPrm.kind) : null,
        patternFamily:
          hbPrm.patternFamily != null ? String(hbPrm.patternFamily) : null,
        subtype: hbPrm.subtype != null ? String(hbPrm.subtype) : null,
        distractorFamily:
          hbPrm.distractorFamily != null ? String(hbPrm.distractorFamily) : null,
        conceptTag: hbPrm.conceptTag != null ? String(hbPrm.conceptTag) : null,
        answerMode:
          Array.isArray(currentQuestion.answers) &&
          currentQuestion.answers.length > 1
            ? "choice"
            : "typed",
      };
      mistake = mergeDiagnosticIntoMistakeEntry(
        mistake,
        extractDiagnosticMetadataFromQuestion(currentQuestion, {
          responseMs: timeSpentMs,
          hintUsed: hintUsedForSave,
        })
      );
      mistake = mergeDiagnosticIntoMistakeEntry(
        mistake,
        computeMcqIndicesForQuestion(currentQuestion, answer)
      );
      if (
        !mistake.distractorFamily &&
        mistake.selectedOptionIndex != null &&
        Array.isArray(currentQuestion.answers)
      ) {
        const cell = currentQuestion.answers[mistake.selectedOptionIndex];
        const dfOpt = distractorFamilyFromOptionCell(cell);
        if (dfOpt) {
          mistake = mergeDiagnosticIntoMistakeEntry(mistake, {
            distractorFamily: dfOpt,
          });
        }
      }
      try {
        if (currentQuestion._fromRich === true) {
          const normalized = normalizeMistakeEvent(mistake, "hebrew");
          hebrewPendingDiagnosticProbeRef.current = buildPendingProbeFromMistake(
            normalized,
            {
              wrongAvoidKey: hebrewQuestionFingerprint(currentQuestion),
              fallbackTopicId: topicKey,
              fallbackGrade: grade,
              fallbackLevel: level,
            },
            "hebrew"
          );
        } else {
          hebrewPendingDiagnosticProbeRef.current = null;
        }
      } catch {
        hebrewPendingDiagnosticProbeRef.current = null;
      }
      setMistakes((prev) => {
        const updated = [...prev, mistake].slice(-50); // שמור רק 50 שגיאות אחרונות
        if (typeof window !== "undefined") {
          localStorage.setItem(HEBREW_MISTAKES_KEY, JSON.stringify(updated));
        }
        return updated;
      });
      
      {
        let expl = getErrorExplanation(
          currentQuestion,
          topicKey,
          answer,
          grade,
          { mode }
        );
        if (
          isChildHebrewNiqqudGradeKey(gradeKeyEff) &&
          currentQuestion.correctAnswer &&
          correctAnswerDisplay &&
          correctAnswerDisplay !== currentQuestion.correctAnswer
        ) {
          expl = expl.split(currentQuestion.correctAnswer).join(correctAnswerDisplay);
        }
        setErrorExplanation(expl);
        if (expl) stepByStepViewedRef.current = true;
      }
      
      // עדכון התקדמות אישית
      setProgress((prev) => {
        const updated = {
          ...prev,
          [topicKey]: {
            total: (prev[topicKey]?.total || 0) + 1,
            correct: prev[topicKey]?.correct || 0,
          },
        };
        // שמירה מיידית ל-localStorage
        if (typeof window !== "undefined") {
          try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY + "_progress") || "{}");
            saved.progress = updated;
            localStorage.setItem(STORAGE_KEY + "_progress", JSON.stringify(saved));
          } catch {}
        }
        return updated;
      });
      
      // אנימציה ותגובה חזותית לתשובה שגויה
      setShowWrongAnimation(true);
      setTimeout(() => setShowWrongAnimation(false), 1000);
      
      if ("vibrate" in navigator) navigator.vibrate?.(200);

      if (mode === "learning") {
        setFeedback(formatLearningWrongFeedbackHe(correctAnswerDisplay));
        scheduleWrongAnswerAdvance(() => {
          generateNewQuestion();
          setSelectedAnswer(null);
          setTypedAnswer("");
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
            hebrewTrackingTopicKeyRef.current = null;
            setCurrentQuestion(null);
            setTimeLeft(0);
            setTimeout(() => {
              hardResetGame();
            }, 2000);
          } else {
            scheduleWrongAnswerAdvance(() => {
              generateNewQuestion();
              setSelectedAnswer(null);
              setTypedAnswer("");
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
          setTypedAnswer("");
          setFeedback(null);
          if (mode === "speed") setTimeLeft(10);
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

  const getOperationName = (op) => {
    // Never fall back to the raw internal English key — show a safe generic
    // Hebrew label instead if the topic has no Hebrew name mapped.
    return TOPICS[op]?.name || "נושא";
  };

  const profileSnap = getCachedStudentLearningProfile();
  const subjectView = useMemo(
    () =>
      buildStudentSubjectDashboardView({
        subject: "hebrew",
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
    logStudentSubjectDashboardDiagnostics("hebrew", subjectView, {
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
  // No word problems for Hebrew - all topics are text-based

  const solutionSteps =
    currentQuestion && currentQuestion.operation
      ? getSolutionSteps(currentQuestion, currentQuestion.params?.op || currentQuestion.operation, grade)
      : [];

  const effGradeNiqqud = String(grade || "").toLowerCase();
  const childNiqqudActive = isChildHebrewNiqqudGradeKey(effGradeNiqqud);
  const nqx = (id, fallback) =>
    childNiqqudActive && Object.prototype.hasOwnProperty.call(niqqudById, id)
      ? niqqudById[id]
      : fallback;

  const disQuestionLabel = currentQuestion
    ? nqx("questionLabel", currentQuestion.questionLabel ?? "")
    : "";
  const disExerciseText = currentQuestion
    ? nqx("exerciseText", currentQuestion.exerciseText ?? "")
    : "";
  const disQuestionBody = currentQuestion
    ? nqx("question", currentQuestion.question ?? "")
    : "";

  const hasValidAudioStem =
    Boolean(currentQuestion?.params?.audioStem) &&
    validateAudioStem(currentQuestion.params.audioStem);
  const normalizedAudioHeadingLabel = String(disQuestionLabel || "")
    .replace(/\s+/g, " ")
    .trim();
  /** Hide standalone "שמע" heading when audio control moved to toolbar (not duplicate big title). */
  const suppressAudioOnlyShamaLabel =
    hasValidAudioStem &&
    /^שמע[\s.:]*$/u.test(normalizedAudioHeadingLabel);
  const normalizedAudioHeadingBody = String(disQuestionBody || "")
    .replace(/\s+/g, " ")
    .trim();
  const suppressAudioOnlyShamaBody =
    hasValidAudioStem &&
    /^שמע[\s.:]*$/u.test(normalizedAudioHeadingBody);

  const showHebrewAudioToolbar = gameActive && hasValidAudioStem;
  const showMobileQuestionActions = Boolean(questionBookHref || showHebrewAudioToolbar);

  const questionTextForPressure = (
    currentQuestion?.questionLabel ||
    currentQuestion?.exerciseText ||
    currentQuestion?.question ||
    ""
  )
    .toString()
    .trim();
  const answerTextsForPressure = Array.isArray(currentQuestion?.answers)
    ? currentQuestion.answers.map((a) => String(a || "").trim())
    : [];
  const questionWordCount = questionTextForPressure
    ? questionTextForPressure.split(/\s+/).filter(Boolean).length
    : 0;
  const questionCharCount = questionTextForPressure.length;
  const longestAnswerChars = answerTextsForPressure.length
    ? Math.max(...answerTextsForPressure.map((a) => a.length))
    : 0;
  const totalAnswerChars = answerTextsForPressure.reduce((sum, a) => sum + a.length, 0);

  const questionPressureScore = questionCharCount + questionWordCount * 2;
  const answerPressureScore = longestAnswerChars * 2 + totalAnswerChars;

  const questionPressureBucket =
    questionPressureScore >= 170
      ? "veryLong"
      : questionPressureScore >= 120
      ? "long"
      : questionPressureScore >= 70
      ? "medium"
      : "short";

  const answerPressureBucket =
    answerPressureScore >= 260
      ? "veryLong"
      : answerPressureScore >= 190
      ? "long"
      : answerPressureScore >= 120
      ? "medium"
      : "short";

  const questionSlotClassByPressure =
    questionPressureBucket === "veryLong"
      ? "w-full shrink-0 min-h-[170px] max-[420px]:min-h-[100px] md:min-h-[210px] flex flex-col items-center justify-center px-1"
      : questionPressureBucket === "long"
      ? "w-full shrink-0 min-h-[190px] max-[420px]:min-h-[110px] md:min-h-[230px] flex flex-col items-center justify-center px-1.5"
      : questionPressureBucket === "medium"
      ? "w-full shrink-0 min-h-[210px] max-[420px]:min-h-[120px] md:min-h-[245px] flex flex-col items-center justify-center px-2"
      : "w-full shrink-0 min-h-[230px] max-[420px]:min-h-[130px] md:min-h-[260px] flex flex-col items-center justify-center px-2";

  const questionSlotClassForStem = `${questionSlotClassByPressure} max-md:mb-1.5`.trim();

  const questionLineHeightByPressure =
    questionPressureBucket === "veryLong"
      ? 1.22
      : questionPressureBucket === "long"
      ? 1.28
      : questionPressureBucket === "medium"
      ? 1.34
      : 1.4;

  const questionBottomSpacingClass =
    questionPressureBucket === "veryLong"
      ? "mb-2"
      : questionPressureBucket === "long"
      ? "mb-2.5"
      : "mb-4";

  const answerCardTextClass =
    answerPressureBucket === "veryLong"
      ? "text-base leading-snug px-3 py-3 min-h-[4.75rem]"
      : answerPressureBucket === "long"
      ? "text-base leading-snug px-3.5 py-3.5 min-h-[5rem]"
      : answerPressureBucket === "medium"
      ? "text-lg leading-snug px-4 py-4 min-h-[5.25rem]"
      : "text-xl leading-snug px-5 py-5 min-h-[5.5rem]";

  const useNarrowMobileAnswerFallback =
    answerPressureBucket === "veryLong" ||
    (answerPressureBucket === "long" && questionPressureBucket !== "short");
  const isTypingQuestion = currentQuestion?.answerMode === "typing";
  const isHebrewAudioRecordedManual =
    currentQuestion?.answerMode === "hebrew_audio_recorded_manual";
  const typingPanelClass =
    questionPressureBucket === "veryLong" || questionPressureBucket === "long"
      ? "w-full mb-2.5 p-3 rounded-lg bg-blue-500/20 border border-blue-400/50"
      : "w-full mb-3 p-4 rounded-lg bg-blue-500/20 border border-blue-400/50";
  const typingInputDesktopClass =
    questionPressureBucket === "veryLong"
      ? "w-full max-w-[320px] px-3 py-3 rounded-lg bg-black/40 border border-white/20 text-white text-lg font-bold text-center disabled:opacity-50"
      : questionPressureBucket === "long"
      ? "w-full max-w-[320px] px-3.5 py-3.5 rounded-lg bg-black/40 border border-white/20 text-white text-xl font-bold text-center disabled:opacity-50"
      : "w-full max-w-[320px] px-4 py-3.5 rounded-lg bg-black/40 border border-white/20 text-white text-xl font-bold text-center disabled:opacity-50";
  const typingRowClass =
    questionPressureBucket === "veryLong" ? "flex gap-1.5 justify-center" : "flex gap-2 justify-center";
  const answerCardNarrowClass =
    "max-[420px]:px-3 max-[420px]:py-2.5 max-[420px]:min-h-[4.25rem] max-[420px]:text-sm";
  const typingInputNarrowClass =
    "max-[420px]:px-3 max-[420px]:py-2 max-[420px]:text-base max-[420px]:h-10 max-[420px]:max-h-10";
  const typingPanelNarrowClass = "max-[420px]:p-2 max-[420px]:mb-2";

  return (
    <MasterSubjectAccessScreen permissionKey="hebrew" titleHe="עברית">
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
          title="📚 עברית"
          subtitle={`${playerName || "שחקן"} • ${GRADES[grade].name} • ${displayLevelLabel()} • ${getOperationName(operation)} • ${MODES[mode].name}`}
          onBack={backSafe}
          onCurriculumClick={() => router.push("/learning/curriculum?subject=hebrew")}
          audio={audio}
        />

        <div className="md:hidden">
          <LearningMasterNavBar
            MB={MB}
            headerRef={headerRef}
            onCurriculumClick={() => router.push("/learning/curriculum?subject=hebrew")}
            onBack={backSafe}
            hideCurriculum
            compactHeader
            integratedTopRow
            centerSlot={
              <LearningMasterMobileNavTitle MB={MB} title="📚 עברית" audio={audio} />
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
          <div className={LEARNING_MASTER_MOBILE_SUBTITLE_ROW_CLASS}>
            <p className={`${MB.pageSub} max-md:leading-none max-md:mb-0`}>
              {playerName || "שחקן"} • {GRADES[grade].name} •{" "}
              {displayLevelLabel()} • {getOperationName(operation)} •{" "}
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

          {/* בחירת מצב (תרגול / למידה / מהירות / מרתון / אתגר) + נגן שמע קומפקטי מתחת */}
          <div className={LEARNING_MASTER_MOBILE_MODE_ROW_CLASS}>
            <div
              className="flex items-center justify-center gap-1.5 md:gap-2.5 lg:gap-3 flex-wrap"
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
          </div>

          {/* הודעות מיוחדות */}
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
                        id="avatar-image-upload-hebrew"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => document.getElementById("avatar-image-upload-hebrew").click()}
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
                            localStorage.setItem("mleo_player_avatar", avatar);
                            localStorage.removeItem("mleo_player_avatar_image");
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
                      setFocusedPracticeMode("mistakes");
                      setShowPracticeOptions(false);
                      if (mistakes.length > 0) {
                        setGameActive(true);
                        startGame();
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
                      setFocusedPracticeMode("graded");
                      setShowPracticeOptions(false);
                      setGameActive(true);
                      startGame();
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
                      localStorage.setItem(HEBREW_MISTAKES_KEY, JSON.stringify([]));
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
            <div className="relative flex flex-col flex-1 min-h-0 min-w-0 w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl items-center justify-start md:gap-1">
              {bookIndexHref ? (
                <LearningBookIndexTile
                  subject="hebrew"
                  grade={grade}
                  testId={`hebrew-${grade}-book-index-button`}
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
                  data-testid="hebrew-player-name"
                  className={MB.preGamePlayerBadge}
                  dir={playerName && /[\u0590-\u05FF]/.test(playerName) ? "rtl" : "ltr"}
                  title={playerName.trim() ? playerName.trim() : undefined}
                  aria-label={playerName.trim() ? `שם ילד/ה: ${playerName.trim()}` : "שם ילד/ה לא זמין"}
                >
                  {playerName.trim() ? playerName.trim() : "שחקן"}
                </div>
                <select
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
                  subjectId="hebrew"
                  value={displayLevel}
                  title={displayLevelLabel()}
                  onChange={handleDisplayLevelChange}
                  className={`${MB.selectControl} shrink-0 min-w-0 w-[5rem] max-w-[5.5rem] md:w-[5.75rem] md:max-w-[6.25rem]`}
                />
                <div className="flex flex-1 min-w-0 md:flex-none md:max-w-[min(22rem,42vw)] items-center gap-1.5 md:gap-2 shrink">
                  <select
                    ref={operationSelectRef}
                    data-testid="hebrew-topic-select"
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
                    {GRADES[grade].topics.map((topic) => (
                      <option key={topic} value={topic} disabled={topic !== "mixed" && guestTopics.isLocked(topic)}>
                        {topic === "mixed" ? getOperationName(topic) : guestTopics.label(topic, getOperationName(topic))}
                      </option>
                    ))}
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

              {showG1BookFirstSoftGate ? (
                <div
                  className="bg-teal-900/35 border border-teal-400/35 rounded-lg px-3 py-3 mb-3 w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl shadow-sm"
                  dir="rtl"
                  data-testid="hebrew-g1-book-first-soft-gate"
                >
                  <div className="text-sm font-bold text-teal-50 mb-1">{g1BookFirstCopy.title}</div>
                  <p className="text-xs text-white/85 leading-snug mb-1">{g1BookFirstCopy.body}</p>
                  <p className="text-[11px] text-white/70 leading-snug mb-3">{g1BookFirstCopy.hint}</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      data-testid="hebrew-g1-book-first-open-book"
                      className="h-9 flex-1 rounded-lg bg-teal-500/85 hover:bg-teal-500 font-bold text-xs text-white shadow-sm"
                      onClick={() => {
                        if (g1FoundationBookHref) router.push(g1FoundationBookHref);
                      }}
                    >
                      {g1BookFirstCopy.openBookLabel}
                    </button>
                    <button
                      type="button"
                      data-testid="hebrew-g1-book-first-continue-practice"
                      className="h-9 flex-1 rounded-lg bg-black/35 border border-white/20 hover:bg-black/45 font-bold text-xs text-white shadow-sm"
                      onClick={() => {
                        setG1LiteracyProgress(
                          dismissHebrewG1BookFirstSoftGateClient(operation)
                        );
                      }}
                    >
                      {g1BookFirstCopy.continueLabel}
                    </button>
                  </div>
                </div>
              ) : null}

              <LearningPlannerRecommendationBlock
                model={adaptivePlannerRecommendationView}
                onRecommendedPractice={handleAdaptivePlannerRecommendedPractice}
              />
              

              <div className="mt-auto mb-2 w-full pt-3 md:pt-4 flex flex-col items-center gap-2 md:gap-3">
              <div className="flex items-center justify-center gap-1.5 md:gap-2.5 w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl flex-wrap px-1 md:px-2 mx-auto">
                <button
                  type="button"
                  data-testid="hebrew-start-game"
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
                  ❓ איך לומדים עברית כאן?
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
                    data-testid={`hebrew-${grade}-book-topic-button`}
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
                {mistakes.length > 0 && (
                  <button
                    onClick={() => setShowPracticeOptions(true)}
                    className={`${MB.btnActionHelp} ${MB.btnActionPink}`}
                  >
                    תרגול ממוקד ({mistakes.length})
                  </button>
                )}
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
                <div
                  ref={gameRef}
                  className={LEARNING_MASTER_MOBILE_GAME_CLASS}
                >
                  {(feedback || errorExplanation) && (
                    <div className="absolute top-0 left-0 right-0 z-[5] px-2 pt-1 pointer-events-none" role="status" aria-live="assertive" aria-atomic="true">
                      <div className="flex flex-col gap-2">
                        {feedback && (
                          <div
                            className={`px-4 py-2 rounded-lg text-sm font-semibold text-center ${
                              showCorrectAnimation
                                ? `${MB.feedbackOk} ${MB.feedbackOkAnim}`
                                : showWrongAnimation
                                ? `${MB.feedbackBad} ${MB.feedbackBadAnim}`
                                : feedback.includes("נכון")
                                ? MB.feedbackOk
                                : MB.feedbackBad
                            }`}
                          >
                            <div className="text-base">{feedback}</div>
                          </div>
                        )}
                        {errorExplanation && (
                          <div className={MB.errorBox}>
                            <div className={MB.errorTitle}>
                              למה הטעות קרתה?
                            </div>
                            <div className={MB.errorBody}>
                              {errorExplanation}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {showHebrewAudioToolbar ? (
                    <div
                      className="absolute top-2 left-2 z-10 max-md:hidden pointer-events-auto"
                      dir="rtl"
                    >
                      <HebrewAudioBuild1Panel
                        stem={currentQuestion.params.audioStem}
                        gameActive={gameActive && !selectedAnswer}
                        grade={grade}
                        topic={
                          currentQuestion.topic ||
                          currentQuestion.operation ||
                          "reading"
                        }
                        guidedMode={isHebrewAudioRecordedManual}
                        onGuidedNeutralDone={finishAudioRecordedManualNeutral}
                      />
                    </div>
                  ) : null}
                  {questionBookHref ? (
                    <div className={`${MB.floatBtnStack} max-md:hidden`}>
                      <button
                        type="button"
                        data-testid={`hebrew-${grade}-book-question-button`}
                        onClick={() => openBookFromLearning(questionBookHref)}
                        className={`${MB.floatBtnHelper} ${MB.floatBtnBookColors}`}
                        title="הסבר בספר לנושא הנוכחי"
                      >
                        הסבר
                      </button>
                    </div>
                  ) : null}

                  <div
                    data-testid="hebrew-question-stem"
                    className={`${questionSlotClassForStem} relative ${showMobileQuestionActions ? "max-md:pb-11" : ""}`.trim()}
                  >
                  {/* ויזואליזציה של מספרים (כיתות א'-ג') */}
                  {(grade === "g1" || grade === "g2" || grade === "g3") && (currentQuestion.operation === "addition" || currentQuestion.operation === "subtraction") && (
                    <div className="mb-4 flex gap-6 items-center justify-center flex-wrap" style={{ direction: "ltr" }}>
                      {/* הגדרת מגבלות לפי כיתה */}
                      {(() => {
                        const maxVisual = grade === "g1" ? 10 : grade === "g2" ? 20 : 30;
                        const showVisual = currentQuestion.a <= maxVisual && currentQuestion.b <= maxVisual;
                        if (!showVisual) return null;
                        
                        const maxA = Math.min(currentQuestion.a, maxVisual);
                        const maxB = Math.min(currentQuestion.b, maxVisual);
                        let remainingA;
                        
                        if (currentQuestion.operation === "subtraction") {
                          // בחיסור - העיגולים הכחולים שנותרו (לפני שעברו לאחר הסימן שווה)
                          if (movedCirclesB >= maxB) {
                            // כל ה-b הורדו, אז כל העיגולים הכחולים עברו לאחר הסימן שווה
                            remainingA = 0;
                          } else {
                            // עדיין יש עיגולים ירוקים, אז העיגולים הכחולים שנותרו = a - movedCirclesB
                            remainingA = Math.max(0, maxA - movedCirclesB);
                          }
                        } else {
                          // בחיבור - העיגולים שנותרו אחרי שעברו
                          remainingA = maxA - movedCirclesA;
                        }
                        
                        return (
                          <>
                            <div className="flex flex-wrap gap-3 justify-center max-w-[200px] min-w-[120px]">
                              {Array(remainingA)
                                .fill(0)
                                .map((_, i) => (
                                  <span
                                    key={`a-${i}`}
                                    onClick={() => {
                                      if (currentQuestion.operation === "addition") {
                                        // בחיבור - עיגול עובר לאחר הסימן שווה
                                        if (movedCirclesA < maxA) {
                                          setMovedCirclesA(prev => prev + 1);
                                        }
                                      } else {
                                        // בחיסור - לחיצה על עיגול מ-a מורידה עיגול מ-b (והעיגול הכחול עצמו נמחק)
                                        if (movedCirclesB < maxB) {
                                          setMovedCirclesB(prev => prev + 1);
                                        }
                                      }
                                    }}
                                    className="inline-block bg-blue-500 rounded-full cursor-pointer hover:bg-blue-400 active:bg-blue-600 transition-all duration-300 touch-manipulation hover:scale-110 active:scale-95 animate-pulse-glow ring-2 ring-blue-300 ring-opacity-75"
                                    style={{ 
                                      userSelect: "none", 
                                      width: grade === "g1" ? "24px" : grade === "g2" ? "20px" : "18px",
                                      height: grade === "g1" ? "24px" : grade === "g2" ? "20px" : "18px",
                                      minWidth: grade === "g1" ? "24px" : grade === "g2" ? "20px" : "18px",
                                      minHeight: grade === "g1" ? "24px" : grade === "g2" ? "20px" : "18px",
                                      animation: "none"
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.animation = "bounce 0.3s ease";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.animation = "none";
                                    }}
                                  />
                                ))}
                            </div>
                            <span className="text-white text-3xl font-bold min-w-[40px] text-center">
                              {currentQuestion.operation === "addition" ? "+" : "−"}
                            </span>
                            <div className="flex flex-wrap gap-3 justify-center max-w-[200px] min-w-[120px]">
                              {Array(Math.min(currentQuestion.b, maxVisual) - movedCirclesB)
                                .fill(0)
                                .map((_, i) => (
                                  <span
                                    key={`b-${i}`}
                                    onClick={() => {
                                      if (currentQuestion.operation === "addition") {
                                        // בחיבור - עיגול עובר לאחר הסימן שווה
                                        if (movedCirclesB < Math.min(currentQuestion.b, maxVisual)) {
                                          setMovedCirclesB(prev => prev + 1);
                                        }
                                      }
                                      // בחיסור - לא ניתן ללחוץ על עיגולים מ-b
                                    }}
                                    className={`inline-block rounded-full ${
                                      currentQuestion.operation === "addition" 
                                        ? "bg-green-500 cursor-pointer hover:bg-green-400 active:bg-green-600 transition-all duration-300 hover:scale-110 active:scale-95 animate-pulse-glow-green ring-2 ring-green-300 ring-opacity-75" 
                                        : "bg-green-500"
                                    } touch-manipulation`}
                                    style={{ 
                                      userSelect: "none",
                                      width: grade === "g1" ? "24px" : grade === "g2" ? "20px" : "18px",
                                      height: grade === "g1" ? "24px" : grade === "g2" ? "20px" : "18px",
                                      minWidth: grade === "g1" ? "24px" : grade === "g2" ? "20px" : "18px",
                                      minHeight: grade === "g1" ? "24px" : grade === "g2" ? "20px" : "18px",
                                      animation: currentQuestion.operation === "addition" ? "none" : "none"
                                    }}
                                    onMouseEnter={(e) => {
                                      if (currentQuestion.operation === "addition") {
                                        e.currentTarget.style.animation = "bounce 0.3s ease";
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.animation = "none";
                                    }}
                                  />
                                ))}
                            </div>
                            <span className="text-white text-3xl font-bold min-w-[40px] text-center">=</span>
                            {/* עיגולים שעברו מאחורי הסימן שווה */}
                            {(() => {
                              const maxVisual = grade === "g1" ? 10 : grade === "g2" ? 20 : 30;
                              const showResult = (movedCirclesA > 0 || movedCirclesB > 0 || (currentQuestion.operation === "subtraction" && movedCirclesB >= Math.min(currentQuestion.b, maxVisual)));
                              if (!showResult) return null;
                              
                              return (
                                <div className="flex flex-wrap gap-3 justify-center max-w-[200px] min-w-[120px]">
                                  {currentQuestion.operation === "addition" ? (
                                    // בחיבור - כל העיגולים שעברו
                                    Array(movedCirclesA + movedCirclesB)
                                      .fill(0)
                                      .map((_, i) => (
                                        <span
                                          key={`result-${i}`}
                                          className={`inline-block rounded-full transition-all duration-300 ${
                                            i < movedCirclesA ? "bg-blue-500" : "bg-green-500"
                                          }`}
                                          style={{ 
                                            width: grade === "g1" ? "24px" : grade === "g2" ? "20px" : "18px",
                                            height: grade === "g1" ? "24px" : grade === "g2" ? "20px" : "18px",
                                            minWidth: grade === "g1" ? "24px" : grade === "g2" ? "20px" : "18px",
                                            minHeight: grade === "g1" ? "24px" : grade === "g2" ? "20px" : "18px",
                                            animation: "fadeIn 0.5s ease-in"
                                          }}
                                        />
                                      ))
                                  ) : (
                                    // בחיסור - העיגולים שנותרו מ-a אחרי שהורידנו את כל ה-b
                                    movedCirclesB >= Math.min(currentQuestion.b, maxVisual) && 
                                    Array(Math.max(0, Math.min(currentQuestion.a, maxVisual) - movedCirclesB))
                                      .fill(0)
                                      .map((_, i) => (
                                        <span
                                          key={`result-${i}`}
                                          className="inline-block bg-blue-500 rounded-full transition-all duration-300"
                                          style={{ 
                                            width: grade === "g1" ? "24px" : grade === "g2" ? "20px" : "18px",
                                            height: grade === "g1" ? "24px" : grade === "g2" ? "20px" : "18px",
                                            minWidth: grade === "g1" ? "24px" : grade === "g2" ? "20px" : "18px",
                                            minHeight: grade === "g1" ? "24px" : grade === "g2" ? "20px" : "18px",
                                            animation: "fadeIn 0.5s ease-in"
                                          }}
                                        />
                                      ))
                                  )}
                                </div>
                              );
                            })()}
                          </>
                        );
                      })()}
                    </div>
                  )}
                  
                  {canDisplayVertically && (
                    <div className="flex justify-center mb-2">
                      <button
                        onClick={() => setIsVerticalDisplay((prev) => !prev)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-500/80 hover:bg-purple-500 text-white transition-all"
                        title={isVerticalDisplay ? "הצג מאוזן" : "הצג מאונך"}
                      >
                        {isVerticalDisplay ? "↔️ מאוזן" : "↕️ מאונך"}
                      </button>
                    </div>
                  )}
                  {isVerticalDisplay && canDisplayVertically && disExerciseText ? (
                    <>
                      {!suppressAudioOnlyShamaLabel && disQuestionLabel ? (
                        <p
                          className={`${MB.questionLead} ${questionBottomSpacingClass} break-words overflow-wrap-anywhere max-w-full px-2`}
                          dir="rtl"
                          data-testid="student-question-lead"
                          style={{
                            direction: "rtl",
                            unicodeBidi: "plaintext",
                            wordBreak: "break-word",
                            overflowWrap: "break-word",
                            lineHeight: questionLineHeightByPressure,
                            ...getQuestionFontStyle({ text: disQuestionLabel || "" }),
                            ...getVerbalInstructionStyle({
                              text: disQuestionLabel || "",
                              isMobileViewport,
                              className: MB.questionLead,
                            }),
                          }}
                        >
                          {disQuestionLabel}
                        </p>
                      ) : null}
                      <div
                        className={`${questionBottomSpacingClass} flex justify-center w-full max-w-full px-2 overflow-x-hidden`}
                        data-testid="student-question-body"
                        dir="ltr"
                      >
                        <pre
                          className="text-2xl md:text-3xl text-center text-white font-bold font-mono whitespace-pre"
                          style={{ direction: "ltr", unicodeBidi: "isolate" }}
                        >
                          {getVerticalExercise() || disExerciseText}
                        </pre>
                      </div>
                    </>
                  ) : suppressAudioOnlyShamaBody && !disExerciseText ? null : (
                    <StudentQuestionDisplay
                      question={suppressAudioOnlyShamaBody ? "" : disQuestionBody}
                      questionLabel={
                        suppressAudioOnlyShamaLabel ? "" : disQuestionLabel
                      }
                      exerciseText={disExerciseText}
                      getQuestionFontStyle={getQuestionFontStyle}
                      leadClassName={`${MB.questionLead} ${questionBottomSpacingClass} break-words overflow-wrap-anywhere max-w-full px-2`}
                      bodyClassName={`${MB.questionBody} ${questionBottomSpacingClass} max-w-full px-2 break-words overflow-wrap-anywhere`}
                      formulaClassName={MB.questionFormula}
                      leadStyle={{ lineHeight: questionLineHeightByPressure }}
                      bodyStyle={{ lineHeight: questionLineHeightByPressure }}
                    />
                  )}

                  <LearningMasterMobileQuestionActionDock
                    MB={MB}
                    show={showMobileQuestionActions}
                    testId="hebrew-question-mobile-actions"
                    secondaryWide
                    bookSlot={
                      questionBookHref ? (
                        <button
                          type="button"
                          data-testid={`hebrew-${grade}-book-question-button`}
                          onClick={() => openBookFromLearning(questionBookHref)}
                          className={`${MB.questionActionBtn} ${MB.floatBtnBookColors}`}
                          title="הסבר בספר לנושא הנוכחי"
                        >
                          הסבר
                        </button>
                      ) : null
                    }
                    secondarySlot={
                      showHebrewAudioToolbar ? (
                        <HebrewAudioBuild1Panel
                          stem={currentQuestion.params.audioStem}
                          gameActive={gameActive && !selectedAnswer}
                          grade={grade}
                          topic={
                            currentQuestion.topic ||
                            currentQuestion.operation ||
                            "reading"
                          }
                          guidedMode={isHebrewAudioRecordedManual}
                          onGuidedNeutralDone={finishAudioRecordedManualNeutral}
                        />
                      ) : null
                    }
                  />
                  </div>

                  <div className="w-full flex-1 min-h-0 mt-2 flex flex-col items-center justify-end">
                  {isTypingQuestion ? (
                    <div className={`${typingPanelClass} ${typingPanelNarrowClass}`}>
                      <div className={`text-center ${questionPressureBucket === "veryLong" ? "mb-2" : "mb-3"} max-[420px]:mb-2`}>
                        <input
                          dir="rtl"
                          type="text"
                          value={typedAnswer}
                          onChange={(e) => setTypedAnswer(e.target.value)}
                          onKeyPress={(e) => {
                            if (
                              e.key === "Enter" &&
                              !selectedAnswer &&
                              typedAnswer.trim() !== ""
                            ) {
                              handleAnswer(typedAnswer.trim());
                            }
                          }}
                          disabled={!!selectedAnswer || !gameActive}
                          placeholder="כתוב את התשובה שלך כאן..."
                          className={
                            isMobileViewport
                              ? LEARNING_MASTER_MOBILE_TYPING_INPUT_CLASS
                              : `${typingInputDesktopClass} ${typingInputNarrowClass}`
                          }
                        />
                      </div>
                      <div className={typingRowClass}>
                        <button
                          onClick={() => {
                            if (!typedAnswer.trim()) return;
                            handleAnswer(typedAnswer.trim());
                          }}
                          disabled={
                            !!selectedAnswer || !gameActive || !typedAnswer.trim()
                          }
                          className={MB.checkBtn}
                        >
                          ✅ בדוק תשובה
                        </button>
                      </div>
                    </div>
                  ) : isHebrewAudioRecordedManual ? (
                    <p className="w-full mb-2 text-center text-[11px] text-white/55 px-2">
                      השלמה מהפאנל למעלה.
                    </p>
                  ) : (
                    <div
                      className={`grid gap-3 w-full mb-3 max-[420px]:gap-2 max-[420px]:mb-2 ${
                        useNarrowMobileAnswerFallback
                          ? "grid-cols-2 max-[420px]:grid-cols-1"
                          : "grid-cols-2"
                      } ${isMobileViewport ? LEARNING_MASTER_MOBILE_ANSWER_SCALE_CLASS : ""}`}
                    >
                      {currentQuestion.answers.map((answer, idx) => {
                        const isSelected = selectedAnswer === answer;
                        const acceptedAnswersMcq =
                          Array.isArray(currentQuestion.acceptedAnswers) &&
                          currentQuestion.acceptedAnswers.length > 0
                            ? currentQuestion.acceptedAnswers
                            : [currentQuestion.correctAnswer];
                        const strictNiqqudMcq =
                          isSpellingTargetWordInQuotesContextFromStem(
                            spellingStemForNiqqudDetect(currentQuestion)
                          );
                        const { isCorrect } = compareAnswers({
                          mode: strictNiqqudMcq
                            ? "hebrew_niqqud_strict"
                            : "hebrew_relaxed_text",
                          user: answer,
                          acceptedList: acceptedAnswersMcq,
                        });
                        const isWrong = isSelected && !isCorrect;

                        return (
                          <button
                            type="button"
                            key={idx}
                            data-testid={`hebrew-mcq-${idx}`}
                            onClick={() => handleAnswer(answer)}
                            disabled={!!selectedAnswer}
                            className={`rounded-xl border-2 transition-all active:scale-95 disabled:opacity-50 ${answerCardTextClass} ${answerCardNarrowClass} ${resolveLearningMcqChoiceClassName(
                              {
                                MB,
                                isSelected,
                                isCorrectChoice: isCorrect,
                                isWrong,
                                revealResults: selectedAnswer != null,
                              }
                            )}`}
                          >
                            {nqx(`answer_${idx}`, answer)}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {currentQuestion && (
                    <div className="w-full flex justify-center gap-2 flex-wrap mb-2 min-h-[2.75rem]" dir="rtl">
                        {mode === "learning" && currentQuestion && (
                          <button
                            type="button"
                            onClick={() => {
                              clearWrongAnswerAdvanceTimer();
                              stepByStepViewedRef.current = true;
                              setShowSolution(true);
                            }}
                            className={MB.btnStepByStep}
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
                              className={MB.btnPrevExercise}
                            >
                              🕘 תרגיל קודם
                            </button>
                          )}
                  </div>
                  )}
                  </div>

                      {/* חלון הסבר מלא - Modal גדול ומרכזי */}
                      {isShowingAnySolution && explanationQuestion && (() => {
                        const info = buildStepExplanation(explanationQuestion);
                        if (!info) return null;

                          return (
                            <StepExerciseUiProvider value={stepExerciseUi}>
                            <div
                              className={learningModalOverlay}
                              onClick={closeExplanationModal}
                              dir="rtl"
                            >
                              <div
                                className={`${learningModalPanel} overflow-hidden`}
                                onClick={(e) => e.stopPropagation()}
                                style={{ maxWidth: "90vw", maxHeight: "90vh" }}
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

                                <div className={`flex-1 min-h-0 overflow-y-auto px-4 pb-2 ${learningModalScrollBody}`} dir="rtl">
                                  <div className={`mb-3 ${learningQuestionBox}`}>
                                    <p
                                      className={`${learningQuestionText} text-center break-words overflow-wrap-anywhere max-w-full px-2`}
                                      style={{
                                        direction: "ltr",
                                        unicodeBidi: "plaintext",
                                        wordBreak: "break-word",
                                        overflowWrap: "break-word",
                                      }}
                                    >
                                      {explanationQuestion === currentQuestion
                                        ? disExerciseText ||
                                          disQuestionBody ||
                                          disQuestionLabel ||
                                          info.exercise ||
                                          explanationQuestion.exerciseText ||
                                          explanationQuestion.question
                                        : info.exercise ||
                                          explanationQuestion.exerciseText ||
                                          explanationQuestion.question}
                                    </p>
                                  </div>
                                  {info.vertical && (
                                    <div className="mb-3 rounded-lg bg-emerald-900/50 px-3 py-2">
                                      <pre
                                        dir="ltr"
                                        className="text-center font-mono text-base leading-relaxed whitespace-pre text-emerald-100"
                                      >
                                        {info.vertical}
                                      </pre>
                                    </div>
                                  )}
                                  <div className="space-y-1.5" style={{ direction: "rtl", unicodeBidi: "plaintext" }}>
                                    {info.steps.map((step, idx) => (
                                      <div key={idx} className={learningExplBody}>
                                        {step}
                                      </div>
                                    ))}
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
                          );
                      })()}
                </div>
              )}

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
                  {studentDisplayLevelKeys("hebrew").slice().reverse().map((dl) => (
                    <button
                      key={dl}
                      onClick={() => {
                        setLeaderboardLevel(dl);
                        if (typeof window !== "undefined") {
                          try {
                            const saved = JSON.parse(
                              localStorage.getItem(STORAGE_KEY) || "{}"
                            );
                            const topScores = loadLeaderboardTop10ByDisplayLevel(saved, dl);
                            setLeaderboardData(topScores);
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
                  const allowed = GRADES[grade].topics;
                  setOperation(allowed.find(topic => topic !== "mixed") || allowed[0]);
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
                    🎲 בחר פעולות למיקס
                  </h2>
                  <p className="text-white/70 text-sm">
                    בחר אילו פעולות לכלול במיקס
                  </p>
                </div>

                <div className="space-y-3 mb-4 overflow-y-auto flex-1 min-h-0">
                  {GRADES[grade].topics
                    .filter((topic) => topic !== "mixed")
                    .map((topic) => (
                      <label
                        key={topic}
                        className="flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-white/10 hover:bg-black/40 cursor-pointer transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={mixedOperations[topic] || false}
                          onChange={(e) => {
                            setMixedOperations((prev) => ({
                              ...prev,
                              [topic]: e.target.checked,
                            }));
                          }}
                          className="w-5 h-5 rounded"
                        />
                        <span className="text-white font-semibold text-lg">
                          {getOperationName(topic)}
                        </span>
                      </label>
                    ))}
                </div>

                <div className="flex gap-2 flex-shrink-0" dir="rtl">
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
                    className="flex-1 px-4 py-2 rounded-lg bg-emerald-500/80 hover:bg-emerald-500 font-bold text-sm"
                  >
                    שמור
                  </button>
                  <button
                    onClick={() => {
                      // בטל הכל
                      const availableTopics = GRADES[grade].topics.filter(
                        (topic) => topic !== "mixed"
                      );
                      const noneSelected = {};
                      availableTopics.forEach((topic) => {
                        noneSelected[topic] = false;
                      });
                      setMixedOperations(noneSelected);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-gray-500/80 hover:bg-gray-500 font-bold text-sm"
                  >
                    בטל הכל
                  </button>
                  <button
                    onClick={() => {
                      // בחר הכל
                      const availableTopics = GRADES[grade].topics.filter(
                        (topic) => topic !== "mixed"
                      );
                      const allSelected = {};
                      availableTopics.forEach((topic) => {
                        allSelected[topic] = true;
                      });
                      setMixedOperations(allSelected);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-blue-500/80 hover:bg-blue-500 font-bold text-sm"
                  >
                    הכל
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
                  📘 איך לומדים עברית כאן?
                </h2>

                <p className="text-white/80 text-xs mb-3 text-center">
                  המטרה היא לתרגל עברית בצורה משחקית, עם התאמה לכיתה, נושא ורמת קושי.
                </p>

                <ul className="list-disc pr-4 space-y-1 text-[13px] text-white/90">
                  <li>בחר כיתה, רמת קושי ונושא (אוצר מילים, דקדוק, כתיבה, הבנת הנקרא ועוד).</li>
                  <li>בחר מצב משחק: למידה, אתגר עם טיימר וחיים, מהירות או מרתון.</li>
                  <li>קרא היטב את השאלה – לפעמים יש שאלות מורכבות שצריך להבין את ההקשר.</li>
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
                  <h2 className="text-2xl font-extrabold">📚 לוח עזרה בעברית</h2>
                  <button
                    onClick={() => setShowReferenceModal(false)}
                    className="text-white/80 hover:text-white text-xl px-2"
                  >
                    ✖
                  </button>
                </div>
                <p className="text-sm text-white/70 mb-3">
                  בחר קטגוריה כדי לראות מושגים, כללים וטיפים חשובים בעברית.
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
                  {referenceCategory === "grammar" && (
                    <>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">✏️ שם עצם</div>
                        <div className="text-sm text-white/80">מילה שמציינת אדם, מקום, חפץ או רעיון</div>
                        <div className="text-xs text-white/60 mt-1">דוגמה: בית, ילד, ספר</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">✏️ פועל</div>
                        <div className="text-sm text-white/80">מילה שמציינת פעולה או מצב</div>
                        <div className="text-xs text-white/60 mt-1">דוגמה: רץ, קורא, כותב</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">✏️ שם תואר</div>
                        <div className="text-sm text-white/80">מילה המתארת שם עצם</div>
                        <div className="text-xs text-white/60 mt-1">דוגמה: יפה, גדול, חכם</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">✏️ מילת יחס</div>
                        <div className="text-sm text-white/80">מילה שמקשרת בין מילים במשפט</div>
                        <div className="text-xs text-white/60 mt-1">דוגמה: ב, ל, מ, על</div>
                      </div>
                    </>
                  )}
                  {referenceCategory === "vocabulary" && (
                    <>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">📚 מילים נרדפות</div>
                        <div className="text-sm text-white/80">מילים בעלות משמעות דומה</div>
                        <div className="text-xs text-white/60 mt-1">דוגמה: שמח = מאושר, יפה = נאה</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">📚 מילים מנוגדות</div>
                        <div className="text-sm text-white/80">מילים בעלות משמעות הפוכה</div>
                        <div className="text-xs text-white/60 mt-1">דוגמה: גדול ≠ קטן, חם ≠ קר</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">📚 שורש</div>
                        <div className="text-sm text-white/80">החלק הבסיסי של המילה</div>
                        <div className="text-xs text-white/60 mt-1">דוגמה: כתב (כתיבה, כתב, מכתב)</div>
                      </div>
                    </>
                  )}
                  {referenceCategory === "reading" && (
                    <>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">📖 הבנת הנקרא</div>
                        <div className="text-sm text-white/80">קריאת טקסט והבנת המשמעות</div>
                        <div className="text-xs text-white/60 mt-1">קרא את הטקסט בעיון וענה על השאלות</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">📖 שאלות הבנה</div>
                        <div className="text-sm text-white/80">שאלות שדורשות הבנה של הטקסט</div>
                        <div className="text-xs text-white/60 mt-1">חפש מילות מפתח בטקסט</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">📖 סיכום</div>
                        <div className="text-sm text-white/80">תקציר של הטקסט במילים שלך</div>
                        <div className="text-xs text-white/60 mt-1">כתוב את העיקר בלבד</div>
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
      subjectId="hebrew"
      uiSelection={`operation=${operation}`}
      currentQuestion={currentQuestion}
      trackingRef={hebrewTrackingTopicKeyRef}
    />
    </Layout>
    </MasterSubjectAccessScreen>
  );
}




