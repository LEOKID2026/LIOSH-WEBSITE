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
import ParentSentActivitiesPanel from "./ParentSentActivitiesPanel.jsx";

const PARENT_ACTIVITY_MODE = "guided_practice";
const MAX_QUESTION_COUNT = 30;

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
 * @param {{ student: { id: string, full_name?: string, grade_level?: string|null }, accessToken: string, onClose: () => void, onSuccess: () => void, refreshKey?: number }} props
 */
export default function AssignActivityModal({ student, accessToken, onClose, onSuccess, refreshKey = 0 }) {
  const gradeKey = useMemo(
    () => normalizeGradeLevelToKey(student?.grade_level),
    [student?.grade_level]
  );
  const missingGrade = !gradeKey;

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("math");
  const [topic, setTopic] = useState(() => defaultTopicForAssignedActivity("math", gradeKey));
  const [difficulty, setDifficulty] = useState("easy");
  const [questionCountInput, setQuestionCountInput] = useState("");
  const [preview, setPreview] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTopic(defaultTopicForAssignedActivity(subject, gradeKey));
    setPreview([]);
  }, [subject, gradeKey]);

  const topicOpts = topicOptionsForAssignedActivity(subject, gradeKey);

  const runPreview = useCallback(async () => {
    if (!gradeKey) {
      setError("יש להגדיר כיתה בפרופיל הילד לפני יצירת פעילות");
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
        gradeLevel: gradeKey,
        topic,
        difficulty,
        count,
      });
      setPreview(qs || []);
    } catch {
      setError("לא ניתן ליצור שאלות — נסו נושא אחר");
    } finally {
      setBusy(false);
    }
  }, [subject, gradeKey, topic, difficulty, questionCountInput]);

  const sendActivity = useCallback(async () => {
    if (!gradeKey) {
      setError("יש להגדיר כיתה בפרופיל הילד לפני שליחת פעילות");
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
          gradeLevel: gradeKey,
          difficultyLevel: difficulty,
          questionCount: count,
          questionSet: preview,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403) {
          setError("לא ניתן לשלוח פעילות לילד זה");
        } else {
          setError(json?.error || "שליחה נכשלה");
        }
        return;
      }
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
    difficulty,
    questionCountInput,
    gradeKey,
    onSuccess,
  ]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-activity-title"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-white/15 bg-slate-900 p-5 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h2 id="assign-activity-title" className="text-lg font-semibold">
            {`שליחת פעילות ל${student.full_name || "ילד"}`}
          </h2>
          <button
            type="button"
            className="rounded bg-white/10 px-2 py-1 text-sm hover:bg-white/20"
            onClick={onClose}
            disabled={busy}
          >
            סגירה
          </button>
        </div>

        {error ? (
          <p className="text-red-200 text-sm rounded border border-red-400/30 bg-red-500/10 px-3 py-2">
            {error}
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm md:col-span-2">
            <span className="text-white/70">כותרת</span>
            <input
              className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              disabled={busy}
            />
          </label>

          <label className="block text-sm">
            <span className="text-white/70">מקצוע</span>
            <select
              className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={busy}
            >
              {activitySubjectsForGrade(gradeKey, [...ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS]).map((s) => (
                <option key={s} value={s}>
                  {subjectLabelHe(s)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-white/70">כיתה</span>
            <div className="mt-1 w-full rounded bg-black/30 border border-white/10 px-3 py-2 text-white/90">
              {missingGrade ? "לא הוגדרה כיתה בפרופיל" : formatGradeLevelHe(gradeKey)}
            </div>
          </label>

          <label className="block text-sm md:col-span-2">
            <span className="text-white/70">נושא</span>
            {topicOpts.length > 0 ? (
              <select
                className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
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
                className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
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
            <span className="text-white/70">מספר שאלות</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
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
              <p id="question-count-max-hint" className="text-amber-200/90 text-xs mt-1">
                {`מספר השאלות מוגבל עד ${MAX_QUESTION_COUNT}`}
              </p>
            ) : null}
          </label>

          <fieldset className="block text-sm">
            <legend className="text-white/70 mb-1">רמת קושי</legend>
            <div className="flex flex-wrap gap-3">
              {["easy", "medium", "hard"].map((level) => (
                <label key={level} className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="difficulty"
                    value={level}
                    checked={difficulty === level}
                    onChange={() => {
                      setDifficulty(level);
                      setPreview([]);
                    }}
                    disabled={busy}
                  />
                  {level === "easy" ? "קל" : level === "medium" ? "בינוני" : "קשה"}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            className="rounded border border-sky-500/40 bg-sky-950/30 text-sky-100 px-3 py-2 text-sm font-semibold hover:bg-sky-900/40 disabled:opacity-60"
            onClick={runPreview}
            disabled={busy || missingGrade}
          >
            תצוגה מקדימה
          </button>
          <button
            type="button"
            className="rounded border border-violet-500/40 bg-violet-950/30 text-violet-100 px-3 py-2 text-sm font-semibold hover:bg-violet-900/40 disabled:opacity-60"
            onClick={sendActivity}
            disabled={busy || missingGrade}
          >
            שלח פעילות
          </button>
          <ParentSentActivitiesPanel
            studentId={student.id}
            accessToken={accessToken}
            refreshKey={refreshKey}
          />
        </div>

        {preview.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white/80">שאלות ({preview.length})</h3>
            <ul className="space-y-2 max-h-48 overflow-y-auto text-sm">
              {preview.map((q, i) => (
                <li key={i} className="rounded border border-white/10 bg-black/30 px-3 py-2">
                  <div className="flex gap-2 items-start">
                    <span className="shrink-0 text-white/70">{i + 1}.</span>
                    <AssignedActivityQuestionDisplay question={q} variant="preview" />
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
