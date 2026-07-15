import { useCallback, useEffect, useMemo, useState } from "react";
import PortalDarkSelect from "../platform-ui/PortalDarkSelect.jsx";
import { SchoolPrimaryButton } from "./SchoolPortalUi";
import { SCHOOL_GRADE_OPTIONS, schoolGradeLabelHe } from "../../lib/school-portal/school-drilldown";
import {
  apiErrorMessageHe,
  schoolAuthFetch,
  SCHOOL_ASSIGN_CHOOSE_CLASS,
  SCHOOL_ASSIGN_CURRENT_CLASS,
  SCHOOL_ASSIGN_CURRENT_GRADE,
  SCHOOL_ASSIGN_NO_CLASS,
  SCHOOL_ASSIGN_SAVED,
  SCHOOL_ASSIGN_TARGET_GRADE,
  SCHOOL_ASSIGN_TRANSFER,
  SCHOOL_ASSIGN_UPDATE,
} from "../../lib/school-portal/school-ui.he";

/**
 * @param {{
 *   accessToken: string,
 *   studentId: string,
 *   studentName?: string,
 *   onUpdated?: () => void,
 * }} props
 */
export default function SchoolStudentAssignmentPanel({
  accessToken,
  studentId,
  studentName = "",
  onUpdated,
}) {
  const [assignment, setAssignment] = useState(null);
  const [physicalClasses, setPhysicalClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toGradeLevel, setToGradeLevel] = useState("");
  const [toPhysicalClassName, setToPhysicalClassName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const gradeOptions = useMemo(
    () => [{ value: "", label: "-" }, ...SCHOOL_GRADE_OPTIONS.map((g) => ({ value: g.level, label: g.label }))],
    []
  );

  const classOptions = useMemo(() => {
    if (!toGradeLevel) return [{ value: "", label: "-" }];
    const names = physicalClasses
      .filter((c) => String(c.gradeLevel) === String(toGradeLevel))
      .map((c) => c.name);
    const unique = [...new Set(names)];
    return [
      { value: "", label: SCHOOL_ASSIGN_CHOOSE_CLASS },
      ...unique.map((n) => ({ value: n, label: n })),
    ];
  }, [toGradeLevel, physicalClasses]);

  const load = useCallback(async () => {
    if (!accessToken || !studentId) return;
    setLoading(true);
    setError("");
    try {
      const [assignRes, classesRes] = await Promise.all([
        schoolAuthFetch(accessToken, `/api/school/students/${studentId}/assignment`),
        schoolAuthFetch(accessToken, "/api/school/physical-classes"),
      ]);
      const assignJson = await assignRes.json().catch(() => ({}));
      const classesJson = await classesRes.json().catch(() => ({}));
      if (!assignRes.ok) {
        setError(apiErrorMessageHe(assignJson?.error, "שגיאה בטעינת שיוך"));
        return;
      }
      if (!classesRes.ok) {
        setError(apiErrorMessageHe(classesJson?.error, "שגיאה בטעינת כיתות"));
        return;
      }
      const a = assignJson?.data?.assignment || null;
      setAssignment(a);
      setPhysicalClasses(classesJson?.data?.physicalClasses || []);
      setToGradeLevel(a?.gradeLevel ? String(a.gradeLevel) : "");
      setToPhysicalClassName(a?.physicalClassName || "");
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }, [accessToken, studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!accessToken || !studentId || !toGradeLevel || !toPhysicalClassName) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await schoolAuthFetch(accessToken, `/api/school/students/${studentId}/assignment`, {
        method: "PATCH",
        body: JSON.stringify({
          toGradeLevel,
          toPhysicalClassName,
          fromGradeLevel: assignment?.gradeLevel || null,
          fromPhysicalClassName: assignment?.physicalClassName || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessageHe(json?.error, "עדכון שיוך נכשל"));
        return;
      }
      setMessage(SCHOOL_ASSIGN_SAVED);
      await load();
      onUpdated?.();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-white/60 text-right">טוען…</p>;
  }

  return (
    <div className="space-y-4 text-right" data-testid="school-student-assignment-panel">
      {studentName ? <p className="text-sm text-white/70">{studentName}</p> : null}

      <dl className="grid grid-cols-2 gap-3 text-sm rounded-lg border border-white/10 bg-black/30 p-3">
        <div>
          <dt className="text-white/50">{SCHOOL_ASSIGN_CURRENT_GRADE}</dt>
          <dd className="font-medium">
            {assignment?.gradeLevel ? schoolGradeLabelHe(assignment.gradeLevel) : "-"}
          </dd>
        </div>
        <div>
          <dt className="text-white/50">{SCHOOL_ASSIGN_CURRENT_CLASS}</dt>
          <dd className="font-medium">{assignment?.physicalClassName || SCHOOL_ASSIGN_NO_CLASS}</dd>
        </div>
      </dl>

      <form onSubmit={(e) => void submit(e)} className="space-y-3">
        <p className="text-sm font-medium text-white/80">{SCHOOL_ASSIGN_TRANSFER}</p>
        <label className="block text-sm">
          <span className="text-white/60 block mb-1">{SCHOOL_ASSIGN_TARGET_GRADE}</span>
          <PortalDarkSelect
            value={toGradeLevel}
            onChange={(v) => {
              setToGradeLevel(v);
              setToPhysicalClassName("");
            }}
            options={gradeOptions}
            data-testid="school-assign-grade-select"
          />
        </label>
        <label className="block text-sm">
          <span className="text-white/60 block mb-1">{SCHOOL_ASSIGN_CHOOSE_CLASS}</span>
          <PortalDarkSelect
            value={toPhysicalClassName}
            onChange={setToPhysicalClassName}
            options={classOptions}
            disabled={!toGradeLevel}
            data-testid="school-assign-class-select"
          />
        </label>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        <SchoolPrimaryButton type="submit" disabled={busy || !toGradeLevel || !toPhysicalClassName}>
          {SCHOOL_ASSIGN_UPDATE}
        </SchoolPrimaryButton>
      </form>
    </div>
  );
}
