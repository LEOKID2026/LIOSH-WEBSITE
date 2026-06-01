import { useCallback, useEffect, useMemo, useState } from "react";
import { ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS } from "../../lib/classroom-activities/classroom-activities-preview.js";
import { generateActivityQuestionSetClient } from "../../lib/classroom-activities/generate-activity-questions-client.js";
import { activityModeLabelHe } from "../../lib/classroom-activities/classroom-activities-labels.client.js";
import { formatGradeLevelHe, normalizeGradeLevelToKey } from "../../lib/learning-student-defaults.js";
import { GRADES as MATH_GRADES } from "../../utils/math-constants.js";
import { getMathReportBucketDisplayName } from "../../utils/math-report-generator.js";
import {
  GRADES as GEOMETRY_GRADES,
  TOPICS as GEOMETRY_TOPICS,
} from "../../utils/geometry-constants.js";
import { TOPICS as MOLEDET_TOPICS } from "../../utils/moledet-geography-constants.js";
import { GRADES as HEBREW_GRADES, TOPICS as HEBREW_TOPICS } from "../../utils/hebrew-constants.js";
import { ENGLISH_GRADES, ENGLISH_TOPICS } from "../../utils/english-question-generator.js";
import { SCIENCE_GRADES } from "../../data/science-curriculum.js";

const PARENT_MODES = ["guided_practice"];
const MAX_QUESTION_COUNT = 30;

const SCIENCE_TOPIC_LABELS = {
  body: "גוף האדם",
  animals: "בעלי חיים",
  plants: "צמחים",
  materials: "חומרים",
  experiments: "ניסויים",
  earth_space: "כדור הארץ וחלל",
  environment: "סביבה",
};

const MOLEDET_TOPIC_OPTIONS = Object.entries(MOLEDET_TOPICS).map(([key, meta]) => ({
  key,
  label: meta.name,
}));

const SUBJECT_LABELS_HE = {
  math: "מתמטיקה",
  geometry: "הנדסה",
  english: "אנגלית",
  hebrew: "עברית",
  science: "מדעים",
  moledet_geography: "מולדת וגאוגרפיה",
};

function subjectLabelHe(subject) {
  return SUBJECT_LABELS_HE[subject] || subject;
}

function topicOptionsForSubject(subject, gradeKey) {
  if (subject === "math") {
    return (MATH_GRADES[gradeKey]?.operations || [])
      .filter((op) => op !== "mixed")
      .map((key) => ({ key, label: getMathReportBucketDisplayName(key) || key }));
  }
  if (subject === "geometry") {
    return (GEOMETRY_GRADES[gradeKey]?.topics || [])
      .filter((t) => t !== "mixed")
      .map((key) => ({ key, label: GEOMETRY_TOPICS[key]?.name || key }));
  }
  if (subject === "hebrew") {
    return (HEBREW_GRADES[gradeKey]?.topics || []).map((key) => ({
      key,
      label: HEBREW_TOPICS[key]?.name || key,
    }));
  }
  if (subject === "english") {
    return (ENGLISH_GRADES[gradeKey]?.topics || []).map((key) => ({
      key,
      label: ENGLISH_TOPICS[key]?.name || key,
    }));
  }
  if (subject === "moledet_geography") return MOLEDET_TOPIC_OPTIONS;
  if (subject === "science") {
    return (SCIENCE_GRADES[gradeKey]?.topics ?? []).map((key) => ({
      key,
      label: SCIENCE_TOPIC_LABELS[key] ?? key,
    }));
  }
  return [];
}

function defaultTopic(subject, gradeKey) {
  const opts = topicOptionsForSubject(subject, gradeKey);
  return opts[0]?.key || "";
}

/**
 * @param {{ student: { id: string, full_name?: string, grade_level?: string|null }, accessToken: string, onClose: () => void, onSuccess: () => void }} props
 */
export default function AssignActivityModal({ student, accessToken, onClose, onSuccess }) {
  const gradeKey = useMemo(
    () => normalizeGradeLevelToKey(student.grade_level) || "g3",
    [student.grade_level]
  );

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("math");
  const [topic, setTopic] = useState(() => defaultTopic("math", gradeKey));
  const [mode] = useState("guided_practice");
  const [difficulty, setDifficulty] = useState("medium");
  const [questionCount, setQuestionCount] = useState(5);
  const [preview, setPreview] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTopic(defaultTopic(subject, gradeKey));
    setPreview([]);
  }, [subject, gradeKey]);

  const topicOpts = topicOptionsForSubject(subject, gradeKey);

  const runPreview = useCallback(async () => {
    setBusy(true);
    setError("");
    setPreview([]);
    try {
      const qs = await generateActivityQuestionSetClient({
        subject,
        gradeLevel: gradeKey,
        topic,
        difficulty,
        count: questionCount,
      });
      setPreview(qs || []);
    } catch {
      setError("לא ניתן ליצור שאלות — נסו נושא אחר");
    } finally {
      setBusy(false);
    }
  }, [subject, gradeKey, topic, difficulty, questionCount]);

  const sendActivity = useCallback(async () => {
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
          mode,
          difficultyLevel: difficulty,
          questionCount,
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
    mode,
    difficulty,
    questionCount,
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
              {[...ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS].map((s) => (
                <option key={s} value={s}>
                  {subjectLabelHe(s)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-white/70">כיתה</span>
            <div className="mt-1 w-full rounded bg-black/30 border border-white/10 px-3 py-2 text-white/90">
              {formatGradeLevelHe(gradeKey)}
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
              type="number"
              min={1}
              max={MAX_QUESTION_COUNT}
              className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
              value={questionCount}
              onChange={(e) => {
                const n = Math.max(1, Math.min(MAX_QUESTION_COUNT, Number(e.target.value) || 1));
                setQuestionCount(n);
                setPreview([]);
              }}
              disabled={busy}
            />
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

          <fieldset className="block text-sm md:col-span-2">
            <legend className="text-white/70 mb-1">סוג פעילות</legend>
            <div className="flex flex-wrap gap-3">
              {PARENT_MODES.map((m) => (
                <label key={m} className="flex items-center gap-1">
                  <input type="radio" name="mode" value={m} checked={mode === m} readOnly disabled={busy} />
                  {activityModeLabelHe(m)}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded bg-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/25 disabled:opacity-60"
            onClick={runPreview}
            disabled={busy}
          >
            תצוגה מקדימה
          </button>
          <button
            type="button"
            className="rounded bg-emerald-600 text-white px-3 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-60"
            onClick={sendActivity}
            disabled={busy}
          >
            שלח פעילות
          </button>
        </div>

        {preview.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white/80">שאלות ({preview.length})</h3>
            <ul className="space-y-2 max-h-48 overflow-y-auto text-sm">
              {preview.map((q, i) => (
                <li key={i} className="rounded border border-white/10 bg-black/30 px-3 py-2">
                  {i + 1}. {q.question || q.prompt || "—"}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
