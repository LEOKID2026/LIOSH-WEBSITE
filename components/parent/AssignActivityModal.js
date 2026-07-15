import { useCallback, useEffect, useMemo, useState } from "react";
import { ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS } from "../../lib/classroom-activities/classroom-activities-preview.js";
import { generateActivityQuestionSetClient } from "../../lib/classroom-activities/generate-activity-questions-client.js";
import { formatGradeLevelHe, normalizeGradeLevelToKey } from "../../lib/learning-student-defaults.js";
import {
  defaultTopicForAssignedActivity,
  topicOptionsForAssignedActivity,
} from "../../lib/classroom-activities/assigned-activity-topic-options.js";
import { activitySubjectsForGrade, subjectLabelHe } from "../../lib/teacher-portal/teacher-ui.he.js";
import AssignedActivityQuestionDisplay from "../classroom-activities/AssignedActivityQuestionDisplay.jsx";
import ActivityDisplayLevelSelector from "../classroom-activities/ActivityDisplayLevelSelector.jsx";
import { writeActivityDifficultyFromDisplayLevel } from "../../lib/learning/activity-display-level.js";
import ParentSentActivitiesPanel from "./ParentSentActivitiesPanel.jsx";
import { trackProductEvent } from "../../lib/analytics/track-event.client.js";
import { getParentPortalTheme } from "../../lib/parent-ui/parent-portal-theme.client.js";
import { mapParentPanelApiError } from "../../lib/parent-server/parent-api-errors.he.js";

const PARENT_ACTIVITY_MODE = "guided_practice";
const MAX_QUESTION_COUNT = 30;
const ACTIVITY_GRADE_KEYS = ["g1", "g2", "g3", "g4", "g5", "g6"];
const FALLBACK_ACTIVITY_GRADE = "g1";

function parseQuestionCountInput(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

function questionCountExceedsMax(raw) {
  const n = parseQuestionCountInput(raw);
  return n != null && n > MAX_QUESTION_COUNT;
}

function resolveQuestionCountForApi(raw) {
  const n = parseQuestionCountInput(raw);
  if (n == null) return null;
  return Math.min(n, MAX_QUESTION_COUNT);
}

/**
 * @param {{ student: { id: string, full_name?: string, grade_level?: string|null }, accessToken: string, onClose: () => void, onSuccess: () => void, refreshKey?: number, bright?: boolean }} props
 */
export default function AssignActivityModal({
  student,
  accessToken,
  onClose,
  onSuccess,
  refreshKey = 0,
  bright = false,
}) {
  const T = getParentPortalTheme(bright);
  // Registered profile grade — used only as the default; never mutated here.
  const profileGradeKey = useMemo(
    () => normalizeGradeLevelToKey(student?.grade_level),
    [student?.grade_level]
  );

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("math");
  // Per-activity grade selection (defaults to profile grade, safe fallback otherwise).
  // This is a one-off choice for THIS activity — it does not change the child's profile.
  const [activityGradeKey, setActivityGradeKey] = useState(
    () => profileGradeKey || FALLBACK_ACTIVITY_GRADE
  );
  const [topic, setTopic] = useState(() =>
    defaultTopicForAssignedActivity("math", profileGradeKey || FALLBACK_ACTIVITY_GRADE)
  );
  const [displayLevel, setDisplayLevel] = useState("regular");
  const [questionCountInput, setQuestionCountInput] = useState("");
  const [preview, setPreview] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const missingGrade = !activityGradeKey;

  // When opening for a different child, reset the per-activity grade to that child's profile grade.
  useEffect(() => {
    setActivityGradeKey(profileGradeKey || FALLBACK_ACTIVITY_GRADE);
  }, [student?.id, profileGradeKey]);

  // Keep subject valid for the selected grade (some subjects are grade-gated).
  useEffect(() => {
    const subs = activitySubjectsForGrade(activityGradeKey, [...ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS]);
    if (subs.length > 0 && !subs.includes(subject)) {
      setSubject(subs[0]);
    }
  }, [activityGradeKey, subject]);

  // On subject/grade change: reset topic to a valid default and clear any stale preview.
  useEffect(() => {
    setTopic(defaultTopicForAssignedActivity(subject, activityGradeKey));
    setPreview([]);
  }, [subject, activityGradeKey]);

  const topicOpts = topicOptionsForAssignedActivity(subject, activityGradeKey);

  const runPreview = useCallback(async () => {
    if (!activityGradeKey) {
      setError("יש לבחור כיתה לפעילות לפני יצירת שאלות");
      return;
    }
    const count = resolveQuestionCountForApi(questionCountInput);
    if (count == null) {
      setError("יש להזין מספר שאלות");
      return;
    }
    setBusy(true);
    setError("");
    setPreview([]);
    try {
      const qs = await generateActivityQuestionSetClient({
        subject,
        gradeLevel: activityGradeKey,
        topic,
        difficulty: displayLevel,
        count,
      });
      setPreview(qs || []);
    } catch {
      setError("לא ניתן ליצור שאלות - נסו נושא אחר");
    } finally {
      setBusy(false);
    }
  }, [subject, activityGradeKey, topic, displayLevel, questionCountInput]);

  const sendActivity = useCallback(async () => {
    if (!activityGradeKey) {
      setError("יש לבחור כיתה לפעילות לפני השליחה");
      return;
    }
    const count = resolveQuestionCountForApi(questionCountInput);
    if (count == null) {
      setError("יש להזין מספר שאלות");
      return;
    }
    if (!title.trim()) {
      setError("יש להזין כותרת לפעילות");
      return;
    }
    if (!preview.length) {
      setError("נא לייצר שאלות תחילה");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/parent/activities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          studentId: student.id,
          title: title.trim(),
          subject,
          topic,
          mode: PARENT_ACTIVITY_MODE,
          gradeLevel: activityGradeKey,
          difficultyLevel: writeActivityDifficultyFromDisplayLevel(displayLevel, subject),
          questionCount: count,
          questionSet: preview,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403) {
          setError("לא ניתן לשלוח פעילות לילד זה");
        } else {
          setError(mapParentPanelApiError(json?.error, "save"));
        }
        return;
      }
      void trackProductEvent({
        eventName: "personal_activity_created",
        actorType: "parent",
        studentId: student.id,
        subject,
        topic,
        grade: activityGradeKey,
        metadata: {
          activityId: json?.activityId,
          mode: PARENT_ACTIVITY_MODE,
          questionCount: count,
        },
      });
      onSuccess();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setBusy(false);
    }
  }, [
    title,
    preview,
    accessToken,
    student.id,
    subject,
    topic,
    displayLevel,
    questionCountInput,
    activityGradeKey,
    onSuccess,
  ]);

  return (
    <div
      className={T.activityOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-activity-title"
    >
      <div className={T.activityPanel}>
        <div className="flex items-start justify-between gap-3">
          <h2 id="assign-activity-title" className="text-lg font-semibold">
            {`שליחת פעילות ל${student.full_name || "ילד"}`}
          </h2>
          <button
            type="button"
            className={T.activityClose}
            onClick={onClose}
            disabled={busy}
          >
            סגירה
          </button>
        </div>

        {error ? <p className={T.activityError}>{error}</p> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm md:col-span-2">
            <span className={T.label}>כותרת</span>
            <input
              className={T.inputMt}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              disabled={busy}
            />
          </label>

          <label className="block text-sm">
            <span className={T.label}>מקצוע</span>
            <select
              className={T.inputMt}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={busy}
            >
              {activitySubjectsForGrade(activityGradeKey, [...ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS]).map((s) => (
                <option key={s} value={s}>
                  {subjectLabelHe(s)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className={T.label}>כיתה לפעילות</span>
            <select
              className={T.inputMt}
              value={activityGradeKey}
              onChange={(e) => {
                setActivityGradeKey(e.target.value);
                setPreview([]);
              }}
              disabled={busy}
            >
              {ACTIVITY_GRADE_KEYS.map((g) => (
                <option key={g} value={g}>
                  {formatGradeLevelHe(g)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm md:col-span-2">
            <span className={T.label}>נושא</span>
            {topicOpts.length > 0 ? (
              <select
                className={T.inputMt}
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  setPreview([]);
                }}
                disabled={busy}
              >
                {topicOpts.map(({ key, label }) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className={T.inputMt}
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  setPreview([]);
                }}
                disabled={busy}
              />
            )}
          </label>

          <label className="block text-sm">
            <span className={T.label}>מספר שאלות</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className={T.inputMt}
              value={questionCountInput}
              onChange={(e) => {
                setQuestionCountInput(e.target.value.replace(/\D/g, ""));
                setPreview([]);
              }}
              disabled={busy}
              aria-describedby={
                questionCountExceedsMax(questionCountInput) ? "question-count-max-hint" : undefined
              }
            />
            {questionCountExceedsMax(questionCountInput) ? (
              <p id="question-count-max-hint" className={`${T.warning} text-xs mt-1`}>
                {`מספר השאלות מוגבל עד ${MAX_QUESTION_COUNT}`}
              </p>
            ) : null}
          </label>

          <ActivityDisplayLevelSelector
            subjectId={subject}
            value={displayLevel}
            onChange={(dl) => {
              setDisplayLevel(dl);
              setPreview([]);
            }}
            disabled={busy}
            variant="radio"
            label="רמה"
            className="block text-sm"
            name="parent-activity-display-level"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            className={T.activityPreviewBtn}
            onClick={runPreview}
            disabled={busy || missingGrade}
          >
            תצוגה מקדימה
          </button>
          <button
            type="button"
            className={T.activitySendBtn}
            onClick={sendActivity}
            disabled={busy || missingGrade}
          >
            שלח פעילות
          </button>
          <ParentSentActivitiesPanel
            studentId={student.id}
            accessToken={accessToken}
            refreshKey={refreshKey}
            bright={bright}
          />
        </div>

        {preview.length > 0 ? (
          <div className="space-y-2">
            <h3 className={`text-sm font-semibold ${T.label}`}>שאלות ({preview.length})</h3>
            <ul className="space-y-2 max-h-48 overflow-y-auto text-sm">
              {preview.map((q, i) => (
                <li key={i} className={T.activityPreviewItem}>
                  <div className="flex gap-2 items-start">
                    <span className={T.activityPreviewIndex}>{i + 1}.</span>
                    <AssignedActivityQuestionDisplay
                      question={q}
                      variant="preview"
                      tone={bright ? "light" : "dark"}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
