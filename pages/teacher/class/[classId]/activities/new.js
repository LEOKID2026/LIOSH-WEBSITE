import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../../../components/Layout";
import TeacherPortalShell from "../../../../../components/teacher-portal/TeacherPortalShell";
import TeacherClassActivitiesNav from "../../../../../components/teacher-portal/TeacherClassActivitiesNav";
import { getLearningSupabaseBrowserClient } from "../../../../../lib/learning-supabase/client";
import { resolveTeacherAccessToken } from "../../../../../lib/teacher-portal/use-teacher-portal-session";
import { teacherAuthFetch } from "../../../../../lib/teacher-portal/teacher-ui.he.js";
import { REPORT_SUBJECTS, subjectLabelHe } from "../../../../../lib/teacher-portal/teacher-ui.he.js";
import { ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS } from "../../../../../lib/classroom-activities/classroom-activities-preview.js";
import { generateActivityQuestionSetClient } from "../../../../../lib/classroom-activities/generate-activity-questions-client.js";
import { activityModeLabelHe } from "../../../../../lib/classroom-activities/classroom-activities-labels.client.js";
import { TOPICS as MOLEDET_TOPICS } from "../../../../../utils/moledet-geography-constants.js";
import {
  GRADES as GEOMETRY_GRADES,
  TOPICS as GEOMETRY_TOPICS,
} from "../../../../../utils/geometry-constants.js";
import { GRADES as HEBREW_GRADES, TOPICS as HEBREW_TOPICS } from "../../../../../utils/hebrew-constants.js";
import {
  ENGLISH_GRADES,
  ENGLISH_TOPICS,
} from "../../../../../utils/english-question-generator.js";
import { GRADES as MATH_GRADES } from "../../../../../utils/math-constants.js";
import { getMathReportBucketDisplayName } from "../../../../../utils/math-report-generator.js";

const MOLEDET_TOPIC_OPTIONS = Object.entries(MOLEDET_TOPICS).map(([key, meta]) => ({
  key,
  label: meta.name,
}));

function geometryTopicOptionsForGrade(gradeKey) {
  const topics = GEOMETRY_GRADES[gradeKey]?.topics || [];
  return topics
    .filter((t) => t !== "mixed")
    .map((key) => ({ key, label: GEOMETRY_TOPICS[key]?.name || key }));
}

function hebrewTopicOptionsForGrade(gradeKey) {
  const topics = HEBREW_GRADES[gradeKey]?.topics || [];
  return topics.map((key) => ({ key, label: HEBREW_TOPICS[key]?.name || key }));
}

function englishTopicOptionsForGrade(gradeKey) {
  const topics = ENGLISH_GRADES[gradeKey]?.topics || [];
  return topics.map((key) => ({ key, label: ENGLISH_TOPICS[key]?.name || key }));
}

function mathTopicOptionsForGrade(gradeKey) {
  const operations = MATH_GRADES[gradeKey]?.operations || [];
  return operations
    .filter((op) => op !== "mixed")
    .map((key) => ({ key, label: getMathReportBucketDisplayName(key) || key }));
}

function defaultTopicForSubject(subjectKey, gradeKey) {
  if (subjectKey === "moledet_geography") {
    return MOLEDET_TOPIC_OPTIONS[0]?.key || "homeland";
  }
  if (subjectKey === "geometry") {
    const opts = geometryTopicOptionsForGrade(gradeKey);
    return opts[0]?.key || "";
  }
  if (subjectKey === "hebrew") {
    const opts = hebrewTopicOptionsForGrade(gradeKey);
    return opts[0]?.key || "";
  }
  if (subjectKey === "english") {
    const opts = englishTopicOptionsForGrade(gradeKey);
    return opts[0]?.key || "";
  }
  if (subjectKey === "math") {
    const opts = mathTopicOptionsForGrade(gradeKey);
    return opts[0]?.key || "addition";
  }
  return "";
}

export async function getServerSideProps(context) {
  const classId = String(context.params?.classId || "").trim();
  return { props: { classId } };
}

const MODES = ["guided_practice", "quiz", "homework", "live_lesson"];

export default function TeacherNewActivityPage({ classId }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("math");
  const [topic, setTopic] = useState(() => defaultTopicForSubject("math", "g3"));
  const [subtopic, setSubtopic] = useState("");
  const [mode, setMode] = useState("guided_practice");
  const [difficulty, setDifficulty] = useState("medium");
  const [questionCount, setQuestionCount] = useState(5);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [gradeLevel, setGradeLevel] = useState("g3");
  const [preview, setPreview] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const opts =
      subject === "math"
        ? mathTopicOptionsForGrade(gradeLevel)
        : subject === "geometry"
          ? geometryTopicOptionsForGrade(gradeLevel)
          : subject === "hebrew"
            ? hebrewTopicOptionsForGrade(gradeLevel)
            : subject === "english"
              ? englishTopicOptionsForGrade(gradeLevel)
              : [];
    if (opts.length && !opts.some((o) => o.key === topic)) {
      setTopic(opts[0].key);
    }
  }, [subject, gradeLevel, topic]);

  const runPreview = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const qs = await generateActivityQuestionSetClient({
        subject,
        gradeLevel,
        topic,
        difficulty,
        count: questionCount,
      });
      setPreview(qs);
    } catch (e) {
      setError(e?.message || "יצירת תצוגה מקדימה נכשלה");
      setPreview([]);
    } finally {
      setBusy(false);
    }
  }, [subject, gradeLevel, topic, difficulty, questionCount]);

  const createDraft = useCallback(async () => {
    if (!title.trim()) {
      setError("נא למלא כותרת");
      return;
    }
    if (!preview.length) {
      setError("נא ליצור תצוגה מקדימה של שאלות לפני שמירה");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const supabase = getLearningSupabaseBrowserClient();
      const session = await resolveTeacherAccessToken(supabase);
      if (!session.ok) {
        router.replace("/teacher/login");
        return;
      }
      const body = {
        classId,
        title: title.trim(),
        subject,
        topic: topic.trim(),
        subtopic: subtopic.trim() || null,
        mode,
        questionSelection: "same_exact",
        difficultyLevel: difficulty,
        questionCount: Number(questionCount),
        questionSet: preview,
        gradeLevel,
      };
      if (timeLimitSeconds) body.timeLimitSeconds = Number(timeLimitSeconds);
      if (dueAt) body.dueAt = new Date(dueAt).toISOString();
      if (mode === "quiz" && !timeLimitSeconds) {
        setError("במצב בוחן נדרש מגבלת זמן (שניות)");
        setBusy(false);
        return;
      }

      const res = await teacherAuthFetch(session.token, "/api/teacher/activities", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error?.message || json?.error?.code || "שמירה נכשלה");
        return;
      }
      const activityId = json?.data?.activityId;
      if (activityId) {
        router.push(
          `/teacher/class/${encodeURIComponent(classId)}/activities/${encodeURIComponent(activityId)}/monitor`
        );
      }
    } catch {
      setError("שגיאת רשת");
    } finally {
      setBusy(false);
    }
  }, [
    classId,
    title,
    subject,
    topic,
    subtopic,
    mode,
    difficulty,
    questionCount,
    preview,
    timeLimitSeconds,
    dueAt,
    gradeLevel,
    router,
  ]);

  return (
    <Layout>
      <TeacherPortalShell title="פעילות חדשה" backHref={`/teacher/class/${classId}/activities`}>
        <TeacherClassActivitiesNav classId={classId} />

        {error ? (
          <p className="mb-4 text-red-200 text-sm rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2">
            {error}
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <label className="block text-sm">
            <span className="text-white/70">כותרת</span>
            <input
              className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
            />
          </label>
          <label className="block text-sm">
            <span className="text-white/70">מקצוע</span>
            <select
              className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2"
              value={subject}
              onChange={(e) => {
                const next = e.target.value;
                setSubject(next);
                setTopic(defaultTopicForSubject(next, gradeLevel));
              }}
            >
              {REPORT_SUBJECTS.filter((s) => ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS.has(s)).map((s) => (
                <option key={s} value={s}>
                  {subjectLabelHe(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-white/70">נושא</span>
            {subject === "moledet_geography" ? (
              <select
                className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                {MOLEDET_TOPIC_OPTIONS.map(({ key, label }) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            ) : subject === "geometry" ? (
              <select
                className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                {geometryTopicOptionsForGrade(gradeLevel).map(({ key, label }) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            ) : subject === "hebrew" ? (
              <select
                className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                {hebrewTopicOptionsForGrade(gradeLevel).map(({ key, label }) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            ) : subject === "english" ? (
              <select
                className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                {englishTopicOptionsForGrade(gradeLevel).map(({ key, label }) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            ) : subject === "math" ? (
              <select
                className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                {mathTopicOptionsForGrade(gradeLevel).map(({ key, label }) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            )}
          </label>
          <label className="block text-sm">
            <span className="text-white/70">תת-נושא (אופציונלי)</span>
            <input
              className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2"
              value={subtopic}
              onChange={(e) => setSubtopic(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-white/70">כיתה (ליצירת שאלות)</span>
            <select
              className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2"
              value={gradeLevel}
              onChange={(e) => {
                const g = e.target.value;
                setGradeLevel(g);
                setTopic(defaultTopicForSubject(subject, g));
              }}
            >
              {["g1", "g2", "g3", "g4", "g5", "g6"].map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-white/70">מצב פעילות</span>
            <select
              className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              {MODES.map((m) => (
                <option key={m} value={m}>
                  {activityModeLabelHe(m)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-white/70">רמת קושי</span>
            <select
              className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="easy">קל</option>
              <option value="medium">בינוני</option>
              <option value="hard">קשה</option>
              <option value="mixed">מעורב</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-white/70">מספר שאלות</span>
            <input
              type="number"
              min={1}
              max={50}
              className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2"
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
            />
          </label>
          <label className="block text-sm">
            <span className="text-white/70">מגבלת זמן (שניות, אופציונלי)</span>
            <input
              type="number"
              min={30}
              className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2"
              value={timeLimitSeconds}
              onChange={(e) => setTimeLimitSeconds(e.target.value)}
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="text-white/70">מועד אחרון (שיעורי בית, אופציונלי)</span>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            disabled={busy}
            onClick={runPreview}
            className="px-4 py-2 rounded-xl border border-white/20 hover:bg-white/10 text-sm"
          >
            {busy ? "מייצר…" : "תצוגה מקדימה של שאלות"}
          </button>
          <button
            type="button"
            disabled={busy || !preview.length}
            onClick={createDraft}
            className="px-4 py-2 rounded-xl bg-amber-500/90 text-black font-semibold text-sm disabled:opacity-50"
          >
            שמירה כטיוטה
          </button>
        </div>

        {preview.length > 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="text-lg font-semibold mb-3">תצוגה מקדימה ({preview.length} שאלות)</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-white/90">
              {preview.map((q, i) => (
                <li key={i}>
                  <span dir="auto">{q.question}</span>
                  <span className="text-white/40 text-xs mr-2"> (לא נשלח לתלמיד)</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </TeacherPortalShell>
    </Layout>
  );
}
