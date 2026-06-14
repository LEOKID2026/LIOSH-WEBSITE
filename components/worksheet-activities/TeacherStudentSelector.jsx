import { useCallback, useEffect, useState } from "react";
import { getLearningSupabaseBrowserClient } from "../../lib/learning-supabase/client";
import { resolveTeacherAccessToken } from "../../lib/teacher-portal/use-teacher-portal-session";
import { teacherAuthFetch } from "../../lib/teacher-portal/teacher-ui.he.js";

/**
 * @param {{
 *   accessToken?: string,
 *   selectedStudentIds: string[],
 *   onChange: (ids: string[]) => void,
 *   preselectedStudentId?: string,
 *   disabled?: boolean,
 * }} props
 */
export default function TeacherStudentSelector({
  accessToken: accessTokenProp,
  selectedStudentIds,
  onChange,
  preselectedStudentId,
  disabled = false,
}) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let token = accessTokenProp;
      if (!token) {
        const supabase = getLearningSupabaseBrowserClient();
        const session = await resolveTeacherAccessToken(supabase);
        if (!session.ok) {
          setError("לא מחובר");
          return;
        }
        token = session.token;
      }
      const res = await teacherAuthFetch(token, "/api/teacher/students");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error?.message || body?.error?.code || "שגיאה בטעינת ילדים");
        return;
      }
      const list = (body?.data?.students || []).filter((s) => !s.archivedAt);
      setStudents(list);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }, [accessTokenProp]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!preselectedStudentId || selectedStudentIds.length) return;
    if (students.some((s) => s.studentId === preselectedStudentId)) {
      onChange([preselectedStudentId]);
    }
  }, [preselectedStudentId, students, selectedStudentIds.length, onChange]);

  const toggle = (studentId) => {
    if (disabled) return;
    if (selectedStudentIds.includes(studentId)) {
      onChange(selectedStudentIds.filter((id) => id !== studentId));
    } else {
      onChange([...selectedStudentIds, studentId]);
    }
  };

  if (loading) return <p className="text-white/60 text-sm">טוען ילדים…</p>;
  if (error) return <p className="text-red-300 text-sm">{error}</p>;
  if (!students.length) {
    return <p className="text-white/60 text-sm">אין ילדים מקושרים. קשרו ילד/ה לפני יצירת דף עבודה.</p>;
  }

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm text-white/80 mb-2">בחרו ילדים לשיוך</legend>
      <ul className="max-h-64 overflow-y-auto rounded-xl border border-white/15 divide-y divide-white/10">
        {students.map((s) => {
          const checked = selectedStudentIds.includes(s.studentId);
          return (
            <li key={s.studentId}>
              <label className="flex items-center justify-between gap-3 px-3 py-2 cursor-pointer hover:bg-white/5">
                <span className="text-white text-sm">
                  {s.studentFullName || s.studentFullNameMasked || "ילד/ה"}
                  {s.gradeLevel ? (
                    <span className="text-white/50 text-xs mr-2">כיתה {s.gradeLevel}</span>
                  ) : null}
                </span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(s.studentId)}
                  data-testid={`worksheet-student-select-${s.studentId}`}
                />
              </label>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-white/50">נבחרו: {selectedStudentIds.length}</p>
    </fieldset>
  );
}
