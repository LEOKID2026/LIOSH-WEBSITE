import { useCallback, useEffect, useState } from "react";
import { subjectLabelHe } from "../../lib/platform-ui/hebrew-display-labels.js";
import { formatActivityTopicDisplayHe } from "../../lib/classroom-activities/student-activity-display-labels.client.js";
import {
  parentSentActivitiesSectionTitleHe,
  parentSentActivityStatusLabelHe,
  parentViewActivityResultsLabelHe,
} from "../../lib/parent-server/parent-activity-labels.client.js";
import AssignedActivityQuestionDisplay from "../classroom-activities/AssignedActivityQuestionDisplay.jsx";
import AssignedActivityBidiText from "../classroom-activities/AssignedActivityBidiText.jsx";
import { trackProductEvent } from "../../lib/analytics/track-event.client.js";
import { getParentPortalTheme } from "../../lib/parent-ui/parent-portal-theme.client.js";

const POLL_MS = 8000;

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("he-IL", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

function formatScore(scorePct) {
  if (scorePct == null || Number.isNaN(Number(scorePct))) return "—";
  return `${Number(scorePct).toFixed(0)}%`;
}

function ParentActivityResultsModal({ activityId, accessToken, onClose, bright = false }) {
  const T = getParentPortalTheme(bright);
  const panelClass = bright
    ? "max-w-lg w-full max-h-[85vh] overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 space-y-3 shadow-xl text-right text-slate-900"
    : "max-w-lg w-full max-h-[85vh] overflow-y-auto rounded-lg border border-white/20 bg-[#0f1629] p-4 space-y-3 shadow-xl text-right";
  const titleClass = bright ? "text-lg font-bold text-slate-900" : "text-lg font-bold text-white";
  const mutedClass = bright ? "text-sm text-slate-600" : "text-sm text-white/70";
  const errorClass = bright ? "text-sm text-rose-600" : "text-sm text-red-300";
  const bodyClass = bright ? "text-sm text-slate-700 space-y-1" : "text-sm text-white/80 space-y-1";
  const itemClass = bright
    ? "rounded border border-slate-200 bg-slate-50 p-2 text-sm"
    : "rounded border border-white/10 bg-black/30 p-2 text-sm";
  const itemTitleClass = bright ? "font-medium text-slate-900" : "font-medium text-white";
  const dividerClass = bright ? "space-y-2 pt-2 border-t border-slate-200" : "space-y-2 pt-2 border-t border-white/10";
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    if (!activityId || !accessToken) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        `/api/parent/activities/${encodeURIComponent(activityId)}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok !== true) {
        setError(json?.message || json?.error || "לא ניתן לטעון תוצאות");
        setDetail(null);
        return;
      }
      setDetail(json);
    } catch {
      setError("שגיאת רשת");
      setDetail(null);
    } finally {
      setBusy(false);
    }
  }, [activityId, accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const activity = detail?.activity;
  const attempts = Array.isArray(detail?.attempts) ? detail.attempts : [];
  const questions = Array.isArray(detail?.questions) ? detail.questions : [];

  return (
    <div
      className={bright ? T.deleteOverlay : "fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4"}
      role="dialog"
      aria-modal="true"
      aria-labelledby="parent-activity-results-title"
    >
      <div className={panelClass}>
        <div className="flex items-start justify-between gap-3">
          <h3 id="parent-activity-results-title" className={titleClass}>
            {activity?.title || "תוצאות פעילות"}
          </h3>
          <button type="button" className={bright ? T.copyBtn : "rounded bg-white/10 px-2 py-1 text-xs shrink-0"} onClick={onClose}>
            סגירה
          </button>
        </div>

        {busy ? <p className={mutedClass}>טוען…</p> : null}
        {error ? <p className={errorClass}>{error}</p> : null}

        {activity ? (
          <div className={bodyClass}>
            <div>
              מקצוע: {subjectLabelHe(activity.subject)} · נושא:{" "}
              {formatActivityTopicDisplayHe(activity.subject, activity.topic, activity.subtopic)}
            </div>
            <div>
              סטטוס: {parentSentActivityStatusLabelHe(activity.studentStatus)}
            </div>
            <div>
              תשובות: {activity.answersCount ?? 0} · נכונות: {activity.correctCount ?? 0} ·
              ציון: {formatScore(activity.scorePct)}
            </div>
            <div>התחלה: {formatWhen(activity.startedAt)}</div>
            <div>סיום: {formatWhen(activity.submittedAt)}</div>
          </div>
        ) : null}

        {questions.length > 0 ? (
          <div className={dividerClass}>
            <div className={`font-semibold text-sm ${bright ? "text-slate-900" : "text-white"}`}>פירוט תשובות</div>
            {questions.map((q) => (
              <div
                key={q.questionIndex}
                className={itemClass}
                data-testid={`parent-activity-question-${q.questionIndex}`}
              >
                <div className={itemTitleClass}>
                  שאלה {Number(q.questionIndex) + 1}:{" "}
                  {q.isCorrect === true
                    ? "נכון"
                    : q.isCorrect === false
                      ? "לא נכון"
                      : "—"}
                </div>
                {q.question ? (
                  <div className="text-white/85 mt-1">
                    <AssignedActivityQuestionDisplay
                      question={q}
                      variant="compact"
                      testId={`parent-activity-question-text-${q.questionIndex}`}
                    />
                  </div>
                ) : null}
                {Array.isArray(q.choices) && q.choices.length > 0 ? (
                  <div className="text-white/60 text-xs mt-1">
                    אפשרויות:{" "}
                    {q.choices.map((choice, choiceIndex) => (
                      <span key={choiceIndex}>
                        {choiceIndex > 0 ? " · " : ""}
                        <AssignedActivityBidiText text={choice} />
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="text-white/70 mt-1">
                  תשובה: <AssignedActivityBidiText text={q.selectedAnswer || "—"} />
                </div>
                <div className="text-white/70">
                  תשובה נכונה: <AssignedActivityBidiText text={q.correctAnswer || "—"} />
                </div>
                {q.legacyFallback ? (
                  <div className="text-white/45 text-xs mt-1" data-testid="legacy-fallback-indicator">
                    —
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : attempts.length > 0 ? (
          <div className={dividerClass}>
            <div className={`font-semibold text-sm ${bright ? "text-slate-900" : "text-white"}`}>פירוט תשובות</div>
            {attempts.map((attempt) => (
              <div key={attempt.questionIndex} className={itemClass}>
                <div className={itemTitleClass}>
                  שאלה {Number(attempt.questionIndex) + 1}:{" "}
                  {attempt.isCorrect === true
                    ? "נכון"
                    : attempt.isCorrect === false
                      ? "לא נכון"
                      : "—"}
                </div>
                <div className="text-white/70 mt-1">
                  תשובה: {attempt.selectedAnswer || "—"}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ParentSentActivitiesModal({ studentId, accessToken, refreshKey, onClose, bright = false }) {
  const T = getParentPortalTheme(bright);
  const panelClass = bright
    ? "max-w-lg w-full max-h-[85vh] overflow-y-auto rounded-lg border border-emerald-200 bg-white p-4 space-y-3 shadow-xl text-right text-slate-900"
    : "max-w-lg w-full max-h-[85vh] overflow-y-auto rounded-lg border border-emerald-500/30 bg-[#0f1629] p-4 space-y-3 shadow-xl text-right";
  const titleClass = bright ? "text-lg font-bold text-emerald-800" : "text-lg font-bold text-emerald-100";
  const mutedClass = bright ? "text-sm text-slate-500" : "text-sm text-white/60";
  const cardClass = bright
    ? "rounded border border-slate-200 bg-slate-50 p-3 text-sm space-y-1"
    : "rounded border border-white/10 bg-black/30 p-3 text-sm space-y-1";
  const cardTitleClass = bright ? "font-semibold text-slate-900" : "font-semibold text-white";
  const cardBodyClass = bright ? "text-slate-700" : "text-white/75";
  const cardMetaClass = bright ? "text-slate-500 text-xs" : "text-white/60 text-xs";
  const cardBtnClass = bright ? T.copyBtn + " mt-1" : "mt-1 rounded bg-white/10 hover:bg-white/15 px-2 py-1 text-xs text-white";
  const [activities, setActivities] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [resultsActivityId, setResultsActivityId] = useState(null);

  const load = useCallback(async () => {
    if (!studentId || !accessToken) return;
    try {
      const res = await fetch(
        `/api/parent/activities?studentId=${encodeURIComponent(studentId)}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        }
      );
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.ok === true) {
        setActivities(Array.isArray(json.activities) ? json.activities : []);
      }
    } catch {
      /* non-blocking */
    } finally {
      setLoaded(true);
    }
  }, [studentId, accessToken]);

  useEffect(() => {
    setLoaded(false);
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (!studentId || !accessToken) return undefined;
    const timer = setInterval(() => {
      void load();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [studentId, accessToken, load]);

  return (
    <>
      <div
        className={bright ? T.deleteOverlay : "fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="parent-sent-activities-title"
      >
        <div className={panelClass}>
          <div className="flex items-start justify-between gap-3">
            <h3 id="parent-sent-activities-title" className={titleClass}>
              {parentSentActivitiesSectionTitleHe()}
            </h3>
            <button type="button" className={bright ? T.copyBtn : "rounded bg-white/10 px-2 py-1 text-xs shrink-0"} onClick={onClose}>
              סגירה
            </button>
          </div>

          {!loaded ? <p className={mutedClass}>טוען…</p> : null}

          {loaded && activities.length === 0 ? <p className={mutedClass}>עדיין לא נשלחו פעילויות</p> : null}

          {activities.length > 0 ? (
            <div className="space-y-2">
              {activities.map((activity) => (
                <div key={activity.activityId} className={cardClass}>
                  <div className={cardTitleClass}>{activity.title}</div>
                  <div className={cardBodyClass}>
                    {subjectLabelHe(activity.subject)} ·{" "}
                    {formatActivityTopicDisplayHe(
                      activity.subject,
                      activity.topic,
                      activity.subtopic
                    )}
                  </div>
                  <div className={cardBodyClass}>
                    {parentSentActivityStatusLabelHe(activity.studentStatus)} · תשובות:{" "}
                    {activity.answersCount ?? 0} · נכונות: {activity.correctCount ?? 0} · ציון:{" "}
                    {formatScore(activity.scorePct)}
                  </div>
                  <div className={cardMetaClass}>
                    התחלה: {formatWhen(activity.startedAt)} · סיום:{" "}
                    {formatWhen(activity.submittedAt)}
                  </div>
                  <button
                    type="button"
                    className={cardBtnClass}
                    onClick={() => {
                      setResultsActivityId(activity.activityId);
                      void trackProductEvent({
                        eventName: "personal_activity_results_opened",
                        actorType: "parent",
                        studentId,
                        subject: activity.subject,
                        topic: activity.topic,
                        objectType: "parent_assigned_activity",
                        objectId: activity.activityId,
                        idempotencyKey: `personal_activity_results_opened:${activity.activityId}:${Date.now()}`,
                      });
                    }}
                  >
                    {parentViewActivityResultsLabelHe()}
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {resultsActivityId ? (
        <ParentActivityResultsModal
          activityId={resultsActivityId}
          accessToken={accessToken}
          onClose={() => setResultsActivityId(null)}
          bright={bright}
        />
      ) : null}
    </>
  );
}

/**
 * Compact trigger button — opens sent-activities modal (no inline list on dashboard).
 *
 * @param {{ studentId: string, accessToken: string, refreshKey?: number, buttonClassName?: string }} props
 */
export default function ParentSentActivitiesPanel({
  studentId,
  accessToken,
  refreshKey = 0,
  buttonClassName,
  bright = false,
}) {
  const [open, setOpen] = useState(false);

  if (!accessToken) return null;

  const defaultBtnClass = bright
    ? "rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 px-3 py-2 text-sm font-semibold hover:bg-emerald-100"
    : "rounded border border-emerald-500/40 bg-emerald-950/30 text-emerald-100 px-3 py-2 text-sm font-semibold hover:bg-emerald-900/40";

  return (
    <>
      <button
        type="button"
        className={buttonClassName || defaultBtnClass}
        onClick={() => setOpen(true)}
      >
        {parentSentActivitiesSectionTitleHe()}
      </button>

      {open ? (
        <ParentSentActivitiesModal
          studentId={studentId}
          accessToken={accessToken}
          refreshKey={refreshKey}
          onClose={() => setOpen(false)}
          bright={bright}
        />
      ) : null}
    </>
  );
}
