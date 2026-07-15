import { useCallback, useEffect, useState } from "react";
import ClassroomGeometryQuestionDiagram from "../student/ClassroomGeometryQuestionDiagram";
import { teacherAuthFetch } from "../../lib/teacher-portal/teacher-ui.he.js";
import { studentActivityStatusLabelHe } from "../../lib/classroom-activities/classroom-activities-labels.client.js";
import AssignedActivityQuestionDisplay from "../classroom-activities/AssignedActivityQuestionDisplay.jsx";
import AssignedActivityBidiText from "../classroom-activities/AssignedActivityBidiText.jsx";

function answerStatusLabel(isCorrect) {
  if (isCorrect === true) return { text: "נכון", className: "text-emerald-300" };
  if (isCorrect === false) return { text: "שגוי", className: "text-red-300" };
  return { text: "ללא תשובה", className: "text-white/50" };
}

/**
 * @param {{
 *   open: boolean;
 *   onClose: () => void;
 *   accessToken: string;
 *   activityId: string;
 *   student: { studentId: string; studentFullNameMasked: string; status: string; answersCount?: number; correctCount?: number } | null;
 *   activityTitle?: string;
 *   answersApiPath?: string;
 *   authFetch?: (token: string, path: string, init?: RequestInit) => Promise<Response>;
 * }} props
 */
export default function TeacherActivityStudentAnswersModal({
  open,
  onClose,
  accessToken,
  activityId,
  student,
  activityTitle,
  answersApiPath,
  authFetch,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    if (!open || !accessToken || !activityId || !student?.studentId) return;
    setLoading(true);
    setError("");
    try {
      const fetchAnswers = authFetch || teacherAuthFetch;
      const path =
        answersApiPath ||
        `/api/teacher/activities/${encodeURIComponent(activityId)}/students/${encodeURIComponent(student.studentId)}/answers`;
      const res = await fetchAnswers(accessToken, path);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDetail(null);
        setError(body?.error?.message || body?.error?.code || "טעינת תשובות נכשלה");
        return;
      }
      setDetail(body.data);
    } catch {
      setDetail(null);
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }, [open, accessToken, activityId, student?.studentId, answersApiPath, authFetch]);

  useEffect(() => {
    if (open) load();
    else {
      setDetail(null);
      setError("");
    }
  }, [open, load]);

  if (!open || !student) return null;

  const status = student.status;
  const emptyNotStarted = status === "not_started";
  const emptyNoAnswers =
    !emptyNotStarted && (student.answersCount ?? 0) === 0 && !(detail?.questions || []).some((q) => q.selectedAnswer);

  const title = activityTitle || detail?.activity?.title || "פעילות";
  const accuracy =
    detail?.student?.accuracyPct != null
      ? `${detail.student.accuracyPct}%`
      : student.answersCount > 0
        ? `${Math.round((student.correctCount / student.answersCount) * 100)}%`
        : "-";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="סגור"
        onClick={onClose}
      />
      <div
        className="relative w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/15 bg-[#1a1f35] shadow-xl"
        data-testid="teacher-student-answers-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="teacher-student-answers-title"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-white/10 bg-[#1a1f35] px-4 py-3">
          <h2 id="teacher-student-answers-title" className="text-lg font-semibold">
            תשובות: {student.studentFullNameMasked}
          </h2>
          <button type="button" onClick={onClose} className="text-white/60 text-sm shrink-0">
            סגור
          </button>
        </div>

        <div className="px-4 py-3 text-sm text-white/70 space-y-1">
          <p>{title}</p>
          <p>
            סטטוס: {studentActivityStatusLabelHe(status)} · דיוק: {accuracy} · תשובות:{" "}
            {detail?.student?.answersCount ?? student.answersCount ?? 0}/
            {detail?.activity?.questionCount ?? "-"}
          </p>
        </div>

        <div className="px-4 pb-4">
          {loading ? (
            <p className="text-white/60 text-sm py-6 text-center">טוען תשובות…</p>
          ) : error ? (
            <p className="text-red-200 text-sm py-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3">
              {error}
            </p>
          ) : emptyNotStarted ? (
            <p className="text-white/60 text-sm py-6 text-center">הילד/ה עדיין לא התחיל/ה את הפעילות.</p>
          ) : emptyNoAnswers ? (
            <p className="text-white/60 text-sm py-6 text-center">אין עדיין תשובות.</p>
          ) : (
            <ol className="space-y-4">
              {(detail?.questions || []).map((q) => {
                const badge = answerStatusLabel(q.isCorrect);
                const diagramQuestion =
                  q.subject === "geometry"
                    ? {
                        subject: q.subject,
                        topic: q.topic,
                        shape: q.shape,
                        params: q.params,
                      }
                    : null;
                return (
                  <li
                    key={q.questionIndex}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3"
                    data-testid={`teacher-student-answer-row-${q.questionIndex}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="font-medium text-white/90">שאלה {q.questionIndex + 1}</span>
                      <span className={`text-xs font-medium ${badge.className}`}>{badge.text}</span>
                    </div>
                    {diagramQuestion ? (
                      <ClassroomGeometryQuestionDiagram question={diagramQuestion} />
                    ) : null}
                    {q.question ? (
                      <div className="text-white/90 text-sm mb-2">
                        <AssignedActivityQuestionDisplay question={q} variant="compact" />
                      </div>
                    ) : null}
                    {Array.isArray(q.choices) && q.choices.length > 0 ? (
                      <p className="text-white/50 text-xs mb-2">
                        אפשרויות:{" "}
                        {q.choices.map((choice, choiceIndex) => (
                          <span key={choiceIndex}>
                            {choiceIndex > 0 ? " · " : ""}
                            <AssignedActivityBidiText text={choice} />
                          </span>
                        ))}
                      </p>
                    ) : null}
                    <dl className="grid gap-1 text-sm">
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="text-white/50">תשובת הילד/ה:</dt>
                        <dd className="text-white/90" data-testid="student-selected-answer">
                          <AssignedActivityBidiText text={q.selectedAnswer ?? "-"} />
                        </dd>
                      </div>
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="text-white/50">תשובה נכונה:</dt>
                        <dd className="text-white/90" data-testid="student-correct-answer">
                          <AssignedActivityBidiText text={q.correctAnswer ?? "-"} />
                        </dd>
                      </div>
                      {q.legacyFallback ? (
                        <p className="text-white/45 text-xs" data-testid="legacy-fallback-indicator">
                          -
                        </p>
                      ) : null}
                    </dl>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
