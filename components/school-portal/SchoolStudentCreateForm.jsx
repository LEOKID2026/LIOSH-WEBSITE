import { useMemo, useState } from "react";
import PortalDarkSelect from "../platform-ui/PortalDarkSelect.jsx";
import SchoolCredentialShownOnceBox from "./SchoolCredentialShownOnceBox";
import { SchoolPrimaryButton, SCHOOL_CARD, SCHOOL_CARD_INNER } from "./SchoolPortalUi";
import { SCHOOL_GRADE_OPTIONS } from "../../lib/school-portal/school-drilldown";
import {
  apiErrorMessageHe,
  schoolAuthFetch,
  SCHOOL_CREATE_STUDENT_CLASS,
  SCHOOL_CREATE_STUDENT_CLASS_HINT,
  SCHOOL_CREATE_STUDENT_FULL_NAME,
  SCHOOL_CREATE_STUDENT_GRADE,
  SCHOOL_CREATE_STUDENT_LOGIN,
  SCHOOL_CREATE_STUDENT_NOTES,
  SCHOOL_CREATE_STUDENT_SECTION,
  SCHOOL_CREATE_STUDENT_SUBMIT,
  SCHOOL_CREATE_STUDENT_SUCCESS,
} from "../../lib/school-portal/school-ui.he";

/**
 * @param {{
 *   accessToken: string,
 *   browseSummary?: { physicalClassesByGrade?: Record<string, Array<{ name: string }>> }|null,
 *   onSuccess?: () => void,
 * }} props
 */
export default function SchoolStudentCreateForm({ accessToken, browseSummary, onSuccess }) {
  const [fullName, setFullName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [physicalClassName, setPhysicalClassName] = useState("");
  const [notes, setNotes] = useState("");
  const [createLoginAccess, setCreateLoginAccess] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [credentials, setCredentials] = useState(null);

  const classOptions = useMemo(() => {
    if (!gradeLevel || !browseSummary?.physicalClassesByGrade) return [];
    return (browseSummary.physicalClassesByGrade[gradeLevel] || []).map((g) => ({
      value: g.name,
      label: g.name,
    }));
  }, [gradeLevel, browseSummary]);

  const submit = async (e) => {
    e.preventDefault();
    if (!accessToken || !fullName.trim()) return;
    setBusy(true);
    setError("");
    setMessage("");
    setCredentials(null);
    try {
      const res = await schoolAuthFetch(accessToken, "/api/school/students", {
        method: "POST",
        body: JSON.stringify({
          fullName: fullName.trim(),
          gradeLevel: gradeLevel || null,
          physicalClassName: physicalClassName || null,
          notes: notes.trim() || null,
          createLoginAccess,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessageHe(json?.error, "יצירת תלמיד/ה נכשלה"));
        return;
      }
      setMessage(SCHOOL_CREATE_STUDENT_SUCCESS);
      if (json?.data?.student?.access?.loginUsername) {
        setCredentials({
          loginUsername: json.data.student.access.loginUsername,
          loginPinOnce: json.data.student.access.loginPinOnce,
        });
      }
      setFullName("");
      setNotes("");
      onSuccess?.();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`${SCHOOL_CARD} mb-6`} data-testid="school-student-create-form">
      <div className={SCHOOL_CARD_INNER}>
        <h2 className="text-base font-semibold mb-2 text-right">{SCHOOL_CREATE_STUDENT_SECTION}</h2>
        <form onSubmit={(e) => void submit(e)} className="space-y-3 max-w-xl text-right">
          <label className="block text-sm">
            <span className="text-white/60 block mb-1">{SCHOOL_CREATE_STUDENT_FULL_NAME}</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm">
            <span className="text-white/60 block mb-1">{SCHOOL_CREATE_STUDENT_GRADE}</span>
            <PortalDarkSelect
              data-testid="school-create-student-grade"
              value={gradeLevel}
              onChange={(v) => {
                setGradeLevel(v);
                setPhysicalClassName("");
              }}
              options={[{ value: "", label: "— בחרו שכבה —" }, ...SCHOOL_GRADE_OPTIONS.map((g) => ({ value: g.level, label: g.label }))]}
            />
          </label>

          {gradeLevel ? (
            <label className="block text-sm">
              <span className="text-white/60 block mb-1">{SCHOOL_CREATE_STUDENT_CLASS}</span>
              {classOptions.length ? (
                <PortalDarkSelect
                  data-testid="school-create-student-class"
                  value={physicalClassName}
                  onChange={setPhysicalClassName}
                  options={[{ value: "", label: "— בחרו כיתה —" }, ...classOptions]}
                />
              ) : (
                <input
                  value={physicalClassName}
                  onChange={(e) => setPhysicalClassName(e.target.value)}
                  placeholder="למשל: 1"
                  className="w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2 text-sm"
                />
              )}
              <p className="text-xs text-white/45 mt-1">{SCHOOL_CREATE_STUDENT_CLASS_HINT}</p>
            </label>
          ) : null}

          <label className="block text-sm">
            <span className="text-white/60 block mb-1">{SCHOOL_CREATE_STUDENT_NOTES}</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2 text-sm"
            />
          </label>

          <label className="flex items-center justify-between gap-3 text-sm">
            <span>{SCHOOL_CREATE_STUDENT_LOGIN}</span>
            <input
              type="checkbox"
              checked={createLoginAccess}
              onChange={(e) => setCreateLoginAccess(e.target.checked)}
              className="h-4 w-4"
            />
          </label>

          {error ? <p className="text-red-300 text-sm">{error}</p> : null}
          {message ? <p className="text-emerald-300 text-sm">{message}</p> : null}
          {credentials ? (
            <SchoolCredentialShownOnceBox
              credentials={credentials}
              onDismiss={() => setCredentials(null)}
            />
          ) : null}

          <SchoolPrimaryButton type="submit" disabled={busy || !fullName.trim()}>
            {busy ? "יוצר…" : SCHOOL_CREATE_STUDENT_SUBMIT}
          </SchoolPrimaryButton>
        </form>
      </div>
    </section>
  );
}
