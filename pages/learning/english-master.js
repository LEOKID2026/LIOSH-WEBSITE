import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Layout from "../../components/Layout";
import { useRouter } from "next/router";
import { useIOSViewportFix } from "../../hooks/useIOSViewportFix";
import { useMobileViewport } from "../../hooks/useMobileViewport";
import { trackEnglishTopicTime } from "../../utils/english-time-tracking";
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
  LIVE_PRACTICE_CORRECT_HE,
  LIVE_PRACTICE_GAME_OVER_HE,
  LIVE_PRACTICE_WRONG_HE,
  formatLearningWrongFeedbackHe,
} from "../../utils/learning-live-feedback-he";
import { reportModeFromGameState } from "../../utils/report-track-meta";
import {
  updateDailyStreak,
  getStreakReward,
} from "../../utils/daily-streak";
import { useGameAudio } from "../../hooks/useGameAudio";
import { startLearningMasterSessionAudio } from "../../lib/game-audio/learning-master-session-audio.js";
import { getQuestionFontStyle } from "../../utils/learning-question-font";
import { resolveLearningMcqChoiceClassName } from "../../utils/learning-mcq-choice-styles.client";
import { sanitizeQuestionForStudentDisplay } from "../../utils/student-question-stem-sanitizer";
import StudentQuestionDisplay from "../../components/learning/StudentQuestionDisplay";
import {
  buildHebrewApprovedVerbalMasterLayout,
  buildHebrewApprovedVerbalMcqGridClassName,
  getHebrewApprovedSingleVerbalQuestionStyle,
  HEBREW_APPROVED_VERBAL_ANSWER_AREA_CLASS,
} from "../../utils/hebrew-approved-verbal-master-contract.client.js";
import EnglishPhonicsAudioPanel from "../../components/EnglishPhonicsAudioPanel";
import { validateAudioStem } from "../../utils/audio-task-contract";
import { isLowerGradeG1G2Key } from "../../utils/lower-grade-practice-runtime-quality";
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
  selectQuestionWithProbe,
  probeMatchesSession,
  attachProbeMetaToQuestion,
  applyProbeOutcome,
  buildDiagnosticProbeClientMeta,
  clearActiveDiagnosticState,
  decrementPendingProbeExpiry,
} from "../../utils/active-diagnostic-runtime/index.js";
import { mergeDiagnosticContractIntoParams } from "../../utils/diagnostic-question-contract";
import { mcqCellValue } from "../../utils/mcq-option-cell";
import { useLearningMasterUi } from "../../hooks/useLearningMasterUi";
import SubjectMasterSessionShell from "../../components/learning/SubjectMasterSessionShell.jsx";
import StudentLoadingPanel from "../../components/ui/StudentLoadingPanel.jsx";
import { useGuestPlayableTopics } from "../../hooks/useGuestPlayableTopics.js";
import { GUEST_TOPIC_LOCK_MESSAGE_HE } from "../../lib/guest/constants.js";
import StudentLearningAvatar from "../../components/arcade/club/StudentLearningAvatar.jsx";
import ProfileBackgroundPickerGrid from "../../components/student/ProfileBackgroundPickerGrid.jsx";
import { DEFAULT_PROFILE_BACKGROUND_KEY } from "../../lib/student-ui/profile-background-options.js";
import { readProfileBackgroundFromLocalStorage } from "../../lib/student-ui/profile-background.client.js";
import LearningMasterHud from "../../components/learning/LearningMasterHud";
import LearningMasterNavBar from "../../components/learning/LearningMasterNavBar";
import LearningMasterMobileNavTitle from "../../components/learning/LearningMasterMobileNavTitle.jsx";
import LearningMasterDesktopHeader from "../../components/learning/LearningMasterDesktopHeader.jsx";
import LearningMasterAdSlot from "../../components/learning/LearningMasterAdSlot.jsx";
import LearningMasterMobileQuestionActionDock from "../../components/learning/LearningMasterMobileQuestionActionDock.jsx";
import { StepExerciseUiProvider } from "../../contexts/StepExerciseUiContext.jsx";
import { formatMathHudNumber } from "../../utils/math-master-hud-number.client.js";
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
import { computeFreePracticeTiming } from "../../lib/learning/timing-policy.js";
import TrackingDebugPanel from "../../components/TrackingDebugPanel";
import LearningPlannerRecommendationBlock from "../../components/LearningPlannerRecommendationBlock";
import {
  WORD_LISTS,
} from "../../data/english-questions";
import {
  ENGLISH_LEVELS as LEVELS,
  ENGLISH_TOPICS as TOPICS,
  ENGLISH_GRADES as GRADES,
  ENGLISH_GRADE_ORDER as GRADE_ORDER,
  getLevelForGrade,
  generateQuestion,
  englishGrammarRowKeyFromQuestion,
} from "../../utils/english-question-generator.js";
import { englishQuestionFingerprint } from "../../utils/english-learning-intel";
import { SessionAntiRepeatBuffer } from "../../utils/question-session-anti-repeat";
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
import { getLearningBookIndexHref } from "../../lib/learning-book/learning-book-catalog-meta";
import LearningBookIndexTile from "../../components/learning-book/LearningBookIndexTile";
import { getEnglishBookHref } from "../../lib/learning-book/resolve-english-book-page";
import {
  ENGLISH_BOOK_GRADES,
  consumeAnyEnglishBookLearningSnapshot,
  consumeAnyEnglishBookPracticePreset,
  isEnglishBookPracticeEntry,
  saveEnglishBookLearningSnapshot,
  withEnglishBookLearningReturn,
} from "../../lib/learning-book/english-book-nav";
import {
  buildBookContextClientMetaExtras,
  tryConsumeBookContextOnPracticeEntry,
} from "../../lib/learning-book/book-context-master-helper";
import { useStudentDisplayLevelPractice } from "../../hooks/useStudentDisplayLevelPractice.js";
import { StudentDisplayLevelSelect } from "../../components/learning/StudentDisplayLevelSelect.js";
import {
  isStudentAdaptiveActive,
  studentDisplayLevelKeys,
  studentDisplayLevelLabel,
  migrateLegacyPracticeKeyToDisplayLevel,
} from "../../lib/learning-client/student-display-level-practice.js";

const ENGLISH_BOOK_GRADE_SET = new Set(ENGLISH_BOOK_GRADES);

const MODES = {
  learning: { name: "למידה", description: "ללא סיום משחק, תרגול בקצב שלך" },
  challenge: { name: "אתגר", description: "טיימר + חיים, מרוץ ניקוד גבוה" },
  speed: { name: "מהירות", description: "תשובות מהירות = יותר נקודות! ⚡" },
  marathon: { name: "מרתון", description: "כמה שאלות תוכל לפתור? 🏃" },
  practice: { name: "תרגול", description: "בוחר נושא/מצב אימון מדויק" },
};

const STORAGE_KEY = "mleo_english_master";

const PRACTICE_FOCUS_OPTIONS = [
  { value: "balanced", label: "📚 כל הנושאים" },
  { value: "vocab_core", label: "🔤 אוצר מילים בסיסי" },
  { value: "grammar_forms", label: "✏️ דקדוק ומבנים" },
  { value: "writing_lab", label: "📝 כתיבה ומשפטים" },
  { value: "translation_boost", label: "📖 תרגום והבנת קטע" },
];

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
  colors: { label: "צבעים", lists: ["colors"] },
  animals: { label: "חיות", lists: ["animals"] },
  actions: { label: "פעלים נפוצים", lists: ["actions"] },
  emotions: { label: "רגשות", lists: ["emotions"] },
  school: { label: "חיי בית ספר", lists: ["school", "family"] },
  technology: { label: "טכנולוגיה", lists: ["technology", "global_issues"] },
};

const REFERENCE_CATEGORY_KEYS = Object.keys(REFERENCE_CATEGORIES);

function buildTop10ByScore(saved, level) {
  const allScores = [];
  Object.keys(TOPICS).forEach((topic) => {
    const key = `${level}_${topic}`;
    const levelData = saved[key] || [];
    if (Array.isArray(levelData)) {
      levelData.forEach((entry) => {
        const bestScore = entry.bestScore ?? entry.score ?? 0;
        const bestStreak = entry.bestStreak ?? entry.streak ?? 0;
        if (bestScore > 0) {
          allScores.push({
            name: entry.playerName || entry.name || "שחקן",
            bestScore,
            bestStreak,
            topic,
            timestamp: entry.timestamp || 0,
          });
        }
      });
    } else {
      Object.entries(levelData).forEach(([name, data]) => {
        const bestScore = data.bestScore ?? data.score ?? 0;
        const bestStreak = data.bestStreak ?? data.streak ?? 0;
        if (bestScore > 0) {
          allScores.push({
            name,
            bestScore,
            bestStreak,
            topic,
            timestamp: data.timestamp || 0,
          });
        }
      });
    }
  });
  const sorted = allScores
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
      topic: "",
      timestamp: 0,
      placeholder: true,
    });
  }
  return sorted;
}

function loadLeaderboardTop10ByDisplayLevel(saved, displayLevel) {
  const sourceKeys = displayLevel === "advanced" ? ["hard"] : ["easy", "medium"];
  const merged = sourceKeys.flatMap((sk) => buildTop10ByScore(saved, sk));
  merged.sort((a, b) => {
    if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
    if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak;
    return (b.timestamp || 0) - (a.timestamp || 0);
  });
  return merged.filter((e) => !e.placeholder).slice(0, 10);
}

function saveScoreEntry(saved, key, entry) {
  let levelData = saved[key];
  if (!levelData) {
    levelData = [];
  } else if (!Array.isArray(levelData)) {
    levelData = Object.entries(levelData).map(([name, data]) => ({
      playerName: name,
      bestScore: data.bestScore ?? data.score ?? 0,
      bestStreak: data.bestStreak ?? data.streak ?? 0,
      timestamp: data.timestamp || 0,
    }));
  }
  levelData.push(entry);
  if (levelData.length > 100) {
    levelData = levelData.slice(-100);
  }
  saved[key] = levelData;
}

// פונקציית עזר למיספור צעדים
function makeStep(num, text) {
  return (
    <div
      key={num}
      dir="rtl"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.4rem",
      }}
    >
      {/* המספר – תמיד מיושר וכיווני LTR כדי שלא יברח לסוף */}
      <span
        dir="ltr"
        style={{
          minWidth: "1.5em",
          textAlign: "center",
          fontWeight: 700,
        }}
      >
        .{num}
      </span>
      {/* הטקסט – בעברית, RTL */}
      <span style={{ flex: 1 }}>{text}</span>
    </div>
  );
}

// הסבר מפורט צעד-אחר-צעד לפי נושא וכיתה
function getSolutionSteps(question, topic, gradeKey) {
  if (!question || !question.params) return [];
  const { correctAnswer } = question;

  switch (topic) {
    case "vocabulary": {
      if (question.params.direction === "en_to_he") {
        return [
          makeStep(1, `נבין שהמילה "${question.params.word}" היא באנגלית.`),
          makeStep(2, "נחפש את הפירוש של המילה בעברית."),
          makeStep(3, `הפירוש הנכון הוא: ${correctAnswer}.`),
          makeStep(4, "נבדוק שהפירוש הגיוני ונכון."),
        ];
      } else {
        return [
          makeStep(1, `נבין שהמילה "${question.params.word}" היא בעברית.`),
          makeStep(2, "נחפש את הפירוש של המילה באנגלית."),
          makeStep(3, `הפירוש הנכון הוא: ${correctAnswer}.`),
          makeStep(4, "נבדוק שהפירוש הגיוני ונכון."),
        ];
      }
    }

    case "grammar": {
      return [
        makeStep(1, "נבין את כללי הדקדוק באנגלית."),
        makeStep(
          2,
          "I (אני) = am, You/We/They (אתה/אנחנו/הם) = are, He/She/It (הוא/היא/זה) = is."
        ),
        makeStep(3, `התשובה הנכונה היא: ${correctAnswer}.`),
        makeStep(
          4,
          question.params.explanation ||
            "נבדוק שהתשובה מתאימה לנושא המשפט."
        ),
      ];
    }

    case "translation": {
      if (question.params.direction === "en_to_he") {
        return [
          makeStep(
            1,
            `נקרא את המשפט באנגלית: "${question.params.sentence}".`
          ),
          makeStep(2, "ננסה לתרגם כל מילה או חלק מהמשפט."),
          makeStep(3, "נחבר את המילים למשפט בעברית."),
          makeStep(4, `התרגום הנכון: ${correctAnswer}.`),
        ];
      } else {
        return [
          makeStep(
            1,
            `נקרא את המשפט בעברית: "${question.params.sentence}".`
          ),
          makeStep(2, "ננסה לתרגם כל מילה או חלק מהמשפט לאנגלית."),
          makeStep(3, "נחבר את המילים למשפט באנגלית."),
          makeStep(4, `התרגום הנכון: ${correctAnswer}.`),
        ];
      }
    }

    case "sentences": {
      return [
        makeStep(1, `נקרא את המשפט: "${question.params.template}".`),
        makeStep(
          2,
          "נבין מה חסר במשפט - איזו מילה או צורה דקדוקית."
        ),
        makeStep(
          3,
          "נבדוק מה מתאים לפי כללי הדקדוק: I/You/We/They = are, He/She/It = is."
        ),
        makeStep(
          4,
          `התשובה הנכונה: ${correctAnswer}. ${
            question.params.explanation || ""
          }`
        ),
      ];
    }

    case "writing": {
      if (question.params.type === "word") {
        return [
          makeStep(
            1,
            `נקרא את המילה בעברית: "${question.params.wordHe}".`
          ),
          makeStep(2, "נזכר בצורה שלה באנגלית שלמדנו קודם."),
          makeStep(
            3,
            "נכתוב אות-אחר-אות, ושמים לב לאיות (spelling)."
          ),
          makeStep(4, `התשובה הנכונה היא: ${correctAnswer}.`),
        ];
      }
      if (question.params.type === "sentence") {
        return [
          makeStep(
            1,
            `נקרא את המשפט בעברית: "${question.params.sentenceHe}".`
          ),
          makeStep(
            2,
            "נפרק את המשפט לחלקים ונחשוב איך אומרים כל חלק באנגלית."
          ),
          makeStep(
            3,
            "נבדוק סדר מילים נכון ואות גדולה בתחילת המשפט."
          ),
          makeStep(4, `המשפט הנכון: ${correctAnswer}.`),
        ];
      }
      return [];
  }

    default:
  return [];
  }
}

// "למה טעיתי?" – הסבר קצר לטעות נפוצה
function getErrorExplanation(question, topic, wrongAnswer, gradeKey, opts = {}) {
  if (!question) return "";
  const userAns = String(wrongAnswer).toLowerCase();
  const correctAns = String(question.correctAnswer).toLowerCase();
  const learning = opts.mode === "learning";
  const ca = question.correctAnswer;

  switch (topic) {
    case "vocabulary":
      return learning
        ? `התשובה הנכונה היא "${ca}". בדוק שוב: האם הפירוש שבחרת מתאים למילה?`
        : "בדוק שוב: האם הפירוש שבחרת מתאים למילה? נסה לחשוב על המילה בעברית/אנגלית לפי ההקשר.";

    case "grammar":
      if (userAns === "is" && correctAns === "am") {
        return "זכור: I (אני) תמיד עם am, לא is. I am = אני.";
      }
      if (userAns === "am" && (correctAns === "is" || correctAns === "are")) {
        return "זכור: am משמש רק עם I (אני). He/She/It = is, You/We/They = are.";
      }
      return learning
        ? `התשובה הנכונה היא "${ca}". בדוק שוב את כללי הדקדוק: I am, You/We/They are, He/She/It is.`
        : "בדוק שוב את כללי הדקדוק: I am, You/We/They are, He/She/It is.";

    case "translation":
      return learning
        ? `התרגום הנכון: ${ca}. בדוק שוב: האם תרגמת את כל המילים נכון?`
        : "בדוק שוב: האם תרגמת את כל המילים נכון? נסה לחשוב על המשמעות של המשפט ולא רק על מילים בודדות.";

    case "sentences":
      return learning
        ? `התשובה הנכונה היא "${ca}". בדוק שוב: האם המילה שבחרת מתאימה לנושא המשפט?`
        : "בדוק שוב: האם המילה שבחרת מתאימה לנושא המשפט? זכור: I/You/We/They = are, He/She/It = is.";

    case "writing":
      return learning
        ? `התשובה הנכונה היא "${ca}". כנראה שטעית באיות - בדוק שוב אות-אחר-אות.`
        : "כנראה שטעית באיות (spelling). בדוק שוב אות-אחר-אות, שים לב אל th / sh / ch ולסיום המילה (s / ed / ing).";

    default:
      return "";
  }
}

export default function EnglishMaster() {
  useIOSViewportFix();
  const isMobileViewport = useMobileViewport();
  const { MB, ui, shellClass, shellBgStyle } = useLearningMasterUi();
  const {
    learningModalOverlay,
    learningModalPanel,
    learningModalHeader,
    learningModalCloseBtn,
    learningModalTitle,
    learningModalFooter,
    learningQuestionBox,
    learningQuestionText,
    learningExplBody,
    learningModalScrollBody,
    stepExerciseUi,
    learningPrimaryCloseBtn,
    learningExplainOpenBtn,
  } = ui;
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
  const learningSessionStartPromiseRef = useRef(null);
  const plannerResponseSeqRef = useRef(0);
  const plannerNextSessionClientMetaRef = useRef(null);
  const pendingEnglishTrackMetaRef = useRef(null);
  /** localStorage bucket key for the question currently being timed (same idea as geometry topic ref). */
  const englishTrackingTopicKeyRef = useRef(null);
  const learningProfileStudentIdRef = useRef(null);
  const learningProfileHydratedRef = useRef(false);
  const [serverAccountSubjectAccuracyPct, setServerAccountSubjectAccuracyPct] = useState(null);
  const [learningProfileHydrationTick, setLearningProfileHydrationTick] = useState(0);
  const scoresStoreRef = useRef({});
  const progressLoadedRef = useRef(false);
  const progressStringRef = useRef("");

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
  } = useSubjectSessionDefaults({ permissionKey: "english" });
  const safeGrade = grade || "g1";
  const visibleEnglishTopics = useMemo(
    () => listVisibleTopicsForSelfPractice("english", safeGrade, GRADES[safeGrade]?.topics ?? []),
    [safeGrade]
  );
  const englishTopicSelectOptions = useMemo(() => {
    const curriculum = GRADES[safeGrade]?.topics ?? [];
    if (curriculum.includes("mixed")) return [...visibleEnglishTopics, "mixed"];
    return visibleEnglishTopics;
  }, [safeGrade, visibleEnglishTopics]);
  const guestTopics = useGuestPlayableTopics("english", visibleEnglishTopics);
  const [mode, setMode] = useState("practice");
  const [practiceFocus, setPracticeFocus] = useState("balanced");
  const [focusedPracticeMode, setFocusedPracticeMode] = useState("normal");
  const [useStoryQuestions, setUseStoryQuestions] = useState(false);
  const [storyOnly, setStoryOnly] = useState(false);
  const {
    displayLevel,
    displayLevelRef,
    sourceDifficulty: level,
    handleDisplayLevelChange: onDisplayLevelChange,
    resetAdaptiveForSessionStart,
    applyAnswerAdaptive,
    applyPlannerLevelKey,
    hydrateFromResumeSnapshot,
    buildSessionStartLevelFields,
    buildAnswerLevelFields,
    tagQuestion,
  } = useStudentDisplayLevelPractice("english");
  const handleDisplayLevelChange = useCallback((nextDisplayLevel) => {
    onDisplayLevelChange(nextDisplayLevel);
    setGameActive(false);
  }, [onDisplayLevelChange]);
  const [topic, setTopic] = useState("vocabulary");
  const [gameActive, setGameActive] = useState(false);
  const [adaptivePlannerRecommendationView, setAdaptivePlannerRecommendationView] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [typedAnswer, setTypedAnswer] = useState("");
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
  const [showPracticeOptions, setShowPracticeOptions] = useState(false);
  
  // Daily Streak
  const [dailyStreak, setDailyStreak] = useState({ streak: 0, lastDate: null });
  const [showStreakReward, setShowStreakReward] = useState(null);
  
  // Sound system
  const audio = useGameAudio();
  
  const [playerLevel, setPlayerLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [progress, setProgress] = useState({
    vocabulary: { total: 0, correct: 0 },
    grammar: { total: 0, correct: 0 },
    translation: { total: 0, correct: 0 },
    sentences: { total: 0, correct: 0 },
    writing: { total: 0, correct: 0 },
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

  // הסבר מפורט לשאלה
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

  // הסבר לטעות אחרונה
  const [errorExplanation, setErrorExplanation] = useState("");

  const [showMixedSelector, setShowMixedSelector] = useState(false);
  const [mixedTopics, setMixedTopics] = useState({
    vocabulary: true,
    grammar: false,
    translation: true,
    sentences: false,
    writing: false,
  });
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const [leaderboardLevel, setLeaderboardLevel] = useState("regular");
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [showHowTo, setShowHowTo] = useState(false);
  const [mistakes, setMistakes] = useState([]);
  const englishPendingDiagnosticProbeRef = useRef(null);
  const englishHypothesisLedgerRef = useRef(null);
  const englishGrammarRecentRowKeysRef = useRef([]);
  const bookPracticePresetRef = useRef(null);
  const practiceForceKindRef = useRef(null);
  const practiceForceSkillIdRef = useRef(null);
  const bookPracticeSemanticTopicRef = useRef(null);
  const bookIndexHref = getLearningBookIndexHref("english", grade);
  const bookTopicHref = useMemo(() => {
    if (!ENGLISH_BOOK_GRADE_SET.has(grade)) return null;
    return getEnglishBookHref({ grade, topic });
  }, [grade, topic]);
  const questionBookHref = useMemo(() => {
    if (mode !== "learning" || !currentQuestion) return null;
    if (!ENGLISH_BOOK_GRADE_SET.has(grade)) return null;
    const params = currentQuestion.params || {};
    return getEnglishBookHref({
      grade,
      topic: currentQuestion.topic || topic,
      forceKind: params.bookPageId ?? practiceForceKindRef.current,
      pageId: params.bookPageId ?? null,
      listKey: params.listKey ?? null,
      englishPoolKey: params.englishPoolKey ?? null,
    });
  }, [grade, mode, currentQuestion, topic]);
  const [showPracticeModal, setShowPracticeModal] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [referenceCategory, setReferenceCategory] = useState(REFERENCE_CATEGORY_KEYS[0]);
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
      if (!ENGLISH_BOOK_GRADE_SET.has(grade)) return;
      const snapshot = {
        gameActive: true,
        mode,
        grade,
        gradeNumber,
        displayLevel: displayLevelRef.current,
        level,
        topic,
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
      saveEnglishBookLearningSnapshot(grade, snapshot);
      router.push(withEnglishBookLearningReturn(href));
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
      typedAnswer,
      feedback,
      questionStartTime,
      router,
    ]
  );

  const applyBookPracticePreset = useCallback((preset) => {
    if (!preset || preset.mode !== "learning") return;
    const presetGrade = preset.grade;
    if (!ENGLISH_BOOK_GRADE_SET.has(presetGrade)) return;
    const presetTopic = preset.topic;
    if (!presetTopic || typeof preset.forceKind !== "string") return;
    bookPracticePresetRef.current = preset;
    practiceForceKindRef.current = preset.forceKind || null;
    practiceForceSkillIdRef.current = preset.skillId || null;
    bookPracticeSemanticTopicRef.current = presetTopic;
    setGrade(presetGrade);
    const presetGradeNumber = gradeKeyToNumber(presetGrade);
    if (presetGradeNumber) {
      setGradeNumber(presetGradeNumber);
    }
    setMode("learning");
    setTopic(presetTopic);
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
    const snap = consumeAnyEnglishBookLearningSnapshot();
    if (!snap || snap.gameActive !== true) return;
    const migrated = hydrateFromResumeSnapshot(snap);
    setMode(typeof migrated.mode === "string" ? migrated.mode : "practice");
    if (typeof migrated.grade === "string") setGrade(migrated.grade);
    if (typeof migrated.gradeNumber === "number") setGradeNumber(migrated.gradeNumber);
    if (typeof snap.topic === "string") setTopic(snap.topic);
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
    if (!isEnglishBookPracticeEntry(router.query)) return;
    const preset = consumeAnyEnglishBookPracticePreset();
    if (preset) {
      applyBookPracticePreset(preset);
    }
  }, [router.isReady, router.query, applyBookPracticePreset]);

  useEffect(() => {
    tryConsumeBookContextOnPracticeEntry(
      router,
      { subject: "english", grade },
      { bookContextRef, bookContextConsumedRef }
    );
  }, [router.isReady, router.query, grade]);

  const [playerAvatar, setPlayerAvatar] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("mleo_player_avatar") || "👤";
      } catch {
        return "👤";
      }
    }
    return "👤";
  });
  const [playerAvatarImage, setPlayerAvatarImage] = useState(null); // תמונת אווטר מותאמת אישית
  const [playerAvatarBackground, setPlayerAvatarBackground] = useState(DEFAULT_PROFILE_BACKGROUND_KEY);
  const [showPlayerProfile, setShowPlayerProfile] = useState(false);
  const gradeLabels = ["א", "ב", "ג", "ד", "ה", "ו"];

  useEffect(() => {
    clearActiveDiagnosticState(
      englishPendingDiagnosticProbeRef,
      englishHypothesisLedgerRef
    );
    englishGrammarRecentRowKeysRef.current = [];
  }, [grade, level, topic, practiceFocus]);

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
        const acc = mapSubjectAccountViewFromStudentProfile(profile, "english");
        const sub = profile.row.subjects?.english;
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
        const { daily: chDaily, weekly: chWeekly } = pickSubjectChallengeBlobs(ch, "english");
        if (chDaily) setDailyChallenge(chDaily);
        if (chWeekly) setWeeklyChallenge(chWeekly);
        setServerAccountSubjectAccuracyPct(accountAccuracyDisplayFromDerived(profile.derived, "english"));
        const st = profile.row.streaks?.english;
        if (st && typeof st === "object") setDailyStreak(st);
        applyLearningProfileAvatarRowToPlayerState(
          profile.row.profile,
          setPlayerAvatar,
          setPlayerAvatarImage,
          setPlayerAvatarBackground,
        );
        learningProfileHydratedRef.current = true;
        try {
          const pr = profile.row.subjects?.english?.progressStore?.progress;
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
    debounceStudentLearningProfilePatch("english-master-sync", () => {
      const base = {
        subjects: {
          english: {
            progressStore,
            scoresStore: scoresStoreRef.current,
            mistakes,
            intel: {},
          },
        },
        challenges: subjectChallengePatch("english", dailyChallenge, weeklyChallenge),
        streaks: { english: dailyStreak },
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
    const idx = GRADE_ORDER.indexOf(grade);
    if (idx !== -1 && gradeNumber !== idx + 1) {
      setGradeNumber(idx + 1);
    }
  }, [grade, gradeNumber]);

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

  const handleGradeNumberChange = (value) => {
    const numeric = Number(value);
    if (!numeric) return;
    const nextGradeKey = GRADE_ORDER[numeric - 1] || "g3";
    practiceForceKindRef.current = null;
    practiceForceSkillIdRef.current = null;
    bookPracticeSemanticTopicRef.current = null;
    setGradeNumber(numeric);
    setGrade(nextGradeKey);
    setGameActive(false);
  };

  function updateTopicProgress(topic, isCorrect) {
    if (!topic) return;
    setProgress((prev) => {
      const prevEntry = prev[topic] || { total: 0, correct: 0 };
      return {
        ...prev,
        [topic]: {
          total: (prevEntry.total || 0) + 1,
          correct: (prevEntry.correct || 0) + (isCorrect ? 1 : 0),
        },
      };
    });
  }

  function refreshMistakes() {
    if (typeof window === "undefined") return;
    try {
      const saved = JSON.parse(localStorage.getItem("mleo_english_mistakes") || "[]");
      setMistakes(saved.slice(-50).reverse());
    } catch {}
  }

  function clearMistakes() {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem("mleo_english_mistakes");
      setMistakes([]);
    } catch {}
  }

  function handleMistakePractice(entry) {
    if (!entry) return;
    const gradeKey = entry.grade || grade;
    const levelKey = entry.level || level;
    const topicKey = entry.topic || "vocabulary";
    const gradeIdx = GRADE_ORDER.indexOf(gradeKey);
    if (gradeIdx !== -1) {
      setGradeNumber(gradeIdx + 1);
    }
    setGrade(gradeKey);
    if (levelKey) applyPlannerLevelKey(levelKey);
    setTopic(topicKey);
    setMode("learning");
    setGameActive(false);
    setShowPracticeModal(false);
    setTimeout(() => {
      if (playerName.trim()) {
        startGame();
      } else {
        setFeedback("הכנס שם שחקן כדי לתרגל את הטעות שנבחרה");
      }
    }, 200);
  }

  function logEnglishMistakeEntry(entry) {
    if (typeof window === "undefined") return;
    try {
      const saved = JSON.parse(
        localStorage.getItem("mleo_english_mistakes") || "[]"
      );
      saved.push({ ...entry, timestamp: Date.now() });
      if (saved.length > 200) saved.shift();
      localStorage.setItem("mleo_english_mistakes", JSON.stringify(saved));
      refreshMistakes();
    } catch {}
  }

  const applyEnglishTopicCreditFromClosed = useCallback(
    (closed, questionForTrack, metaHint) => {
      if (!closed || closed.creditedSecForTopic <= 0) return;
      const topicKey =
        englishTrackingTopicKeyRef.current ?? questionForTrack?.topic;
      if (!topicKey) return;
      const qGrade = questionForTrack?.gradeKey || grade;
      const qLevel = questionForTrack?.levelKey || level;
      trackEnglishTopicTime(
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
              const meta = pendingEnglishTrackMetaRef.current;
              pendingEnglishTrackMetaRef.current = null;
              if (meta && meta.mode != null) {
                applyEnglishTopicCreditFromClosed(closed, questionForTrack, {
                  mode: meta.mode,
                  correct: meta.correct,
                  total: meta.total,
                });
              } else {
                applyEnglishTopicCreditFromClosed(closed, questionForTrack);
              }
            }
          : null
      );
      if (questionStartTime) setQuestionStartTime(null);
    },
    [currentQuestion, questionStartTime, applyEnglishTopicCreditFromClosed]
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
        const acc = accountAccuracyDisplayFromDerived(p.derived, "english");
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
          source: "english-master",
          version: "phase-2d-b4",
        },
      }).catch(() => {
        notifyLearningSessionSaveFailure(setFeedback, "english-master");
      });
      if (includePlannerRecommendation) {
        const cid = (plannerResponseSeqRef.current += 1);
        scheduleAdaptivePlannerRecommendation(
          {
            learningSessionId: sessionIdForFinish,
            subject: "english",
            grade: gradeNumber,
            topic: englishTrackingTopicKeyRef.current ?? currentQuestion?.topic ?? "",
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

  function buildEnglishSessionStartPayload() {
    const baseMeta = {
      source: "english-master",
      version: "phase-2d-b4",
    };
    const plannerExtra = plannerNextSessionClientMetaRef.current;
    return {
      subject: "english",
      topic: String(englishTrackingTopicKeyRef.current || currentQuestion?.topic || topic || "english"),
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
    const startPromise = startLearningSession(buildEnglishSessionStartPayload())
      .then((res) => {
        const id = res?.learningSessionId ? String(res.learningSessionId) : "";
        if (!id) return null;
        learningSessionIdRef.current = id;
        return id;
      })
      .catch((error) => {
        console.warn("[english-master] session start save failed", error);
        return null;
      })
      .finally(() => {
        learningSessionStartPromiseRef.current = null;
        plannerNextSessionClientMetaRef.current = null;
      });
    learningSessionStartPromiseRef.current = startPromise;
    return startPromise;
  }

  function saveEnglishAnswerInParallel({
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
    const questionFingerprint = englishQuestionFingerprint(question) || null;
    const questionId = question?.id
      ? String(question.id)
      : questionFingerprint || `english-${Date.now()}`;
    const expectedValue =
      Array.isArray(question?.acceptedAnswers) && question.acceptedAnswers.length > 0
        ? question.acceptedAnswers.join(" | ")
        : question?.correctAnswer != null
          ? String(question.correctAnswer)
          : null;
    const questionEngine = question
      ? buildQuestionEngineMetadataFromQuestion(question, {
          selectedValue: userAnswer,
          generatorSource: "english-master",
          afterStepByStep: stepByStepViewedRef.current,
        })
      : null;
    const answerLevelFields = buildAnswerLevelFields(
      question?.sourceDifficulty || question?.levelKey || level
    );
    ensureLearningSessionId()
      .then((learningSessionId) => {
        if (!learningSessionId) return;
        return saveLearningAnswer({
          learningSessionId,
          subject: "english",
          topic: String(question?.topic || topic || "english"),
          gameMode: reportModeFromGameState(mode, focusedPracticeMode),
          questionId,
          questionFingerprint,
          prompt: String(question?.question || ""),
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
            source: "english-master",
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
        console.warn("[english-master] answer save failed", error);
      });
  }

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
      logAccountTileSync("english", {
        tile: "personalBests",
        level,
        topic,
        displayedBestScore: maxScore,
        displayedBestStreak: maxStreak,
      });
    } catch {}
  }, [level, topic, playerName, learningProfileHydrationTick]);

  useEffect(() => {
    return () => {
      recordSessionProgress({ includePlannerRecommendation: false });
    };
  }, []);

  useEffect(() => {
    if (!grade) return;
    if (showMixedSelector) return;
    if (practiceForceKindRef.current) return;
    const allowed = englishTopicSelectOptions;
    if (!allowed.includes(topic)) {
      const firstAllowed = allowed.find((t) => t !== "mixed") || allowed[0];
      setTopic(firstAllowed);
    }
  }, [grade, showMixedSelector, englishTopicSelectOptions, topic]);

  useEffect(() => {
    if (!grade) return;
    const availableTopics = visibleEnglishTopics;
    const newMixedTopics = {
      vocabulary: availableTopics.includes("vocabulary"),
      grammar: availableTopics.includes("grammar"),
      translation: availableTopics.includes("translation"),
      sentences: availableTopics.includes("sentences"),
      writing: availableTopics.includes("writing"),
    };
    setMixedTopics(newMixedTopics);
  }, [grade, visibleEnglishTopics]);

  useEffect(() => {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
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
        saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      }
      const key = `${level}_${topic}`;
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
        const patchBody = { subjects: { english: { scoresStore: saved } } };
        void patchStudentLearningProfile(patchBody)
          .then((json) => {
            const acc = accountAccuracyDisplayFromDerived(json?.derived, "english");
            if (acc != null) setServerAccountSubjectAccuracyPct(acc);
            logAccountTileSync("english", {
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
      englishPendingDiagnosticProbeRef,
      englishHypothesisLedgerRef
    );
    englishGrammarRecentRowKeysRef.current = [];
    setGameActive(false);
    englishTrackingTopicKeyRef.current = null;
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

  const accumulateQuestionTime = useCallback(() => {
    closeOpenQuestionLedger(false);
  }, [closeOpenQuestionLedger]);

  const beginEnglishQuestionLedger = useCallback(
    (questionObj) => {
      if (!questionObj) return;
      beginMasterQuestionLedger(questionTimeLedgerRef, {
        subjectId: "english",
        mode,
        question: questionObj,
      });
    },
    [mode]
  );

  function generateNewQuestion() {
    clearWrongAnswerAdvanceState();
    closeOpenQuestionLedger(true);
    let gradeForQuestion = grade;
    let levelForQuestion = level;
    let topicForState = topic;
    if (practiceForceKindRef.current && bookPracticeSemanticTopicRef.current) {
      topicForState = bookPracticeSemanticTopicRef.current;
    }
    let mixedConfig = topic === "mixed" ? mixedTopics : null;

    if (focusedPracticeMode === "mistakes" && mistakes.length > 0) {
      const randomMistake =
        mistakes[Math.floor(Math.random() * mistakes.length)];
      if (randomMistake.grade) {
        gradeForQuestion = randomMistake.grade;
      }
      if (randomMistake.level) {
        levelForQuestion = randomMistake.level;
      }
      if (randomMistake.topic) {
        topicForState = randomMistake.topic;
      }
    }

    if (focusedPracticeMode === "graded") {
      levelForQuestion =
        correct < 5 ? "easy" : correct < 15 ? "medium" : level;
    }

    const translationVisible = visibleEnglishTopics.includes("translation");

    if (mode === "practice") {
      switch (practiceFocus) {
        case "vocab_core":
          topicForState = "vocabulary";
          break;
        case "grammar_forms":
          topicForState = "grammar";
          break;
        case "writing_lab":
          topicForState = "writing";
          break;
        case "translation_boost":
          if (translationVisible) topicForState = "translation";
          break;
        default:
          break;
      }
    }

    if (storyOnly && translationVisible) {
      topicForState = "translation";
    } else if (useStoryQuestions && translationVisible && topicForState !== "translation") {
      topicForState = Math.random() < 0.5 ? "translation" : topicForState;
    }

    const levelConfig = getLevelForGrade(levelForQuestion, gradeForQuestion);
    let question;
    let attempts = 0;
    const maxAttempts = 50;
    const localRecentQuestions = SessionAntiRepeatBuffer.fromIterable(recentQuestions);
    const probeAtStart = englishPendingDiagnosticProbeRef.current;
    const probeMetaHolder = { current: null };
    do {
      question = generateQuestion(
        levelConfig,
        topicForState,
        gradeForQuestion,
        topicForState === "mixed" ? mixedConfig : null,
        levelForQuestion,
        {
          grammarProbe: probeAtStart,
          grammarRecentRowKeys: englishGrammarRecentRowKeysRef.current,
          probeMetaHolder,
          forceKind: practiceForceKindRef.current,
          forceSkillId: practiceForceSkillIdRef.current,
        }
      );
      attempts++;
      const questionKey = englishQuestionFingerprint(question);
      if (localRecentQuestions.wouldAccept(questionKey)) {
        localRecentQuestions.record(questionKey);
        break;
      }
    } while (attempts < maxAttempts);
    if (attempts >= maxAttempts) {
      localRecentQuestions.softenOnExhaustion();
    }
    setRecentQuestions(localRecentQuestions.toSet());
    question.gradeKey = gradeForQuestion;
    question.levelKey = levelForQuestion;
    question.practiceFocus = mode === "practice" ? practiceFocus : "default";
    if (probeMetaHolder.current) {
      question = attachProbeMetaToQuestion(question, probeMetaHolder.current);
    }
    if (probeAtStart) {
      const probeConsumed =
        probeMetaHolder.current != null || question.topic === "grammar";
      if (probeConsumed) {
        englishPendingDiagnosticProbeRef.current = null;
      }
    }
    const grammarProbeRetainedInMixed =
      probeAtStart &&
      topicForState === "mixed" &&
      englishPendingDiagnosticProbeRef.current &&
      question.topic !== "grammar" &&
      !probeMetaHolder.current;
    if (!grammarProbeRetainedInMixed) {
      decrementPendingProbeExpiry(englishPendingDiagnosticProbeRef);
    }
    if (question.topic === "grammar") {
      const k = englishGrammarRowKeyFromQuestion(question);
      const prev = englishGrammarRecentRowKeysRef.current || [];
      englishGrammarRecentRowKeysRef.current = [...prev.filter((x) => x !== k), k].slice(
        -24
      );
    }
    englishTrackingTopicKeyRef.current = question.topic;
    if (currentQuestion) {
      setPreviousExplanationQuestion(currentQuestion);
    }
    const displayQuestion = tagQuestion(sanitizeQuestionForStudentDisplay(question));
    setCurrentQuestion(displayQuestion);
    setSelectedAnswer(null);
    setTypedAnswer("");
    setFeedback(null);
    setQuestionStartTime(Date.now());
    beginEnglishQuestionLedger(displayQuestion);
    setShowSolution(false);
    setShowPreviousSolution(false);
    setErrorExplanation("");
    stepByStepViewedRef.current = false;
  }

  function startGame(opts = {}) {
    if (guestTopics.isGuest && topic !== "mixed" && guestTopics.isLocked(topic)) {
      alert(GUEST_TOPIC_LOCK_MESSAGE_HE);
      return;
    }
    if (opts.fromAdaptivePlannerRecommendedPractice && opts.plannerSessionMeta && typeof opts.plannerSessionMeta === "object") {
      plannerNextSessionClientMetaRef.current = opts.plannerSessionMeta;
      if (opts.appliedLevelKey) {
        applyPlannerLevelKey(opts.appliedLevelKey);
      }
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
      englishPendingDiagnosticProbeRef,
      englishHypothesisLedgerRef
    );
    englishGrammarRecentRowKeysRef.current = [];
    setRecentQuestions(new Set());
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
    stepByStepViewedRef.current = false;
    learningSessionIdRef.current = null;
    learningSessionStartPromiseRef.current = null;
    
    startLearningMasterSessionAudio(audio);
    setErrorExplanation("");
    void ensureLearningSessionId();
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
    // Stop background music when game stops
    audio.stopMusic();
    clearActiveDiagnosticState(
      englishPendingDiagnosticProbeRef,
      englishHypothesisLedgerRef
    );
    englishGrammarRecentRowKeysRef.current = [];
    pendingEnglishTrackMetaRef.current = {
      correct: undefined,
      total: 1,
      mode: reportModeFromGameState(mode, focusedPracticeMode),
    };
    trackCurrentQuestionTime();
    recordSessionProgress();
    setGameActive(false);
    englishTrackingTopicKeyRef.current = null;
    setCurrentQuestion(null);
    setFeedback(null);
    setSelectedAnswer(null);
    setShowSolution(false);
    setShowPreviousSolution(false);
    setPreviousExplanationQuestion(null);
    saveRunToStorage();
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

  function advanceToNextQuestionManually() {
    clearWrongAnswerAdvanceState();
    setSelectedAnswer(null);
    setTypedAnswer("");
    setFeedback(null);
    generateNewQuestion();
  }

  function handleEnglishPrimaryAnswerButtonClick() {
    const { action } = getLearningPrimaryAnswerButtonState({
      selectedAnswer,
      textAnswer: typedAnswer,
    });
    if (action === "next") {
      advanceToNextQuestionManually();
      return;
    }
    if (typedAnswer.trim() !== "") {
      handleAnswer(typedAnswer.trim());
    }
  }

  function handleTimeUp() {
    audio.playSfx("sfx-game-over");
    pendingEnglishTrackMetaRef.current = {
      correct: 0,
      total: 1,
      mode: reportModeFromGameState(mode, focusedPracticeMode),
    };
    trackCurrentQuestionTime();
    recordSessionProgress();
    setWrong((prev) => prev + 1);
    setStreak(0);
    setFeedback("הזמן נגמר! המשחק נגמר! ⏰");
    setGameActive(false);
    englishTrackingTopicKeyRef.current = null;
    setCurrentQuestion(null);
    setTimeLeft(0);
    saveRunToStorage();
    setTimeout(() => {
      hardResetGame();
    }, 2000);
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
    const acceptedAnswers =
      Array.isArray(currentQuestion.acceptedAnswers) &&
      currentQuestion.acceptedAnswers.length > 0
        ? currentQuestion.acceptedAnswers
        : [currentQuestion.correctAnswer];
    const { isCorrect } = compareAnswers({
      mode: "exact_text",
      user: answer,
      expected: currentQuestion.correctAnswer,
      acceptedList: acceptedAnswers,
    });
    const questionGradeKey = currentQuestion.gradeKey || grade;

    let diagnosticProbeMetaForSave = null;
    if (
      questionForSave._diagnosticProbeAttempt === true &&
      questionForSave._probeMeta
    ) {
      let inferredTags = [];
      const probeAnsweredAt = Date.now();
      if (!isCorrect) {
        let wrongEntry = {
          topic: currentQuestion.topic,
          topicOrOperation: currentQuestion.topic,
          bucketKey: currentQuestion.topic,
          grade: questionGradeKey,
          level: currentQuestion.levelKey || level,
          mode: reportModeFromGameState(mode, focusedPracticeMode),
          question: currentQuestion.question,
          exerciseText: currentQuestion.question,
          correctAnswer: currentQuestion.correctAnswer,
          wrongAnswer: answer,
          userAnswer: answer,
          isCorrect: false,
          patternFamily:
            currentQuestion.params?.patternFamily != null
              ? String(currentQuestion.params.patternFamily)
              : null,
          conceptTag:
            currentQuestion.params?.conceptTag != null
              ? String(currentQuestion.params.conceptTag)
              : null,
          distractorFamily:
            currentQuestion.params?.distractorFamily != null
              ? String(currentQuestion.params.distractorFamily)
              : null,
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
        const normalizedWrong = normalizeMistakeEvent(wrongEntry, "english");
        inferredTags = inferNormalizedTags(normalizedWrong, "english");
      }
      englishHypothesisLedgerRef.current = applyProbeOutcome(
        englishHypothesisLedgerRef.current,
        {
          isCorrect,
          inferredTags,
          probeMeta: questionForSave._probeMeta,
          now: probeAnsweredAt,
        }
      );
      diagnosticProbeMetaForSave = buildDiagnosticProbeClientMeta({
        probeMeta: questionForSave._probeMeta,
        ledger: englishHypothesisLedgerRef.current,
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

    pendingEnglishTrackMetaRef.current = {
      correct: isCorrect ? 1 : 0,
      total: 1,
      mode: reportModeFromGameState(mode, focusedPracticeMode),
    };
    if (
      isStudentAdaptiveActive("english", {
        displayLevel: displayLevelRef.current,
        mode: focusedPracticeMode,
      })
    ) {
      applyAnswerAdaptive(isCorrect, {
        displayLevel: displayLevelRef.current,
        mode: focusedPracticeMode,
      });
    }
    saveEnglishAnswerInParallel({
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
    let awardedPoints = 0;
    if (isCorrect) {
      awardedPoints = 10 + streak;
      if (mode === "speed") {
        const timeBonus = timeLeft ? Math.floor(timeLeft * 2) : 0;
        awardedPoints += timeBonus;
      }
      setScore((prev) => prev + awardedPoints);
      setStreak((prev) => prev + 1);
      setCorrect((prev) => prev + 1);
      
      clearWrongAnswerAdvanceState();
      setErrorExplanation("");

      const top = currentQuestion.topic;
      updateTopicProgress(top, true);
      const newCorrect = correct + 1;
      if (newCorrect % 5 === 0) {
        setStars((prev) => {
          const newStars = prev + 1;
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
      const newStreak = streak + 1;
      if (newStreak === 10 && !badges.includes("🔥 Hot Streak")) {
        const newBadge = "🔥 Hot Streak";
        setBadges((prev) => [...prev, newBadge]);
        setShowBadge(newBadge);
        audio.playSfx("sfx-badge");
        setTimeout(() => setShowBadge(null), 3000);
        if (typeof window !== "undefined") {
          try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY + "_progress") || "{}");
            saved.badges = [...badges, newBadge];
            localStorage.setItem(STORAGE_KEY + "_progress", JSON.stringify(saved));
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
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY + "_progress") || "{}");
            saved.badges = [...badges, newBadge];
            localStorage.setItem(STORAGE_KEY + "_progress", JSON.stringify(saved));
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
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY + "_progress") || "{}");
            saved.badges = [...badges, newBadge];
            localStorage.setItem(STORAGE_KEY + "_progress", JSON.stringify(saved));
          } catch {}
        }
      }
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
      setFeedback(LIVE_PRACTICE_CORRECT_HE);
      
      // Play sound - different sound for streak milestones
      if ((streak + 1) % 5 === 0 && streak + 1 >= 5) {
        audio.playSfx("sfx-streak");
      } else {
        audio.playSfx("sfx-correct");
      }
      
      // Update daily streak
      const updatedStreak = updateDailyStreak("mleo_english_daily_streak");
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
      
      const errExpl = getErrorExplanation(
        currentQuestion,
        currentQuestion.topic,
        answer,
        questionGradeKey,
        { mode }
      );
      setErrorExplanation(errExpl);
      if (errExpl) stepByStepViewedRef.current = true;
      
      const top = currentQuestion.topic;
      updateTopicProgress(top, false);
      const enPrm = currentQuestion.params || {};
      let englishMistakePayload = {
        topic: currentQuestion.topic,
        topicOrOperation: currentQuestion.topic,
        bucketKey: currentQuestion.topic,
        grade: questionGradeKey,
        level: currentQuestion.levelKey || level,
        mode: reportModeFromGameState(mode, focusedPracticeMode),
        question: currentQuestion.question,
        exerciseText: currentQuestion.question,
        correctAnswer: currentQuestion.correctAnswer,
        wrongAnswer: answer,
        userAnswer: answer,
        isCorrect: false,
        kind: enPrm.kind != null ? String(enPrm.kind) : null,
        patternFamily:
          enPrm.patternFamily != null ? String(enPrm.patternFamily) : null,
        subtype: enPrm.subtype != null ? String(enPrm.subtype) : null,
        distractorFamily:
          enPrm.distractorFamily != null ? String(enPrm.distractorFamily) : null,
        conceptTag: enPrm.conceptTag != null ? String(enPrm.conceptTag) : null,
        answerMode:
          Array.isArray(currentQuestion.answers) &&
          currentQuestion.answers.length > 1
            ? "choice"
            : "typed",
      };
      englishMistakePayload = mergeDiagnosticIntoMistakeEntry(
        englishMistakePayload,
        extractDiagnosticMetadataFromQuestion(currentQuestion, {
          responseMs: timeSpentMs,
          hintUsed: hintUsedForSave,
        })
      );
      englishMistakePayload = mergeDiagnosticIntoMistakeEntry(
        englishMistakePayload,
        computeMcqIndicesForQuestion(currentQuestion, answer)
      );
      if (
        !englishMistakePayload.distractorFamily &&
        englishMistakePayload.selectedOptionIndex != null &&
        Array.isArray(currentQuestion.answers)
      ) {
        const cell = currentQuestion.answers[englishMistakePayload.selectedOptionIndex];
        const dfOpt = distractorFamilyFromOptionCell(cell);
        if (dfOpt) {
          englishMistakePayload = mergeDiagnosticIntoMistakeEntry(englishMistakePayload, {
            distractorFamily: dfOpt,
          });
        }
      }
      try {
        if (currentQuestion.topic === "grammar") {
          const normalized = normalizeMistakeEvent(englishMistakePayload, "english");
          englishPendingDiagnosticProbeRef.current = buildPendingProbeFromMistake(
            normalized,
            {
              wrongAvoidKey: englishGrammarRowKeyFromQuestion(currentQuestion),
              fallbackTopicId: currentQuestion.topic,
              fallbackGrade: questionGradeKey,
              fallbackLevel: currentQuestion.levelKey || level,
            },
            "english"
          );
        } else {
          englishPendingDiagnosticProbeRef.current = null;
        }
      } catch {
        englishPendingDiagnosticProbeRef.current = null;
      }
      logEnglishMistakeEntry(englishMistakePayload);
      if ("vibrate" in navigator) navigator.vibrate?.(200);
      if (mode === "learning") {
        setFeedback(
          formatLearningWrongFeedbackHe(
            `\u2066${currentQuestion.correctAnswer}\u2069`
          )
        );
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
            pendingEnglishTrackMetaRef.current = {
              correct: 0,
              total: 1,
              mode: reportModeFromGameState(mode, focusedPracticeMode),
            };
            trackCurrentQuestionTime();
            setFeedback(LIVE_PRACTICE_GAME_OVER_HE);
            audio.playSfx("sfx-game-over");
            recordSessionProgress();
            saveRunToStorage();
            setGameActive(false);
            englishTrackingTopicKeyRef.current = null;
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
          if (mode === "speed") {
            setTimeLeft(10);
          } else {
            setTimeLeft(null);
          }
        });
      }
    }

    const potentialScore = isCorrect ? score + awardedPoints : score;
    setDailyChallenge((prev) => ({
      ...prev,
      bestScore: Math.max(prev.bestScore || 0, potentialScore),
      questions: (prev.questions || 0) + 1,
      correct: (prev.correct || 0) + (isCorrect ? 1 : 0),
    }));
    if (isCorrect) {
      setWeeklyChallenge((prev) => {
        if (prev.completed) return prev;
        const next = prev.current + 1;
        const completed = next >= prev.target;
        return {
          ...prev,
          current: next,
          completed,
        };
      });
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
        const key = `${level}_${topic}`;
        delete saved[key];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
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

  const getGradeLabel = (gradeKey) => {
    const idx = GRADE_ORDER.indexOf(gradeKey);
    if (idx === -1) return "";
    return `כיתה ${gradeLabels[idx]}`;
  };

  const profileSnap = getCachedStudentLearningProfile();
  const subjectView = useMemo(
    () =>
      buildStudentSubjectDashboardView({
        subject: "english",
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
    logStudentSubjectDashboardDiagnostics("english", subjectView, {
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
  const gradeInfo = GRADES[grade] || GRADES.g3;
  const dailySolved = subjectView.dailyChallenge.correctToday;
  const dailyQuestionsCanon = subjectView.dailyChallenge.questionsToday;
  const dailyProgress =
    dailyQuestionsCanon > 0 ? Math.min(1, dailySolved / dailyQuestionsCanon) : 0;
  const dailyPercent = Math.round(dailyProgress * 100);
  const weeklyProgress = Math.min(
    1,
    (weeklyChallenge.current || 0) / (weeklyChallenge.target || 1)
  );
  const weeklyPercent = Math.round(weeklyProgress * 100);
  const referenceData =
    REFERENCE_CATEGORIES[referenceCategory] ||
    REFERENCE_CATEGORIES[REFERENCE_CATEGORY_KEYS[0]];
  const referenceEntries = referenceData.lists.flatMap((listKey) =>
    Object.entries(WORD_LISTS[listKey] || {})
  );

  const hasEnglishAudio =
    gameActive &&
    (currentQuestion?.topic === "phonics" ||
      (currentQuestion?.topic === "vocabulary" && isLowerGradeG1G2Key(grade))) &&
    currentQuestion?.params?.audioStem &&
    validateAudioStem(currentQuestion.params.audioStem);

  const showMobileQuestionActions = Boolean(hasEnglishAudio || questionBookHref);

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
    <MasterSubjectAccessScreen permissionKey="english" titleHe="אנגלית">
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
          title="🇬🇧 אנגלית"
          subtitle={`${playerName || "שחקן"} • ${gradeInfo.name} • ${studentDisplayLevelLabel(displayLevel)} • ${getTopicName(topic)} • ${MODES[mode].name}`}
          onBack={backSafe}
          onCurriculumClick={() => router.push("/learning/curriculum?subject=english")}
          audio={audio}
        />

        <div className="md:hidden">
          <LearningMasterNavBar
            MB={MB}
            headerRef={headerRef}
            onCurriculumClick={() => router.push("/learning/curriculum?subject=english")}
            onBack={backSafe}
            hideCurriculum
            compactHeader
            integratedTopRow
            centerSlot={
              <LearningMasterMobileNavTitle MB={MB} title="🇬🇧 אנגלית" audio={audio} />
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
              {playerName || "שחקן"} • {gradeInfo.name} •{" "}
              {studentDisplayLevelLabel(displayLevel)} • {getTopicName(topic)} • {MODES[mode].name}
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
            <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white px-8 py-6 rounded-2xl shadow-2xl text-center animate-bounce">
                <div className="text-4xl mb-2">🎉</div>
                <div className="text-2xl font-bold">תג חדש!</div>
                <div className="text-xl">{showBadge}</div>
              </div>
            </div>
          )}


          {showLevelUp && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white px-8 py-6 rounded-2xl shadow-2xl text-center animate-pulse">
                <div className="text-4xl mb-2">🌟</div>
                <div className="text-2xl font-bold">עלית רמה!</div>
                <div className="text-xl">אתה עכשיו ברמה {playerLevel}!</div>
              </div>
            </div>
          )}

                    {!gameActive ? (
            <div className="relative flex flex-col flex-1 min-h-0 min-w-0 w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl items-center justify-start md:gap-1">
              {bookIndexHref ? (
                <LearningBookIndexTile
                  subject="english"
                  grade={grade}
                  testId={`english-${grade}-book-index-button`}
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
                  data-testid="english-player-name"
                  className={MB.preGamePlayerBadge}
                  dir={playerName && /[\u0590-\u05FF]/.test(playerName) ? "rtl" : "ltr"}
                  title={playerName.trim() ? playerName.trim() : undefined}
                  aria-label={playerName.trim() ? `שם ילד/ה: ${playerName.trim()}` : "שם ילד/ה לא זמין"}
                >
                  {playerName.trim() ? playerName.trim() : "שחקן"}
                </div>
                <select
                  value={gradeNumber}
                  title={`כיתה ${gradeLabels[gradeNumber - 1]}`}
                  disabled={!canPickGrade}
                  aria-disabled={!canPickGrade || undefined}
                  onChange={(e) => handleGradeNumberChange(e.target.value)}
                  className={`${MB.selectControl} shrink-0 min-w-0 w-[5.75rem] max-w-[6.25rem] md:w-[6.5rem] md:max-w-[7rem]`}
                >
                  {GRADE_ORDER.map((_, idx) => (
                    <option key={`grade-${idx + 1}`} value={idx + 1}>
                      {`כיתה ${gradeLabels[idx]}`}
                    </option>
                  ))}
                </select>
                <StudentDisplayLevelSelect
                  subjectId="english"
                  value={displayLevel}
                  title={studentDisplayLevelLabel(displayLevel)}
                  onChange={handleDisplayLevelChange}
                  className={`${MB.selectControl} shrink-0 min-w-0 w-[5rem] max-w-[5.5rem] md:w-[5.75rem] md:max-w-[6.25rem]`}
                />
                <div className="flex flex-1 min-w-0 md:flex-none md:max-w-[min(22rem,42vw)] items-center gap-1.5 md:gap-2 shrink">
                  <select
                    ref={topicSelectRef}
                    data-testid="english-topic-select"
                    value={topic}
                    title={getTopicName(topic)}
                    onChange={(e) => {
                      const newTopic = e.target.value;
                      if (guestTopics.isGuest && guestTopics.isLocked(newTopic)) {
                        alert(GUEST_TOPIC_LOCK_MESSAGE_HE);
                        return;
                      }
                      setGameActive(false);
                      practiceForceKindRef.current = null;
                      practiceForceSkillIdRef.current = null;
                      bookPracticeSemanticTopicRef.current = null;
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
                    {englishTopicSelectOptions.map((t) => (
                      <option key={t} value={t} disabled={t !== "mixed" && guestTopics.isLocked(t)}>
                        {t === "mixed" ? getTopicName(t) : guestTopics.label(t, getTopicName(t))}
                      </option>
                    ))}
                  </select>
                  {topic === "mixed" && (
                    <button
                      type="button"
                      onClick={() => setShowMixedSelector(true)}
                      className={MB.preGameGearBtn}
                      title="ערוך נושאים למיקס"
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


              <div className="mt-auto mb-2 w-full pt-3 md:pt-4 flex flex-col items-center gap-2.5 md:gap-3">
              <div className="flex items-center justify-center gap-1.5 md:gap-2.5 w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl flex-wrap px-1 md:px-2 mx-auto">
                <button
                  type="button"
                  data-testid="english-start-game"
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
                  ❓ איך לומדים אנגלית כאן?
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
                    data-testid={`english-${grade}-book-topic-button`}
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
              {currentQuestion && (
                <div
                  ref={gameRef}
                  className={LEARNING_MASTER_MOBILE_GAME_CLASS}
                >
                  {(feedback || errorExplanation) && (
                    <div className="absolute top-0 left-0 right-0 z-[5] px-2 pt-1 pointer-events-none" role="status" aria-live="assertive" aria-atomic="true">
                      <div className="flex flex-col gap-2 items-stretch">
                        {feedback && (
                          <div
                            className={`px-4 py-2 rounded-lg text-sm font-semibold text-center ${
                              feedback.includes("Correct") ||
                              feedback.includes("∞") ||
                              feedback.includes("Start")
                                ? MB.feedbackOk
                                : MB.feedbackBad
                            }`}
                          >
                            <div>{feedback}</div>
                          </div>
                        )}
                        {errorExplanation && (
                          <div className={MB.errorBox}>
                            <div className={MB.errorTitle}>
                              למה הטעות קרתה?
                            </div>
                            <div className={MB.errorBody} dir="ltr">
                              {errorExplanation}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {hasEnglishAudio ? (
                    <div
                      className="absolute top-2 left-2 z-10 max-md:hidden pointer-events-auto"
                      dir="rtl"
                    >
                      <EnglishPhonicsAudioPanel
                        stem={currentQuestion.params.audioStem}
                        gameActive={gameActive && !selectedAnswer}
                        grade={grade}
                        topic={currentQuestion.topic || currentQuestion.operation || "phonics"}
                      />
                    </div>
                  ) : null}
                  {questionBookHref ? (
                    <div className={`${MB.floatBtnStack} max-md:hidden`}>
                      <button
                        type="button"
                        data-testid={`english-${grade}-book-question-button`}
                        onClick={() => openBookFromLearning(questionBookHref)}
                        className={`${MB.floatBtnHelper} ${MB.floatBtnBookColors}`}
                        title="הסבר בספר לנושא הנוכחי"
                      >
                        הסבר
                      </button>
                    </div>
                  ) : null}

                  <div
                    data-testid="english-question-stem"
                    className={`${verbalVisualLayout?.questionSlotClassForStem ?? ""} relative ${showMobileQuestionActions ? "max-md:pb-11" : ""}`.trim()}
                  >
                    <StudentQuestionDisplay
                      question={currentQuestion.question}
                      questionLabel={currentQuestion.questionLabel}
                      exerciseText={currentQuestion.exerciseText}
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
                    testId="english-question-mobile-actions"
                    secondaryWide
                    bookSlot={
                      questionBookHref ? (
                        <button
                          type="button"
                          data-testid={`english-${grade}-book-question-button`}
                          onClick={() => openBookFromLearning(questionBookHref)}
                          className={`${MB.questionActionBtn} ${MB.floatBtnBookColors}`}
                          title="הסבר בספר לנושא הנוכחי"
                        >
                          הסבר
                        </button>
                      ) : null
                    }
                    secondarySlot={
                      hasEnglishAudio ? (
                        <EnglishPhonicsAudioPanel
                          stem={currentQuestion.params.audioStem}
                          gameActive={gameActive && !selectedAnswer}
                          grade={grade}
                          topic={currentQuestion.topic || currentQuestion.operation || "phonics"}
                        />
                      ) : null
                    }
                  />
                  </div>

                  <div className={HEBREW_APPROVED_VERBAL_ANSWER_AREA_CLASS}>
                    {currentQuestion.qType === "typing" ? (
                      <div className={MB.answerWrap}>
                        <div className="text-center mb-3 max-[420px]:mb-2">
                          <input
                            dir="ltr"
                            type="text"
                            value={typedAnswer}
                            onChange={(e) => setTypedAnswer(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                handleEnglishPrimaryAnswerButtonClick();
                              }
                            }}
                            disabled={!!selectedAnswer || !gameActive}
                            placeholder="כתוב את התשובה שלך כאן..."
                            className={
                              isMobileViewport
                                ? LEARNING_MASTER_MOBILE_TYPING_INPUT_CLASS
                                : `w-full max-w-[300px] ${MB.inputDesktop} disabled:opacity-50`
                            }
                          />
                        </div>
                        <div className="flex justify-center">
                          {(() => {
                            const primaryBtn = getLearningPrimaryAnswerButtonState({
                              selectedAnswer,
                              textAnswer: typedAnswer,
                            });
                            return (
                              <button
                                type="button"
                                onClick={handleEnglishPrimaryAnswerButtonClick}
                                disabled={
                                  !gameActive ||
                                  (primaryBtn.action === "check" && primaryBtn.disabled)
                                }
                                className={
                                  primaryBtn.action === "next" ? MB.checkBtnNext : MB.checkBtn
                                }
                              >
                                {primaryBtn.action === "check"
                                  ? "✅ בדוק תשובה"
                                  : primaryBtn.label}
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div
                        className={buildHebrewApprovedVerbalMcqGridClassName({
                          useNarrowMobileAnswerFallback:
                            verbalVisualLayout?.useNarrowMobileAnswerFallback,
                          isMobileViewport,
                        })}
                      >
                        {currentQuestion.answers.map((answer, idx) => {
                          const isSelected = selectedAnswer === answer;
                          const isCorrect =
                            String(answer).trim().toLowerCase() ===
                            String(currentQuestion.correctAnswer).trim().toLowerCase();
                          const isWrong = isSelected && !isCorrect;
                          return (
                            <button
                              type="button"
                              key={idx}
                              data-testid={`english-mcq-${idx}`}
                              onClick={() => handleAnswer(answer)}
                              disabled={!!selectedAnswer}
                              className={`rounded-xl border-2 transition-all active:scale-95 disabled:opacity-50 ${verbalVisualLayout?.answerCardTextClass ?? ""} ${verbalVisualLayout?.answerCardNarrowClass ?? ""} ${resolveLearningMcqChoiceClassName(
                                {
                                  MB,
                                  isSelected,
                                  isCorrectChoice: isCorrect,
                                  isWrong,
                                  revealResults: selectedAnswer != null,
                                }
                              )}`}
                            >
                              {answer}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="w-full flex justify-center gap-2 flex-wrap mb-2 min-h-[2.75rem]" dir="rtl">
                      {mode === "learning" &&
                        currentQuestion &&
                        currentQuestion.topic !== "phonics" && (
                          <button
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
              )}

            </div>
          )}

          {showLeaderboard && (
            <div
              role="dialog" aria-modal="true" className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
              onClick={() => setShowLeaderboard(false)}
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

                <div className="flex gap-2 mb-4 justify-center">
                  {studentDisplayLevelKeys("english").slice().reverse().map((dl) => (
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
                            console.error("Error loading leaderboard:", e);
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
                            עדיין אין תוצאות עבור רמה {studentDisplayLevelLabel(leaderboardLevel)}
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
                  const allowed = englishTopicSelectOptions;
                  setTopic(allowed.find((t) => t !== "mixed") || allowed[0]);
                }
              }}
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
                  {visibleEnglishTopics.map((t) => (
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

                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => {
                      const availableTopics = visibleEnglishTopics;
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
                      const availableTopics = visibleEnglishTopics;
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

          {showPracticeModal && (
            <div
              role="dialog" aria-modal="true" className="fixed inset-0 bg-black/80 flex items-center justify-center z-[190] p-4"
              onClick={() => setShowPracticeModal(false)}
            >
              <div
                className="bg-gradient-to-br from-[#080c16] to-[#0a0f1d] border-2 border-purple-400/60 rounded-2xl p-5 max-w-lg w-full max-h-[85vh] overflow-y-auto"
                dir="rtl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-extrabold text-white mb-1">
                    🎯 תרגול טעויות אחרונות
                  </h2>
                  <p className="text-white/70 text-sm">
                    בחר טעות אחרונה כדי לפתוח משחק ממוקד באותו נושא, כיתה ורמת קושי.
                  </p>
                </div>

                {mistakes.length === 0 ? (
                  <div className="text-center py-6 text-white/60">
                    אין טעויות פעילות כרגע. תתחיל משחק, אסוף נתונים ואז חזור לכאן.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mistakes.slice(0, 10).map((mistake, idx) => (
                      <div
                        key={`${mistake.timestamp || idx}-${idx}`}
                        className="bg-black/30 border border-white/10 rounded-xl p-3"
                        dir="rtl"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-white font-semibold mb-1">
                          <span>{getTopicName(mistake.topic || "vocabulary")}</span>
                          <span className="text-white/70 text-xs">
                            {getGradeLabel(mistake.grade) || "כיתה נוכחית"} ·{" "}
                            {studentDisplayLevelLabel(
                              migrateLegacyPracticeKeyToDisplayLevel(mistake.level || level, "english")
                            )}
                          </span>
                        </div>
                        {mistake.question && (
                          <p className="text-xs text-white/80 mb-1" dir="auto">
                            {mistake.question}
                          </p>
                        )}
                        {mistake.correctAnswer && (
                          <p className="text-xs text-emerald-300 mb-1" dir="auto">
                            תשובה נכונה: {mistake.correctAnswer}
                          </p>
                        )}
                        <button
                          onClick={() => handleMistakePractice(mistake)}
                          className="mt-2 w-full px-3 py-2 rounded-lg bg-emerald-500/80 hover:bg-emerald-500 text-xs font-bold text-white"
                        >
                          תרגל עכשיו
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowPracticeModal(false)}
                    className="flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-bold text-white"
                  >
                    סגור
                  </button>
                  {mistakes.length > 0 && (
                    <button
                      onClick={clearMistakes}
                      className="flex-1 px-4 py-2 rounded-lg bg-red-500/80 hover:bg-red-500 text-sm font-bold text-white"
                    >
                      🧹 איפוס טעויות
                    </button>
                  )}
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
                  <h2 className="text-2xl font-extrabold">📚 לוח מילים אינטראקטיבי</h2>
                  <button
                    onClick={() => setShowReferenceModal(false)}
                    className="text-white/80 hover:text-white text-xl px-2"
                  >
                    ✖
                  </button>
                </div>
                <p className="text-sm text-white/70 mb-3">
                  בחר קטגוריה כדי לראות מילים חשובות באנגלית ובעברית, בדיוק כמו בעזרי העזר של משחק החשבון.
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
                      {REFERENCE_CATEGORIES[key].label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" dir="ltr">
                  {referenceEntries.map(([en, he]) => (
                    <div
                      key={`${referenceCategory}-${en}-${he}`}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex items-center justify-between text-sm"
                    >
                      <span className="font-semibold">{en}</span>
                      <span className="text-white/50 mx-2">|</span>
                      <span className="text-right" dir="rtl">
                        {he}
                      </span>
                    </div>
                  ))}
                  {referenceEntries.length === 0 && (
                    <div className="text-center col-span-full text-white/60 py-4">
                      אין מילים להצגה בקטגוריה זו.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {showPracticeOptions && (
            <div
              role="dialog" aria-modal="true" className="fixed inset-0 bg-black/80 flex items-center justify-center z-[188] p-4"
              onClick={() => setShowPracticeOptions(false)}
            >
              <div
                className="bg-gradient-to-br from-[#080c16] to-[#0a0f1d] border-2 border-emerald-400/60 rounded-2xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto text-white"
                dir="rtl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-2xl font-extrabold">🎛️ הגדרות תרגול חכם</h2>
                  <button
                    onClick={() => setShowPracticeOptions(false)}
                    className="text-white/80 hover:text-white text-xl px-2"
                  >
                    ✖
                  </button>
                </div>
                <p className="text-sm text-white/70 mb-3">
                  כמו במשחקי החשבון והגאומטריה, ניתן לבחור כאן מצב אימון מיוחד, חיבור לשגיאות אחרונות או מעבר מדורג בין רמות.
                </p>
                <div className="space-y-2 mb-4">
                  <p className="text-xs text-white/60 font-semibold">מצב מיקוד</p>
                  {[
                    { value: "normal", label: "ברירת מחדל" },
                    { value: "mistakes", label: "חזרה על טעויות אחרונות" },
                    { value: "graded", label: "תרגול מדורג (התחלה נמוכה → הרמה שבחרת)" },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="focus-mode"
                        value={opt.value}
                        checked={focusedPracticeMode === opt.value}
                        onChange={(e) => setFocusedPracticeMode(e.target.value)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
                <div className="space-y-2 mb-4">
                  <p className="text-xs text-white/60 font-semibold">שאלות תרגום/סיפור</p>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={useStoryQuestions}
                      onChange={(e) => {
                        setUseStoryQuestions(e.target.checked);
                        if (!e.target.checked) setStoryOnly(false);
                      }}
                    />
                    <span>שלב שאלות תרגום בתוך משחקי האוצר מילים/דקדוק</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={storyOnly}
                      disabled={!useStoryQuestions}
                      onChange={(e) => setStoryOnly(e.target.checked)}
                    />
                    <span>הצג רק שאלות תרגום/סיפור</span>
                  </label>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-white/80">
                  <div className="font-semibold mb-1">סיכום מצב נוכחי</div>
                  <p>מצב תרגול: {MODES[mode].name}</p>
                  <p>פוקוס: {PRACTICE_FOCUS_OPTIONS.find((o) => o.value === practiceFocus)?.label || ""}</p>
                  <p>מיקוד שגיאות: {focusedPracticeMode === "normal" ? "רגיל" : focusedPracticeMode === "mistakes" ? "טעויות אחרונות" : "מדורג"}</p>
                  <p>שאלות תרגום: {storyOnly ? "רק תרגום" : useStoryQuestions ? "מעורב" : "כבוי"}</p>
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
                      setUseStoryQuestions(false);
                      setStoryOnly(false);
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
                        id="avatar-image-upload-english"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => document.getElementById("avatar-image-upload-english").click()}
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
                                <span className="text-white/80">{getTopicName(topicKey)}</span>
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
              className={learningModalOverlay}
              onClick={() => setShowHowTo(false)}
            >
              <div
                className={learningModalPanel}
                dir="rtl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className={learningModalHeader}>
                  <button
                    type="button"
                    onClick={() => setShowHowTo(false)}
                    className={learningModalCloseBtn}
                    aria-label="סגור"
                  >
                    ✖
                  </button>
                  <h2 className={learningModalTitle}>
                    📘 איך לומדים אנגלית כאן?
                  </h2>
                  <span className="w-10 shrink-0" aria-hidden />
                </div>

                <div className={`${learningModalScrollBody} text-sm`}>
                  <p className="text-xs mb-3 text-center">
                    המטרה היא לתרגל אנגלית בצורה משחקית, עם התאמה לכיתה, נושא ורמת קושי.
                  </p>

                  <ul className="list-disc pr-4 space-y-1 text-[13px]">
                    <li>בחר כיתה, רמת קושי ונושא (אוצר מילים, דקדוק, תרגום, כתיבה ועוד).</li>
                    <li>בחר מצב משחק: למידה, אתגר עם טיימר וחיים, מהירות או מרתון.</li>
                    <li>קרא היטב את השאלה – לפעמים צריך לבחור תשובה, ולפעמים לכתוב באנגלית.</li>
                    <li>ניקוד גבוה, רצף תשובות נכון, כוכבים ו Badges עוזרים לך לעלות רמה כשחקן.</li>
                  </ul>
                </div>

                <div className={learningModalFooter}>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowHowTo(false)}
                      className={learningPrimaryCloseBtn}
                    >
                      סגור
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* חלון הסבר מלא - Modal גדול ומרכזי */}
          {isShowingAnySolution && explanationQuestion && (
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
                      : "\u200Fאיך פותרים את השאלה?"}
                  </h3>
                  <span className="w-10 shrink-0" aria-hidden />
                </div>

                <StepExerciseUiProvider value={stepExerciseUi}>
                  <div className={learningModalScrollBody} dir="rtl">
                    <div className={`mb-3 ${learningQuestionBox}`}>
                      <p
                        className={`${learningQuestionText} text-center`}
                        style={{ direction: "rtl", unicodeBidi: "plaintext" }}
                      >
                        {explanationQuestion.stem || explanationQuestion.question}
                      </p>
                    </div>
                    <div
                      className="space-y-2"
                      style={{ direction: "rtl", unicodeBidi: "plaintext" }}
                    >
                      {getSolutionSteps(
                        explanationQuestion,
                        explanationQuestion.topic,
                        grade
                      ).map((step, idx) => (
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
                      dir="rtl"
                    >
                      {"\u200Fסגור"}
                    </button>
                  </div>
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
      subjectId="english"
      uiSelection={`topic=${topic}`}
      currentQuestion={currentQuestion}
      trackingRef={englishTrackingTopicKeyRef}
    />
    </Layout>
    </MasterSubjectAccessScreen>
  );
}

