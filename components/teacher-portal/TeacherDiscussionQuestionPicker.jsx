import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { teacherAuthFetch, subjectLabelHe } from "../../lib/teacher-portal/teacher-ui.he.js";
import { ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS } from "../../lib/classroom-activities/classroom-activities-preview.js";
import { formatGradeLevelHe, resolveCanonicalGradeKey } from "../../lib/teacher-portal/teacher-class-grade.js";
import {
  moledetGeographyTopicOptionsForGrade,
  defaultTopicForSubject,
  englishTopicOptionsForGrade,
  geometryTopicOptionsForGrade,
  hebrewTopicOptionsForGrade,
  mathTopicOptionsForGrade,
  scienceTopicOptionsForGrade,
  topicOptionsForSubject,
} from "../../lib/teacher-portal/teacher-class-topic-options.js";
import ActivityDisplayLevelSelector from "../classroom-activities/ActivityDisplayLevelSelector.jsx";
import { writeActivityDifficultyFromDisplayLevel } from "../../lib/learning/activity-display-level.js";

function questionPrompt(q) {
  return String(q?.question || q?.prompt || q?.stem || "").trim();
}

function questionChoices(q) {
  if (Array.isArray(q?.choices)) return q.choices.map((c) => String(c));
  if (Array.isArray(q?.options)) return q.options.map((c) => String(c));
  return [];
}

function correctAnswerText(q) {
  const candidates = [q?.correct_answer, q?.correctAnswer, q?.expectedAnswer, q?.answer];
  for (const c of candidates) {
    if (c == null) continue;
    const s = String(c).trim();
    if (s) return s;
  }
  const idx = q?.correctIndex ?? q?.correct_index;
  if (typeof idx === "number" && Array.isArray(q?.choices)) {
    return String(q.choices[idx] ?? "");
  }
  return "";
}

/**
 * @param {{
 *   accessToken: string,
 *   gradeLevel: string,
 *   classId?: string,
 *   studentId?: string,
 *   monitorHref?: (activityId: string) => string,
 *   lockedSubject?: string | null,
 *   subjectLocked?: boolean,
 * }} props
 */
export default function TeacherDiscussionQuestionPicker({
  accessToken,
  gradeLevel,
  classId,
  studentId,
  monitorHref,
  lockedSubject = null,
  subjectLocked = false,
}) {
  const router = useRouter();
  const [permittedSubjects, setPermittedSubjects] = useState([]);
  const [subjectsLoaded, setSubjectsLoaded] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("math");
  const [topic, setTopic] = useState(() => defaultTopicForSubject("math", gradeLevel || "g3"));
  const [displayLevel, setDisplayLevel] = useState("regular");
  const [preview, setPreview] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState(() => new Set());
  const [answerRequired, setAnswerRequired] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [classMembers, setClassMembers] = useState([]);
  const [recipientScope, setRecipientScope] = useState("whole_class");
  const [selectedStudentIds, setSelectedStudentIds] = useState(() => new Set());

  const gradeKey = resolveCanonicalGradeKey(gradeLevel) || "g3";
  const isClassDiscussion = Boolean(classId && !studentId);

  useEffect(() => {
    if (!subjectLocked || !lockedSubject) return;
    setSubject(lockedSubject);
    setTopic(defaultTopicForSubject(lockedSubject, gradeKey));
  }, [subjectLocked, lockedSubject, gradeKey]);

  const subjectOptions = useMemo(() => {
    const allowed = new Set(permittedSubjects);
    return [...ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS].filter((s) => allowed.has(s));
  }, [permittedSubjects]);

  useEffect(() => {
    if (!accessToken || !gradeKey) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await teacherAuthFetch(
          accessToken,
          `/api/teacher/discussion/question-preview?gradeLevel=${encodeURIComponent(gradeKey)}`
        );
        const json = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && json?.data?.subjects) {
          setPermittedSubjects(json.data.subjects);
          if (subjectLocked && lockedSubject) {
            setSubject(lockedSubject);
            setTopic(defaultTopicForSubject(lockedSubject, gradeKey));
          } else if (json.data.subjects.length && !json.data.subjects.includes(subject)) {
            setSubject(json.data.subjects[0]);
            setTopic(defaultTopicForSubject(json.data.subjects[0], gradeKey));
          }
        }
      } catch {
        /* non-blocking */
      } finally {
        if (!cancelled) setSubjectsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, gradeKey, subjectLocked, lockedSubject]);

  useEffect(() => {
    if (!isClassDiscussion || !accessToken || !classId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await teacherAuthFetch(
          accessToken,
          `/api/teacher/classes/${encodeURIComponent(classId)}`
        );
        const json = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && Array.isArray(json?.data?.members)) {
          setClassMembers(json.data.members);
        }
      } catch {
        /* non-blocking */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, classId, isClassDiscussion]);

  useEffect(() => {
    const opts =
      subject === "math"
        ? mathTopicOptionsForGrade(gradeKey)
        : subject === "geometry"
          ? geometryTopicOptionsForGrade(gradeKey)
          : subject === "hebrew"
            ? hebrewTopicOptionsForGrade(gradeKey)
            : subject === "english"
              ? englishTopicOptionsForGrade(gradeKey)
              : [];
    if (opts.length && !opts.some((o) => o.key === topic)) {
      setTopic(opts[0].key);
    }
  }, [subject, gradeKey, topic]);

  const runPreview = useCallback(async () => {
    setBusy(true);
    setError("");
    setSelectedIndices(new Set());
    try {
      const res = await teacherAuthFetch(accessToken, "/api/teacher/discussion/question-preview", {
        method: "POST",
        body: JSON.stringify({
          subject,
          gradeLevel: gradeKey,
          topic,
          difficulty: displayLevel,
          count: 5,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error?.message || json?.error?.code || "יצירת שאלות נכשלה");
        setPreview([]);
        return;
      }
      setPreview(json?.data?.questions || []);
    } catch {
      setError("שגיאת רשת");
      setPreview([]);
    } finally {
      setBusy(false);
    }
  }, [accessToken, subject, gradeKey, topic, displayLevel]);

  const createDiscussion = useCallback(async () => {
    if (selectedIndices.size === 0) {
      setError("נא לבחור לפחות שאלה אחת");
      return;
    }
    if (!title.trim()) {
      setError("נא למלא כותרת");
      return;
    }
    if (isClassDiscussion && recipientScope === "selected_students" && selectedStudentIds.size === 0) {
      setError("נא לבחור לפחות ילד/ה אחד");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const selectedQuestions = [...selectedIndices]
        .sort((a, b) => a - b)
        .map((i) => preview[i])
        .filter(Boolean);
      const body = {
        title: title.trim(),
        subject,
        topic: topic.trim(),
        mode: "discussion",
        questionSelection: "same_exact",
        difficultyLevel: writeActivityDifficultyFromDisplayLevel(displayLevel, subject),
        questionCount: selectedQuestions.length,
        questionSet: selectedQuestions,
        gradeLevel: gradeKey,
        answerRequired,
      };
      if (classId) body.classId = classId;
      if (studentId) body.studentId = studentId;
      if (isClassDiscussion) {
        body.recipientScope = recipientScope;
        if (recipientScope === "selected_students") {
          body.studentIds = [...selectedStudentIds];
        }
      }

      const apiPath = studentId ? "/api/teacher/student-activities" : "/api/teacher/activities";
      const res = await teacherAuthFetch(accessToken, apiPath, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error?.message || json?.error?.code || "יצירה נכשלה");
        return;
      }
      const activityId = json?.data?.activityId;
      if (activityId) {
        const statusPath = studentId
          ? `/api/teacher/student-activities/${encodeURIComponent(activityId)}/status`
          : `/api/teacher/activities/${encodeURIComponent(activityId)}/status`;
        await teacherAuthFetch(accessToken, statusPath, {
          method: "PATCH",
          body: JSON.stringify({ action: "activate" }),
        });

        const href = monitorHref
          ? monitorHref(activityId)
          : classId
            ? `/teacher/class/${encodeURIComponent(classId)}/activities/${encodeURIComponent(activityId)}/monitor`
            : `/teacher/student/${encodeURIComponent(studentId)}`;
        router.push(href);
      }
    } catch {
      setError("שגיאת רשת");
    } finally {
      setBusy(false);
    }
  }, [
    selectedIndices,
    preview,
    title,
    subject,
    topic,
    displayLevel,
    gradeKey,
    classId,
    studentId,
    accessToken,
    monitorHref,
    router,
    isClassDiscussion,
    recipientScope,
    selectedStudentIds,
    answerRequired,
  ]);

  const toggleQuestionIndex = (index) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
        return next;
      }
      if (next.size >= 5) {
        setError("ניתן לבחור עד 5 שאלות");
        return prev;
      }
      next.add(index);
      setError("");
      return next;
    });
  };

  const toggleStudent = (studentId) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const selectAllStudents = () => {
    setSelectedStudentIds(new Set(classMembers.map((m) => m.studentId).filter(Boolean)));
  };

  const clearSelectedStudents = () => {
    setSelectedStudentIds(new Set());
  };

  if (subjectsLoaded && subjectOptions.length === 0) {
    return (
      <p className="text-amber-200 text-sm rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-3">
        אין הרשאות מקצוע לפעילות דיון. פנה למנהל המערכת או למנהל בית הספר להקצאת מקצועות.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-red-200 text-sm rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2">
          {error}
        </p>
      ) : null}

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
          {subjectLocked && lockedSubject ? (
            <input
              className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 opacity-70"
              value={subjectLabelHe(lockedSubject)}
              readOnly
              disabled
            />
          ) : (
          <select
            className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2"
            value={subject}
            onChange={(e) => {
              const next = e.target.value;
              setSubject(next);
              setTopic(defaultTopicForSubject(next, gradeKey));
            }}
          >
            {subjectOptions.map((s) => (
              <option key={s} value={s}>
                {subjectLabelHe(s)}
              </option>
            ))}
          </select>
          )}
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="text-white/70">נושא</span>
          {subject === "moledet_geography" ? (
            <select
              className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            >
              {moledetGeographyTopicOptionsForGrade(gradeKey).map(({ key, label }) => (
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
              {geometryTopicOptionsForGrade(gradeKey).map(({ key, label }) => (
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
              {hebrewTopicOptionsForGrade(gradeKey).map(({ key, label }) => (
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
              {englishTopicOptionsForGrade(gradeKey).map(({ key, label }) => (
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
              {mathTopicOptionsForGrade(gradeKey).map(({ key, label }) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          ) : subject === "science" ? (
            scienceTopicOptionsForGrade(gradeKey).length === 0 ? (
              <p className="mt-1 text-amber-200 text-sm rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2">
                לא נמצאו נושאים זמינים לכיתה זו במקצוע מדעים.
              </p>
            ) : (
              <select
                className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                {scienceTopicOptionsForGrade(gradeKey).map(({ key, label }) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            )
          ) : (
            <input
              className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          )}
        </label>
        <ActivityDisplayLevelSelector
          subjectId={subject}
          value={displayLevel}
          onChange={(dl) => {
            setDisplayLevel(dl);
            setPreview([]);
            setSelectedIndices(new Set());
          }}
          variant="select"
          label="רמה"
          inputClassName="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2"
        />
        <label className="block text-sm">
          <span className="text-white/70">כיתה</span>
          <input
            className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 opacity-70"
            value={formatGradeLevelHe(gradeKey)}
            readOnly
            disabled
          />
        </label>
      </div>

      {isClassDiscussion && selectedIndices.size > 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
          <p className="text-sm font-medium text-white">נמענים</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="recipientScope"
                checked={recipientScope === "whole_class"}
                onChange={() => setRecipientScope("whole_class")}
              />
              <span>כל הכיתה</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="recipientScope"
                checked={recipientScope === "selected_students"}
                onChange={() => setRecipientScope("selected_students")}
              />
              <span>ילדים נבחרים</span>
            </label>
          </div>

          {recipientScope === "selected_students" ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                <span>נבחרו: {selectedStudentIds.size}</span>
                <button
                  type="button"
                  className="underline hover:text-white"
                  onClick={selectAllStudents}
                  disabled={!classMembers.length}
                >
                  בחר הכל
                </button>
                <button
                  type="button"
                  className="underline hover:text-white"
                  onClick={clearSelectedStudents}
                >
                  נקה
                </button>
              </div>
              {classMembers.length === 0 ? (
                <p className="text-white/50 text-sm">אין ילדים פעילים בכיתה.</p>
              ) : (
                <ul className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-white/10 p-2">
                  {classMembers.map((m) => (
                    <li key={m.studentId}>
                      <label className="flex items-center gap-2 text-sm cursor-pointer py-1">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.has(m.studentId)}
                          onChange={() => toggleStudent(m.studentId)}
                        />
                        <span>{m.studentFullNameMasked || m.studentFullName || m.studentId}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <p className="text-sm font-medium text-white">סוג דיון</p>
        <div className="flex flex-col gap-3 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="answerRequiredMode"
              checked={answerRequired}
              onChange={() => setAnswerRequired(true)}
            />
            <span>דיון עם מענה (ילדים מגישים תשובה)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="answerRequiredMode"
              checked={!answerRequired}
              onChange={() => setAnswerRequired(false)}
            />
            <span>הסבר בלבד - ללא מענה נדרש</span>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={runPreview}
          className="px-4 py-2 rounded-xl border border-white/20 hover:bg-white/10 text-sm"
        >
          {busy ? "מייצר…" : "הצג שאלות לבחירה"}
        </button>
        <button
          type="button"
          disabled={busy || selectedIndices.size === 0}
          onClick={createDiscussion}
          className="px-4 py-2 rounded-xl bg-cyan-500/90 text-black font-semibold text-sm disabled:opacity-50"
        >
          צור פעילות דיון
        </button>
      </div>

      {preview.length > 0 ? (
        <>
          <p className="text-sm text-white/70">
            נבחרו {selectedIndices.size} מתוך 5
          </p>
        <div className="grid gap-3 md:grid-cols-2">
          {preview.map((q, i) => {
            const correct = correctAnswerText(q);
            const choices = questionChoices(q);
            const selected = selectedIndices.has(i);
            return (
              <div
                key={i}
                className={`rounded-xl border p-4 text-sm ${
                  selected
                    ? "border-cyan-400/50 bg-cyan-500/10"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <p className="font-medium text-white mb-2" dir="auto">
                  {questionPrompt(q)}
                </p>
                {choices.length > 0 ? (
                  <ul className="space-y-1 mb-2 text-white/80">
                    {choices.map((c, ci) => (
                      <li
                        key={ci}
                        className={
                          c === correct || String(ci) === String(q?.correctIndex)
                            ? "text-emerald-300 font-medium"
                            : ""
                        }
                        dir="auto"
                      >
                        {c}
                        {c === correct ? " ✓" : ""}
                      </li>
                    ))}
                  </ul>
                ) : correct ? (
                  <p className="text-emerald-300 text-xs mb-2" dir="auto">
                    תשובה נכונה: {correct}
                  </p>
                ) : null}
                <button
                  type="button"
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/10"
                  onClick={() => {
                    toggleQuestionIndex(i);
                    if (!title.trim()) {
                      setTitle(`דיון - ${subjectLabelHe(subject)}`);
                    }
                  }}
                >
                  {selected ? "נבחרה ✓" : "בחר שאלה"}
                </button>
              </div>
            );
          })}
        </div>
        </>
      ) : null}
    </div>
  );
}
