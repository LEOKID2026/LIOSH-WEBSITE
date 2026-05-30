import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../../components/Layout";
import {
  activityModeLabelHe,
  isClassroomActivitiesEnabled,
} from "../../../lib/classroom-activities/classroom-activities-labels.client.js";
import { formatStudentActivityCompletionSummaryHe } from "../../../lib/classroom-activities/student-activity-result-labels.client.js";
import { resolveStudentActivityApiErrorHe } from "../../../lib/classroom-activities/student-activity-error-labels.client.js";
import { resolveStudentActivityAnswerInputProps } from "../../../lib/classroom-activities/student-activity-question-ui.client.js";
import ClassroomGeometryQuestionDiagram from "../../../components/student/ClassroomGeometryQuestionDiagram";
import StudentActivityQuestionSurface from "../../../components/student/StudentActivityQuestionSurface";

export async function getServerSideProps(context) {
  if (process.env.NEXT_PUBLIC_ACTIVITIES_ENABLED === "false") {
    return { redirect: { destination: "/student/home", permanent: false } };
  }
  return { props: { activityId: String(context.params?.activityId || "") } };
}

export default function StudentActivityPage({ activityId }) {
  const router = useRouter();
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
      if (json.activity?.mode === "live_lesson") {
        setCurrentIdx(json.activity?.currentQuestionIdx ?? 0);
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

  const answerInputProps = useMemo(
    () => resolveStudentActivityAnswerInputProps(currentQuestion),
    [currentQuestion]
  );

  const advanceToNextQuestion = useCallback(() => {
    if (effectiveIdx < questionSet.length - 1) {
      setCurrentIdx((i) => i + 1);
      setAnswerInput("");
      setFeedback(null);
    }
  }, [effectiveIdx, questionSet.length]);

  const submitAnswer = async () => {
    if (!currentQuestion || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/student/activities/${encodeURIComponent(activityId)}/answer`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionIndex: effectiveIdx,
          selectedAnswer: answerInput,
          timeSpentMs: 5000,
          hintsUsed: 0,
          explanationViewed: false,
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
        setFeedback({
          type: json.isCorrect ? "correct" : "wrong",
          message: json.isCorrect ? "נכון!" : "לא נכון",
          explanation: showExplanation ? json.explanation : undefined,
          correctAnswer: showExplanation ? json.correctAnswer : undefined,
        });
      }
      if (activity?.mode !== "live_lesson" && effectiveIdx < questionSet.length - 1) {
        setTimeout(() => {
          setCurrentIdx((i) => i + 1);
          setAnswerInput("");
          setFeedback(null);
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
        setFinished({
          scorePct: json.scorePct,
          correctCount: json.correctCount,
          questionCount: json.questionCount,
        });
        setPhase("done");
      }
    } finally {
      setBusy(false);
    }
  };

  if (phase === "loading") {
    return (
      <Layout>
        <div className="min-h-[50vh] flex items-center justify-center text-white/80">טוען פעילות…</div>
      </Layout>
    );
  }

  if (phase === "error") {
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-12 text-center" dir="rtl">
          <p className="text-red-200 mb-4">{error}</p>
          <Link href="/student/home" className="text-amber-300 underline">
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
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-12 text-center" dir="rtl">
          <h1 className="text-2xl font-bold text-white mb-4">
            {isExplanationOnly
              ? "קראת את ההסבר"
              : isDiscussionDone
                ? multiQuestionDiscussion
                  ? "סיימת את הדיון"
                  : "התשובה נשלחה"
                : "סיימת את הפעילות!"}
          </h1>
          {!isDiscussionDone ? (
            <p className="text-xl font-bold text-emerald-300 mb-6">
              {formatStudentActivityCompletionSummaryHe(
                finished.correctCount,
                finished.questionCount
              )}
            </p>
          ) : isExplanationOnly ? (
            <p className="text-white/70 text-sm mb-6">קראת את ההסבר של המורה. תודה!</p>
          ) : multiQuestionDiscussion ? (
            <p className="text-white/70 text-sm mb-6">
              סיימת {finished.questionCount ?? questionSet.length} שאלות דיון. תודה על המענה!
            </p>
          ) : (
            <p className="text-white/70 text-sm mb-6">תודה על המענה. המורה יראה את התשובה בכיתה.</p>
          )}
          <Link
            href="/student/home"
            className="inline-flex rounded-xl bg-emerald-500 text-black font-bold px-6 py-3"
          >
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
  const showHints =
    !isDiscussion &&
    (activity?.mode === "guided_practice" || activity?.mode === "homework");
  const progressPct =
    questionSet.length > 0 ? Math.round(((effectiveIdx + 1) / questionSet.length) * 100) : 0;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8" dir="rtl" lang="he">
        <Link href="/student/home" className="text-sm text-white/60 hover:text-white mb-4 inline-block">
          ← חזרה לבית
        </Link>

        <h1 className="text-2xl font-bold text-white mb-1">{activity?.title}</h1>
        <p className="text-white/60 text-sm mb-4">
          {activityModeLabelHe(activity?.mode)} · שאלה {effectiveIdx + 1} מתוך {questionSet.length}
        </p>

        <div className="h-2 rounded-full bg-black/40 mb-6 overflow-hidden">
          <div
            className="h-full bg-cyan-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {activity?.mode === "live_lesson" && activity?.activityStatus === "paused" ? (
          <p className="text-amber-200 text-center py-8">ממתינים למורה…</p>
        ) : currentQuestion ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            {currentQuestion.subject === "geometry" ? (
              <ClassroomGeometryQuestionDiagram question={currentQuestion} />
            ) : null}
            <StudentActivityQuestionSurface
              question={currentQuestion}
              questionIndex={effectiveIdx}
            />
            {isExplanationOnly ? (
              <>
                <p className="text-sm text-cyan-200/90 mb-4 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2">
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
                  className="w-full rounded-xl bg-cyan-500 text-black font-bold py-3 disabled:opacity-50"
                >
                  {effectiveIdx < questionSet.length - 1 ? "קראתי — המשך" : "סיימתי לקרוא"}
                </button>
              </>
            ) : Array.isArray(currentQuestion.choices) && currentQuestion.choices.length ? (
              <div
                className={`mb-4 ${
                  currentQuestion.choices.every((c) => String(c).length <= 16)
                    ? "grid grid-cols-1 sm:grid-cols-2 gap-2"
                    : "space-y-2"
                }`}
                data-testid="activity-answer-choices"
              >
                {currentQuestion.choices.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAnswerInput(String(c))}
                    className={`w-full text-right px-4 py-3 rounded-xl border min-h-[44px] ${
                      answerInput === String(c)
                        ? "border-cyan-400 bg-cyan-500/20"
                        : "border-white/15 hover:bg-white/5"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            ) : (
              <input
                className="w-full rounded-xl bg-black/30 border border-white/20 px-4 py-3 text-white mb-4"
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                placeholder="הקלידו תשובה"
                dir="auto"
                {...answerInputProps}
              />
            )}
            {!isExplanationOnly && showHints && currentQuestion.hint ? (
              <p className="text-xs text-white/50 mb-3">רמז: {currentQuestion.hint}</p>
            ) : null}
            {feedback?.type === "wait" ? (
              <p className="text-amber-200 text-sm mb-3">{feedback.message}</p>
            ) : null}
            {feedback && feedback.type !== "wait" ? (
              <div
                className={`mb-4 text-sm rounded-lg px-3 py-2 ${
                  feedback.type === "correct"
                    ? "bg-emerald-500/20 text-emerald-100"
                    : feedback.type === "submitted"
                      ? "bg-white/10 text-white/90"
                      : feedback.type === "error"
                        ? "bg-red-500/20 text-red-100"
                        : "bg-amber-500/20 text-amber-100"
                }`}
              >
                <p>{feedback.message}</p>
                {feedback.correctAnswer ? (
                  <p className="mt-1">תשובה נכונה: {feedback.correctAnswer}</p>
                ) : null}
                {feedback.explanation ? <p className="mt-1">{feedback.explanation}</p> : null}
              </div>
            ) : null}
            {!isExplanationOnly ? (
            <button
              type="button"
              disabled={busy || !answerInput.trim()}
              onClick={submitAnswer}
              className="w-full rounded-xl bg-cyan-500 text-black font-bold py-3 disabled:opacity-50"
            >
              שליחת תשובה
            </button>
            ) : null}
          </div>
        ) : null}

        {activity?.mode !== "live_lesson" && !isExplanationOnly ? (
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {effectiveIdx < questionSet.length - 1 && !isQuiz && !isDiscussion ? (
              <button
                type="button"
                onClick={() => {
                  setCurrentIdx((i) => Math.min(questionSet.length - 1, i + 1));
                  setAnswerInput("");
                  setFeedback(null);
                }}
                className="px-4 py-2 rounded-xl border border-white/20 text-sm"
              >
                שאלה הבאה
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={submitActivity}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm"
            >
              סיום והגשה
            </button>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
