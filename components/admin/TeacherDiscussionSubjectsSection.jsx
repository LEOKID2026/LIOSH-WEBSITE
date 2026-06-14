import { useCallback, useEffect, useState } from "react";
import AdminSectionCard from "./AdminSectionCard.jsx";
import { REPORT_SUBJECTS, subjectLabelHe } from "../../lib/teacher-portal/teacher-ui.he.js";
import { adminAuthFetch } from "../../lib/admin-portal/use-admin-session.js";

/**
 * @param {{ teacher: object, accessToken: string }} props
 */
export default function TeacherDiscussionSubjectsSection({ teacher, accessToken }) {
  const [subjects, setSubjects] = useState([]);
  const [grantSubject, setGrantSubject] = useState("math");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isPrivateTeacher = !teacher?.schoolMembership?.schoolId;

  const load = useCallback(async () => {
    if (!accessToken || !teacher?.teacherId || !isPrivateTeacher) return;
    try {
      const res = await adminAuthFetch(
        accessToken,
        `/api/admin/teachers/${encodeURIComponent(teacher.teacherId)}/discussion-subjects`
      );
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.data?.subjects) {
        setSubjects(json.data.subjects);
      }
    } catch {
      /* non-blocking */
    }
  }, [accessToken, teacher?.teacherId, isPrivateTeacher]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isPrivateTeacher) {
    return null;
  }

  const grant = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await adminAuthFetch(
        accessToken,
        `/api/admin/teachers/${encodeURIComponent(teacher.teacherId)}/discussion-subjects`,
        {
          method: "POST",
          body: JSON.stringify({ subject: grantSubject }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error?.message || json?.error?.code || "הקצאה נכשלה");
        return;
      }
      setMessage("ההרשאה נוספה");
      await load();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (grantId) => {
    setBusy(true);
    setError("");
    try {
      const res = await adminAuthFetch(
        accessToken,
        `/api/admin/teachers/${encodeURIComponent(teacher.teacherId)}/discussion-subjects/${encodeURIComponent(grantId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json?.error?.message || "ביטול נכשל");
        return;
      }
      await load();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminSectionCard
      id="admin-teacher-discussion-subjects"
      title="הרשאות מקצוע לפעילות דיון (מורה פרטי)"
      className="mt-5"
    >
      <p className="text-white/60 text-sm mb-4">
        מורה פרטי ללא הרשאות מקצוע לא יוכל ליצור פעילויות דיון. ההרשאה היא לפי מקצוע בלבד (לא
        לפי כיתה או שכבה). רמת הילד/ה משמשת רק לבחירת שאלות מתאימות.
      </p>

      {error ? <p className="text-red-200 text-sm mb-3">{error}</p> : null}
      {message ? <p className="text-emerald-200 text-sm mb-3">{message}</p> : null}

      <ul className="space-y-2 mb-4">
        {subjects.length === 0 ? (
          <li className="text-white/50 text-sm">אין הרשאות מוגדרות</li>
        ) : (
          subjects.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm"
            >
              <span>{subjectLabelHe(row.subject)}</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => revoke(row.id)}
                className="text-xs text-red-300 hover:underline"
              >
                ביטול
              </button>
            </li>
          ))
        )}
      </ul>

      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-sm">
          <span className="text-white/60 block mb-1">מקצוע</span>
          <select
            className="rounded-lg bg-white/10 border border-white/20 px-2 py-1.5"
            value={grantSubject}
            onChange={(e) => setGrantSubject(e.target.value)}
          >
            {REPORT_SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {subjectLabelHe(s)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={grant}
          className="px-3 py-2 rounded-lg bg-amber-500/90 text-black text-sm font-semibold disabled:opacity-50"
        >
          הוסף הרשאה
        </button>
      </div>
    </AdminSectionCard>
  );
}
