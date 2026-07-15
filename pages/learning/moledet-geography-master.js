import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Layout from "../../components/Layout";
import { useRouter } from "next/router";
import { useIOSViewportFix } from "../../hooks/useIOSViewportFix";
import {
  BLANK,
  LEVELS,
  GRADE_LEVELS,
  GRADES,
  TOPICS,
  MODES,
  STORAGE_KEY,
} from "../../utils/moledet-geography-constants";
import { MOLEDET_GEOGRAPHY_ACTIVITY_SUBJECT_ID } from "../../lib/learning-shared/moledet-geography-subject-id.js";
import {
  VISUAL_STRAND_MOLEDET,
  VISUAL_STRAND_GEOGRAPHY,
  catalogGradeKeysForVisualStrand,
  catalogSubjectForVisualStrand,
  clampGradeKeyToVisualStrand,
  defaultTopicForVisualStrand,
  filterTopicsForVisualStrand,
  gradeNumberFromGradeKey,
  normalizeVisualStrand,
  visualStrandTitleHe,
  VISUAL_STRAND_LABEL_HE,
} from "../../lib/learning-shared/moledet-geography-display.js";
import LearningBookIndexTile from "../../components/learning-book/LearningBookIndexTile";
import { getLearningBookIndexHref } from "../../lib/learning-book/learning-book-catalog-meta.js";
import { getMoledetGeographyBookHref } from "../../lib/learning-book/resolve-moledet-geography-book-page.js";
import {
  consumeAnyMoledetGeographyBookLearningSnapshot,
  consumeAnyMoledetGeographyBookPracticePreset,
  isMoledetGeographyBookPracticeEntry,
  saveMoledetGeographyBookLearningSnapshot,
  withMoledetGeographyBookLearningReturn,
} from "../../lib/learning-book/moledet-geography-book-nav.js";
import {
  buildBookContextClientMetaExtras,
  tryConsumeBookContextOnPracticeEntry,
} from "../../lib/learning-book/book-context-master-helper";

const MG_SUBJECT = MOLEDET_GEOGRAPHY_ACTIVITY_SUBJECT_ID;
import {
  getLevelConfig,
  getLevelForGrade,
  buildTop10ByScore,
  saveScoreEntry,
} from "../../utils/moledet-geography-storage";
import { generateQuestion } from "../../utils/moledet-geography-question-generator";
import { SessionAntiRepeatBuffer } from "../../utils/question-session-anti-repeat";
import { getQuestionFingerprintForSubject } from "../../utils/question-fingerprints";
import { sanitizeQuestionForStudentDisplay } from "../../utils/student-question-stem-sanitizer";
import StudentQuestionDisplay from "../../components/learning/StudentQuestionDisplay";
import {
  buildHebrewApprovedVerbalMasterLayout,
  buildHebrewApprovedVerbalMcqGridClassName,
  getHebrewApprovedSingleVerbalQuestionStyle,
  HEBREW_APPROVED_VERBAL_ANSWER_AREA_CLASS,
} from "../../utils/hebrew-approved-verbal-master-contract.client.js";
import { resolveStudentQuestionDisplayParts } from "../../utils/student-question-display";
import {
  getSolutionSteps,
  getErrorExplanation,
  buildStepExplanation,
} from "../../utils/moledet-geography-explanations";
import { trackMoledetGeographyTopicTime } from "../../utils/moledet-geography-time-tracking";
import { useLearningVisibilityClock } from "../../hooks/useLearningVisibilityClock";
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
import {
  applyLearningMasterMobileShellLayoutVars,
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
import { useMobileViewport } from "../../hooks/useMobileViewport";
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
import {
  buildPendingProbeFromMistake,
  probeMatchesSession,
  attachProbeMetaToQuestion,
  decrementPendingProbeExpiry,
} from "../../utils/active-diagnostic-runtime/index.js";
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
  studentDisplayLevelKeys,
  studentDisplayLevelLabel,
} from "../../lib/learning-client/student-display-level-practice.js";

function loadLeaderboardTop10ByDisplayLevel(saved, displayLevel) {
  const sourceKeys = displayLevel === "advanced" ? ["hard"] : ["easy", "medium"];
  const merged = sourceKeys.flatMap((sk) => buildTop10ByScore(saved, sk));
  merged.sort((a, b) => (b.score || 0) - (a.score || 0));
  return merged.slice(0, 10);
}

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
  homeland: { label: "מולדת", icon: "🏠" },
  geography: { label: "גאוגרפיה", icon: "🗺️" },
  citizenship: { label: "אזרחות", icon: "👥" },
};

const REFERENCE_CATEGORY_KEYS = Object.keys(REFERENCE_CATEGORIES);

function referenceCategoryKeysForStrand(visualStrand) {
  if (visualStrand === VISUAL_STRAND_GEOGRAPHY) return ["geography"];
  return ["homeland", "citizenship"];
}

/** Matches `utils/math-report-generator.js` and parent-report mistake readers. */
const MOLEDET_GEOGRAPHY_MISTAKES_KEY = `mleo_${MOLEDET_GEOGRAPHY_ACTIVITY_SUBJECT_ID}_mistakes`;

/** @param {{ visualStrand?: string }} props */
export function MoledetGeographyMasterPage({ visualStrand: visualStrandProp = VISUAL_STRAND_MOLEDET }) {
  const visualStrand = normalizeVisualStrand(visualStrandProp);
  const strandGradeKeys = useMemo(
    () => catalogGradeKeysForVisualStrand(visualStrand),
    [visualStrand]
  );
  const strandGradeNumbers = useMemo(
    () =>
      strandGradeKeys
        .map((gk) => gradeNumberFromGradeKey(gk))
        .filter((n) => n != null),
    [strandGradeKeys]
  );
  const strandBookGradeSet = useMemo(() => new Set(strandGradeKeys), [strandGradeKeys]);
  const strandCatalogSubject = catalogSubjectForVisualStrand(visualStrand);
  const pageTitleHe = visualStrandTitleHe(visualStrand);
  const curriculumSubject =
    visualStrand === VISUAL_STRAND_GEOGRAPHY ? "geography" : "moledet";
  const curriculumHref = `/learning/curriculum?subject=${curriculumSubject}`;
  const strandReferenceKeys = useMemo(
    () => referenceCategoryKeysForStrand(visualStrand),
    [visualStrand]
  );

  useIOSViewportFix();
  const isMobileViewport = useMobileViewport();
  const { MB, ui, shellClass, shellBgStyle } = useLearningMasterUi();
  const learningModalOverlay = ui.learningModalOverlay;
  const learningModalPanel = ui.learningModalPanel;
  const learningModalHeader = ui.learningModalHeader;
  const learningModalCloseBtn = ui.learningModalCloseBtn;
  const learningModalTitle = ui.learningModalTitle;
  const learningModalFooter = ui.learningModalFooter;
  const learningModalScrollBody = ui.learningModalScrollBody;
  const learningQuestionBox = ui.learningQuestionBox;
  const learningQuestionText = ui.learningQuestionText;
  const learningExplTitle = ui.learningExplTitle;
  const learningExplBody = ui.learningExplBody;
  const learningPrimaryCloseBtn = ui.learningPrimaryCloseBtn;
  const learningExplainOpenBtn = ui.learningExplainOpenBtn;
  const stepExerciseUi = ui.stepExerciseUi;
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
  const pendingMoledetGeographyTrackMetaRef = useRef(null);
  /** Real topic/operation bucket for the question on screen (avoids stale currentQuestion) */
  const moledetTrackingTopicKeyRef = useRef(null);
  const moledetPendingDiagnosticProbeRef = useRef(null);
  const learningProfileStudentIdRef = useRef(null);
  const learningProfileHydratedRef = useRef(false);
  const [serverAccountSubjectAccuracyPct, setServerAccountSubjectAccuracyPct] = useState(null);
  const [learningProfileHydrationTick, setLearningProfileHydrationTick] = useState(0);
  const scoresStoreRef = useRef({});
  const progressLoadedRef = useRef(false);
  const progressStringRef = useRef("");

  const [mounted, setMounted] = useState(false);

  const transformMoledetGradeKey = useCallback(
    (gradeKey) => clampGradeKeyToVisualStrand(gradeKey, visualStrand),
    [visualStrand]
  );

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
  } = useSubjectSessionDefaults({
    transformGradeKey: transformMoledetGradeKey,
    permissionKey: curriculumSubject,
  });
  const bookIndexHref =
    grade && strandBookGradeSet.has(grade)
      ? getLearningBookIndexHref(strandCatalogSubject, grade)
      : null;
  const [mode, setMode] = useState("practice");

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
  } = useStudentDisplayLevelPractice(MG_SUBJECT);
  const handleDisplayLevelChange = useCallback(
    (nextDisplayLevel) => {
      onDisplayLevelChange(nextDisplayLevel);
      setGameActive(false);
    },
    [onDisplayLevelChange]
  );
  const [operation, setOperation] = useState(() => defaultTopicForVisualStrand(visualStrand));
  const strandTopicsForGrade = useMemo(
    () => filterTopicsForVisualStrand(GRADES[grade]?.topics ?? [], visualStrand),
    [grade, visualStrand]
  );
  const moledetTopicsForGuest = useMemo(
    () => strandTopicsForGrade.filter((t) => t !== "mixed"),
    [strandTopicsForGrade]
  );
  const guestTopics = useGuestPlayableTopics("moledet_geography", moledetTopicsForGuest);
  const bookTopicHref = useMemo(() => {
    if (!strandBookGradeSet.has(grade)) return null;
    return getMoledetGeographyBookHref({ grade, topic: operation, kind: null });
  }, [grade, operation, strandBookGradeSet]);
  const [gameActive, setGameActive] = useState(false);
  const [adaptivePlannerRecommendationView, setAdaptivePlannerRecommendationView] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const bookPracticePresetRef = useRef(null);
  const practiceForceKindRef = useRef(null);
  const practiceForceSkillIdRef = useRef(null);
  const questionBookHref = useMemo(() => {
    if (mode !== "learning" || !currentQuestion) return null;
    if (!strandBookGradeSet.has(grade)) return null;
    const params = currentQuestion.params || {};
    return getMoledetGeographyBookHref({
      grade,
      topic: currentQuestion.topic || currentQuestion.operation || operation,
      kind: params.bookPageId ?? params.subtopicId ?? params.kind ?? null,
      forceKind: params.bookPageId ?? practiceForceKindRef.current,
      pageId: params.bookPageId ?? null,
    });
  }, [grade, mode, currentQuestion, operation]);
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
  const openBookFromLearning = useCallback(
    (href) => {
      if (!href) return;
      if (!strandBookGradeSet.has(grade)) return;
      const snapshot = {
        gameActive: true,
        mode,
        grade,
        gradeNumber,
        displayLevel,
        level,
        operation,
        currentQuestion,
        score,
        streak,
        correct,
        wrong,
        selectedAnswer,
        feedback,
        questionStartTime,
      };
      saveMoledetGeographyBookLearningSnapshot(grade, snapshot);
      router.push(withMoledetGeographyBookLearningReturn(href));
    },
    [
      mode,
      grade,
      gradeNumber,
      displayLevel,
      level,
      operation,
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
    if (!strandBookGradeSet.has(presetGrade)) return;
    const presetTopic = preset.topic || preset.operation;
    if (!presetTopic || typeof preset.forceKind !== "string") return;
    if (!GRADES[presetGrade]?.topics?.includes(presetTopic)) return;
    bookPracticePresetRef.current = preset;
    practiceForceKindRef.current = preset.forceKind || null;
    practiceForceSkillIdRef.current = preset.skillId || null;
    setGrade(presetGrade);
    const presetGradeNumber = gradeKeyToNumber(presetGrade);
    if (presetGradeNumber) {
      setGradeNumber(clampMoledetGeographyGradeNumber(presetGradeNumber));
    }
    setMode("learning");
    setOperation(presetTopic);
  }, []);

  useLearningVisibilityClock({
    enabled: gameActive && isFairnessVisibilityLedgerActive(mode),
    ledger: questionTimeLedgerRef.current,
  });

  const beginMoledetQuestionLedger = useCallback(
    (questionObj) => {
      if (!questionObj) return;
      beginMasterQuestionLedger(questionTimeLedgerRef, {
        subjectId: MG_SUBJECT,
        mode,
        question: questionObj,
      });
    },
    [mode]
  );

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
    homeland: { total: 0, correct: 0 },
    community: { total: 0, correct: 0 },
    citizenship: { total: 0, correct: 0 },
    geography: { total: 0, correct: 0 },
    values: { total: 0, correct: 0 },
    maps: { total: 0, correct: 0 },
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
  const focusedPracticeModeRef = useRef("normal");

  useEffect(() => {
    focusedPracticeModeRef.current = focusedPracticeMode;
  }, [focusedPracticeMode]);

  const applyMoledetTopicCreditFromClosed = useCallback(
    (closed, questionForTrack, metaHint) => {
      if (!closed || closed.creditedSecForTopic <= 0) return;
      const topic =
        moledetTrackingTopicKeyRef.current ??
        questionForTrack?.topic ??
        questionForTrack?.operation ??
        "mixed";
      if (!topic) return;
      trackMoledetGeographyTopicTime(
        topic,
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
              const meta = pendingMoledetGeographyTrackMetaRef.current;
              pendingMoledetGeographyTrackMetaRef.current = null;
              if (meta && meta.mode != null) {
                applyMoledetTopicCreditFromClosed(closed, questionForTrack, {
                  mode: meta.mode,
                  correct: meta.correct,
                  total: meta.total,
                });
              } else {
                applyMoledetTopicCreditFromClosed(closed, questionForTrack);
              }
            }
          : null
      );
      if (questionStartTime) setQuestionStartTime(null);
    },
    [currentQuestion, questionStartTime, applyMoledetTopicCreditFromClosed]
  );

  const accumulateQuestionTime = useCallback(() => {
    closeOpenQuestionLedger(false);
  }, [closeOpenQuestionLedger]);

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
  // No word problems for Moledet & Geography - all topics are text-based
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
    const snap = consumeAnyMoledetGeographyBookLearningSnapshot();
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
    setFeedback(snap.feedback ?? null);
    setQuestionStartTime(
      typeof snap.questionStartTime === "number"
        ? snap.questionStartTime
        : Date.now()
    );
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    if (!isMoledetGeographyBookPracticeEntry(router.query)) return;
    const preset = consumeAnyMoledetGeographyBookPracticePreset();
    if (preset) {
      applyBookPracticePreset(preset);
    }
  }, [router.isReady, router.query, applyBookPracticePreset]);

  useEffect(() => {
    tryConsumeBookContextOnPracticeEntry(
      router,
      { subject: MG_SUBJECT, grade },
      { bookContextRef, bookContextConsumedRef }
    );
  }, [router.isReady, router.query, grade]);

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
        const acc = mapSubjectAccountViewFromStudentProfile(profile, MG_SUBJECT);
        const sub = profile.row.subjects?.[MG_SUBJECT];
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
        const { daily: chDaily, weekly: chWeekly } = pickSubjectChallengeBlobs(ch, MG_SUBJECT);
        if (chDaily) setDailyChallenge(chDaily);
        if (chWeekly) setWeeklyChallenge(chWeekly);
        setServerAccountSubjectAccuracyPct(
          accountAccuracyDisplayFromDerived(profile.derived, MG_SUBJECT)
        );
        const st = profile.row.streaks?.[MG_SUBJECT];
        if (st && typeof st === "object") setDailyStreak(st);
        applyLearningProfileAvatarRowToPlayerState(
          profile.row.profile,
          setPlayerAvatar,
          setPlayerAvatarImage,
          setPlayerAvatarBackground,
        );
        learningProfileHydratedRef.current = true;
        try {
          const pr = profile.row.subjects?.[MG_SUBJECT]?.progressStore?.progress;
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
    debounceStudentLearningProfilePatch("moledet-geography-master-sync", () => {
      const base = {
        subjects: {
          [MG_SUBJECT]: {
            progressStore,
            scoresStore: scoresStoreRef.current,
            mistakes,
            intel: {},
          },
        },
        challenges: subjectChallengePatch(MG_SUBJECT, dailyChallenge, weeklyChallenge),
        streaks: { [MG_SUBJECT]: dailyStreak },
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
      logAccountTileSync(MG_SUBJECT, {
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
    if (practiceForceKindRef.current) return;

    const allowed = strandTopicsForGrade.length ? strandTopicsForGrade : GRADES[grade]?.topics ?? [];
    if (!allowed.includes(operation)) {
      const firstAllowed = allowed.find((topic) => topic !== "mixed") || allowed[0];
      if (firstAllowed) setOperation(firstAllowed);
    }
  }, [grade, strandTopicsForGrade, operation, showMixedSelector]);

  // עדכון mixedOperations לפי הכיתה
  useEffect(() => {
    if (!grade) return;
    const availableTopics = strandTopicsForGrade.filter((topic) => topic !== "mixed");
    const newMixedOps = {};
    availableTopics.forEach(topic => {
      newMixedOps[topic] = true;
    });
    setMixedOperations(newMixedOps);
  }, [grade, strandTopicsForGrade]);

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
        const patchBody = { subjects: { [MG_SUBJECT]: { scoresStore: saved } } };
        void patchStudentLearningProfile(patchBody)
          .then((json) => {
            const acc = accountAccuracyDisplayFromDerived(json?.derived, MG_SUBJECT);
            if (acc != null) setServerAccountSubjectAccuracyPct(acc);
            logAccountTileSync(MG_SUBJECT, {
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
    setGameActive(false);
    moledetTrackingTopicKeyRef.current = null;
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
    setShowSolution(false);
    setShowPreviousSolution(false);
    setPreviousExplanationQuestion(null);
  }

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

    // No word problems for Moledet & Geography - all topics are text-based
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
    const probeAtStart = moledetPendingDiagnosticProbeRef.current;

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

      const probeResultHolder = {};
      const probeOpts =
        probeAtStart &&
        probeMatchesSession(probeAtStart, grade, level, opForQuestion)
          ? {
              pendingProbe: probeAtStart,
              recentIds: recentQuestions,
              resultHolder: probeResultHolder,
              forceKind: practiceForceKindRef.current,
              forceSkillId: practiceForceSkillIdRef.current,
            }
          : {
              forceKind: practiceForceKindRef.current,
              forceSkillId: practiceForceSkillIdRef.current,
            };
      question = generateQuestion(
        levelConfigCopy,
        opForQuestion,
        grade,
        opForQuestion === "mixed" ? mixedOperations : null,
        probeOpts
      );
      if (probeResultHolder.usedProbe && probeAtStart && question && !question.emptyPool) {
        question = attachProbeMetaToQuestion(question, {
          probeSnapshot: probeAtStart,
          probeReason: probeResultHolder.reason,
          expectedErrorTags: Array.isArray(question.params?.expectedErrorTags)
            ? [...question.params.expectedErrorTags]
            : undefined,
        });
      }
      attempts++;

      if (question?.emptyPool) {
        break;
      }

      const questionKey =
        getQuestionFingerprintForSubject(question, "moledet", {
          grade,
          topic: opForQuestion,
        }) ||
        `moledet|${question.question}|${question.correctAnswer}`;

      if (localRecentQuestions.wouldAccept(questionKey)) {
        localRecentQuestions.record(questionKey);
        break;
      }
    } while (attempts < maxAttempts);

    decrementPendingProbeExpiry(moledetPendingDiagnosticProbeRef);
    if (probeAtStart) {
      moledetPendingDiagnosticProbeRef.current = null;
    }

    if (question?.emptyPool) {
      if (
        currentQuestion &&
        Array.isArray(currentQuestion.answers) &&
        currentQuestion.answers.length > 0
      ) {
        trackCurrentQuestionTime();
        setQuestionStartTime(Date.now());
        setSelectedAnswer(null);
        setFeedback(null);
        return;
      }
      setFeedback("אין שאלות בנושא זה כרגע");
      return;
    }

    // עדכון state רק פעם אחת אחרי הלולאה
    if (attempts >= maxAttempts) {
      console.warn(
        `Too many attempts (${attempts}) to generate new question, softening anti-repeat buffer`
      );
      localRecentQuestions.softenOnExhaustion();
    }
    setRecentQuestions(localRecentQuestions.toSet());

    if (currentQuestion) {
      setPreviousExplanationQuestion(currentQuestion);
    }
    moledetTrackingTopicKeyRef.current =
      question.topic || question.operation || "mixed";
    const displayQuestion = tagQuestion(sanitizeQuestionForStudentDisplay(question));
    setCurrentQuestion(displayQuestion);
    setSelectedAnswer(null);
    setFeedback(null);
    setQuestionStartTime(Date.now());
    beginMoledetQuestionLedger(displayQuestion);
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
        const acc = accountAccuracyDisplayFromDerived(p.derived, MG_SUBJECT);
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
          source: "moledet-geography-master",
          version: "phase-2d-b7",
        },
      }).catch(() => {
        notifyLearningSessionSaveFailure(setFeedback, "moledet-geography-master");
      });
      if (includePlannerRecommendation) {
        const cid = (plannerResponseSeqRef.current += 1);
        scheduleAdaptivePlannerRecommendation(
          {
            learningSessionId: sessionIdForFinish,
            subject: MG_SUBJECT,
            grade,
            topic:
              moledetTrackingTopicKeyRef.current ??
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

  function buildMoledetSessionStartPayload() {
    const baseMeta = {
      source: "moledet-geography-master",
      version: "phase-4-display-level",
    };
    const plannerExtra = plannerNextSessionClientMetaRef.current;
    return {
      subject: MG_SUBJECT,
      topic: String(
        moledetTrackingTopicKeyRef.current ||
          currentQuestion?.topic ||
          currentQuestion?.operation ||
          operation ||
          "homeland"
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
    const startPromise = startLearningSession(buildMoledetSessionStartPayload())
      .then((res) => {
        const id = res?.learningSessionId ? String(res.learningSessionId) : "";
        if (!id) return null;
        learningSessionIdRef.current = id;
        return id;
      })
      .catch((error) => {
        console.warn("[moledet-geography-master] session start save failed", error);
        return null;
      })
      .finally(() => {
        learningSessionStartPromiseRef.current = null;
        plannerNextSessionClientMetaRef.current = null;
      });
    learningSessionStartPromiseRef.current = startPromise;
    return startPromise;
  }

  function saveMoledetAnswerInParallel({
    question,
    userAnswer,
    isCorrect,
    timeSpentMs,
    rawTimeSpentMs,
    creditedTimeMs,
    timingStatus,
    usedHint,
  }) {
    const questionFingerprint = question?.id ? String(question.id) : null;
    const questionId = question?.id
      ? String(question.id)
      : questionFingerprint || `moledet-geography-${Date.now()}`;
    const expectedValue =
      question?.correctAnswer != null ? String(question.correctAnswer) : null;
    const questionEngine = question
      ? buildQuestionEngineMetadataFromQuestion(question, {
          selectedValue: userAnswer,
          generatorSource: "moledet-geography-master",
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
          subject: MG_SUBJECT,
          topic: String(question?.topic || question?.operation || operation || "homeland"),
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
            source: "moledet-geography-master",
            version: "phase-4-display-level",
            gradeKey: String(grade || ""),
            afterStepByStep: stepByStepViewedRef.current,
            displayLevel: answerLevelFields.displayLevel,
            sourceDifficulty: answerLevelFields.sourceDifficulty,
            ...buildBookContextClientMetaExtras(mode, {
              bookContextRef,
              bookContextConsumedRef,
            }),
          },
        });
      })
      .catch((error) => {
        console.warn("[moledet-geography-master] answer save failed", error);
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
    setRecentQuestions(new Set()); // איפוס ההיסטוריה
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
    recordSessionProgress();
    setGameActive(false);
    moledetTrackingTopicKeyRef.current = null;
    setCurrentQuestion(null);
    setFeedback(null);
    setSelectedAnswer(null);
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
    moledetTrackingTopicKeyRef.current = null;
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

  function handleAnswer(answer) {
    if (selectedAnswer || !gameActive || !currentQuestion) return;
    const questionForSave = currentQuestion;
    const hintUsedForSave = false;
    const rawMs = questionStartTime ? Math.max(0, Date.now() - questionStartTime) : null;
    const timeSpentMs = rawMs;
    const { rawTimeSpentMs, creditedTimeMs, timingStatus } = computeFreePracticeTiming(rawMs, {
      creditedMs: questionTimeLedgerRef.current ? questionTimeLedgerRef.current.peekCreditedMs() : undefined,
      tierCapMs: questionTimeLedgerRef.current?.tierCapMs,
    });
    if (
      currentQuestion.emptyPool ||
      !Array.isArray(currentQuestion.answers) ||
      currentQuestion.answers.length === 0
    ) {
      return;
    }

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
    const { isCorrect } = compareAnswers({
      mode: "exact_text",
      user: answer,
      expected: currentQuestion.correctAnswer,
      acceptedList: [currentQuestion.correctAnswer],
    });
    applyAnswerAdaptive(isCorrect, { mode: focusedPracticeModeRef.current });
    saveMoledetAnswerInParallel({
      question: questionForSave,
      userAnswer: answer,
      isCorrect,
      timeSpentMs,
      rawTimeSpentMs,
      creditedTimeMs,
      timingStatus,
      usedHint: hintUsedForSave,
    });
    pendingMoledetGeographyTrackMetaRef.current = {
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
      
      clearWrongAnswerAdvanceState();
      setErrorExplanation("");

      // עדכון התקדמות אישית
      const topicKey = currentQuestion.topic || currentQuestion.operation || "homeland";
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
      const newScore = score + points;
      const topicKeyForBadge = topicKey; // משתמש ב-topicKey שכבר הוגדר למעלה
      const opProgress = progress[topicKeyForBadge] || { total: 0, correct: 0 };
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
      } else if (newStreak === 100 && !badges.includes("👑 מלך המולדת")) {
        const newBadge = "👑 מלך המולדת";
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        audio.playSfx("sfx-badge");
        setTimeout(() => setShowBadge(null), 3000);
        saveBadge(newBadge);
      }
      
      // תגים לפי פעולות ספציפיות
      const opName = getOperationName(topicKeyForBadge);
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
      const updatedStreak = updateDailyStreak("mleo_moledet_daily_streak");
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
      const topicKey = currentQuestion.topic || currentQuestion.operation || "homeland";
      const mgPrm = currentQuestion.params || {};
      const ts = Date.now();
      const storedLevel =
        mgPrm.contentPoolLevel != null
          ? mgPrm.contentPoolLevel
          : mgPrm.uiLevel != null
            ? mgPrm.uiLevel
            : level;
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
        level: storedLevel,
        params: { ...mgPrm },
        timestamp: ts,
        storedAt: ts,
        kind: mgPrm.kind != null ? String(mgPrm.kind) : null,
        patternFamily:
          mgPrm.patternFamily != null ? String(mgPrm.patternFamily) : null,
        subtype: mgPrm.subtype != null ? String(mgPrm.subtype) : null,
        distractorFamily:
          mgPrm.distractorFamily != null ? String(mgPrm.distractorFamily) : null,
        conceptTag: mgPrm.conceptTag != null ? String(mgPrm.conceptTag) : null,
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
        const normalized = normalizeMistakeEvent(mistake, "moledet-geography");
        moledetPendingDiagnosticProbeRef.current = buildPendingProbeFromMistake(
          normalized,
          {
            wrongAvoidKey:
              currentQuestion.id != null
                ? String(currentQuestion.id)
                : undefined,
            fallbackTopicId: topicKey,
            fallbackGrade: grade,
            fallbackLevel: level,
          },
          "moledet-geography"
        );
      } catch {
        moledetPendingDiagnosticProbeRef.current = null;
      }
      setMistakes((prev) => {
        const updated = [...prev, mistake].slice(-50); // שמור רק 50 שגיאות אחרונות
        if (typeof window !== "undefined") {
          localStorage.setItem(MOLEDET_GEOGRAPHY_MISTAKES_KEY, JSON.stringify(updated));
        }
        return updated;
      });
      
      const errExpl = getErrorExplanation(
        currentQuestion,
        topicKey,
        answer,
        grade,
        { mode }
      );
      setErrorExplanation(errExpl);
      if (errExpl) stepByStepViewedRef.current = true;
      
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
            setGameActive(false);
            moledetTrackingTopicKeyRef.current = null;
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
        subject: MG_SUBJECT,
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
    logStudentSubjectDashboardDiagnostics(MG_SUBJECT, subjectView, {
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
  // No word problems for Moledet & Geography - all topics are text-based

  const solutionSteps =
    currentQuestion && currentQuestion.operation
      ? getSolutionSteps(currentQuestion, currentQuestion.params?.op || currentQuestion.operation, grade)
      : [];

  const showMobileQuestionActions = Boolean(questionBookHref || canDisplayVertically);

  const verbalVisualLayout = currentQuestion
    ? buildHebrewApprovedVerbalMasterLayout({
        MB,
        questionParts: [
          currentQuestion.question,
          currentQuestion.questionLabel,
          currentQuestion.exerciseText,
        ],
        answers: currentQuestion.answers ?? [],
      })
    : null;

  return (
    <MasterSubjectAccessScreen permissionKey={curriculumSubject} titleHe={pageTitleHe}>
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
          title={pageTitleHe}
          subtitle={`${playerName || "שחקן"} • ${GRADES[grade].name} • ${displayLevelLabel()} • ${getOperationName(operation)} • ${MODES[mode].name}`}
          onBack={backSafe}
          onCurriculumClick={() => router.push(curriculumHref)}
          audio={audio}
        />

        <div className="md:hidden">
          <LearningMasterNavBar
            MB={MB}
            headerRef={headerRef}
            onCurriculumClick={() => router.push(curriculumHref)}
            onBack={backSafe}
            hideCurriculum
            compactHeader
            integratedTopRow
            centerSlot={
              <LearningMasterMobileNavTitle MB={MB} title={pageTitleHe} audio={audio} />
            }
          />
        </div>

        <div
          className={CONTENT_SCROLL_CLASS}
          style={{
            height: "100%",
            maxHeight: "100%",
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
          }}
        >
          <div className={SUBTITLE_ROW_CLASS}>
            <p className={`${MB.pageSub} max-md:leading-none max-md:mb-0`}>
              {playerName || "שחקן"} • {GRADES[grade].name} •{" "}
              {displayLevelLabel()} • {getOperationName(operation)} •{" "}
              {MODES[mode].name}
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
            formatValue={formatMathHudNumber}
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
            <div className={MB.coinBadgeDesktop} title="מטבעות משחק">
              <span className={MB.coinBadgeLabel}>מטבעות:</span>
              <span dir="ltr" className={MB.coinBadgeValue}>
                {childCoinBalance}
              </span>
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
                        id="avatar-image-upload-moledet"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => document.getElementById("avatar-image-upload-moledet").click()}
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
                          <span dir="ltr" style={{ display: 'inline-block' }}>{mistake.question} = {mistake.wrongAnswer}</span> ❌ (נכון: <span dir="ltr" style={{ display: 'inline-block' }}>{mistake.correctAnswer}</span>)
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    setMistakes([]);
                    if (typeof window !== "undefined") {
                      localStorage.setItem(MOLEDET_GEOGRAPHY_MISTAKES_KEY, JSON.stringify([]));
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
                  subject={strandCatalogSubject}
                  grade={grade}
                  testId={`moledet-geography-${grade}-book-index-button`}
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
                    data-testid="moledet-player-name"
                    className={MB.preGamePlayerBadge}
                    dir={playerName && /[\u0590-\u05FF]/.test(playerName) ? "rtl" : "ltr"}
                    title={playerName.trim() ? playerName.trim() : undefined}
                    aria-label={playerName.trim() ? `שם ילד/ה: ${playerName.trim()}` : "שם ילד/ה לא זמין"}
                  >
                    {playerName.trim() ? playerName.trim() : "שחקן"}
                  </div>
                  <select
                    data-testid="moledet-grade-select"
                    value={gradeNumber}
                    title={`כיתה ${["א", "ב", "ג", "ד", "ה", "ו"][gradeNumber - 1]}`}
                    disabled={!canPickGrade}
                    aria-disabled={!canPickGrade || undefined}
                    onChange={(e) => {
                      const newGradeNum = Number(e.target.value);
                      practiceForceKindRef.current = null;
                      practiceForceSkillIdRef.current = null;
                      setGradeNumber(newGradeNum);
                      setGrade(`g${newGradeNum}`);
                      setGameActive(false);
                    }}
                    className={`${MB.selectControl} shrink-0 min-w-0 w-[5.75rem] max-w-[6.25rem] md:w-[6.5rem] md:max-w-[7rem]`}
                  >
                    {[1, 2, 3, 4, 5, 6]
                      .filter((g) => strandGradeNumbers.includes(g))
                      .map((g) => (
                      <option key={g} value={g}>
                        {`כיתה ${["א","ב","ג","ד","ה","ו"][g - 1]}`}
                      </option>
                    ))}
                  </select>
                  <StudentDisplayLevelSelect
                    subjectId={MG_SUBJECT}
                    value={displayLevel}
                    title={displayLevelLabel()}
                    onChange={handleDisplayLevelChange}
                    className={`${MB.selectControl} shrink-0 min-w-0 w-[5rem] max-w-[5.5rem] md:w-[5.75rem] md:max-w-[6.25rem]`}
                  />
                  <div className="flex flex-1 min-w-0 md:flex-none md:max-w-[min(22rem,42vw)] items-center gap-1.5 md:gap-2 shrink">
                    <select
                      ref={operationSelectRef}
                      data-testid="moledet-topic-select"
                      value={operation}
                      title={getOperationName(operation)}
                      onChange={(e) => {
                        const newOp = e.target.value;
                        if (guestTopics.isGuest && guestTopics.isLocked(newOp)) {
                          alert(GUEST_TOPIC_LOCK_MESSAGE_HE);
                          return;
                        }
                        setGameActive(false);
                        practiceForceKindRef.current = null;
                        practiceForceSkillIdRef.current = null;
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
                      {(strandTopicsForGrade.length ? strandTopicsForGrade : []).map((topic) => (
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
                        void fetchStudentLearningProfile()
                          .then((p) => {
                            if (!p?.ok) return;
                            const { daily, weekly } = pickSubjectChallengeBlobs(
                              p.row.challenges,
                              MG_SUBJECT
                            );
                            if (daily) setDailyChallenge(daily);
                            if (weekly) setWeeklyChallenge(weekly);
                            const acc = accountAccuracyDisplayFromDerived(
                              p.derived,
                              MG_SUBJECT
                            );
                            if (acc != null) setServerAccountSubjectAccuracyPct(acc);
                            logAccountTileSync(MG_SUBJECT, { tile: "challengesPrefetch" });
                          })
                          .finally(() => setShowDailyChallenge(true));
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
                  data-testid="moledet-start-game"
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
                  ❓ איך לומדים {VISUAL_STRAND_LABEL_HE[visualStrand] || "כאן"} כאן?
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
                    data-testid={`moledet-geography-${grade}-book-topic-button`}
                    onClick={() => router.push(bookTopicHref)}
                    className={`${MB.btnActionHelp} ${MB.btnActionTeal}`}
                  >
                    הסבר בספר
                  </button>
                ) : null}
                <div className={MB.coinBadgeMobile} title="מטבעות משחק">
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
                                ? MB.feedbackOkAnim
                                : showWrongAnimation
                                ? MB.feedbackBadAnim
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
                            <div className={MB.errorTitle}>למה הטעות קרתה?</div>
                            <div className={MB.errorBody}>{errorExplanation}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {canDisplayVertically ? (
                    <button
                      type="button"
                      onClick={() => setIsVerticalDisplay((prev) => !prev)}
                      className={`${MB.floatBtn} ${MB.floatBtnPurple} ${MB.floatBtnCornerLeft} max-md:hidden pointer-events-auto`}
                      title={isVerticalDisplay ? "הצג מאוזן" : "הצג מאונך"}
                    >
                      {isVerticalDisplay ? "↔️ מאוזן" : "↕️ מאונך"}
                    </button>
                  ) : null}
                  {questionBookHref ? (
                    <div className={`${MB.floatBtnStack} max-md:hidden`}>
                      <button
                        type="button"
                        data-testid={`moledet-geography-${grade}-book-question-button`}
                        onClick={() => openBookFromLearning(questionBookHref)}
                        className={`${MB.floatBtnHelper} ${MB.floatBtnBookColors}`}
                        title="הסבר בספר לנושא הנוכחי"
                      >
                        הסבר
                      </button>
                    </div>
                  ) : null}

                  <div
                    data-testid="moledet-question-stem"
                    className={`${verbalVisualLayout?.questionSlotClassForStem ?? ""} relative ${showMobileQuestionActions ? "max-md:pb-11" : ""}`.trim()}
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
                  
                  {isVerticalDisplay &&
                  canDisplayVertically &&
                  currentQuestion.exerciseText ? (
                    <>
                      {(() => {
                        const displayParts = resolveStudentQuestionDisplayParts({
                          question: currentQuestion.question,
                          questionLabel: currentQuestion.questionLabel,
                          exerciseText: currentQuestion.exerciseText,
                        });
                        return displayParts.leadText ? (
                          <p
                            className={
                              verbalVisualLayout?.questionLeadClassName ??
                              MB.questionLead
                            }
                            dir="rtl"
                            data-testid="student-question-lead"
                            style={{
                              direction: "rtl",
                              unicodeBidi: "plaintext",
                              lineHeight:
                                verbalVisualLayout?.questionLineHeightByPressure,
                              ...getQuestionFontStyle({
                                text: displayParts.leadText,
                              }),
                              ...getVerbalInstructionStyle({
                                text: displayParts.leadText,
                                isMobileViewport,
                                className:
                                  verbalVisualLayout?.questionLeadClassName ??
                                  MB.questionLead,
                              }),
                            }}
                          >
                            {displayParts.leadText}
                          </p>
                        ) : null;
                      })()}
                      <div
                        className="mb-4 flex justify-center w-full max-w-full px-2 overflow-x-hidden"
                        data-testid="student-question-body"
                        dir="ltr"
                      >
                        <pre
                          className={
                            verbalVisualLayout?.verticalPreClassName ??
                            "text-2xl md:text-3xl text-center text-white font-bold font-mono whitespace-pre"
                          }
                          style={{ direction: "ltr", unicodeBidi: "isolate" }}
                        >
                          {getVerticalExercise() || currentQuestion.exerciseText}
                        </pre>
                      </div>
                    </>
                  ) : (
                    <StudentQuestionDisplay
                      question={currentQuestion.question}
                      questionLabel={currentQuestion.questionLabel}
                      exerciseText={currentQuestion.exerciseText}
                      getQuestionFontStyle={getQuestionFontStyle}
                      resolveVerbalSingleStyle={getHebrewApprovedSingleVerbalQuestionStyle}
                      leadClassName={
                        verbalVisualLayout?.questionLeadClassName ?? MB.questionLead
                      }
                      bodyClassName={`${
                        verbalVisualLayout?.questionBodyClassName ?? MB.questionBody
                      } ${
                        currentQuestion.operation === "sequences"
                          ? "whitespace-normal break-words overflow-wrap-anywhere"
                          : ""
                      }`}
                      formulaClassName={MB.questionFormula}
                      leadStyle={{
                        lineHeight: verbalVisualLayout?.questionLineHeightByPressure,
                      }}
                      bodyStyle={{
                        lineHeight: verbalVisualLayout?.questionLineHeightByPressure,
                      }}
                    />
                  )}

                  <LearningMasterMobileQuestionActionDock
                    MB={MB}
                    show={showMobileQuestionActions}
                    testId="moledet-question-mobile-actions"
                    bookSlot={
                      questionBookHref ? (
                        <button
                          type="button"
                          data-testid={`moledet-geography-${grade}-book-question-button`}
                          onClick={() => openBookFromLearning(questionBookHref)}
                          className={`${MB.questionActionBtn} ${MB.floatBtnBookColors}`}
                          title="הסבר בספר לנושא הנוכחי"
                        >
                          הסבר
                        </button>
                      ) : null
                    }
                    secondarySlot={
                      canDisplayVertically ? (
                        <button
                          type="button"
                          onClick={() => setIsVerticalDisplay((prev) => !prev)}
                          className={`${MB.questionActionBtn} ${MB.floatBtnPurple}`}
                          title={isVerticalDisplay ? "הצג מאוזן" : "הצג מאונך"}
                          data-testid="activity-math-layout-toggle"
                        >
                          {isVerticalDisplay ? "↔️ מאוזן" : "↕️ מאונך"}
                        </button>
                      ) : null
                    }
                  />
                  </div>

                  <div className={HEBREW_APPROVED_VERBAL_ANSWER_AREA_CLASS}>
                  <div
                    className={buildHebrewApprovedVerbalMcqGridClassName({
                      useNarrowMobileAnswerFallback:
                        verbalVisualLayout?.useNarrowMobileAnswerFallback,
                      isMobileViewport,
                    })}
                  >
                    {currentQuestion.answers.map((answer, idx) => {
                      const isSelected = selectedAnswer === answer;
                      const { isCorrect: isCorrectChoice } = compareAnswers({
                        mode: "exact_text",
                        user: answer,
                        expected: currentQuestion.correctAnswer,
                        acceptedList: [currentQuestion.correctAnswer],
                      });
                      const isWrong = isSelected && !isCorrectChoice;

                      return (
                        <button
                          key={idx}
                          data-testid={`moledet-mcq-${idx}`}
                          onClick={() => handleAnswer(answer)}
                          disabled={!!selectedAnswer}
                          className={`rounded-xl border-2 transition-all active:scale-95 disabled:opacity-50 ${verbalVisualLayout?.answerCardTextClass ?? ""} ${verbalVisualLayout?.answerCardNarrowClass ?? ""} ${resolveLearningMcqChoiceClassName({
                            MB,
                            isSelected,
                            isCorrectChoice,
                            isWrong,
                            revealResults: selectedAnswer != null,
                          })}`}
                        >
                          {answer}
                        </button>
                      );
                    })}
                  </div>

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
                        // עבור שאלות טקסטואליות - נציג הסבר פשוט
                        const info = buildStepExplanation(explanationQuestion);
                        if (!info) return null;
                        
                        return (
                            <div
                              className={learningModalOverlay}
                              onClick={closeExplanationModal}
                            >
                              <div
                                className={learningModalPanel}
                                onClick={(e) => e.stopPropagation()}
                                style={{ maxWidth: "90vw", maxHeight: "90vh" }}
                              >
                                <div className={learningModalHeader}>
                                  <h3 className={learningModalTitle} dir="rtl">
                                    {showPreviousSolution
                                      ? "פתרון התרגיל הקודם"
                                      : "\u200Fאיך פותרים את התרגיל?"}
                                  </h3>
                                  <button
                                    onClick={closeExplanationModal}
                                    className={learningModalCloseBtn}
                                  >
                                    ✖
                                  </button>
                                </div>
                                
                                <StepExerciseUiProvider value={stepExerciseUi}>
                                <div className={learningModalScrollBody} dir="rtl">
                                  <div className={`mb-3 ${learningQuestionBox}`} dir="ltr">
                                    <div
                                      className={learningQuestionText}
                                      style={{ 
                                        direction: "ltr", 
                                        unicodeBidi: "plaintext",
                                        wordBreak: "break-word",
                                        overflowWrap: "break-word",
                                      }}
                                    >
                                      {info.exercise ||
                                        explanationQuestion.exerciseText ||
                                        explanationQuestion.question}
                                    </div>
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
                                  <div className="space-y-1.5 text-sm" style={{ direction: "rtl", unicodeBidi: "plaintext" }}>
                                    {info.steps.map((step, idx) => (
                                      <div key={idx} className={learningExplBody}>
                                        {step}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                </StepExerciseUiProvider>
                                
                                <div className={learningModalFooter}>
                                  <button
                                    onClick={closeExplanationModal}
                                    className={learningPrimaryCloseBtn}
                                  >
                                    סגור
                                  </button>
                                </div>
                              </div>
                            </div>
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
                  {studentDisplayLevelKeys(MG_SUBJECT).slice().reverse().map((dl) => (
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
                  📘 איך לומדים {VISUAL_STRAND_LABEL_HE[visualStrand]} כאן?
                </h2>

                <p className="text-white/80 text-xs mb-3 text-center">
                  {visualStrand === VISUAL_STRAND_GEOGRAPHY
                    ? "המטרה היא לתרגל גאוגרפיה, מפות ונוף בצורה משחקית, עם התאמה לכיתה, נושא ורמת קושי."
                    : "המטרה היא לתרגל מולדת, חברה ואזרחות בצורה משחקית, עם התאמה לכיתה, נושא ורמת קושי."}
                </p>

                <ul className="list-disc pr-4 space-y-1 text-[13px] text-white/90">
                  <li>
                    {visualStrand === VISUAL_STRAND_GEOGRAPHY
                      ? "בחר כיתה, רמת קושי ונושא (גאוגרפיה, מפות ועוד)."
                      : "בחר כיתה, רמת קושי ונושא (מולדת, חברה, אזרחות, ערכים ועוד)."}
                  </li>
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
                  <h2 className="text-2xl font-extrabold">📚 לוח עזרה ב{VISUAL_STRAND_LABEL_HE[visualStrand]}</h2>
                  <button
                    onClick={() => setShowReferenceModal(false)}
                    className="text-white/80 hover:text-white text-xl px-2"
                  >
                    ✖
                  </button>
                </div>
                <p className="text-sm text-white/70 mb-3">
                  בחר קטגוריה כדי לראות מושגים, עובדות וטיפים חשובים ב{VISUAL_STRAND_LABEL_HE[visualStrand]}.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {strandReferenceKeys.map((key) => (
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
                  {referenceCategory === "homeland" && (
                    <>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">🏠 מולדת</div>
                        <div className="text-sm text-white/80">הארץ שבה נולדנו וחיים בה</div>
                        <div className="text-xs text-white/60 mt-1">ישראל היא המולדת שלנו</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">🏠 סמלים לאומיים</div>
                        <div className="text-sm text-white/80">דגל, המנון, סמל המדינה</div>
                        <div className="text-xs text-white/60 mt-1">דוגמה: דגל ישראל, המנון התקווה</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">🏠 חגים לאומיים</div>
                        <div className="text-sm text-white/80">חגים שמציינים אירועים חשובים במדינה</div>
                        <div className="text-xs text-white/60 mt-1">דוגמה: יום העצמאות, יום הזיכרון</div>
                      </div>
                    </>
                  )}
                  {referenceCategory === "geography" && (
                    <>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">🗺️ יבשות</div>
                        <div className="text-sm text-white/80">שטחי יבשה גדולים על פני כדור הארץ</div>
                        <div className="text-xs text-white/60 mt-1">דוגמה: אסיה, אירופה, אפריקה</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">🗺️ אוקיינוסים</div>
                        <div className="text-sm text-white/80">גופי מים גדולים בין היבשות</div>
                        <div className="text-xs text-white/60 mt-1">דוגמה: האוקיינוס השקט, האוקיינוס האטלנטי</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">🗺️ אקלים</div>
                        <div className="text-sm text-white/80">תנאי מזג האוויר באזור מסוים</div>
                        <div className="text-xs text-white/60 mt-1">דוגמה: אקלים ים תיכוני, אקלים מדברי</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">🗺️ תבליט</div>
                        <div className="text-sm text-white/80">צורת פני השטח של האזור</div>
                        <div className="text-xs text-white/60 mt-1">דוגמה: הרים, עמקים, מישורים</div>
                      </div>
                    </>
                  )}
                  {referenceCategory === "citizenship" && (
                    <>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">👥 אזרחות</div>
                        <div className="text-sm text-white/80">הזכויות והחובות של תושבי המדינה</div>
                        <div className="text-xs text-white/60 mt-1">כל אזרח זכאי לזכויות וחייב בחובות</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">👥 דמוקרטיה</div>
                        <div className="text-sm text-white/80">שיטת ממשל שבה העם בוחר את נציגיו</div>
                        <div className="text-xs text-white/60 mt-1">בישראל יש דמוקרטיה</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">👥 זכויות</div>
                        <div className="text-sm text-white/80">מה שמגיע לכל אדם</div>
                        <div className="text-xs text-white/60 mt-1">דוגמה: זכות לחינוך, זכות לבריאות</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="font-bold text-lg mb-2">👥 חובות</div>
                        <div className="text-sm text-white/80">מה שכל אזרח חייב לעשות</div>
                        <div className="text-xs text-white/60 mt-1">דוגמה: חובת שירות צבאי, תשלום מיסים</div>
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
      subjectId="moledet"
      uiSelection={`operation=${operation}`}
      currentQuestion={currentQuestion}
      trackingRef={moledetTrackingTopicKeyRef}
    />
    </Layout>
    </MasterSubjectAccessScreen>
  );
}

/** Legacy route — same as moledet strand entry. */
export default function MoledetGeographyMasterLegacyRoute() {
  return <MoledetGeographyMasterPage visualStrand={VISUAL_STRAND_MOLEDET} />;
}




