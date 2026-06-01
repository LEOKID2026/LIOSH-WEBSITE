import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Layout from "../../components/Layout";
import { useRouter } from "next/router";
import { useIOSViewportFix } from "../../hooks/useIOSViewportFix";
import {
  BLANK,
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
  getHint,
  getSolutionSteps,
  getErrorExplanation,
  getAdditionStepsColumn,
  buildStepExplanation,
} from "../../utils/math-explanations";
import { trackOperationTime, buildMathReportStorageKey } from "../../utils/math-time-tracking";
import { applyLearningShellLayoutVars } from "../../utils/learning-shell-layout";
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
  learningModalOverlay,
  learningModalPanel,
  learningModalHeader,
  learningModalCloseBtn,
  learningModalTitle,
  learningModalFooter,
  learningStepNavRow,
  learningStepNavBtn,
  learningStepNavBtnPlay,
  learningStepCounter,
  learningQuestionBox,
  learningQuestionText,
  learningExplTitle,
  learningExplBody,
  learningPrimaryCloseBtn,
  learningHintTriggerBtn,
  learningExplainOpenBtn,
} from "../../utils/learning-ui-classes";
import {
  addSessionProgress,
} from "../../utils/progress-storage";
import {
  MONTHLY_MINUTES_TARGET,
} from "../../data/reward-options";
import {
  loadDailyStreak,
  updateDailyStreak,
  getStreakReward,
} from "../../utils/daily-streak";
import { useSound } from "../../hooks/useSound";
import { getQuestionFontStyle } from "../../utils/learning-question-font";
import {
  compareAnswers,
  compareMathLearnerAnswer,
} from "../../utils/answer-compare";
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
import { resolveMathSessionTopic } from "../../lib/learning/session-topic-helpers.js";
import { getMathG1BookHref } from "../../lib/learning-book/resolve-math-g1-book-page";
import { MATH_G1_BOOK_META } from "../../lib/learning-book/math-g1-registry";
import { scheduleAdaptivePlannerRecommendation } from "../../lib/learning-client/scheduleAdaptivePlannerRecommendation";
import { buildPlannerRecommendationViewModel } from "../../lib/learning-client/adaptive-planner-recommendation-view-model";
import {
  buildRecommendedPracticeFromViewModel,
  mapPlannerTargetDifficultyToTriLevel,
  mergePlannerSessionClientMeta,
} from "../../lib/learning-client/adaptive-planner-recommended-practice";
import {
  gradeKeyToNumber,
  normalizeGradeLevelToKey,
} from "../../lib/learning-student-defaults";
import { isStudentIdentityDiagnosticsEnabled } from "../../lib/dev-student-identity-client";
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
import SubjectMonthlyPrizeJourney from "../../components/learning/SubjectMonthlyPrizeJourney";
import { buildDailyMissionsView } from "../../lib/learning-client/dailyMissionsView";
import { fetchStudentHomeProfile } from "../../lib/learning-client/fetchStudentHomeProfile";
import { buildSubjectMonthlyPersistenceViewFromProfile } from "../../lib/learning-client/subjectMonthlyPersistenceView";
import { navigateToStudentHome } from "../../lib/learning-client/navigateToStudentHome";

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
  operations: { label: "פעולות חשבון", icon: "➕" },
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

export default function MathMaster() {
  useIOSViewportFix();
  const router = useRouter();
  const wrapRef = useRef(null);
  const headerRef = useRef(null);
  const gameRef = useRef(null);
  const controlsRef = useRef(null);
  const operationSelectRef = useRef(null);
  const sessionStartRef = useRef(null);
  const solvedCountRef = useRef(0);
  const sessionSecondsRef = useRef(0);
  const learningSessionIdRef = useRef(null);
  const learningSessionStartPromiseRef = useRef(null);
  const plannerResponseSeqRef = useRef(0);
  const plannerNextSessionClientMetaRef = useRef(null);
  const mathPendingDiagnosticProbeRef = useRef(null);
  const mathHypothesisLedgerRef = useRef(null);
  const learningProfileStudentIdRef = useRef(null);
  const learningProfileHydratedRef = useRef(false);
  const [serverAccountSubjectAccuracyPct, setServerAccountSubjectAccuracyPct] = useState(null);
  const [learningProfileHydrationTick, setLearningProfileHydrationTick] = useState(0);
  /** Leaderboard / best-score blob (mirrors legacy STORAGE_KEY JSON). */
  const scoresStoreRef = useRef({});

  const [mounted, setMounted] = useState(false);

  // NEW: grade & mode
  const [gradeNumber, setGradeNumber] = useState(3); // 1 = כיתה א׳, 2 = ב׳, ... 6 = ו׳
  const [grade, setGrade] = useState("g3"); // g1, g2, g3, g4, g5, g6
  const [mode, setMode] = useState("learning");

  const [level, setLevel] = useState("easy");
  const [operation, setOperation] = useState("addition"); // לא mixed כברירת מחדל כדי שה-modal לא יפתח אוטומטית
  const g1BookIndexHref = grade === "g1" ? MATH_G1_BOOK_META.routeBase : null;
  const g1BookTopicHref = useMemo(
    () => getMathG1BookHref({ grade, operation, kind: null }),
    [grade, operation]
  );
  const [gameActive, setGameActive] = useState(false);
  const [adaptivePlannerRecommendationView, setAdaptivePlannerRecommendationView] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const g1QuestionBookHref = useMemo(() => {
    if (grade !== "g1" || mode !== "learning" || !currentQuestion) return null;
    const params = currentQuestion.params || {};
    return getMathG1BookHref({
      grade,
      operation: currentQuestion.operation || operation,
      kind: params.kind ?? null,
    });
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

  // מניעת שאלות חוזרות
  const [recentQuestions, setRecentQuestions] = useState(new Set());

  /** תצוגת תרגיל: מאוזן (ברירת מחדל) / מאונך — רק לסשן הפעיל; לא נשמר בשרת או ב-localStorage קבוע. מתאפס ב־startGame / stopGame / hardResetGame. */
  const [isVerticalDisplay, setIsVerticalDisplay] = useState(false);

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
  const sound = useSound();
  
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

  // רמזים
  const [showHint, setShowHint] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);

  // הסבר מפורט לשאלה
  const [showSolution, setShowSolution] = useState(false);
  const [showPreviousSolution, setShowPreviousSolution] = useState(false);
  const [previousExplanationQuestion, setPreviousExplanationQuestion] = useState(null);
  const [animationStep, setAnimationStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  
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
        ? buildStepExplanation(explanationQuestion)
        : null,
    [isShowingAnySolution, explanationQuestion]
  );

  // בניית צעדי אנימציה
  const animationSteps = useMemo(() => {
    if (!isShowingAnySolution || !explanationQuestion) return null;
    
    const p = explanationQuestion.params || {};
    const op = explanationQuestion.operation;
    let effectiveOp = op;
    let top = p.a ?? explanationQuestion.a;
    let bottom = p.b ?? explanationQuestion.b;
    
    const answer = explanationQuestion.correctAnswer !== undefined
      ? explanationQuestion.correctAnswer
      : explanationQuestion.answer;
    
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
      return buildAdditionOrSubtractionAnimation(top, bottom, answer, effectiveOp);
    }
    
    // שאר הנושאים - אנימציה כללית (רק אם זה לא חיבור/חיסור)
    const built = buildAnimationForOperation(explanationQuestion, op, grade);
    if (built && Array.isArray(built) && built.length > 0) return built;

    // Fallback: אם אין אנימציה מובנית לנושא - עדיין נותנים "צעדים" עם ניווט,
    // על בסיס getSolutionSteps (React nodes) כדי שכל הנושאים יעבדו כמו בכפל.
    try {
      const fallbackSteps = getSolutionSteps(
        explanationQuestion,
        explanationQuestion.params?.op || op,
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
      const qText = explanationQuestion.exerciseText || explanationQuestion.question || "";
      const ansText =
        explanationQuestion.correctAnswer !== undefined
          ? String(explanationQuestion.correctAnswer)
          : (explanationQuestion.answer !== undefined ? String(explanationQuestion.answer) : "");
      return [
        {
          id: "fallback-basic-1",
          title: "שלב 1: נבין את השאלה",
          content: qText ? (
            <span dir="ltr" style={{ unicodeBidi: "plaintext" }}>
              {qText}
            </span>
          ) : (
            <span>נסתכל על התרגיל.</span>
          ),
          text: "",
        },
        { id: "fallback-basic-2", title: "שלב 2: איך ניגשים?", content: <span>{getHint(explanationQuestion, explanationQuestion.params?.op || op, grade) || "נפתור לפי הכללים של הנושא."}</span>, text: "" },
        { id: "fallback-basic-3", title: "שלב 3: התשובה", content: ansText ? <span>התשובה היא: {ansText}</span> : <span>נבדוק את התשובה.</span>, text: "" },
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
    if (animationStep >= animationSteps.length - 1) return;

    const id = setTimeout(() => {
      setAnimationStep((s) => s + 1);
    }, 2000); // 2 שניות בין שלבים
    
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
      setAutoPlay(true);
    } else if (isShowingAnySolution && (!animationSteps || animationSteps.length === 0)) {
      // אם אין אנימציה, נאפס את הצעד
      setAnimationStep(0);
    } else if (!isShowingAnySolution) {
      // כשסוגרים את המודל - ניקוי מלא
      setAnimationStep(0);
      setAutoPlay(true);
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
        applyLearningProfileAvatarRowToPlayerState(profile.row.profile, setPlayerAvatar, setPlayerAvatarImage);
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
  const [leaderboardLevel, setLeaderboardLevel] = useState("easy");
  const [leaderboardData, setLeaderboardData] = useState([]);
  useEffect(() => {
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
    let mounted = true;
    fetch("/api/student/me", { credentials: "same-origin", cache: "no-store" })
      .then((res) => res.json().catch(() => ({})))
      .then((payload) => {
        if (!mounted) return;
        const rawBal = payload?.student?.coin_balance;
        const bal =
          typeof rawBal === "number" && !Number.isNaN(rawBal) ? rawBal : 0;
        setChildCoinBalance(bal);
        if (!payload?.ok || !payload?.student?.id) return;
        const student = payload.student;
        const fullName = String(student.full_name || "").trim();
        if (fullName) {
          setPlayerName(fullName);
          try {
            localStorage.setItem("mleo_player_name", fullName);
          } catch {}
        }
        const gradeKey = normalizeGradeLevelToKey(student.grade_level);
        if (gradeKey) {
          setGrade(gradeKey);
          const gradeNumberFromDb = gradeKeyToNumber(gradeKey);
          if (gradeNumberFromDb) {
            setGradeNumber(gradeNumberFromDb);
          }
        }
        if (isStudentIdentityDiagnosticsEnabled()) {
          console.log("[math-master] GET /api/student/me", {
            id: payload.student?.id,
            fullName: payload.student?.full_name,
            gradeLevel: payload.student?.grade_level,
            debug: payload.debugStudentIdentity,
            fullNameAppliedToState: fullName,
          });
          console.log("[math-master] localStorage after /me handler", {
            liosh_active_student_id: localStorage.getItem("liosh_active_student_id"),
            mleo_player_name: localStorage.getItem("mleo_player_name"),
          });
        }
      })
      .catch(() => {
        if (mounted) setChildCoinBalance(0);
      });
    return () => {
      mounted = false;
    };
  }, []);

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
    // אל תשנה אם ה-modal פתוח
    if (showMixedSelector) return;
    
    const allowed = GRADES[grade].operations;
    if (!allowed.includes(operation)) {
      // מצא את הפעולה הראשונה שזמינה (לא mixed)
      const firstAllowed = allowed.find(op => op !== "mixed") || allowed[0];
      setOperation(firstAllowed);
    }
  }, [grade]); // רק כשהכיתה משתנה, לא כשהפעולה משתנה

  // עדכון mixedOperations לפי הכיתה — כל פעולה זמינה לכיתה מקבלת מפתח (ברירת מחדל: הכל פעיל)
  useEffect(() => {
    const availableOps = GRADES[grade].operations.filter(
      (op) => op !== "mixed"
    );
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
        const topScores = buildTop10ByScore(saved, leaderboardLevel);
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
        applyLearningShellLayoutVars({
          wrapRef,
          headerRef,
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

  // שמירת ריצה נוכחית ל־localStorage + עדכון Best & Leaderboard
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
        const topScores = buildTop10ByScore(saved, leaderboardLevel);
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
    accumulateQuestionTime();
    // Stop background music when game ends
    sound.stopBackgroundMusic();
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

  function closeExplanationModal() {
    setShowSolution(false);
    setShowPreviousSolution(false);
  }

  function openPreviousExplanation() {
    setShowSolution(false);
    setShowPreviousSolution(true);
  }

  const accumulateQuestionTime = useCallback(() => {
    if (!questionStartTime) return;
    const elapsed = Date.now() - questionStartTime;
    if (elapsed <= 0) return;
    sessionSecondsRef.current += Math.min(elapsed, 120_000);
  }, [questionStartTime]);

  function generateNewQuestion() {
    accumulateQuestionTime();
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

          if (questionStartTime) {
            const duration = (Date.now() - questionStartTime) / 1000;
            if (duration > 0 && duration < 300) {
              const baseOp =
                mathTrackingOperationKeyRef.current ?? currentQuestion?.operation;
              const storageKey = buildMathReportStorageKey(baseOp, currentQuestion);
              if (storageKey) {
                trackOperationTime(
                  storageKey,
                  grade,
                  level,
                  duration,
                  {
                    mode: "practice_mistakes",
                    total: 1,
                    correct: undefined,
                    baseOperation: baseOp,
                    kind: currentQuestion?.params?.kind,
                  }
                );
              }
            }
          }

          mathTrackingOperationKeyRef.current = replay.operation;
          if (currentQuestion) setPreviousExplanationQuestion(currentQuestion);
          setCurrentQuestion(replay);
          setSelectedAnswer(null);
          setTextAnswer("");
          setFeedback(null);
          setQuestionStartTime(Date.now());
          setShowHint(false);
          setHintUsed(false);
          closeExplanationModal();
          setErrorExplanation("");
          setMovedCirclesA(0);
          setMovedCirclesB(0);
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

    // מעקב זמן - סיום שאלה קודמת (אם יש)
    if (questionStartTime) {
      const duration = (Date.now() - questionStartTime) / 1000; // שניות
      if (duration > 0 && duration < 300) {
        const meta = pendingTimeTrackMetaRef.current;
        pendingTimeTrackMetaRef.current = null;
        const baseOp =
          mathTrackingOperationKeyRef.current ?? currentQuestion?.operation;
        const storageKey = buildMathReportStorageKey(baseOp, currentQuestion);
        if (storageKey) {
          trackOperationTime(
            storageKey,
            grade,
            level,
            duration,
            meta && meta.mode != null
              ? {
                  mode: meta.mode,
                  correct: meta.correct,
                  total: meta.total,
                  baseOperation: baseOp,
                  kind: currentQuestion?.params?.kind,
                }
              : {
                  mode: reportModeFromGameState(mode, focusedPracticeMode),
                  total: 1,
                  correct: undefined,
                  baseOperation: baseOp,
                  kind: currentQuestion?.params?.kind,
                }
          );
        }
      }
    }

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
    setCurrentQuestion(sanitizeQuestionForStudentDisplay(question));
    setSelectedAnswer(null);
    setTextAnswer("");
    setFeedback(null);
    setQuestionStartTime(Date.now());
    setShowHint(false);
    setHintUsed(false);
    closeExplanationModal();
    setErrorExplanation("");
    // איפוס עיגולים שעברו כשמשנים שאלה
    setMovedCirclesA(0);
    setMovedCirclesB(0);
  }

  function trackCurrentQuestionTime() {
    if (!questionStartTime) return;
    const baseOp =
      mathTrackingOperationKeyRef.current ?? currentQuestion?.operation;
    const storageKey = buildMathReportStorageKey(baseOp, currentQuestion);
    if (!storageKey) return;
    const elapsedMs = Date.now() - questionStartTime;
    if (elapsedMs <= 0) return;
    sessionSecondsRef.current += Math.min(elapsedMs, 120_000);
    const duration = (Date.now() - questionStartTime) / 1000;
    if (duration > 0 && duration < 300) {
      const meta = pendingTimeTrackMetaRef.current;
      pendingTimeTrackMetaRef.current = null;
      trackOperationTime(
        storageKey,
        grade,
        level,
        duration,
        meta && meta.mode != null
          ? {
              mode: meta.mode,
              correct: meta.correct,
              total: meta.total,
              baseOperation: baseOp,
              kind: currentQuestion?.params?.kind,
            }
          : {
              mode: reportModeFromGameState(mode, focusedPracticeMode),
              total: 1,
              correct: undefined,
              baseOperation: baseOp,
              kind: currentQuestion?.params?.kind,
            }
      );
    }
    setQuestionStartTime(null);
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
    const totalSeconds = sessionSecondsRef.current;
    if (totalSeconds <= 0) {
      sessionStartRef.current = null;
      solvedCountRef.current = 0;
      sessionSecondsRef.current = 0;
      return;
    }
    const answered = Math.max(solvedCountRef.current, totalQuestions);
    const totalMinutes = Number((totalSeconds / 60000).toFixed(2));
    const durationSeconds = Math.max(1, Math.round(totalSeconds / 1000));
    const accuracyForFinish =
      answered > 0 ? Math.round((Math.max(0, correct) / answered) * 100) : 0;
    addSessionProgress(
      totalMinutes,
      answered,
      {
        subject: "math",
        topic: mathTrackingOperationKeyRef.current ?? currentQuestion?.operation ?? "",
        grade,
        mode,
        game: "MathMaster",
        date: new Date(),
      },
      { studentId: learningProfileStudentIdRef.current || undefined }
    );
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
      }).catch((error) => {
        console.warn("[math-master] finish session save failed", error);
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
      version: "phase-2d-b2",
    };
    const plannerExtra = plannerNextSessionClientMetaRef.current;
    return {
      subject: "math",
      topic: resolveMathSessionTopic(mathTrackingOperationKeyRef.current || operation),
      mode: reportModeFromGameState(mode, focusedPracticeMode),
      gradeLevel: String(grade || ""),
      level: String(level || ""),
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
    userAnswer,
    isCorrect,
    expectedAnswer,
    prompt,
    questionFingerprint,
    questionId,
    topic,
    timeSpentMs,
    diagnosticProbeMeta,
  }) {
    ensureLearningSessionId()
      .then((learningSessionId) => {
        if (!learningSessionId) return;
        return saveLearningAnswer({
          learningSessionId,
          subject: "math",
          topic,
          questionId,
          questionFingerprint,
          prompt,
          expectedAnswer,
          userAnswer,
          isCorrect,
          hintsUsed: hintUsed ? 1 : 0,
          timeSpentMs,
          gradeLevel: String(grade || ""),
          clientMeta: {
            source: "math-master",
            version: "phase-2d-b2",
            gradeKey: String(grade || ""),
            ...(diagnosticProbeMeta ? { diagnosticProbe: diagnosticProbeMeta } : {}),
          },
        });
      })
      .catch((error) => {
        console.warn("[math-master] answer save failed", error);
      });
  }

  function startGame(opts = {}) {
    if (opts.focusedPracticeMode != null) {
      setFocusedPracticeMode(opts.focusedPracticeMode);
      focusedPracticeModeRef.current = opts.focusedPracticeMode;
    }
    if (opts.fromAdaptivePlannerRecommendedPractice && opts.plannerSessionMeta && typeof opts.plannerSessionMeta === "object") {
      plannerNextSessionClientMetaRef.current = opts.plannerSessionMeta;
      if (opts.appliedLevelKey === "easy" || opts.appliedLevelKey === "medium" || opts.appliedLevelKey === "hard") {
        setLevel(opts.appliedLevelKey);
      }
    } else {
      plannerNextSessionClientMetaRef.current = null;
    }
    recordSessionProgress({ includePlannerRecommendation: false });
    setAdaptivePlannerRecommendationView(null);
    sessionStartRef.current = Date.now();
    solvedCountRef.current = 0;
    sessionSecondsRef.current = 0;
    clearActiveDiagnosticState(
      mathPendingDiagnosticProbeRef,
      mathHypothesisLedgerRef
    );
    setRecentQuestions(new Set()); // איפוס ההיסטוריה
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
    setShowHint(false);
    setHintUsed(false);
    setShowBadge(null);
    setShowLevelUp(false);
    
    // Start background music and play game start sound
    sound.playBackgroundMusic();
    sound.playSound("game-start");
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
    sound.stopBackgroundMusic();
    
    saveRunToStorage();
  }

  function handleTimeUp() {
    // Time up – במצב Challenge או Speed
    recordSessionProgress();
    setWrong((prev) => prev + 1);
    setStreak(0);
      setFeedback("הזמן נגמר! המשחק נגמר! ⏰");
    sound.playSound("game-over");
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
    const questionForSave = currentQuestion;
    const hintUsedForSave = hintUsed;

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
    } = compareMathLearnerAnswer({
      user: answer,
      correctAnswer: currentQuestion.correctAnswer,
      numericTolerance: MATH_NUMERIC_TOLERANCE,
    });
    if (rejectInvalidNumber) {
      setFeedback("נא להזין מספר תקין");
      setTimeout(() => setFeedback(null), 2000);
      return;
    }

    const timeSpentMs = questionStartTime ? Math.max(0, Date.now() - questionStartTime) : null;

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
    saveAnswerInParallel({
      userAnswer: numericAnswer,
      isCorrect,
      expectedAnswer: currentQuestion.correctAnswer,
      prompt: currentQuestion.exerciseText || currentQuestion.question || "",
      questionFingerprint,
      questionId,
      topic: resolvedTopic,
      timeSpentMs,
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
        sound.playSound("badge-earned");
        setTimeout(() => setShowBadge(null), 3000);
        saveBadge(newBadge);
      } else if (newStreak === 25 && !badges.includes("⚡ מהיר כברק")) {
        const newBadge = "⚡ מהיר כברק";
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        sound.playSound("badge-earned");
        setTimeout(() => setShowBadge(null), 3000);
        saveBadge(newBadge);
      } else if (newStreak === 50 && !badges.includes("🌟 אלוף") && !badges.includes("🌟 מאסטר")) {
        const newBadge = "🌟 אלוף";
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        sound.playSound("badge-earned");
        setTimeout(() => setShowBadge(null), 3000);
        saveBadge(newBadge);
      } else if (newStreak === 100 && !badges.includes("👑 מלך החשבון")) {
        const newBadge = "👑 מלך החשבון";
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        sound.playSound("badge-earned");
        setTimeout(() => setShowBadge(null), 3000);
        saveBadge(newBadge);
      }
      
      // תגים לפי פעולות ספציפיות
      const opName = getOperationName(op);
      if (newOpCorrect === 50 && !badges.includes(`🧮 מלך ה${opName}`)) {
        const newBadge = `🧮 מלך ה${opName}`;
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        sound.playSound("badge-earned");
        setTimeout(() => setShowBadge(null), 3000);
        saveBadge(newBadge);
      } else if (newOpCorrect === 100 && !badges.includes(`🏆 גאון ה${opName}`)) {
        const newBadge = `🏆 גאון ה${opName}`;
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        sound.playSound("badge-earned");
        setTimeout(() => setShowBadge(null), 3000);
        saveBadge(newBadge);
      }
      
      // תגים לפי ניקוד
      if (newScore >= 1000 && newScore - points < 1000 && !badges.includes("💎 אלף נקודות")) {
        const newBadge = "💎 אלף נקודות";
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        sound.playSound("badge-earned");
        setTimeout(() => setShowBadge(null), 3000);
        saveBadge(newBadge);
      } else if (newScore >= 5000 && newScore - points < 5000 && !badges.includes("🎯 חמשת אלפים")) {
        const newBadge = "🎯 חמשת אלפים";
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        sound.playSound("badge-earned");
        setTimeout(() => setShowBadge(null), 3000);
        saveBadge(newBadge);
      }
      
      // תגים לפי מספר תשובות נכונות
      if (newCorrect === 100 && correct < 100 && !badges.includes("⭐ מאה תשובות נכונות")) {
        const newBadge = "⭐ מאה תשובות נכונות";
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        sound.playSound("badge-earned");
        setTimeout(() => setShowBadge(null), 3000);
        saveBadge(newBadge);
      } else if (newCorrect === 500 && correct < 500 && !badges.includes("🌟 חמש מאות תשובות")) {
        const newBadge = "🌟 חמש מאות תשובות";
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        sound.playSound("badge-earned");
        setTimeout(() => setShowBadge(null), 3000);
        saveBadge(newBadge);
      }

      // מערכת XP ורמות
      const xpGain = hintUsed ? 5 : 10; // פחות XP אם השתמש ברמז
      setXp((prev) => {
        const newXp = prev + xpGain;
        const xpNeeded = playerLevel * 100;
        
        if (newXp >= xpNeeded) {
          setPlayerLevel((prevLevel) => {
            const newLevel = prevLevel + 1;
            setShowLevelUp(true);
            sound.playSound("level-up");
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
        sound.playSound("streak");
      } else {
        sound.playSound("correct");
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
      }, 1000);
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
      
      setErrorExplanation(
        getErrorExplanation(
          currentQuestion,
          currentQuestion.operation,
          numericAnswer,
          grade
        )
      );
      
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
      sound.playSound("wrong");
      
      if ("vibrate" in navigator) navigator.vibrate?.(200);

      if (mode === "learning") {
        // במצב למידה – אין Game Over, רק הצגת תשובה והמשך
        setFeedback(
          `לא נכון 😔 התשובה הנכונה: \u2066${currentQuestion.correctAnswer}\u2069 ✅`
        );
        setTimeout(() => {
          generateNewQuestion();
          setSelectedAnswer(null);
          setTextAnswer("");
          solvedCountRef.current += 1;
          setFeedback(null);
          setTimeLeft(null);
        }, 2000);
      } else if (mode === "challenge") {
        // מצב Challenge – עובדים עם חיים
        setFeedback(
          `לא נכון 😔 התשובה: \u2066${currentQuestion.correctAnswer}\u2069 ❌ (-1 ❤️)`
        );
        setLives((prevLives) => {
          const nextLives = prevLives - 1;

          if (nextLives <= 0) {
            // Game Over
            setFeedback("Game Over! 💔");
            sound.playSound("game-over");
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
            setTimeout(() => {
              generateNewQuestion();
              setSelectedAnswer(null);
              setTextAnswer("");
              setFeedback(null);
              setTimeLeft(20);
            }, 1500);
          }

          return nextLives;
        });
      } else {
        // מצבי speed / marathon / practice - לא יוצאים מהמשחק על טעות
        setFeedback(
          `לא נכון 😔 התשובה הנכונה: \u2066${currentQuestion.correctAnswer}\u2069 ❌`
        );
        setTimeout(() => {
          generateNewQuestion();
          setSelectedAnswer(null);
          setTextAnswer("");
          setFeedback(null);
          if (mode === "speed") {
            setTimeLeft(10);
          } else {
            setTimeLeft(null);
          }
        }, 1500);
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
    navigateToStudentHome(router);
  };

  const getOperationName = (op) => {
    switch (op) {
      case "addition":
        return "חיבור";
      case "subtraction":
        return "חיסור";
      case "multiplication":
        return "כפל";
      case "division":
        return "חילוק";
      case "division_with_remainder":
        return "חילוק עם שארית";
      case "fractions":
        return "שברים";
      case "percentages":
        return "אחוזים";
      case "sequences":
        return "סדרות";
      case "decimals":
        return "עשרוניים";
      case "rounding":
        return "עיגול";
      case "divisibility":
        return "סימני התחלקות";
      case "prime_composite":
        return "מספרים ראשוניים ופריקים";
      case "powers":
        return "חזקות";
      case "ratio":
        return "יחס";
      case "equations":
        return "משוואות";
      case "order_of_operations":
        return "סדר פעולות";
      case "zero_one_properties":
        return "תכונות ה-0 וה-1";
      case "estimation":
        return "אומדן";
      case "scale":
        return "קנה מידה";
      case "compare":
        return "השוואה";
      case "number_sense":
        return "חוש מספרים";
      case "factors_multiples":
        return "גורמים וכפולות";
      case "word_problems":
        return "בעיות מילוליות";
      case "mixed":
        return "ערבוב";
      default:
        return op;
    }
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
          goalMinutes: monthlyPersistenceView?.goalMinutes ?? MONTHLY_MINUTES_TARGET,
          yearMonth: monthlyPersistenceView?.yearMonthIsrael ?? "",
          selectedRewardKey: null,
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

  if (!mounted)
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0f1d] to-[#141928] flex items-center justify-center">
        <div className="text-white text-xl">טוען...</div>
      </div>
    );

  const accuracy =
    totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
  const gradeSupportsWordProblems = GRADES[grade].operations.includes("word_problems");

  // עוטף ביטויים מתמטיים (עם אופרטורים) בתוך טקסט עברי כדי שיוצגו משמאל לימין.
  // לדוגמה: "12 = 1 + 6 + 5" אחרת זה מתהפך בגלל RTL.
  const renderMathLTRInText = (text) => {
    if (!text || typeof text !== "string") return text;

    // רצף שמכיל ספרות + לפחות אופרטור אחד (כולל / או %), כדי להציג אותו ב-LTR.
    const re =
      /(\d[\d\s.,]*\s*(?:%|(?:\/\s*\d)|[+\-−×÷=])\s*[\d\s.,]+(?:\s*(?:%|(?:\/\s*\d)|[+\-−×÷=])\s*[\d\s.,]+)*)/g;

    const parts = text.split(re);
    if (parts.length === 1) return text;

    const needsLeadingSpace = (prevText) => {
      if (!prevText) return false;
      return !/[\s([\u200f\u200e]$/.test(prevText) && !/[—–-]$/.test(prevText);
    };
    const needsTrailingSpace = (nextText) => {
      if (!nextText) return false;
      return !/^[\s).,;:!?]/.test(nextText);
    };

    return parts.map((part, idx) => {
      if (idx % 2 === 1) {
        const prev = parts[idx - 1] ?? "";
        const next = parts[idx + 1] ?? "";
        const addBefore = needsLeadingSpace(prev);
        const addAfter = needsTrailingSpace(next);

        return (
          <span key={`mwrap-${idx}`}>
            {addBefore ? " " : ""}
            <span dir="ltr" style={{ unicodeBidi: "plaintext" }}>
              {part}
            </span>
            {addAfter ? " " : ""}
          </span>
        );
      }
      return <span key={`t-${idx}`}>{part}</span>;
    });
  };

  // ✅ טקסט רמז והסבר מלא לשאלה הנוכחית
  const hintText =
    currentQuestion && currentQuestion.operation
      ? getHint(currentQuestion, currentQuestion.operation, grade)
      : "";

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

  // חלונות תשובה (כפתורים/קלט) – מקטינים ב-20% רק ויזואלית, בלי להזיז layout
  const ANSWER_AREA_SCALE = 0.8;

  // תשובות עם מלל – מקטינים את האותיות בתוך הכפתור כמו בשאלות מילוליות
  const renderAnswerLabel = (ans) => {
    const s = typeof ans === "string" ? ans : String(ans ?? "");
    const mathyPlain =
      typeof ans === "string" &&
      (/^\d+\s*\/\s*\d+/.test(s) ||
        /\d\s*\/\s*\d/.test(s) ||
        (/[0-9]/.test(s) && /[+\-×÷*/=√π²³]/.test(s)));
    if (hasLetters(s)) {
      return (
        <span
          style={{
            display: "inline-block",
            transform: `scale(${QUESTION_TEXT_SCALE})`,
            transformOrigin: "center center",
            ...learningMixedHebrewMathStyle,
          }}
        >
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
    return ans;
  };

  return (
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
      <div className="flex flex-col h-dvh max-h-dvh min-h-0 overflow-hidden bg-gradient-to-b from-[#0a0f1d] to-[#141928]" dir="rtl">
        <div
          ref={wrapRef}
          className="relative overflow-hidden game-page-mobile learning-master-fill flex flex-col flex-1 min-h-0 w-full max-md:pl-0 max-md:pr-0 md:pl-[clamp(8px,2vw,32px)] md:pr-[clamp(8px,2vw,32px)]"
          style={{
            maxWidth: "1200px",
            width: "min(1200px, 100vw)",
            paddingTop: "clamp(12px, 3vw, 32px)",
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

        <div
          ref={headerRef}
          className="absolute top-0 left-0 right-0 z-50 pointer-events-none"
        >
          <div
            className="relative px-2 py-3"
            style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)" }}
          >
            <div className="absolute right-2 top-2 flex gap-2 pointer-events-auto">
              <button
                onClick={() => router.push("/learning/curriculum?subject=math")}
                className="min-w-[100px] px-3 py-1 rounded-lg text-sm font-bold bg-emerald-500/20 border border-emerald-400/30 hover:bg-emerald-500/30 text-emerald-200"
              >
                📋 תוכנית לימודים
              </button>
            </div>
            <div className="absolute left-2 top-2 pointer-events-auto">
              <button
                onClick={backSafe}
                className="min-w-[60px] px-3 py-1 rounded-lg text-sm font-bold bg-white/5 border border-white/10 hover:bg-white/10"
              >
                חזרה
              </button>
            </div>
          </div>
        </div>

        <div
          className="relative flex flex-1 min-h-0 flex-col items-center justify-start px-2 md:px-4 overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch]"
          style={{
            height: "100%",
            maxHeight: "100%",
            paddingTop: "calc(var(--head-h, 56px) + 8px)",
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
          }}
        >
          <div className="text-center mb-3">
            <div className="flex items-center justify-center gap-2 mb-0.5">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white">
                🧮 חשבון
              </h1>
              <button
                onClick={() => {
                  sound.toggleSounds();
                  sound.toggleMusic();
                }}
                className={`h-7 w-7 rounded-lg border border-white/20 text-white text-sm font-bold flex items-center justify-center transition-all flex-shrink-0 ${
                  sound.soundsEnabled && sound.musicEnabled
                    ? "bg-green-500/80 hover:bg-green-500"
                    : "bg-red-500/80 hover:bg-red-500"
                }`}
                title={sound.soundsEnabled && sound.musicEnabled ? "השתק צלילים" : "הפעל צלילים"}
              >
                {sound.soundsEnabled && sound.musicEnabled ? "🔊" : "🔇"}
              </button>
            </div>
            <p className="text-white/70 text-xs md:text-sm">
              {playerName || "שחקן"} • {GRADES[grade].name} •{" "}
              {LEVELS[level].name} • {getOperationName(operation)} •{" "}
              {MODES[mode].name}
            </p>
          </div>

          <div
            ref={controlsRef}
            className="mx-auto grid grid-cols-8 gap-0.5 md:gap-1 lg:gap-1.5 mb-3 w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl"
          >
            <div className="bg-black/30 border border-white/10 rounded-lg py-1.5 px-0.5 md:py-2 md:px-1 lg:px-1.5 text-center flex flex-col items-stretch justify-start min-h-[50px] md:min-h-[58px] lg:min-h-[62px]">
              <div className="flex shrink-0 items-center justify-center mb-0.5 md:mb-1 md:min-h-[26px] lg:min-h-[28px] px-0.5">
                <div className="text-[9px] md:text-[12px] lg:text-sm text-white/78 md:text-white/85 lg:text-white/90 leading-tight">ניקוד</div>
              </div>
              <div className="flex flex-1 items-center justify-center min-h-0">
                <div className="text-sm md:text-lg lg:text-xl font-bold text-emerald-300 md:text-emerald-300 lg:text-emerald-200 leading-tight">
                  {subjectView.topHud.score}
                </div>
              </div>
            </div>
            <div className="bg-black/30 border border-white/10 rounded-lg py-1.5 px-0.5 md:py-2 md:px-1 lg:px-1.5 text-center flex flex-col items-stretch justify-start min-h-[50px] md:min-h-[58px] lg:min-h-[62px]">
              <div className="flex shrink-0 items-center justify-center mb-0.5 md:mb-1 md:min-h-[26px] lg:min-h-[28px] px-0.5">
                <div className="text-[9px] md:text-[12px] lg:text-sm text-white/78 md:text-white/85 lg:text-white/90 leading-tight">רצף</div>
              </div>
              <div className="flex flex-1 items-center justify-center min-h-0">
                <div className="text-sm md:text-lg lg:text-xl font-bold text-amber-300 md:text-amber-300 lg:text-amber-200 leading-tight">
                  🔥{subjectView.topHud.streak}
                </div>
              </div>
            </div>
            <div className="bg-black/30 border border-white/10 rounded-lg py-1.5 px-0.5 md:py-2 md:px-1 lg:px-1.5 text-center flex flex-col items-stretch justify-start min-h-[50px] md:min-h-[58px] lg:min-h-[62px]">
              <div className="flex shrink-0 items-center justify-center mb-0.5 md:mb-1 md:min-h-[26px] lg:min-h-[28px] px-0.5">
                <div className="text-[9px] md:text-[12px] lg:text-sm text-white/78 md:text-white/85 lg:text-white/90 leading-tight">כוכבים</div>
              </div>
              <div className="flex flex-1 items-center justify-center min-h-0">
                <div className="text-sm md:text-lg lg:text-xl font-bold text-yellow-300 md:text-yellow-300 lg:text-yellow-200 leading-tight">⭐{subjectView.topHud.stars}</div>
              </div>
            </div>
            <div className="bg-black/30 border border-white/10 rounded-lg py-1.5 px-0.5 md:py-2 md:px-1 lg:px-1.5 text-center flex flex-col items-stretch justify-start min-h-[50px] md:min-h-[58px] lg:min-h-[62px]">
              <div className="flex shrink-0 items-center justify-center mb-0.5 md:mb-1 md:min-h-[26px] lg:min-h-[28px] px-0.5">
                <div className="text-[9px] md:text-[12px] lg:text-sm text-white/78 md:text-white/85 lg:text-white/90 leading-tight">רמה</div>
              </div>
              <div className="flex flex-1 items-center justify-center min-h-0">
                <div className="text-sm md:text-lg lg:text-xl font-bold text-purple-300 md:text-purple-300 lg:text-purple-200 leading-tight">רמה {subjectView.topHud.level}</div>
              </div>
            </div>
            <div className="bg-black/30 border border-white/10 rounded-lg py-1.5 px-0.5 md:py-2 md:px-1 lg:px-1.5 text-center flex flex-col items-stretch justify-start min-h-[50px] md:min-h-[58px] lg:min-h-[62px]">
              <div className="flex shrink-0 items-center justify-center mb-0.5 md:mb-1 md:min-h-[26px] lg:min-h-[28px] px-0.5">
                <div className="text-[9px] md:text-[12px] lg:text-sm text-white/78 md:text-white/85 lg:text-white/90 leading-tight">✅</div>
              </div>
              <div className="flex flex-1 items-center justify-center min-h-0">
                <div className="text-sm md:text-lg lg:text-xl font-bold text-green-300 md:text-green-300 lg:text-green-200 leading-tight">
                  {subjectView.topHud.correct}
                </div>
              </div>
            </div>
            <div className="bg-black/30 border border-white/10 rounded-lg py-1.5 px-0.5 md:py-2 md:px-1 lg:px-1.5 text-center flex flex-col items-stretch justify-start min-h-[50px] md:min-h-[58px] lg:min-h-[62px]">
              <div className="flex shrink-0 items-center justify-center mb-0.5 md:mb-1 md:min-h-[26px] lg:min-h-[28px] px-0.5">
                <div className="text-[9px] md:text-[12px] lg:text-sm text-white/78 md:text-white/85 lg:text-white/90 leading-tight">חיים</div>
              </div>
              <div className="flex flex-1 items-center justify-center min-h-0">
                <div className="text-sm md:text-lg lg:text-xl font-bold text-rose-300 md:text-rose-300 lg:text-rose-200 leading-tight">
                  {mode === "challenge" ? `${lives} ❤️` : "∞"}
                </div>
              </div>
            </div>
            <div
              className={`rounded-lg py-1.5 px-0.5 md:py-2 md:px-1 lg:px-1.5 text-center flex flex-col items-stretch justify-start min-h-[50px] md:min-h-[58px] lg:min-h-[62px] ${
                gameActive && (mode === "challenge" || mode === "speed") && timeLeft <= 5
                  ? "bg-red-500/30 border-2 border-red-400 animate-pulse"
                  : "bg-black/30 border border-white/10"
              }`}
            >
              <div className="flex shrink-0 items-center justify-center mb-0.5 md:mb-1 md:min-h-[26px] lg:min-h-[28px] px-0.5">
                <div className="text-[9px] md:text-[12px] lg:text-sm text-white/78 md:text-white/85 lg:text-white/90 leading-tight">⏰ טיימר</div>
              </div>
              <div className="flex flex-1 items-center justify-center min-h-0">
                <div
                  className={`text-sm md:text-lg lg:text-xl font-black leading-tight ${
                    gameActive && (mode === "challenge" || mode === "speed") && timeLeft <= 5
                      ? "text-red-400"
                      : gameActive && (mode === "challenge" || mode === "speed")
                      ? "text-yellow-400"
                      : "text-white/78 md:text-white/85 lg:text-white/90"
                  }`}
                >
                  {gameActive
                    ? mode === "challenge" || mode === "speed"
                      ? timeLeft ?? "--"
                      : "∞"
                    : "--"}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowPlayerProfile(true)}
              className="bg-black/30 border border-white/10 rounded-lg py-1.5 px-0.5 md:py-2 md:px-1 lg:px-1.5 text-center flex flex-col items-stretch justify-start min-h-[50px] md:min-h-[58px] lg:min-h-[62px] hover:bg-purple-500/20 transition-all cursor-pointer"
              title="פרופיל שחקן"
            >
              <div className="flex shrink-0 items-center justify-center mb-0.5 md:mb-1 md:min-h-[26px] lg:min-h-[28px] px-0.5">
                <div className="text-[9px] md:text-[12px] lg:text-sm text-white/78 md:text-white/85 lg:text-white/90 leading-tight">אווטר</div>
              </div>
              <div className="flex flex-1 items-center justify-center min-h-0">
                <div className="text-lg md:text-2xl lg:text-3xl font-bold leading-tight">
                  {playerAvatarImage ? (
                    <img 
                      src={playerAvatarImage} 
                      alt="אווטר" 
                      className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 rounded-full object-cover mx-auto"
                    />
                  ) : (
                    playerAvatar
                  )}
                </div>
              </div>
            </button>
          </div>

          {/* בחירת מצב (Learning / Challenge) */}
          <div
            className="mx-auto flex items-center justify-center gap-1.5 md:gap-2.5 lg:gap-3 mb-3 md:mb-4 w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl flex-wrap px-1 md:px-2"
            dir="rtl"
          >
            {["learning", "challenge", "speed", "marathon"].map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setGameActive(false);
                  setFeedback(null);
                }}
                className={`h-8 md:h-10 lg:h-11 px-3 md:px-4 lg:px-5 rounded-lg text-xs md:text-sm lg:text-base font-bold transition-all flex-shrink-0 ${
                  mode === m
                    ? "bg-emerald-500/80 text-white"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                {MODES[m].name}
              </button>
            ))}
            <div className="inline-flex items-center gap-1.5 md:gap-2.5 lg:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setMode("practice");
                  setGameActive(false);
                  setFeedback(null);
                }}
                className={`h-8 md:h-10 lg:h-11 px-3 md:px-4 lg:px-5 rounded-lg text-xs md:text-sm lg:text-base font-bold transition-all flex-shrink-0 ${
                  mode === "practice"
                    ? "bg-emerald-500/80 text-white"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                {MODES.practice.name}
              </button>
              <div
                className="hidden md:inline-flex items-center justify-center gap-1.5 md:gap-2 shrink-0 rounded-lg border border-amber-400/45 bg-black/35 md:h-10 lg:h-11 md:px-4 lg:px-5 md:text-sm lg:text-base font-bold tabular-nums shadow-sm"
                title="מטבעות משחק"
              >
                <span className="text-white">מטבעות:</span>
                <span dir="ltr" className="text-amber-100">
                  {childCoinBalance}
                </span>
              </div>
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
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4"
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
                      <div className="text-4xl">
                        {playerAvatarImage ? (
                          <img 
                            src={playerAvatarImage} 
                            alt="אווטר" 
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          playerAvatar
                        )}
                      </div>
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
                    </div>
                  </div>
                  
                  {/* Monthly Progress */}
                  <div className="bg-black/30 border border-white/10 rounded-lg p-3">
                    <div className="text-sm text-white/60 mb-2">התקדמות חודשית</div>
                    <div className="flex justify-between text-xs text-white/60 mb-1">
                      <span>{Math.round(monthlyPersistenceView?.currentMinutes ?? 0)} / {MONTHLY_MINUTES_TARGET} דק׳</span>
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
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4"
              onClick={() => setShowPracticeOptions(false)}
              dir="rtl"
            >
              <div
                className="bg-gradient-to-br from-[#080c16] to-[#0a0f1d] border-2 border-white/20 rounded-2xl p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-2xl font-extrabold text-white mb-4 text-center">
                  🎯 תרגול ממוקד
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
                      התחל קל והתקדם לקשה יותר
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
            <div className="flex flex-col flex-1 min-h-0 w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl items-center justify-start md:gap-1">
              <div className="w-full flex justify-center mb-3 md:mb-4 overflow-x-auto [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] px-0.5">
                <div
                  className="inline-flex flex-nowrap items-center justify-center gap-2 md:gap-2.5 lg:gap-3 w-max max-w-full min-w-0"
                  dir="rtl"
                >
                <div
                  data-testid="math-player-name"
                  className="h-10 md:h-11 shrink-0 w-[3.5rem] md:w-[8.5rem] lg:w-[9.25rem] px-1.5 md:px-3 lg:px-3.5 rounded-lg bg-black/30 border border-white/20 text-white text-xs md:text-sm font-bold box-border flex items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap select-none pointer-events-none min-w-0"
                  dir={playerName && /[\u0590-\u05FF]/.test(playerName) ? "rtl" : "ltr"}
                  title={playerName.trim() ? playerName.trim() : undefined}
                  aria-label={playerName.trim() ? `שם תלמיד: ${playerName.trim()}` : "שם תלמיד לא זמין"}
                >
                  {playerName.trim() ? playerName.trim() : "שחקן"}
                </div>
                <select
                  data-testid="math-grade-select"
                  value={gradeNumber}
                  title={`כיתה ${["א", "ב", "ג", "ד", "ה", "ו"][gradeNumber - 1]}`}
                  onChange={(e) => {
                    const newGradeNum = Number(e.target.value);
                    setGradeNumber(newGradeNum);
                    setGrade(`g${newGradeNum}`);
                    setGameActive(false);
                  }}
                  className="h-10 md:h-11 shrink-0 min-w-0 w-[5.75rem] max-w-[6.25rem] md:w-[6.5rem] md:max-w-[7rem] rounded-lg bg-black/30 border border-white/20 text-white text-xs md:text-sm font-bold px-2 box-border overflow-hidden text-ellipsis whitespace-nowrap"
                >
                  {[1, 2, 3, 4, 5, 6].map((g) => (
                    <option key={g} value={g}>
                      {`כיתה ${["א","ב","ג","ד","ה","ו"][g - 1]}`}
                    </option>
                  ))}
                </select>
                <select
                  value={level}
                  title={LEVELS[level]?.name}
                  onChange={(e) => {
                    setLevel(e.target.value);
                    setGameActive(false);
                  }}
                  className="h-10 md:h-11 shrink-0 min-w-0 w-[5rem] max-w-[5.5rem] md:w-[5.75rem] md:max-w-[6.25rem] rounded-lg bg-black/30 border border-white/20 text-white text-xs md:text-sm font-bold px-2 box-border overflow-hidden text-ellipsis whitespace-nowrap"
                >
                  {Object.keys(LEVELS).map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {LEVELS[lvl].name}
                    </option>
                  ))}
                </select>
                <div className="flex flex-1 min-w-0 md:flex-none md:max-w-[min(22rem,42vw)] items-center gap-1.5 md:gap-2 shrink">
                  <select
                    ref={operationSelectRef}
                    data-testid="math-operation-select"
                    value={operation}
                    title={getOperationName(operation)}
                    onChange={(e) => {
                      const newOp = e.target.value;
                      setGameActive(false);
                      if (newOp === "mixed") {
                        setOperation(newOp);
                        setShowMixedSelector(true);
                      } else {
                        setOperation(newOp);
                        setShowMixedSelector(false);
                      }
                    }}
                    className="h-10 md:h-11 min-w-0 w-full md:w-[min(22rem,42vw)] md:max-w-[22rem] rounded-lg bg-black/30 border border-white/20 text-white text-xs md:text-sm font-bold px-2 box-border overflow-hidden text-ellipsis whitespace-nowrap"
                  >
                    {GRADES[grade].operations.map((op) => (
                      <option key={op} value={op}>
                        {getOperationName(op)}
                      </option>
                    ))}
                  </select>
                  {operation === "mixed" && (
                    <button
                      type="button"
                      onClick={() => setShowMixedSelector(true)}
                      className="h-10 w-10 md:h-11 md:w-11 shrink-0 rounded-lg bg-blue-500/80 hover:bg-blue-500 border border-white/20 text-white text-sm md:text-base font-bold flex items-center justify-center box-border"
                      title="ערוך פעולות למיקס"
                    >
                      ⚙️
                    </button>
                  )}
                </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5 md:gap-2 lg:gap-2.5 mb-3 md:mb-4 w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto" dir="rtl">
                <div className="bg-black/25 border border-white/15 rounded-lg md:rounded-xl px-1 py-2 md:px-2 md:py-3 min-h-[4.5rem] md:min-h-[5.25rem] lg:min-h-[5.75rem] flex flex-col items-stretch justify-start gap-1 md:gap-1.5 min-w-0 shadow-sm">
                  <div className="flex shrink-0 items-center justify-center md:min-h-[28px] lg:min-h-[30px] px-0.5">
                    <span className="text-[10px] md:text-[13px] lg:text-sm text-white/78 md:text-white/85 lg:text-white/90 text-center leading-tight max-w-full line-clamp-2">שיא ניקוד</span>
                  </div>
                  <div className="flex flex-1 items-center justify-center min-h-0">
                    <span className="text-base md:text-xl lg:text-2xl font-bold text-emerald-300 md:text-emerald-300 lg:text-emerald-200 tabular-nums leading-tight">{subjectView.middleTiles.bestScore}</span>
                  </div>
                </div>
                <div className="bg-black/25 border border-white/15 rounded-lg md:rounded-xl px-1 py-2 md:px-2 md:py-3 min-h-[4.5rem] md:min-h-[5.25rem] lg:min-h-[5.75rem] flex flex-col items-stretch justify-start gap-1 md:gap-1.5 min-w-0 shadow-sm">
                  <div className="flex shrink-0 items-center justify-center md:min-h-[28px] lg:min-h-[30px] px-0.5">
                    <span className="text-[10px] md:text-[13px] lg:text-sm text-white/78 md:text-white/85 lg:text-white/90 text-center leading-tight max-w-full line-clamp-2">שיא רצף</span>
                  </div>
                  <div className="flex flex-1 items-center justify-center min-h-0">
                    <span className="text-base md:text-xl lg:text-2xl font-bold text-amber-300 md:text-amber-300 lg:text-amber-200 tabular-nums leading-tight">{subjectView.middleTiles.bestStreak}</span>
                  </div>
                </div>
                <div className="bg-black/25 border border-white/15 rounded-lg md:rounded-xl px-1 py-2 md:px-2 md:py-3 min-h-[4.5rem] md:min-h-[5.25rem] lg:min-h-[5.75rem] flex flex-col items-stretch justify-start gap-1 md:gap-1.5 min-w-0 shadow-sm">
                  <div className="flex shrink-0 items-center justify-center md:min-h-[28px] lg:min-h-[30px] px-0.5">
                    <span className="text-[10px] md:text-[13px] lg:text-sm text-white/78 md:text-white/85 lg:text-white/90 text-center leading-tight max-w-full line-clamp-2">דיוק</span>
                  </div>
                  <div className="flex flex-1 items-center justify-center min-h-0">
                    <span className="text-base md:text-xl lg:text-2xl font-bold text-blue-300 md:text-blue-300 lg:text-blue-200 tabular-nums leading-tight">{subjectView.middleTiles.accuracy}%</span>
                  </div>
                </div>
                <div className="bg-black/25 border border-white/15 rounded-lg md:rounded-xl px-1 py-2 md:px-2 md:py-3 min-h-[4.5rem] md:min-h-[5.25rem] lg:min-h-[5.75rem] flex flex-col items-stretch justify-start gap-1 md:gap-1.5 min-w-0 shadow-sm">
                  <div className="flex shrink-0 items-center justify-center md:min-h-[28px] lg:min-h-[30px] px-0.5">
                    <span className="text-[10px] md:text-[13px] lg:text-sm text-white/78 md:text-white/85 lg:text-white/90 text-center leading-tight">אתגרים</span>
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
                      className="h-7 md:h-8 w-full max-w-[3.5rem] md:max-w-[4rem] px-1.5 md:px-2 rounded-md bg-blue-500/85 hover:bg-blue-500 text-white text-[11px] md:text-sm lg:text-base font-bold"
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
              
              <SubjectMonthlyPrizeJourney view={monthlyPersistenceView} />

              <div className="mt-auto mb-2 w-full pt-3 md:pt-4 flex flex-col items-center gap-2 md:gap-3">
              {g1BookIndexHref ? (
                <button
                  type="button"
                  data-testid="math-g1-book-index-button"
                  onClick={() => router.push(g1BookIndexHref)}
                  className="w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl px-4 py-2.5 md:py-3 rounded-lg bg-violet-500/80 hover:bg-violet-500 text-xs md:text-sm font-bold text-white shadow-sm"
                >
                  📖 ספר חשבון כיתה א׳
                </button>
              ) : null}
              <div className="flex items-center justify-center gap-1.5 md:gap-2.5 w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl flex-wrap px-1 md:px-2 mx-auto">
                <button
                  type="button"
                  data-testid="math-start-game"
                  onClick={startGame}
                  disabled={!playerName.trim()}
                  className="h-9 md:h-10 px-4 md:px-5 rounded-lg bg-emerald-500/80 hover:bg-emerald-500 disabled:bg-gray-500/50 disabled:cursor-not-allowed font-bold text-xs md:text-sm"
                >
                  ▶️ התחל
                </button>
                <button
                  onClick={() => setShowMultiplicationTable(true)}
                  className="h-9 md:h-10 px-3 md:px-4 rounded-lg bg-blue-500/80 hover:bg-blue-500 font-bold text-xs md:text-sm"
                >
                  📊 לוח כפל
                </button>
                <button
                  onClick={() => setShowLeaderboard(true)}
                  className="h-9 md:h-10 px-3 md:px-4 rounded-lg bg-orange-500/80 hover:bg-orange-500 font-bold text-xs md:text-sm"
                >
                  🏆 לוח תוצאות
                </button>
                {g1BookTopicHref ? (
                  <button
                    type="button"
                    data-testid="math-g1-book-topic-button"
                    onClick={() => router.push(g1BookTopicHref)}
                    className="h-9 md:h-10 px-3 md:px-4 rounded-lg bg-violet-500/70 hover:bg-violet-500 font-bold text-xs md:text-sm text-white shadow-sm shrink-0"
                  >
                    📖 הסבר בספר
                  </button>
                ) : null}
              </div>

              {/* כפתורים עזרה ותרגול ממוקד */}
              <div className="w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl flex justify-center gap-2 md:gap-2.5 flex-wrap mx-auto px-1 md:px-2">
                <button
                  onClick={() => setShowHowTo(true)}
                  className="px-4 py-2 md:px-5 md:py-2.5 rounded-lg bg-cyan-500/80 hover:bg-cyan-500 text-xs md:text-sm font-bold text-white shadow-sm"
                >
                  ❓ איך לומדים חשבון כאן?
                </button>
                <button
                  onClick={() => setShowReferenceModal(true)}
                  className="px-4 py-2 md:px-5 md:py-2.5 rounded-lg bg-purple-500/80 hover:bg-purple-500 text-xs md:text-sm font-bold text-white shadow-sm"
                >
                  📚 לוח עזרה
                </button>
                <div
                  className="md:hidden inline-flex items-center justify-center gap-1.5 shrink-0 rounded-lg border border-amber-400/45 bg-black/35 px-3 py-2 text-xs font-bold tabular-nums shadow-sm text-white"
                  title="מטבעות משחק"
                >
                  <span>מטבעות:</span>
                  <span dir="ltr" className="text-amber-100">
                    {childCoinBalance}
                  </span>
                </div>
                <button
                  onClick={() => setShowPracticeOptions(true)}
                  className="px-4 py-2 md:px-5 md:py-2.5 rounded-lg bg-pink-500/80 hover:bg-pink-500 text-xs md:text-sm font-bold text-white shadow-sm"
                >
                  🎯 תרגול ממוקד
                  {mistakes.length > 0 ? ` (${mistakes.length})` : ""}
                </button>
              </div>

              {!playerName.trim() && (
                <p className="text-xs text-white/60 text-center mb-1">
                  הכנס את שמך כדי להתחיל
                </p>
              )}
              </div>
            </div>
          ) : (
            <>
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
                  className="relative w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-4xl flex flex-col items-center justify-start mb-2 flex-1 mx-auto"
                  style={{ height: "var(--game-h, 400px)", minHeight: "300px" }}
                >
                  {/* שכבת הודעות שלא משנה פריסה (אין מקום שמור / אין מיקרו-סק롤) */}
                  {(feedback || (showHint && hintText) || errorExplanation) && (
                    <div className="absolute top-0 left-0 right-0 z-[5] px-2 pt-1 pointer-events-none">
                      <div className="flex flex-col gap-2 items-stretch">
                        {feedback && (
                          <div
                            className={`px-4 py-2 rounded-lg text-sm font-semibold text-center transition-all duration-300 ${
                              showCorrectAnimation
                                ? "bg-emerald-500/40 text-emerald-100 scale-110 shadow-lg shadow-emerald-500/50"
                                : showWrongAnimation
                                ? "bg-red-500/40 text-red-100 scale-105 shadow-lg shadow-red-500/50"
                                : feedback.includes("נכון") ||
                                  feedback.includes("∞") ||
                                  feedback.includes("Start")
                                ? "bg-emerald-500/20 text-emerald-200"
                                : "bg-red-500/20 text-red-200"
                            }`}
                          >
                            <div className="text-lg" style={learningMixedHebrewMathStyle}>
                              {feedback}
                            </div>
                          </div>
                        )}

                        {showHint && hintText && (
                          <div className="bg-blue-500/10 border border-blue-400/50 rounded-lg p-3 text-right">
                            <div className="text-xs font-semibold text-blue-200/95 mb-1.5 tracking-tight">
                              רמז
                            </div>
                            <div
                              className="text-sm text-blue-100/95 leading-relaxed"
                              style={learningMixedHebrewMathStyle}
                            >
                              {hintText}
                            </div>
                          </div>
                        )}

                        {errorExplanation && (
                          <div className="bg-[#0a1222]/95 border border-rose-300/60 rounded-lg p-3 text-right shadow-xl backdrop-blur-sm">
                            <div className="text-xs font-semibold text-rose-100 mb-1.5 tracking-tight">
                              למה הטעות קרתה?
                            </div>
                            <div
                              className="text-sm text-rose-50 leading-relaxed"
                              style={learningMixedHebrewMathStyle}
                            >
                              {errorExplanation}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* כפתור מאוזן/מאונך מעוגן למעלה (לא מזיז פריסה) */}
                  {canDisplayVertically && (
                    <button
                      onClick={() => setIsVerticalDisplay((prev) => !prev)}
                      className="absolute top-2 left-2 z-10 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-500/80 hover:bg-purple-500 text-white transition-all pointer-events-auto shadow-lg"
                      title={isVerticalDisplay ? "הצג מאוזן" : "הצג מאונך"}
                    >
                      {isVerticalDisplay ? "↔️ מאוזן" : "↕️ מאונך"}
                    </button>
                  )}

                  {g1QuestionBookHref ? (
                    <button
                      type="button"
                      data-testid="math-g1-book-question-button"
                      onClick={() => router.push(g1QuestionBookHref)}
                      className="absolute top-2 right-2 z-10 px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-500/80 hover:bg-violet-500 text-white transition-all pointer-events-auto shadow-lg"
                      title="הסבר בספר לנושא הנוכחי"
                    >
                      📖 הסבר
                    </button>
                  ) : null}

                  {/* אזור שאלה יציב למניעת קפיצות בפריסת התשובות */}
                  <div
                    data-testid="math-question-surface"
                    className="w-full shrink-0 min-h-[230px] md:min-h-[260px] flex flex-col items-center justify-center px-2"
                  >
                    {/* ויזואליזציה של מספרים (כיתות א'-ג') */}
                    {(grade === "g1" || grade === "g2" || grade === "g3") &&
                      (currentQuestion.operation === "addition" ||
                        currentQuestion.operation === "subtraction") && (
                        <div
                          className="mb-4 flex gap-6 items-center justify-center flex-wrap"
                          style={{ direction: "ltr" }}
                        >
                          {/* הגדרת מגבלות לפי כיתה */}
                          {(() => {
                            const maxVisual =
                              grade === "g1" ? 10 : grade === "g2" ? 20 : 30;
                            const showVisual =
                              currentQuestion.a <= maxVisual &&
                              currentQuestion.b <= maxVisual;
                            if (!showVisual) return null;

                            const maxA = Math.min(currentQuestion.a, maxVisual);
                            const maxB = Math.min(currentQuestion.b, maxVisual);
                            let remainingA;

                            if (currentQuestion.operation === "subtraction") {
                              // בחיסור - העיגולים הכחולים שנותרו (לפני שעברו לאחר הסימן שווה)
                              if (movedCirclesB >= maxB) {
                                remainingA = 0;
                              } else {
                                remainingA = Math.max(0, maxA - movedCirclesB);
                              }
                            } else {
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
                                          if (
                                            currentQuestion.operation ===
                                            "addition"
                                          ) {
                                            if (movedCirclesA < maxA) {
                                              setMovedCirclesA((prev) => prev + 1);
                                            }
                                          } else {
                                            if (movedCirclesB < maxB) {
                                              setMovedCirclesB((prev) => prev + 1);
                                            }
                                          }
                                        }}
                                        className="inline-block bg-blue-500 rounded-full cursor-pointer hover:bg-blue-400 active:bg-blue-600 transition-all duration-300 touch-manipulation hover:scale-110 active:scale-95 animate-pulse-glow ring-2 ring-blue-300 ring-opacity-75"
                                        style={{
                                          userSelect: "none",
                                          width:
                                            grade === "g1"
                                              ? "24px"
                                              : grade === "g2"
                                              ? "20px"
                                              : "18px",
                                          height:
                                            grade === "g1"
                                              ? "24px"
                                              : grade === "g2"
                                              ? "20px"
                                              : "18px",
                                          minWidth:
                                            grade === "g1"
                                              ? "24px"
                                              : grade === "g2"
                                              ? "20px"
                                              : "18px",
                                          minHeight:
                                            grade === "g1"
                                              ? "24px"
                                              : grade === "g2"
                                              ? "20px"
                                              : "18px",
                                          animation: "none",
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.animation =
                                            "bounce 0.3s ease";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.animation = "none";
                                        }}
                                      />
                                    ))}
                                </div>
                                <span className="text-white text-3xl font-bold min-w-[40px] text-center">
                                  {currentQuestion.operation === "addition"
                                    ? "+"
                                    : "−"}
                                </span>
                                <div className="flex flex-wrap gap-3 justify-center max-w-[200px] min-w-[120px]">
                                  {Array(
                                    Math.min(currentQuestion.b, maxVisual) -
                                      movedCirclesB
                                  )
                                    .fill(0)
                                    .map((_, i) => (
                                      <span
                                        key={`b-${i}`}
                                        onClick={() => {
                                          if (
                                            currentQuestion.operation ===
                                            "addition"
                                          ) {
                                            if (
                                              movedCirclesB <
                                              Math.min(
                                                currentQuestion.b,
                                                maxVisual
                                              )
                                            ) {
                                              setMovedCirclesB((prev) => prev + 1);
                                            }
                                          }
                                        }}
                                        className={`inline-block rounded-full ${
                                          currentQuestion.operation === "addition"
                                            ? "bg-green-500 cursor-pointer hover:bg-green-400 active:bg-green-600 transition-all duration-300 hover:scale-110 active:scale-95 animate-pulse-glow-green ring-2 ring-green-300 ring-opacity-75"
                                            : "bg-green-500"
                                        } touch-manipulation`}
                                        style={{
                                          userSelect: "none",
                                          width:
                                            grade === "g1"
                                              ? "24px"
                                              : grade === "g2"
                                              ? "20px"
                                              : "18px",
                                          height:
                                            grade === "g1"
                                              ? "24px"
                                              : grade === "g2"
                                              ? "20px"
                                              : "18px",
                                          minWidth:
                                            grade === "g1"
                                              ? "24px"
                                              : grade === "g2"
                                              ? "20px"
                                              : "18px",
                                          minHeight:
                                            grade === "g1"
                                              ? "24px"
                                              : grade === "g2"
                                              ? "20px"
                                              : "18px",
                                          animation: "none",
                                        }}
                                        onMouseEnter={(e) => {
                                          if (
                                            currentQuestion.operation ===
                                            "addition"
                                          ) {
                                            e.currentTarget.style.animation =
                                              "bounce 0.3s ease";
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.animation = "none";
                                        }}
                                      />
                                    ))}
                                </div>
                                <span className="text-white text-3xl font-bold min-w-[40px] text-center">
                                  =
                                </span>
                                {/* עיגולים שעברו מאחורי הסימן שווה */}
                                {(() => {
                                  const maxVisual =
                                    grade === "g1"
                                      ? 10
                                      : grade === "g2"
                                      ? 20
                                      : 30;
                                  const showResult =
                                    movedCirclesA > 0 ||
                                    movedCirclesB > 0 ||
                                    (currentQuestion.operation ===
                                      "subtraction" &&
                                      movedCirclesB >=
                                        Math.min(currentQuestion.b, maxVisual));
                                  if (!showResult) return null;

                                  return (
                                    <div className="flex flex-wrap gap-3 justify-center max-w-[200px] min-w-[120px]">
                                      {currentQuestion.operation === "addition" ? (
                                        Array(movedCirclesA + movedCirclesB)
                                          .fill(0)
                                          .map((_, i) => (
                                            <span
                                              key={`result-${i}`}
                                              className={`inline-block rounded-full transition-all duration-300 ${
                                                i < movedCirclesA
                                                  ? "bg-blue-500"
                                                  : "bg-green-500"
                                              }`}
                                              style={{
                                                width:
                                                  grade === "g1"
                                                    ? "24px"
                                                    : grade === "g2"
                                                    ? "20px"
                                                    : "18px",
                                                height:
                                                  grade === "g1"
                                                    ? "24px"
                                                    : grade === "g2"
                                                    ? "20px"
                                                    : "18px",
                                                minWidth:
                                                  grade === "g1"
                                                    ? "24px"
                                                    : grade === "g2"
                                                    ? "20px"
                                                    : "18px",
                                                minHeight:
                                                  grade === "g1"
                                                    ? "24px"
                                                    : grade === "g2"
                                                    ? "20px"
                                                    : "18px",
                                                animation: "fadeIn 0.5s ease-in",
                                              }}
                                            />
                                          ))
                                      ) : (
                                        movedCirclesB >=
                                          Math.min(currentQuestion.b, maxVisual) &&
                                        Array(
                                          Math.max(
                                            0,
                                            Math.min(currentQuestion.a, maxVisual) -
                                              movedCirclesB
                                          )
                                        )
                                          .fill(0)
                                          .map((_, i) => (
                                            <span
                                              key={`result-${i}`}
                                              className="inline-block bg-blue-500 rounded-full transition-all duration-300"
                                              style={{
                                                width:
                                                  grade === "g1"
                                                    ? "24px"
                                                    : grade === "g2"
                                                    ? "20px"
                                                    : "18px",
                                                height:
                                                  grade === "g1"
                                                    ? "24px"
                                                    : grade === "g2"
                                                    ? "20px"
                                                    : "18px",
                                                minWidth:
                                                  grade === "g1"
                                                    ? "24px"
                                                    : grade === "g2"
                                                    ? "20px"
                                                    : "18px",
                                                minHeight:
                                                  grade === "g1"
                                                    ? "24px"
                                                    : grade === "g2"
                                                    ? "20px"
                                                    : "18px",
                                                animation: "fadeIn 0.5s ease-in",
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

                    {/* הפרדה בין שורת השאלה לשורת התרגיל */}
                    {isVerticalDisplay &&
                    canDisplayVertically &&
                    currentQuestion.exerciseText ? (
                      <div className="relative w-full pr-2 pl-2 pt-0">
                        {currentQuestion.questionLabel ? (
                          <p
                            className="text-2xl text-center text-white mb-2 break-words overflow-wrap-anywhere max-w-full px-2"
                            dir="rtl"
                            data-testid="student-question-lead"
                            style={{
                              direction: "rtl",
                              unicodeBidi: "plaintext",
                              ...getQuestionFontStyle({
                                text: currentQuestion.questionLabel,
                                kind: "label",
                              }),
                            }}
                          >
                            {currentQuestion.questionLabel}
                          </p>
                        ) : null}

                        <div
                          className="flex justify-center w-full max-w-full px-2 overflow-x-hidden"
                          data-testid="student-question-body"
                          dir="ltr"
                        >
                          <pre
                            className="text-3xl text-center text-white font-bold font-mono whitespace-pre"
                            style={{
                              direction: "ltr",
                              unicodeBidi: "isolate",
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
                        question={currentQuestion.question}
                        questionLabel={currentQuestion.questionLabel}
                        exerciseText={currentQuestion.exerciseText}
                        getQuestionFontStyle={getQuestionFontStyle}
                        wrapperClassName="relative w-full pr-2 pl-2 pt-0 w-full flex flex-col items-center justify-center gap-1"
                        bodyClassName={`text-4xl text-center text-white font-bold max-w-full px-2 ${
                          currentQuestion.operation === "sequences"
                            ? "whitespace-normal break-words overflow-wrap-anywhere"
                            : ""
                        }`}
                      />
                    )}
                  </div>

                  {/* אזור התשובות/בקרים (קבוע בתחתית) */}
                  <div className="w-full flex-1 min-h-0 mt-2 flex flex-col items-center justify-end">
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
                      const gridCols = isCompare ? "grid-cols-3" : "grid-cols-2";
                      const buttonPadding = isCompare ? "px-3 py-3" : "px-6 py-6";
                      const buttonText = isCompare ? "text-lg" : "text-2xl";
                      
                      return (
                        <div
                          className="w-full mb-3"
                          style={{
                            transform: `scale(${ANSWER_AREA_SCALE})`,
                            transformOrigin: "top center",
                          }}
                        >
                          <div className={`grid ${gridCols} gap-3 w-full`}>
                            {currentQuestion.answers.map((answer, idx) => {
                              const isSelected = selectedAnswer === answer;
                              const isCorrect = compareMathLearnerAnswer({
                                user: answer,
                                correctAnswer: currentQuestion.correctAnswer,
                                numericTolerance: MATH_NUMERIC_TOLERANCE,
                              }).isCorrect;
                              const isWrong = isSelected && !isCorrect;

                              return (
                                <button
                                  key={idx}
                                  onClick={() => handleAnswer(answer)}
                                  disabled={!!selectedAnswer}
                                  className={`rounded-xl border-2 ${buttonPadding} ${buttonText} font-bold transition-all active:scale-95 disabled:opacity-50 ${
                                    isCorrect && isSelected
                                      ? "bg-emerald-500/30 border-emerald-400 text-emerald-200"
                                      : isWrong
                                      ? "bg-red-500/30 border-red-400 text-red-200"
                                      : selectedAnswer && isCorrect
                                      ? "bg-emerald-500/30 border-emerald-400 text-emerald-200"
                                      : "bg-black/30 border-white/15 text-white hover:border-white/40"
                                  }`}
                                >
                                  {renderAnswerLabel(answer)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    } else if ((mode === "learning" || mode === "practice") && !practiceMode) {
                      // שדה קלט טקסט למצבי למידה ותרגול
                      return (
                        <div className="w-full mb-3 p-4 rounded-lg bg-blue-500/20 border border-blue-400/50">
                          <div className="text-center mb-3">
                            <input
                              type="number"
                              data-testid="math-text-answer"
                              value={textAnswer}
                              onChange={(e) => setTextAnswer(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === "Enter" && !selectedAnswer && textAnswer.trim() !== "") {
                                  handleAnswer(textAnswer);
                                }
                              }}
                              placeholder="תשובה"
                              disabled={!!selectedAnswer}
                              className="w-full max-w-[300px] px-4 py-4 rounded-lg bg-black/40 border border-white/20 text-white text-2xl font-bold text-center disabled:opacity-50"
                              autoFocus
                            />
                          </div>
                          <div className="flex gap-2 justify-center">
                            <button
                              type="button"
                              data-testid="math-check-answer"
                              onClick={() => {
                                if (!selectedAnswer && textAnswer.trim() !== "") {
                                  handleAnswer(textAnswer);
                                }
                              }}
                              disabled={!!selectedAnswer || textAnswer.trim() === ""}
                              className="px-6 py-3 rounded-lg bg-emerald-500/80 hover:bg-emerald-500 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              בדוק
                            </button>
                            {selectedAnswer && (
                              <button
                                onClick={() => {
                                  setSelectedAnswer(null);
                                  setTextAnswer("");
                                  setFeedback(null);
                                  generateNewQuestion();
                                }}
                                className="px-6 py-3 rounded-lg bg-blue-500/80 hover:bg-blue-500 font-bold text-lg"
                              >
                                שאלה הבאה
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    } else {
                      // ברירת מחדל - כפתורי בחירה
                      // בנושא השוואה - 3 עמודות, כפתורים קטנים יותר
                      const isCompare = currentQuestion.operation === "compare";
                      const gridCols = isCompare ? "grid-cols-3" : "grid-cols-2";
                      const buttonPadding = isCompare ? "px-3 py-3" : "px-6 py-6";
                      const buttonText = isCompare ? "text-lg" : "text-2xl";
                      
                      return (
                        <div
                          className="w-full mb-3"
                          style={{
                            transform: `scale(${ANSWER_AREA_SCALE})`,
                            transformOrigin: "top center",
                          }}
                        >
                          <div className={`grid ${gridCols} gap-3 w-full`}>
                            {currentQuestion.answers.map((answer, idx) => {
                              const isSelected = selectedAnswer === answer;
                              const isCorrect = compareMathLearnerAnswer({
                                user: answer,
                                correctAnswer: currentQuestion.correctAnswer,
                                numericTolerance: MATH_NUMERIC_TOLERANCE,
                              }).isCorrect;
                              const isWrong = isSelected && !isCorrect;

                              return (
                                <button
                                  key={idx}
                                  onClick={() => handleAnswer(answer)}
                                  disabled={!!selectedAnswer}
                                  className={`rounded-xl border-2 ${buttonPadding} ${buttonText} font-bold transition-all active:scale-95 disabled:opacity-50 ${
                                    isCorrect && isSelected
                                      ? "bg-emerald-500/30 border-emerald-400 text-emerald-200"
                                      : isWrong
                                      ? "bg-red-500/30 border-red-400 text-red-200"
                                      : selectedAnswer && isCorrect
                                      ? "bg-emerald-500/30 border-emerald-400 text-emerald-200"
                                      : "bg-black/30 border-white/15 text-white hover:border-white/40"
                                  }`}
                                >
                                  {renderAnswerLabel(answer)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                  })()}

                  {/* רמז + הסבר + למה טעיתי */}
                  {currentQuestion && (
                    <div className="mt-2 flex flex-col gap-2 w-full">
                      {/* כפתורי רמז/הסבר */}
                      <div className="mt-0 flex gap-2 justify-center flex-wrap w-full max-w-full" dir="rtl">
                        {mode === "learning" && (
                          <button
                            type="button"
                            onClick={() => setShowSolution((prev) => !prev)}
                            className={`${learningExplainOpenBtn} bg-indigo-500/80 hover:bg-indigo-500 border-indigo-300/40`}
                          >
                            📖 צעד-צעד
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowHint((prev) => !prev)}
                          className={`${learningHintTriggerBtn} bg-amber-500/80 hover:bg-amber-500 border-amber-300/40 text-white`}
                        >
                          💡 רמז
                        </button>
                        {(mode === "learning" || mode === "practice") &&
                          previousExplanationQuestion && (
                            <button
                              type="button"
                              onClick={openPreviousExplanation}
                              className={`${learningExplainOpenBtn} bg-cyan-500/80 hover:bg-cyan-500 border-cyan-300/40`}
                            >
                              🕘 תרגיל קודם
                            </button>
                          )}
                  </div>

                  {/* כפתור חיבור לטבלת כפל/חילוק – רק במצב למידה */}
                  {mode === "learning" &&
                    (currentQuestion.operation === "multiplication" ||
                      currentQuestion.operation === "division") && (
                          <div className="flex justify-center">
                      <button
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
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-500/80 hover:bg-blue-500 text-white"
                      >
                              📊 הצג בטבלה
                      </button>
                          </div>
                        )}

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
                                
                                <div className="flex-1 overflow-y-auto px-4 pb-2 min-h-0" dir="rtl">
                                  <div className={`mb-3 ${learningQuestionBox}`} dir="ltr">
                                    <div
                                      className={`${learningQuestionText} text-center`}
                                      style={{
                                        direction: "ltr",
                                        unicodeBidi: "plaintext",
                                        wordBreak: "break-word",
                                        overflowWrap: "break-word",
                                      }}
                                    >
                                      {info.exercise || explanationQuestion.exerciseText || explanationQuestion.question}
                                    </div>
                                  </div>
                                  {info.vertical && (
                                    <div className="mb-3 rounded-lg bg-emerald-900/50 border border-emerald-500/15 px-3 py-2">
                                      <pre
                                        dir="ltr"
                                        className="text-center font-mono text-base leading-relaxed whitespace-pre text-emerald-100"
                                      >
                                        {info.vertical}
                                      </pre>
                                    </div>
                                  )}
                                  <div
                                    className="space-y-2"
                                    style={{ direction: "rtl", unicodeBidi: "plaintext" }}
                                  >
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
                          
                          // פונקציה לפיצול ספרות עם padding
                          const splitDigits = (num, minLength = 1) => {
                            const s = String(Math.abs(num)).padStart(minLength, " ");
                            return s.split("");
                          };
                          
                          // טיפול בעשרוניים - צריך לטפל בנקודה העשרונית
                          const isDecimal = op === "decimals";
                          const safeToFixed2 = (v) => (typeof v === "number" ? v.toFixed(2) : String(v ?? ""));
                          let aStr = isDecimal ? safeToFixed2(aVal) : String(aVal);
                          let bStr = isDecimal ? safeToFixed2(bVal) : String(bVal);
                          let answerStr = isDecimal ? safeToFixed2(answerVal) : String(answerVal);
                          
                          // חישוב אורך מקסימלי (כולל נקודה עשרונית)
                          const maxLen = Math.max(
                            aStr.length,
                            bStr.length,
                            answerStr.length
                          );
                          
                          const aDigits = aStr.padStart(maxLen, " ").split("");
                          const bDigits = bStr.padStart(maxLen, " ").split("");
                          const resDigitsFull = answerStr.padStart(maxLen, " ").split("");
                          
                          // חישוב כמה ספרות לחשוף לפי הצעד הנוכחי
                          const revealCount = (activeStep && typeof activeStep.revealDigits === "number") 
                            ? activeStep.revealDigits 
                            : 0;
                          
                          // יצירת מערך ספרות תוצאה חלקי - רק הספרות החשופות
                          const visibleResultDigits = resDigitsFull.map((d, idx) => {
                            const fromRight = maxLen - 1 - idx; // 0 = ספרת אחדות (מימין)
                            if (fromRight < revealCount) {
                              return d.trim() || "\u00A0";
                            }
                            // ספרות לא חשופות - רווח
                            return "\u00A0";
                          });
                          
                          const isHighlighted = (key) => {
                            if (!activeStep || !activeStep.highlights || !Array.isArray(activeStep.highlights)) {
                              return false;
                            }
                            return activeStep.highlights.includes(key);
                          };
                          
                          // טיפול מיוחד בחילוק ארוך - תצוגה שונה עם כל השלבים
                          // אם יש לנו pre (ASCII) מהאנימציה – נשתמש במודל הרגיל כמו בכפל (בלי המסך המיוחד).
                          if ((effectiveOp === "division" || effectiveOp === "division_with_remainder") && activeStep?.type === "division" && !activeStep?.pre) {
                            // חישוב כל השלבים בחילוק ארוך (בדיוק כמו ב-buildDivisionAnimation)
                            const divSteps = [];
                            let wNum = 0;
                            let qPos = 0;
                            const divStr = String(aVal);
                            
                            let startPos = 0;
                            for (let i = 0; i < divStr.length; i++) {
                              if (wNum === 0) {
                                startPos = i;
                              }
                              wNum = wNum * 10 + parseInt(divStr[i]);
                              if (wNum >= bVal) {
                                const qDig = Math.floor(wNum / bVal);
                                const prod = qDig * bVal;
                                const rem = wNum - prod;
                                divSteps.push({
                                  pos: i, // מיקום הספרה האחרונה
                                  startPos: startPos, // מיקום הספרה הראשונה
                                  wNum,
                                  qDig,
                                  prod,
                                  rem,
                                  qPos: qPos++,
                                  wNumLen: String(wNum).length,
                                });
                                wNum = rem;
                                startPos = rem > 0 ? i : i + 1;
                              }
                            }
                            
                            // בניית תצוגת חילוק ארוך עם כל השלבים
                            const quotientDigits = divSteps.map(s => s.qDig);
                            const quotientStrFull = quotientDigits.join("");
                            const quotientDigitsArray = quotientStrFull.split("");
                            const dividendDigitsArray = divStr.split("");
                            const divisorStr = String(bVal);
                            
                            // קביעת מה להציג לפי הצעד הנוכחי
                            const currentStepIndex = activeStep?.stepIndex ?? -1;
                            const revealQuotientCount = activeStep?.revealDigits ?? 0;
                            const isSubtractStep = activeStep?.id?.includes("subtract");
                            const isBringDownStep = activeStep?.id?.includes("bring-down");
                            
                            // חישוב מיקום המחלק והמחולק
                            const divisorPadding = divisorStr.length + 2; // מקום למחלק + "│" + רווח
                            
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
                                  {/* כותרת */}
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
                                  
                                  {/* תוכן */}
                                  <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-2">
                                    {/* תצוגת חילוק ארוך */}
                                    <div className="mb-4 flex flex-col items-start font-mono text-xl leading-[1.6]" style={{ direction: "ltr", minWidth: "300px" }}>
                                      {/* שורה 1: המנה (quotient) - מעל, מיושרת לימין של המחולק */}
                                      <div className="mb-1 flex" style={{ paddingLeft: `${divisorPadding * 1.5}ch` }}>
                                        <div className="grid gap-x-1" style={{ gridTemplateColumns: `repeat(${quotientDigitsArray.length}, 1.5ch)` }}>
                                          {quotientDigitsArray.map((d, idx) => {
                                            const shouldHighlight = isHighlighted(`result${idx}`);
                                            return (
                                              <span
                                                key={`q-${idx}`}
                                                className={`text-center font-bold ${shouldHighlight ? "bg-yellow-500/30 rounded px-1 animate-pulse" : ""}`}
                                              >
                                                {idx < revealQuotientCount ? d : "\u00A0"}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      </div>
                                      
                                      {/* שורה 2: קו תחתון מעל המחולק */}
                                      <div className="mb-1 flex" style={{ paddingLeft: `${divisorPadding * 1.5}ch` }}>
                                        <div className="h-[2px] bg-white" style={{ width: `${dividendDigitsArray.length * 1.5}ch` }} />
                                      </div>
                                      
                                      {/* שורה 3: המחלק משמאל + סוגר + המחולק */}
                                      <div className="flex items-center gap-2">
                                        <span className="text-xl font-bold">{bVal}</span>
                                        <span className="text-xl font-bold">│</span>
                                        <div className="grid gap-x-1" style={{ gridTemplateColumns: `repeat(${dividendDigitsArray.length}, 1.5ch)` }}>
                                          {dividendDigitsArray.map((d, idx) => {
                                            const shouldHighlight = isHighlighted(`a${idx}`) || isHighlighted("aAll");
                                            return (
                                              <span
                                                key={`d-${idx}`}
                                                className={`text-center font-bold ${shouldHighlight ? "bg-yellow-500/30 rounded px-1 animate-pulse" : ""}`}
                                              >
                                                {d}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      </div>
                                      
                                      {/* הצגת שלבי החילוק לפי הצעד הנוכחי */}
                                      {currentStepIndex >= 0 && divSteps[currentStepIndex] && (() => {
                                        const step = divSteps[currentStepIndex];
                                        const showWorkingNum = isSubtractStep || isHighlighted(`workingNum${currentStepIndex}`);
                                        const showProduct = isSubtractStep || isHighlighted(`product${currentStepIndex}`);
                                        const showRemainder = isSubtractStep || isHighlighted(`remainder${currentStepIndex}`);
                                        
                                        // חישוב מיקום - המספר צריך להיות מיושר מעל החלק הרלוונטי של המחולק
                                        // step.pos הוא המיקום במחולק (משמאל, החל מ-0)
                                        // צריך לחשב כמה מקום יש מהמחלק ועד למיקום הנכון
                                        // workingNumber מתחיל מהמיקום step.pos, אבל יכול להיות מספר ספרות
                                        const wNumStr = String(step.wNum);
                                        const prodStr = String(step.prod);
                                        const remStr = String(step.rem);
                                        
                                        // המיקום הוא: divisorPadding + מיקום התחלה של המספר במחולק
                                        // step.startPos הוא המיקום של הספרה הראשונה (השמאלית ביותר) של workingNumber
                                        const alignmentOffset = divisorPadding + (step.startPos || 0);
                                        
                                        return (
                                          <div className="mt-2 flex flex-col gap-1">
                                            {/* שורה עם המספר שמחלקים (workingNumber) - אם צריך להציג */}
                                            {showWorkingNum && (
                                              <div className="flex" style={{ paddingLeft: `${alignmentOffset * 1.5}ch` }}>
                                                <div className="grid gap-x-1" style={{ gridTemplateColumns: `repeat(${wNumStr.length}, 1.5ch)` }}>
                                                  {wNumStr.split("").map((d, idx) => (
                                                    <span key={`wn-${idx}`} className="text-center font-bold text-emerald-300">
                                                      {d}
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                            
                                            {/* שורה עם התוצאה של הכפל (product) - מיושר לימין של workingNumber */}
                                            {showProduct && (
                                              <div className="flex" style={{ paddingLeft: `${(alignmentOffset + wNumStr.length - prodStr.length) * 1.5}ch` }}>
                                                <div className="grid gap-x-1" style={{ gridTemplateColumns: `repeat(${prodStr.length}, 1.5ch)` }}>
                                                  {prodStr.split("").map((d, idx) => (
                                                    <span key={`prod-${idx}`} className="text-center font-bold text-red-300">
                                                      {d}
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                            
                                            {/* קו חיסור - מיושר כמו product */}
                                            {showProduct && (
                                              <div className="flex" style={{ paddingLeft: `${(alignmentOffset + wNumStr.length - prodStr.length) * 1.5}ch` }}>
                                                <div className="h-[1px] bg-white" style={{ width: `${Math.max(prodStr.length, wNumStr.length) * 1.5}ch` }} />
                                              </div>
                                            )}
                                            
                                            {/* שורה עם השארית (remainder) - מיושר לימין של product */}
                                            {showRemainder && step.rem >= 0 && (
                                              <div className="flex" style={{ paddingLeft: `${(alignmentOffset + wNumStr.length - remStr.length) * 1.5}ch` }}>
                                                <div className="grid gap-x-1" style={{ gridTemplateColumns: `repeat(${remStr.length}, 1.5ch)` }}>
                                                  {remStr.split("").map((d, idx) => (
                                                    <span key={`rem-${idx}`} className="text-center font-bold text-blue-300">
                                                      {d}
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                            
                                            {/* אם זה צעד של הורדת ספרה, הצג את הספרה הבאה */}
                                            {isBringDownStep && currentStepIndex < divSteps.length - 1 && activeStep?.nextDigit !== undefined && (
                                              <div className="flex items-center gap-1 mt-1" style={{ paddingLeft: `${(divisorPadding + (step.pos + 1)) * 1.5}ch` }}>
                                                <span className="text-blue-300 font-bold text-sm">↓</span>
                                                <span className="text-emerald-300 font-bold">{activeStep.nextDigit}</span>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                    
                                    {/* טקסט ההסבר */}
                                    <div className="mb-4 text-emerald-50" dir="rtl">
                                      <h4 className={learningExplTitle}>{activeStep?.title || ""}</h4>
                                      <p className={learningExplBody}>{activeStep?.text || ""}</p>
                                    </div>
                                  </div>
                                  
                                  {/* כפתורים ואינדיקטור */}
                                  <div className={learningModalFooter}>
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
                                    <div className={learningStepCounter}>
                                      צעד {animationStep + 1} מתוך {animationSteps.length}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          
                          // חיבור, חיסור, כפל - הקוד המקורי בדיוק כמו שהיה
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
                                <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-2">
                                  {/* אם יש בלוק מונוספייס מהאנימציה: מציגים אותו במקום הטבלה (כדי למנוע כפילות) */}
                                  {activeStep.pre ? (
                                    <div className="mb-4 w-full">
                                      <div className="rounded-lg bg-emerald-900/50 px-3 py-2 overflow-x-auto">
                                        {activeStep?.type === "division" && typeof activeStep.pre === "string" ? (() => {
                                          const raw = activeStep.pre.replace(/\u2066|\u2069/g, "");
                                          const lines = raw.split("\n");
                                          const firstLine = lines[0] ?? "";
                                          const rest = lines.slice(1).join("\n");
                                          return (
                                            <div className="flex flex-col items-center">
                                              <pre
                                                dir="ltr"
                                                className="text-center font-mono text-lg whitespace-pre text-emerald-100"
                                                style={{
                                                  unicodeBidi: "plaintext",
                                                  margin: 0,
                                                  transform: "translateY(6px)", // מקרב רק את שורת המנה לקו, בלי להזיז את הקו
                                                }}
                                              >
                                                {`\u2066${firstLine}\u2069`}
                                              </pre>
                                              <pre
                                                dir="ltr"
                                                className="text-center font-mono text-lg leading-relaxed whitespace-pre text-emerald-100"
                                                style={{ unicodeBidi: "plaintext", margin: 0 }}
                                              >
                                                {`\u2066${rest}\u2069`}
                                              </pre>
                                            </div>
                                          );
                                        })() : (
                                          <pre
                                            dir="ltr"
                                            className="text-center font-mono text-lg leading-relaxed whitespace-pre text-emerald-100"
                                            style={{ unicodeBidi: "plaintext" }}
                                          >
                                            {activeStep.pre}
                                          </pre>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    /* תצוגת התרגיל המאונך עם הדגשות - טבלה */
                                    <div className="mb-4 flex flex-col items-center font-mono text-2xl leading-[1.8]" style={{ direction: "ltr" }}>
                                    {/* שורה 1 – המספר הראשון (תא ריק במקום סימן הפעולה) */}
                                    <div 
                                      className="grid gap-x-1 mb-1"
                                      style={{ 
                                        gridTemplateColumns: `auto repeat(${maxLen}, 1.5ch)`
                                      }}
                                    >
                                      <span className="w-4" /> {/* תא ריק במקום סימן הפעולה */}
                                      {aDigits.map((d, idx) => {
                                        const pos = maxLen - idx - 1; // מיקום מהסוף (0 = אחדות, 1 = עשרות וכו')
                                        const highlightKey = pos === 0 ? "Units" : pos === 1 ? "Tens" : "Hundreds";
                                        const shouldHighlight = isHighlighted("aAll") || 
                                                              (pos === 0 && isHighlighted("aUnits")) ||
                                                              (pos === 1 && isHighlighted("aTens")) ||
                                                              (pos === 2 && isHighlighted("aHundreds"));
                                        return (
                                          <span
                                            key={`a-${idx}`}
                                            className={`text-center font-bold ${
                                              shouldHighlight ? "bg-yellow-500/30 rounded px-1 animate-pulse" : ""
                                            }`}
                                          >
                                            {d.trim() || "\u00A0"}
                                          </span>
                                        );
                                      })}
                                    </div>
                                    
                                    {/* שורה 2 – סימן הפעולה והמספר השני */}
                                    <div 
                                      className="grid gap-x-1 mb-1"
                                      style={{ 
                                        gridTemplateColumns: `auto repeat(${maxLen}, 1.5ch)`
                                      }}
                                    >
                                      <span className="w-4 text-center text-2xl font-bold">
                                        {opSymbol}
                                      </span>
                                      {bDigits.map((d, idx) => {
                                        const pos = maxLen - idx - 1;
                                        const highlightKey = pos === 0 ? "Units" : pos === 1 ? "Tens" : "Hundreds";
                                        const shouldHighlight = isHighlighted("bAll") || 
                                                              (pos === 0 && isHighlighted("bUnits")) ||
                                                              (pos === 1 && isHighlighted("bTens")) ||
                                                              (pos === 2 && isHighlighted("bHundreds"));
                                        return (
                                          <span
                                            key={`b-${idx}`}
                                            className={`text-center font-bold ${
                                              shouldHighlight ? "bg-yellow-500/30 rounded px-1 animate-pulse" : ""
                                            }`}
                                          >
                                            {d.trim() || "\u00A0"}
                                          </span>
                                        );
                                      })}
                                    </div>
                                    
                                    {/* קו תחתון */}
                                    <div 
                                      className="h-[2px] bg-white my-2"
                                      style={{ width: `${(maxLen + 1) * 1.5}ch` }}
                                    />
                                    
                                    {/* שורה 3 – התוצאה (חשיפה הדרגתית) */}
                                    <div 
                                      className="grid gap-x-1"
                                      style={{ 
                                        gridTemplateColumns: `auto repeat(${maxLen}, 1.5ch)`
                                      }}
                                    >
                                      <span className="w-4" /> {/* תא ריק */}
                                      {visibleResultDigits.map((d, idx) => {
                                        const pos = maxLen - idx - 1;
                                        const fromRight = pos; // 0 = אחדות, 1 = עשרות וכו'
                                        const isVisible = fromRight < revealCount;
                                        const highlightKey = pos === 0 ? "Units" : pos === 1 ? "Tens" : "Hundreds";
                                        const shouldHighlight = isVisible && (
                                          isHighlighted("resultAll") || 
                                          (pos === 0 && isHighlighted("resultUnits")) ||
                                          (pos === 1 && isHighlighted("resultTens")) ||
                                          (pos === 2 && isHighlighted("resultHundreds"))
                                        );
                                        return (
                                          <span
                                            key={`r-${idx}`}
                                            className={`text-center font-bold ${
                                              shouldHighlight ? "bg-yellow-500/30 rounded px-1 animate-pulse" : ""
                                            }`}
                                          >
                                            {d}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  )}
                                  
                                  {/* טקסט ההסבר */}
                                  <div className="mb-4 text-emerald-50" dir="rtl">
                                    <h4 className={learningExplTitle}>{activeStep.title}</h4>
                                    {activeStep.content ? (
                                      <div className={learningExplBody}>{activeStep.content}</div>
                                    ) : (
                                      <p className={learningExplBody}>{renderMathLTRInText(activeStep.text)}</p>
                                    )}
                                  </div>
                                </div>
                                
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
                              <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-2">
                                {/* הצגת התרגיל/שאלה (תמיד LTR כמו תרגיל חשבון) */}
                                <div className={`mb-3 ${learningQuestionBox}`} dir="ltr">
                                  <div
                                    className={`${learningQuestionText} mb-0`}
                                    style={{ unicodeBidi: "plaintext" }}
                                  >
                                    {explanationQuestion.exerciseText || explanationQuestion.question}
                                  </div>
                                </div>
                                
                                {/* טקסט ההסבר */}
                                <div className="mb-4 text-emerald-50" dir="rtl">
                                  <h4 className={learningExplTitle}>{activeStep.title || "הסבר"}</h4>
                                  {activeStep.pre && (
                                    <div className="mt-2 mb-3 rounded-lg bg-emerald-900/50 border border-emerald-500/15 px-3 py-2 overflow-x-auto">
                                      {activeStep?.type === "division" && typeof activeStep.pre === "string" ? (() => {
                                        const raw = activeStep.pre.replace(/\u2066|\u2069/g, "");
                                        const lines = raw.split("\n");
                                        const firstLine = lines[0] ?? "";
                                        const rest = lines.slice(1).join("\n");
                                        return (
                                          <div className="flex flex-col items-center">
                                            <pre
                                              dir="ltr"
                                              className="text-center font-mono text-base whitespace-pre text-emerald-100"
                                              style={{
                                                unicodeBidi: "plaintext",
                                                margin: 0,
                                                transform: "translateY(6px)",
                                              }}
                                            >
                                              {`\u2066${firstLine}\u2069`}
                                            </pre>
                                            <pre
                                              dir="ltr"
                                              className="text-center font-mono text-base leading-relaxed whitespace-pre text-emerald-100"
                                              style={{ unicodeBidi: "plaintext", margin: 0 }}
                                            >
                                              {`\u2066${rest}\u2069`}
                                            </pre>
                                          </div>
                                        );
                                      })() : (
                                        <pre
                                          dir="ltr"
                                          className="text-center font-mono text-base leading-relaxed whitespace-pre text-emerald-100"
                                          style={{ unicodeBidi: "plaintext" }}
                                        >
                                          {activeStep.pre}
                                        </pre>
                                      )}
                                    </div>
                                  )}
                                  {activeStep.content ? (
                                    <div className={learningExplBody}>{activeStep.content}</div>
                                  ) : (
                                    <p className={learningExplBody}>{renderMathLTRInText(activeStep.text || "")}</p>
                                  )}
                                </div>
                              </div>
                              
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
              )}

              <button
                type="button"
                data-testid="learning-stop-game"
                onClick={stopGame}
                className="h-9 px-4 rounded-lg bg-red-500/80 hover:bg-red-500 font-bold text-sm"
              >
                ⏹️ עצור
              </button>
            </>
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
                        <div className="text-2xl font-bold text-white mb-2">
                          {practiceQuestion.row} × {practiceQuestion.col} = ?
                        </div>
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
                            ⚠️ שגיאה: {selectedResult} ÷ {selectedDivisor} הוא
                            לא מספר שלם!
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
                          <span className="text-base text-white/80">
                            {selectedRow || selectedCell.row} ×{" "}
                            {selectedCol || selectedCell.col} =
                          </span>
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
                              ⚠️ Should be{" "}
                              {(selectedRow || selectedCell.row) *
                                (selectedCol || selectedCell.col)}
                            </span>
                          )}
                        </div>
                      )}

                    {tableMode === "division" &&
                      selectedResult &&
                      selectedDivisor &&
                      selectedResult % selectedDivisor === 0 && (
                        <div className="w-full px-4 py-1 rounded-lg bg-purple-500/20 border border-purple-400/50 text-center flex items-center justify-center gap-3">
                          <span className="text-base text-white/80">
                            {selectedResult} ÷ {selectedDivisor} =
                          </span>
                          <span className="text-xl font-bold text-purple-300">
                            {selectedResult / selectedDivisor}
                          </span>
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
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
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
                  {Object.keys(LEVELS).reverse().map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => {
                        setLeaderboardLevel(lvl);
                        if (typeof window !== "undefined") {
                          try {
                            const saved = JSON.parse(
                              localStorage.getItem(STORAGE_KEY) || "{}"
                            );
                            const topScores = buildTop10ByScore(saved, lvl);
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
                        leaderboardLevel === lvl
                          ? "bg-amber-500/80 text-white"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      }`}
                    >
                      {LEVELS[lvl].name}
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
                            {LEVELS[leaderboardLevel].name}
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
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4"
              onClick={() => {
                setShowMixedSelector(false);
                // אם לא נבחרו פעולות, חזור לפעולה הקודמת
                const hasSelected = Object.values(mixedOperations).some(
                  (selected) => selected
                );
                if (!hasSelected && operation === "mixed") {
                  const allowed = GRADES[grade].operations;
                  setOperation(allowed.find(op => op !== "mixed") || allowed[0]);
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
                  {GRADES[grade].operations
                    .filter((op) => op !== "mixed")
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
                        const availableOps = GRADES[grade].operations.filter(
                          (op) => op !== "mixed"
                        );
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
                        const availableOps = GRADES[grade].operations.filter(
                          (op) => op !== "mixed"
                        );
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
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-[180] p-4"
              onClick={() => setShowHowTo(false)}
            >
              <div
                className="bg-gradient-to-br from-[#080c16] to-[#0a0f1d] border-2 border-emerald-400/60 rounded-2xl p-4 max-w-md w-full text-sm text-white"
                dir="rtl"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-extrabold mb-2 text-center">
                  📘 איך לומדים חשבון כאן?
                </h2>

                <p className="text-white/80 text-xs mb-3 text-center">
                  המטרה היא לתרגל חשבון בצורה משחקית, עם התאמה לכיתה, פעולה ורמת קושי.
                </p>

                <ul className="list-disc pr-4 space-y-1 text-[13px] text-white/90">
                  <li>בחר כיתה, רמת קושי ופעולה (חיבור, חיסור, כפל, חילוק, שברים, אחוזים ועוד).</li>
                  <li>בחר מצב משחק: למידה, אתגר עם טיימר וחיים, מהירות או מרתון.</li>
                  <li>קרא היטב את השאלה – לפעמים יש תרגילי מילים שצריך להבין את הסיפור.</li>
                  <li>לחץ על 💡 רמז לקבלת רמז, ועל "📘 הסבר מלא" לפתרון צעד־אחר־צעד.</li>
                  <li>ניקוד גבוה, רצף תשובות נכון, כוכבים ו־Badges עוזרים לך לעלות רמה כשחקן.</li>
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
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-[185] p-4"
              onClick={() => setShowReferenceModal(false)}
            >
              <div
                className="bg-gradient-to-br from-[#080c16] to-[#0a0f1d] border-2 border-blue-400/60 rounded-2xl p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto text-white"
                dir="rtl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-2xl font-extrabold">📚 לוח עזרה בחשבון</h2>
                  <button
                    onClick={() => setShowReferenceModal(false)}
                    className="text-white/80 hover:text-white text-xl px-2"
                  >
                    ✖
                  </button>
                </div>
                <p className="text-sm text-white/70 mb-3">
                  בחר קטגוריה כדי לראות פעולות, נוסחאות ומונחים חשובים בחשבון.
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
      </div>
    </div>
    <TrackingDebugPanel
      subjectId="math"
      uiSelection={`operation=${operation}`}
      currentQuestion={currentQuestion}
      trackingRef={mathTrackingOperationKeyRef}
    />
  </Layout>
);
}




