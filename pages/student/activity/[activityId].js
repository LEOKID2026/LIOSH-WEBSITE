import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../../components/Layout";
import {
  activityModeLabelHe,
  isClassroomActivitiesEnabled,
} from "../../../lib/classroom-activities/classroom-activities-labels.client.js";
import { formatStudentActivityCompletionSummaryHe } from "../../../lib/classroom-activities/student-activity-result-labels.client.js";
import { resolveStudentActivityApiErrorHe } from "../../../lib/classroom-activities/student-activity-error-labels.client.js";
import { resolveStudentActivityAnswerInputProps, assignedActivityUsesNumericKeyboard, resolveAssignedActivityMathScratchpadContext, assignedActivityUsesMathScratchpad, getStudentActivityQuestionFontStyle } from "../../../lib/classroom-activities/student-activity-question-ui.client.js";
import { assignedActivityQuestionUsesChoiceUi } from "../../../utils/geometry-activity-answer-ui.js";
import StudentNumericAnswerField, {
  useMobileEmbeddedNumericSubmit,
} from "../../../components/learning/StudentNumericAnswerField";
import VirtualAnswerKeyboard from "../../../components/learning/VirtualAnswerKeyboard.jsx";
import MathScratchpadSlot from "../../../components/math-scratchpad/MathScratchpadSlot";
import { ScratchpadVirtualInputProvider } from "../../../components/math-scratchpad/scratchpad-virtual-input";
import { useTouchPrimaryDevice } from "../../../hooks/useTouchPrimaryDevice.js";
import { resolveVirtualAnswerKeyboard } from "../../../lib/learning/virtual-answer-keyboard-policy.js";
import { activityChoiceGridClassName } from "../../../lib/classroom-activities/student-activity-choice-layout.client.js";
import { useStudentActivityUi } from "../../../hooks/useStudentActivityUi.js";
import { computeAssignedActivityTiming } from "../../../lib/learning/timing-policy.js";
import StudentAssignedActivityShell from "../../../components/student/StudentAssignedActivityShell";
import StudentAssignedActivityQuestionStage from "../../../components/student/StudentAssignedActivityQuestionStage";
import StudentActivitySubmitConfirmModal from "../../../components/student/StudentActivitySubmitConfirmModal";
import AssignedActivityBidiText from "../../../components/classroom-activities/AssignedActivityBidiText.jsx";

function buildSavedAttemptsMap(attempts) {
  /** @type {Record<number, { questionIndex: number, selectedAnswer: string|null, isCorrect: boolean|null }>} */
  const map = {};
  for (const attempt of attempts || []) {
    if (!Number.isFinite(attempt?.questionIndex)) continue;
    map[attempt.questionIndex] = attempt;
  }
  return map;
}

function feedbackFromSavedAttempt(attempt, activity) {
  if (!attempt) return null;
  if (activity?.mode === "discussion") {
    return { type: "submitted", message: "התשובה נשלחה" };
  }
  return {
    type: attempt.isCorrect ? "correct" : "wrong",
    message: attempt.isCorrect ? "נכון!" : "לא נכון",
  };
}

function savedAnswerDisplayText(saved) {
  return saved?.selectedAnswer != null ? String(saved.selectedAnswer) : "";
}

export async function getServerSideProps(context) {
  if (process.env.NEXT_PUBLIC_ACTIVITIES_ENABLED === "false") {
    return { redirect: { destination: "/student/home", permanent: false } };
  }
  return { props: { activityId: String(context.params?.activityId || "") } };
}

export default function StudentActivityPage({ activityId }) {
  const router = useRouter();
  const { L, MB, isBright, theme } = useStudentActivityUi();
  const [phase, setPhase] = useState("loading");
  const [activity, setActivity] = useState(null);
  const [questionSet, setQuestionSet] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answerInput, setAnswerInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(null);
  const [liveIdx, setLiveIdx] = useState(null);
  const [error, setError] = useState("");
  const [savedAttempts, setSavedAttempts] = useState({});

  // Phase 3: real per-question timing
  const questionStartTimeRef = useRef(null);
  // explanationViewedRef: set true when post-answer explanation is shown (guided_practice/homework);
  // flows into the NEXT question's submit as explanationViewed=true
  const explanationViewedRef = useRef(false);
  const scratchpadOverlayTopRef = useRef(null);
  const scratchpadOverlayWidthRef = useRef(null);
  const scratchpadDockAnchorRef = useRef(null);
  const [scratchpadOpen, setScratchpadOpen] = useState(false);
  const [activeScratchpadCell, setActiveScratchpadCell] = useState(null);
  const [verticalExerciseHeadline, setVerticalExerciseHeadline] = useState(null);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const isTouchDevice = useTouchPrimaryDevice();

  const startSession = useCallback(async () => {
    setPhase("loading");
    setError("");
    try {
      const res = await fetch(`/api/student/activities/${encodeURIComponent(activityId)}/start`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace("/student/login");
        return;
      }
      if (!res.ok || json?.ok !== true) {
        setError(
          resolveStudentActivityApiErrorHe(json, "לא ניתן להתחיל את הפעילות")
        );
        setPhase("error");
        return;
      }
      setActivity(json.activity);
      if (json.alreadyCompleted) {
        setFinished({
          scorePct: json.scorePct ?? null,
          correctCount: json.correctCount ?? 0,
          questionCount: json.activity?.questionCount ?? 0,
          studentStatus: json.studentStatus,
        });
        setPhase("done");
        return;
      }
      setQuestionSet(json.questionSet || []);
      const attemptMap = buildSavedAttemptsMap(json.attempts);
      setSavedAttempts(attemptMap);
      if (json.activity?.mode === "live_lesson") {
        setCurrentIdx(json.activity?.currentQuestionIdx ?? 0);
      } else {
        const resumeIdx =
          typeof json.resumeQuestionIndex === "number"
            ? json.resumeQuestionIndex
            : 0;
        setCurrentIdx(resumeIdx);
        const saved = attemptMap[resumeIdx];
        setAnswerInput(savedAnswerDisplayText(saved));
        setFeedback(feedbackFromSavedAttempt(saved, json.activity));
      }
      setPhase("ready");
    } catch {
      setError("שגיאת רשת");
      setPhase("error");
    }
  }, [activityId, router]);

  useEffect(() => {
    if (!isClassroomActivitiesEnabled()) {
      router.replace("/student/home");
      return;
    }
    void startSession();
  }, [startSession, router]);

  useEffect(() => {
    if (!activity || activity.mode !== "live_lesson") return undefined;
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/student/activities/${encodeURIComponent(activityId)}/live-state`,
          { credentials: "include", cache: "no-store" }
        );
        const json = await res.json().catch(() => ({}));
        if (json?.ok && json.currentQuestionIdx != null) {
          setLiveIdx(json.currentQuestionIdx);
          setCurrentIdx(json.currentQuestionIdx);
        }
        if (json?.activityStatus === "paused") {
          setFeedback({ type: "wait", message: "המורה השהה את השיעור — המתינו" });
        }
      } catch {
        /* ignore */
      }
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [activity, activityId]);

  const effectiveIdx = useMemo(() => {
    if (activity?.mode === "live_lesson") {
      return liveIdx != null ? liveIdx : currentIdx;
    }
    return currentIdx;
  }, [activity, liveIdx, currentIdx]);

  const currentQuestion = questionSet[effectiveIdx];
  const currentSavedAttempt = savedAttempts[effectiveIdx] ?? null;
  const isCurrentQuestionAnswered = Boolean(currentSavedAttempt);
  const answeredQuestionCount = useMemo(
    () =>
      questionSet.reduce(
        (count, _question, idx) => (savedAttempts[idx] ? count + 1 : count),
        0
      ),
    [questionSet, savedAttempts]
  );

  useEffect(() => {
    if (activity?.mode === "live_lesson") return;
    const saved = savedAttempts[effectiveIdx];
    setAnswerInput(savedAnswerDisplayText(saved));
    setFeedback(feedbackFromSavedAttempt(saved, activity));
  }, [effectiveIdx, savedAttempts, activity]);

  // Phase 3: start question timer when question changes; reset explanationViewed
  useEffect(() => {
    questionStartTimeRef.current = Date.now();
    explanationViewedRef.current = false;
    setScratchpadOpen(false);
    setActiveScratchpadCell(null);
    setVerticalExerciseHeadline(null);
  }, [effectiveIdx]);

  const usesMathScratchpad = assignedActivityUsesMathScratchpad(currentQuestion);
  const scratchpadCtx = useMemo(
    () =>
      usesMathScratchpad
        ? resolveAssignedActivityMathScratchpadContext(currentQuestion, activity)
        : null,
    [usesMathScratchpad, currentQuestion, activity]
  );
  const mathVkPolicy = resolveVirtualAnswerKeyboard({
    subject: "math",
    hasTextInput: true,
    isTouch: isTouchDevice,
  });
  const usesScratchpadDock = Boolean(usesMathScratchpad && scratchpadCtx);
  const sharedScratchpadKeyboard =
    usesScratchpadDock && mathVkPolicy.enabled && isTouchDevice;

  const handleScratchpadOpenChange = useCallback((open) => {
    setScratchpadOpen(open);
    if (!open) setActiveScratchpadCell(null);
  }, []);

  const answerInputProps = useMemo(
    () => resolveStudentActivityAnswerInputProps(currentQuestion),
    [currentQuestion]
  );

  const numericKeyboardSubject =
    currentQuestion?.subject === "geometry" ? "geometry" : "math";
  const usesNumericKeyboard = assignedActivityUsesNumericKeyboard(currentQuestion);
  const mobileEmbeddedNumericSubmit =
    useMobileEmbeddedNumericSubmit(numericKeyboardSubject) && usesNumericKeyboard;

  const advanceToNextQuestion = useCallback(() => {
    if (effectiveIdx < questionSet.length - 1) {
      setCurrentIdx((i) => i + 1);
    }
  }, [effectiveIdx, questionSet.length]);

  const submitAnswer = async () => {
    if (!currentQuestion || busy || isCurrentQuestionAnswered) return;
    setBusy(true);
    setFeedback(null);
    try {
      // Phase 3: compute real elapsed time and credit cap
      const rawMs =
        questionStartTimeRef.current != null
          ? Math.max(0, Date.now() - questionStartTimeRef.current)
          : 0;
      const { rawTimeSpentMs, creditedTimeMs, timingStatus } =
        computeAssignedActivityTiming(rawMs);
      // Capture whether the student saw an explanation from the previous question
      const explanationViewedNow = explanationViewedRef.current;
      // Reset for the upcoming question (will be overwritten by effectiveIdx useEffect on advance)
      explanationViewedRef.current = false;

      const res = await fetch(`/api/student/activities/${encodeURIComponent(activityId)}/answer`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionIndex: effectiveIdx,
          selectedAnswer: answerInput,
          rawTimeSpentMs,
          creditedTimeMs,
          timingStatus,
          hintsUsed: 0, // no hint UI in assigned activities
          explanationViewed: explanationViewedNow,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok !== true) {
        setFeedback({
          type: "error",
          message: resolveStudentActivityApiErrorHe(json, "שמירת תשובה נכשלה"),
        });
        return;
      }
      const isDiscussion = activity?.mode === "discussion";
      const showExplanation =
        !isDiscussion &&
        (activity?.mode === "guided_practice" || activity?.mode === "homework");
      if (isDiscussion) {
        setFeedback({
          type: "submitted",
          message: "התשובה נשלחה",
        });
      } else {
        const explanationText = showExplanation ? json.explanation : undefined;
        // Phase 3: mark that an explanation was shown; next question submit will carry explanationViewed=true
        if (explanationText) explanationViewedRef.current = true;
        setFeedback({
          type: json.isCorrect ? "correct" : "wrong",
          message: json.isCorrect ? "נכון!" : "לא נכון",
          explanation: explanationText,
        });
      }
      setSavedAttempts((prev) => ({
        ...prev,
        [effectiveIdx]: {
          questionIndex: effectiveIdx,
          selectedAnswer: answerInput,
          isCorrect: json.isCorrect ?? null,
        },
      }));
      setScratchpadOpen(false);
      if (activity?.mode !== "live_lesson" && effectiveIdx < questionSet.length - 1) {
        setTimeout(() => {
          setCurrentIdx((i) => i + 1);
        }, showExplanation ? 1500 : 600);
      }
    } finally {
      setBusy(false);
    }
  };

  const submitActivity = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/student/activities/${encodeURIComponent(activityId)}/submit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (json?.ok) {
        setSubmitConfirmOpen(false);
        setFinished({
          scorePct: json.scorePct,
          correctCount: json.correctCount,
          questionCount: json.questionCount,
        });
        setPhase("done");
        return true;
      }
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openSubmitConfirm = () => {
    if (!busy) setSubmitConfirmOpen(true);
  };

  const handleConfirmSubmitActivity = () => {
    void submitActivity();
  };

  const layoutProps = { studentTheme: theme, studentShell: "learning" };

  if (phase === "loading") {
    return (
      <Layout {...layoutProps}>
        <div className={`min-h-[50vh] flex items-center justify-center ${L.loadingText}`}>טוען פעילות…</div>
      </Layout>
    );
  }

  if (phase === "error") {
    return (
      <Layout {...layoutProps}>
        <div className="max-w-lg mx-auto px-4 py-12 text-center" dir="rtl">
          <p className={`${L.errorText} mb-4`}>{error}</p>
          <Link href="/student/home" className={L.errorLink}>
            חזרה לבית
          </Link>
        </div>
      </Layout>
    );
  }

  if (phase === "done" && finished) {
    const isDiscussionDone = activity?.mode === "discussion";
    const isExplanationOnly =
      isDiscussionDone && activity?.answerRequired === false;
    const multiQuestionDiscussion =
      isDiscussionDone && !isExplanationOnly && (finished.questionCount ?? questionSet.length) > 1;
    return (
      <Layout {...layoutProps}>
        <div className="max-w-lg mx-auto px-4 py-12 text-center" dir="rtl">
          <h1 className={`${L.doneTitle} mb-4`}>
            {isExplanationOnly
              ? "קראת את ההסבר"
              : isDiscussionDone
                ? multiQuestionDiscussion
                  ? "סיימת את הדיון"
                  : "התשובה נשלחה"
                : "סיימת את הפעילות!"}
          </h1>
          {!isDiscussionDone ? (
            <p className={`${L.doneScore} mb-6`}>
              {formatStudentActivityCompletionSummaryHe(
                finished.correctCount,
                finished.questionCount
              )}
            </p>
          ) : isExplanationOnly ? (
            <p className={`${L.doneBody} mb-6`}>קראת את ההסבר של המורה. תודה!</p>
          ) : multiQuestionDiscussion ? (
            <p className={`${L.doneBody} mb-6`}>
              סיימת {finished.questionCount ?? questionSet.length} שאלות דיון. תודה על המענה!
            </p>
          ) : (
            <p className={`${L.doneBody} mb-6`}>תודה על המענה. המורה יראה את התשובה בכיתה.</p>
          )}
          <Link href="/student/home" className={L.doneButton}>
            חזרה לבית
          </Link>
        </div>
      </Layout>
    );
  }

  const isDiscussion = activity?.mode === "discussion";
  const isAnswerRequired = activity?.answerRequired !== false;
  const isExplanationOnly = isDiscussion && !isAnswerRequired;
  const isQuiz = activity?.mode === "quiz";
  const progressPct =
    questionSet.length > 0 ? Math.round(((effectiveIdx + 1) / questionSet.length) * 100) : 0;
  const choiceGridClass = activityChoiceGridClassName(currentQuestion?.choices);

  const activitySubtitle = `${activityModeLabelHe(activity?.mode)} · שאלה ${effectiveIdx + 1} מתוך ${questionSet.length}`;

  const feedbackToneClass =
    feedback?.type === "correct"
      ? L.feedbackCorrect
      : feedback?.type === "submitted"
        ? L.feedbackSubmitted
        : feedback?.type === "error"
          ? L.feedbackError
          : L.feedbackWrong;

  const renderAnswerFeedback = () => (
    <>
      {feedback?.type === "wait" ? (
        <p className={L.waitText}>{feedback.message}</p>
      ) : null}
      {feedback && feedback.type !== "wait" ? (
        <div className={`${L.feedbackBox} ${feedbackToneClass}`}>
          <p>{feedback.message}</p>
          {feedback.explanation ? <p className="mt-1">{feedback.explanation}</p> : null}
        </div>
      ) : null}
    </>
  );

  const renderSharedScratchpadKeyboard = () =>
    sharedScratchpadKeyboard ? (
      <VirtualAnswerKeyboard
        layout={mathVkPolicy.layout || "numeric"}
        value={activeScratchpadCell ? activeScratchpadCell.value : answerInput}
        onChange={(next) => {
          if (activeScratchpadCell) {
            activeScratchpadCell.onChange(String(next ?? "").replace(/\D/g, "").slice(-1));
            return;
          }
          setAnswerInput(next);
        }}
        disabled={isCurrentQuestionAnswered || busy}
        compact={isTouchDevice}
        submitTone="blue"
        className={isBright ? MB.vkPad : usesScratchpadDock ? "mt-0" : "mt-1"}
        keyClassName={isBright ? (isTouchDevice ? MB.vkKeyCompact : MB.vkKey) : undefined}
        actionKeyClassName={
          isBright
            ? isTouchDevice
              ? `${MB.vkKeyCompact} text-sm`
              : MB.vkKey
            : undefined
        }
        submitClassName={isBright ? MB.vkSubmitBlue : undefined}
        submitButton={
          mobileEmbeddedNumericSubmit
            ? {
                label: isCurrentQuestionAnswered ? "התשובה נשמרה" : "שליחת תשובה",
                onClick: () => {
                  if (!busy && !isCurrentQuestionAnswered && String(answerInput).trim() !== "") {
                    void submitAnswer();
                  }
                },
                disabled:
                  busy || String(answerInput).trim() === "" || isCurrentQuestionAnswered,
                testId: "activity-submit-answer",
              }
            : null
        }
      />
    ) : null;

  const renderDockScratchpadToggleButton = (className, testId = "math-scratchpad-open-dock") => {
    const openModifier =
      testId === "math-scratchpad-toggle-dock-desktop"
        ? L.scratchpadDockDesktopScratchpadButtonOpen
        : L.scratchpadDockScratchpadButtonOpen;
    const label = scratchpadOpen ? "סגור טיוטה" : "דף טיוטה";
    return (
      <button
        type="button"
        onClick={() => setScratchpadOpen((open) => !open)}
        className={`relative ${className}${scratchpadOpen ? ` ${openModifier}` : ""}`}
        data-testid={testId}
      >
        <span className="invisible select-none" aria-hidden="true">
          דף טיוטה
        </span>
        <span className="absolute inset-0 flex items-center justify-center overflow-hidden px-3">
          {label}
        </span>
      </button>
    );
  };

  const renderActivityFinishRow = (compact = false, { includeScratchpadToggle = false } = {}) =>
    activity?.mode !== "live_lesson" && !isExplanationOnly ? (
      compact ? (
        <div className={L.scratchpadDockFinishRow}>
          {effectiveIdx < questionSet.length - 1 && !isQuiz && !isDiscussion ? (
            <button
              type="button"
              onClick={() => {
                setCurrentIdx((i) => Math.min(questionSet.length - 1, i + 1));
              }}
              className={L.scratchpadDockSecondaryButton}
            >
              שאלה הבאה
            </button>
          ) : null}
          {includeScratchpadToggle
            ? renderDockScratchpadToggleButton(
                L.scratchpadDockScratchpadButton,
                "math-scratchpad-toggle-dock-mobile"
              )
            : null}
          <button
            type="button"
            disabled={busy}
            onClick={openSubmitConfirm}
            className={L.scratchpadDockFinishButton}
          >
            סיום והגשה
          </button>
        </div>
      ) : (
        <>
          {effectiveIdx < questionSet.length - 1 && !isQuiz && !isDiscussion ? (
            <button
              type="button"
              onClick={() => {
                setCurrentIdx((i) => Math.min(questionSet.length - 1, i + 1));
              }}
              className={L.footerButton}
            >
              שאלה הבאה
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={openSubmitConfirm}
            className={L.footerSubmit}
          >
            סיום והגשה
          </button>
        </>
      )
    ) : null;

  const renderActions = ({ includeInlineKeyboard = true, includePerQuestionSubmit = true } = {}) => (
    <>
      {isExplanationOnly ? (
        <>
          <p className={L.explanationBanner}>
            אין צורך להגיש תשובה — קרא/י את התוכן
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (effectiveIdx < questionSet.length - 1) {
                advanceToNextQuestion();
              } else {
                void submitActivity();
              }
            }}
            className={L.submitButton}
          >
            {effectiveIdx < questionSet.length - 1 ? "קראתי — המשך" : "סיימתי לקרוא"}
          </button>
        </>
      ) : assignedActivityQuestionUsesChoiceUi(currentQuestion) ? (
        <div className={L.answerWrap}>
          <div className={choiceGridClass} data-testid="activity-answer-choices">
            {currentQuestion.choices.map((c, i) => (
              <button
                key={i}
                type="button"
                disabled={isCurrentQuestionAnswered || busy}
                onClick={() => setAnswerInput(String(c))}
                className={`${L.choiceButton} ${
                  answerInput === String(c) ? L.choiceButtonSelected : L.choiceButtonDefault
                }`}
              >
                <AssignedActivityBidiText text={c} className="block w-full" />
              </button>
            ))}
          </div>
        </div>
      ) : assignedActivityUsesNumericKeyboard(currentQuestion) ? (
        <>
          <div className={L.answerWrap}>
            <StudentNumericAnswerField
              subject={currentQuestion.subject === "geometry" ? "geometry" : "math"}
              value={answerInput}
              onChange={setAnswerInput}
              disabled={isCurrentQuestionAnswered || busy}
              testId={
                currentQuestion.subject === "geometry"
                  ? "activity-geometry-numeric-answer"
                  : "activity-math-numeric-answer"
              }
              placeholder="הקלידו תשובה"
              autoFocus={!scratchpadOpen || currentQuestion.subject !== "math"}
              suppressEmbeddedKeyboard={sharedScratchpadKeyboard}
              onInputFocus={() => setActiveScratchpadCell(null)}
              inputClassName={
                isBright ? (isTouchDevice ? MB.inputMobile : MB.inputDesktop) : undefined
              }
              onEnterSubmit={() => {
                if (!busy && !isCurrentQuestionAnswered && String(answerInput).trim() !== "") {
                  void submitAnswer();
                }
              }}
              onSubmit={() => {
                if (!busy && !isCurrentQuestionAnswered && String(answerInput).trim() !== "") {
                  void submitAnswer();
                }
              }}
              submitDisabled={
                busy || String(answerInput).trim() === "" || isCurrentQuestionAnswered
              }
              submitTestId="activity-submit-answer"
              submitLabel={isCurrentQuestionAnswered ? "התשובה נשמרה" : "שליחת תשובה"}
            />
          </div>
          {includeInlineKeyboard && sharedScratchpadKeyboard
            ? renderSharedScratchpadKeyboard()
            : null}
        </>
      ) : (
        <div className={L.answerWrap}>
          <input
            className={L.textInput}
            value={answerInput}
            onChange={(e) => setAnswerInput(e.target.value)}
            placeholder="הקלידו תשובה"
            dir="auto"
            readOnly={isCurrentQuestionAnswered}
            disabled={isCurrentQuestionAnswered}
            {...answerInputProps}
          />
        </div>
      )}
      {renderAnswerFeedback()}
      {!isExplanationOnly && includePerQuestionSubmit && !mobileEmbeddedNumericSubmit ? (
        <button
          type="button"
          disabled={
            busy ||
            String(answerInput).trim() === "" ||
            isCurrentQuestionAnswered
          }
          onClick={submitAnswer}
          className={L.submitButton}
        >
          {isCurrentQuestionAnswered ? "התשובה נשמרה" : "שליחת תשובה"}
        </button>
      ) : null}
    </>
  );

  const showDockNextQuestion =
    effectiveIdx < questionSet.length - 1 && !isQuiz && !isDiscussion;
  const showDockFinishActions = activity?.mode !== "live_lesson" && !isExplanationOnly;

  const renderDockPerQuestionSubmitButton = (className) =>
    !isExplanationOnly ? (
      <button
        type="button"
        disabled={
          busy || String(answerInput).trim() === "" || isCurrentQuestionAnswered
        }
        onClick={submitAnswer}
        className={className}
        data-testid="activity-submit-answer"
      >
        {isCurrentQuestionAnswered ? "התשובה נשמרה" : "שליחת תשובה"}
      </button>
    ) : null;

  const renderDesktopDockButtonRow = () =>
    showDockFinishActions ? (
      <div
        className={`hidden md:flex ${L.scratchpadDockDesktopButtonRow}`}
        data-testid="activity-scratchpad-desktop-actions"
      >
        {showDockNextQuestion ? (
          <button
            type="button"
            onClick={() => {
              setCurrentIdx((i) => Math.min(questionSet.length - 1, i + 1));
            }}
            className={L.scratchpadDockDesktopSecondaryButton}
          >
            שאלה הבאה
          </button>
        ) : null}
        {renderDockScratchpadToggleButton(
          L.scratchpadDockDesktopScratchpadButton,
          "math-scratchpad-toggle-dock-desktop"
        )}
        {renderDockPerQuestionSubmitButton(L.scratchpadDockDesktopSubmitButton)}
        <button
          type="button"
          disabled={busy}
          onClick={openSubmitConfirm}
          className={L.scratchpadDockDesktopFinishButton}
        >
          סיום והגשה
        </button>
      </div>
    ) : null;

  const renderScratchpadDock = () => (
    <div className={L.scratchpadDockActionsPanel}>
      {renderActions({ includeInlineKeyboard: false, includePerQuestionSubmit: false })}

      <div className="flex flex-col gap-1 md:hidden">
        {!mobileEmbeddedNumericSubmit
          ? renderDockPerQuestionSubmitButton(L.submitButton)
          : null}
        {renderSharedScratchpadKeyboard()}
        {renderActivityFinishRow(true, { includeScratchpadToggle: true })}
      </div>

      {renderDesktopDockButtonRow()}
    </div>
  );

  const assignedActivityShell = currentQuestion ? (
    <StudentAssignedActivityShell
          title={activity?.title || ""}
          subtitle={activitySubtitle}
          progressPct={progressPct}
          singleColumn={isExplanationOnly}
          overlayTopRef={usesMathScratchpad ? scratchpadOverlayTopRef : undefined}
          overlayWidthRef={usesMathScratchpad ? scratchpadOverlayWidthRef : undefined}
          visual={
            usesMathScratchpad && scratchpadCtx ? (
              <MathScratchpadSlot
                gradeKey={scratchpadCtx.gradeKey}
                operation={scratchpadCtx.operation}
                question={scratchpadCtx.question}
                questionKey={`${effectiveIdx}-${String(currentQuestion.qk || currentQuestion.question || "")}`}
                open={scratchpadOpen}
                onOpenChange={handleScratchpadOpenChange}
                hideInlineOpenButton
                preserveQuestionLayout
                overlayTopRef={scratchpadOverlayTopRef}
                overlayWidthRef={scratchpadOverlayWidthRef}
                answerAnchorRef={scratchpadDockAnchorRef}
                exerciseHeadlineOverride={verticalExerciseHeadline || undefined}
                getQuestionFontStyle={getStudentActivityQuestionFontStyle}
              >
                <StudentAssignedActivityQuestionStage
                  question={currentQuestion}
                  questionIndex={effectiveIdx}
                  hideLayoutToggle={scratchpadOpen}
                  onVerticalExerciseHeadlineChange={setVerticalExerciseHeadline}
                />
              </MathScratchpadSlot>
            ) : (
              <StudentAssignedActivityQuestionStage
                question={currentQuestion}
                questionIndex={effectiveIdx}
              />
            )
          }
      actions={
        usesScratchpadDock ? null : renderActions()
      }
      usesScratchpadDock={usesScratchpadDock}
      scratchpadDockAnchorRef={scratchpadDockAnchorRef}
      scratchpadDock={usesScratchpadDock ? renderScratchpadDock() : null}
      footer={usesScratchpadDock ? null : renderActivityFinishRow(false)}
    />
  ) : null;

  const wrapScratchpadVirtualInput = (node) =>
    usesScratchpadDock ? (
      <ScratchpadVirtualInputProvider onActiveCellChange={setActiveScratchpadCell}>
        {node}
      </ScratchpadVirtualInputProvider>
    ) : (
      node
    );

  return (
    <Layout {...layoutProps}>
      {activity?.mode === "live_lesson" && activity?.activityStatus === "paused" ? (
        <div className={L.page} dir="rtl" lang="he">
          <p className={`${L.waitText} text-center py-4`}>ממתינים למורה…</p>
        </div>
      ) : assignedActivityShell ? (
        wrapScratchpadVirtualInput(assignedActivityShell)
      ) : (
        <div className={L.page} dir="rtl" lang="he" />
      )}
      <StudentActivitySubmitConfirmModal
        open={submitConfirmOpen}
        busy={busy}
        activityTitle={activity?.title || ""}
        answeredCount={answeredQuestionCount}
        questionCount={questionSet.length}
        onCancel={() => {
          if (!busy) setSubmitConfirmOpen(false);
        }}
        onConfirm={handleConfirmSubmitActivity}
      />
    </Layout>
  );
}
