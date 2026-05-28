import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../../components/Layout";
import TeacherPortalShell from "../../../../components/teacher-portal/TeacherPortalShell";
import { getLearningSupabaseBrowserClient } from "../../../../lib/learning-supabase/client";
import { resolveTeacherAccessToken } from "../../../../lib/teacher-portal/use-teacher-portal-session";
import { teacherAuthFetch, subjectLabelHe } from "../../../../lib/teacher-portal/teacher-ui.he.js";
import { ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS } from "../../../../lib/classroom-activities/classroom-activities-preview.js";
import { generateActivityQuestionSetClient } from "../../../../lib/classroom-activities/generate-activity-questions-client.js";
import { activityModeLabelHe } from "../../../../lib/classroom-activities/classroom-activities-labels.client.js";
import { GRADES as MATH_GRADES } from "../../../../utils/math-constants.js";
import { getMathReportBucketDisplayName } from "../../../../utils/math-report-generator.js";
import {
  GRADES as GEOMETRY_GRADES,
  TOPICS as GEOMETRY_TOPICS,
} from "../../../../utils/geometry-constants.js";
import { TOPICS as MOLEDET_TOPICS } from "../../../../utils/moledet-geography-constants.js";
import { GRADES as HEBREW_GRADES, TOPICS as HEBREW_TOPICS } from "../../../../utils/hebrew-constants.js";
import { ENGLISH_GRADES, ENGLISH_TOPICS } from "../../../../utils/english-question-generator.js";
import { formatGradeLevelHe } from "../../../../lib/learning-student-defaults.js";
import { SCIENCE_GRADES } from "../../../../data/science-curriculum.js";

const MODES = ["guided_practice", "quiz", "homework", "discussion"];

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

export async function getServerSideProps() {
  return { props: {} };
}

export default function TeacherPrivateStudentsNewActivityPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState("");
  const [students, setStudents] = useState([]);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("math");
  const [gradeKey, setGradeKey] = useState("g3");
  const [topic, setTopic] = useState(() => defaultTopic("math", "g3"));
  const [mode, setMode] = useState("guided_practice");
  const [difficulty, setDifficulty] = useState("medium");
  const [questionCount, setQuestionCount] = useState(5);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [preview, setPreview] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // The grade locked by the currently selected students (null if no students selected).
  const lockedGrade = useMemo(() => {
    if (selectedIds.size === 0) return null;
    for (const s of students) {
      if (selectedIds.has(s.studentId) && s.gradeLevel) {
        return s.gradeLevel;
      }
    }
    return null;
  }, [selectedIds, students]);

  // When the locked grade changes, sync gradeKey and reset preview.
  useEffect(() => {
    if (lockedGrade && lockedGrade !== gradeKey) {
      setGradeKey(lockedGrade);
      setTopic(defaultTopic(subject, lockedGrade));
      setPreview([]);
    }
  }, [lockedGrade]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const supabase = getLearningSupabaseBrowserClient();
    resolveTeacherAccessToken(supabase).then((session) => {
      if (!session.ok) { router.replace("/teacher/login"); return; }
      setAccessToken(session.token);
      teacherAuthFetch(session.token, "/api/teacher/students")
        .then((r) => r.json())
        .then((json) => { if (json?.data?.students) setStudents(json.data.students); })
        .catch(() => {})
        .finally(() => setStudentsLoaded(true));
    });
  }, [router]);

  const toggleStudent = useCallback((id) => {
    setStudents((currentStudents) => {
      const student = currentStudents.find((s) => s.studentId === id);
      setSelectedIds((prev) => {
        // Deselecting is always allowed.
        if (prev.has(id)) {
          const next = new Set(prev);
          next.delete(id);
          return next;
        }
        // Selecting: check grade lock.
        const currentLocked =
          prev.size > 0
            ? currentStudents.find((s) => prev.has(s.studentId))?.gradeLevel ?? null
            : null;
        if (
          currentLocked &&
          student?.gradeLevel &&
          student.gradeLevel !== currentLocked
        ) {
          setError(
            `לא ניתן לשלב תלמידים מכיתות שונות. הפעילות נועלת לכיתה ${currentLocked}. ` +
            `תלמיד זה בכיתה ${student.gradeLevel}.`
          );
          return prev;
        }
        setError("");
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      return currentStudents;
    });
  }, []);

  // Select all students that share the grade of the first selected student (or all if none selected).
  const selectAllSameGrade = useCallback(() => {
    const targetGrade = lockedGrade || students[0]?.gradeLevel || null;
    const eligible = targetGrade
      ? students.filter((s) => s.gradeLevel === targetGrade)
      : students;
    setSelectedIds(new Set(eligible.map((s) => s.studentId)));
    setError("");
  }, [lockedGrade, students]);

  const clearSelected = useCallback(() => {
    setSelectedIds(new Set());
    setError("");
  }, []);

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
        count: mode === "discussion" ? 1 : questionCount,
      });
      setPreview(qs || []);
    } catch (e) {
      setError(e?.message || "יצירת שאלות נכשלה");
    } finally {
      setBusy(false);
    }
  }, [subject, gradeKey, topic, difficulty, mode, questionCount]);

  const createActivity = useCallback(async () => {
    if (selectedIds.size === 0) { setError("נא לבחור לפחות תלמיד אחד"); return; }
    if (!title.trim()) { setError("נא למלא כותרת"); return; }
    if (!preview.length) { setError("נא לייצר שאלות תחילה"); return; }
    if (mode === "quiz" && !timeLimitSeconds) { setError("שאלון דורש הגבלת זמן"); return; }

    setBusy(true);
    setError("");
    try {
      const body = {
        studentIds: [...selectedIds],
        title: title.trim(),
        subject,
        topic,
        mode,
        questionSelection: "same_exact",
        difficultyLevel: difficulty,
        questionCount: mode === "discussion" ? 1 : questionCount,
        questionSet: mode === "discussion" ? preview.slice(0, 1) : preview,
      };
      if (timeLimitSeconds) body.timeLimitSeconds = Number(timeLimitSeconds);
      if (dueAt) body.dueAt = new Date(dueAt).toISOString();

      const res = await teacherAuthFetch(accessToken, "/api/teacher/student-activities", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error?.message || json?.error?.code || "יצירה נכשלה");
        return;
      }

      const { batchId, activityId } = json.data || {};

      if (batchId) {
        router.push(`/teacher/students/activities/batch/${encodeURIComponent(batchId)}/monitor`);
        return;
      }

      if (activityId) {
        await teacherAuthFetch(
          accessToken,
          `/api/teacher/student-activities/${encodeURIComponent(activityId)}/status`,
          { method: "PATCH", body: JSON.stringify({ action: "activate" }) }
        );
        const firstId = [...selectedIds][0];
        router.push(`/teacher/student/${encodeURIComponent(firstId)}`);
      }
    } catch {
      setError("שגיאת רשת");
    } finally {
      setBusy(false);
    }
  }, [
    selectedIds, title, subject, topic, mode, difficulty, questionCount,
    timeLimitSeconds, dueAt, preview, accessToken, router,
  ]);

  // Group students by grade for display hints
  const studentsByGrade = useMemo(() => {
    const map = {};
    for (const s of students) {
      const g = s.gradeLevel || "—";
      if (!map[g]) map[g] = 0;
      map[g] += 1;
    }
    return map;
  }, [students]);

  const multipleGradesExist = Object.keys(studentsByGrade).length > 1;

  return (
    <Layout>
      <TeacherPortalShell
        title="פעילות לתלמידים פרטיים נבחרים"
        backHref="/teacher/dashboard"
      >
        {error ? (
          <p className="text-red-200 text-sm rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 mb-4">
            {error}
          </p>
        ) : null}

        {/* Student selection */}
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="text-base font-semibold">בחר תלמידים פרטיים</h2>
            <span className="text-sm text-white/60">
              נבחרו: {selectedIds.size}
              {lockedGrade ? ` (${formatGradeLevelHe(lockedGrade)})` : ""}
            </span>
          </div>

          {multipleGradesExist ? (
            <p className="text-amber-200/80 text-xs mb-3 rounded border border-amber-400/20 bg-amber-500/10 px-3 py-1.5">
              ⚠ יש לך תלמידים מכיתות שונות. ניתן לשלוח פעילות אחת רק לתלמידים מאותה כיתה.
              {lockedGrade
                ? ` הפעילות נעולה ל-${formatGradeLevelHe(lockedGrade)}.`
                : " בחר תלמיד ראשון לנעילת הכיתה."}
            </p>
          ) : null}

          {!studentsLoaded ? (
            <p className="text-white/50 text-sm">טוען תלמידים…</p>
          ) : students.length === 0 ? (
            <p className="text-white/50 text-sm">אין תלמידים פרטיים מקושרים.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-2 text-xs">
                <button
                  type="button"
                  className="underline text-white/60 hover:text-white"
                  onClick={selectAllSameGrade}
                >
                  {lockedGrade ? `בחר הכל (${formatGradeLevelHe(lockedGrade)})` : "בחר הכל"}
                </button>
                <button
                  type="button"
                  className="underline text-white/60 hover:text-white"
                  onClick={clearSelected}
                >
                  נקה
                </button>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-56 overflow-y-auto">
                {students.map((s) => {
                  const gradeMismatch =
                    lockedGrade &&
                    s.gradeLevel &&
                    s.gradeLevel !== lockedGrade &&
                    !selectedIds.has(s.studentId);
                  return (
                    <li key={s.studentId}>
                      <label
                        className={`flex items-center gap-2 text-sm py-1 ${
                          gradeMismatch
                            ? "cursor-not-allowed opacity-40"
                            : "cursor-pointer"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(s.studentId)}
                          disabled={gradeMismatch}
                          onChange={() => toggleStudent(s.studentId)}
                        />
                        <span>{s.studentFullNameMasked}</span>
                        {s.gradeLevel ? (
                          <span
                            className={`text-xs ${
                              gradeMismatch ? "text-red-400/80" : "text-white/40"
                            }`}
                          >
                            כיתה {s.gradeLevel}
                          </span>
                        ) : null}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        {/* Activity configuration */}
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-5">
          <h2 className="text-base font-semibold mb-3">הגדרות פעילות</h2>
          <div className="grid gap-4 md:grid-cols-2">
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
                  const s = e.target.value;
                  setSubject(s);
                  setTopic(defaultTopic(s, gradeKey));
                  setPreview([]);
                }}
              >
                {[...ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS].map((s) => (
                  <option key={s} value={s}>{subjectLabelHe(s)}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="text-white/70">
                כיתה (לצורך תוכן)
                {lockedGrade ? (
                  <span className="text-emerald-300/80 text-xs mr-1">— נגזר מהתלמידים הנבחרים</span>
                ) : null}
              </span>
              <select
                className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 disabled:opacity-60"
                value={gradeKey}
                disabled={Boolean(lockedGrade)}
                onChange={(e) => {
                  if (lockedGrade) return;
                  setGradeKey(e.target.value);
                  setTopic(defaultTopic(subject, e.target.value));
                  setPreview([]);
                }}
              >
                {["g1","g2","g3","g4","g5","g6"].map((g) => (
                  <option key={g} value={g}>{formatGradeLevelHe(g)}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="text-white/70">נושא</span>
              {subject === "science" && topicOpts.length === 0 ? (
                <p className="mt-1 text-amber-200 text-sm rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2">
                  לא נמצאו נושאים זמינים לכיתה זו במקצוע מדעים.
                </p>
              ) : topicOpts.length > 0 ? (
                <select
                  className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2"
                  value={topic}
                  onChange={(e) => { setTopic(e.target.value); setPreview([]); }}
                >
                  {topicOpts.map(({ key, label }) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2"
                  value={topic}
                  onChange={(e) => { setTopic(e.target.value); setPreview([]); }}
                />
              )}
            </label>

            <label className="block text-sm">
              <span className="text-white/70">סוג פעילות</span>
              <select
                className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2"
                value={mode}
                onChange={(e) => { setMode(e.target.value); setPreview([]); }}
              >
                {MODES.map((m) => (
                  <option key={m} value={m}>{activityModeLabelHe(m)}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="text-white/70">רמת קושי</span>
              <select
                className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2"
                value={difficulty}
                onChange={(e) => { setDifficulty(e.target.value); setPreview([]); }}
              >
                <option value="easy">קל</option>
                <option value="medium">בינוני</option>
                <option value="hard">קשה</option>
                <option value="mixed">מעורב</option>
              </select>
            </label>

            {mode !== "discussion" ? (
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
            ) : null}

            <label className="block text-sm">
              <span className="text-white/70">הגבלת זמן (שניות, אופציונלי)</span>
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2"
                value={timeLimitSeconds}
                onChange={(e) => setTimeLimitSeconds(e.target.value)}
                placeholder={mode === "quiz" ? "חובה בשאלון" : "ריק = ללא הגבלה"}
              />
            </label>

            <label className="block text-sm">
              <span className="text-white/70">תאריך הגשה (אופציונלי)</span>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </label>
          </div>
        </section>

        {/* Preview + create */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            disabled={busy}
            onClick={runPreview}
            className="px-4 py-2 rounded-xl border border-white/20 hover:bg-white/10 text-sm"
          >
            {busy ? "מייצר שאלות…" : "הצג תצוגה מקדימה"}
          </button>
          {preview.length > 0 ? (
            <button
              type="button"
              disabled={busy || selectedIds.size === 0}
              onClick={createActivity}
              className="px-4 py-2 rounded-xl bg-emerald-600/90 text-white font-semibold text-sm disabled:opacity-50"
            >
              צור ושלח ({selectedIds.size} תלמידים)
            </button>
          ) : null}
        </div>

        {preview.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-white/60">
              {mode === "discussion" ? "שאלה לדיון:" : `${preview.length} שאלות:`}
            </p>
            <ul className="space-y-2">
              {preview.slice(0, mode === "discussion" ? 1 : undefined).map((q, i) => {
                const prompt = String(q?.question || q?.prompt || q?.stem || "").trim();
                const choices = Array.isArray(q?.choices) ? q.choices : [];
                return (
                  <li
                    key={i}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
                  >
                    <p className="font-medium mb-1" dir="auto">{i + 1}. {prompt}</p>
                    {choices.length > 0 ? (
                      <ul className="space-y-0.5 text-white/70">
                        {choices.map((c, ci) => (
                          <li key={ci} dir="auto">{c}</li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </TeacherPortalShell>
    </Layout>
  );
}
