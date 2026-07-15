import { useCallback, useEffect, useMemo, useState } from "react";
import PortalDarkSelect from "../platform-ui/PortalDarkSelect.jsx";
import { SchoolEmptyState, SchoolPrimaryButton, SCHOOL_CARD, SCHOOL_CARD_INNER } from "./SchoolPortalUi";
import { SCHOOL_GRADE_OPTIONS, schoolGradeLabelHe } from "../../lib/school-portal/school-drilldown";
import {
  apiErrorMessageHe,
  schoolAuthFetch,
  SCHOOL_CLASS_MGMT_ADD,
  SCHOOL_CLASS_MGMT_CREATE,
  SCHOOL_CLASS_MGMT_CREATE_SUCCESS,
  SCHOOL_CLASS_MGMT_EMPTY,
  SCHOOL_CLASS_MGMT_EXISTING,
  SCHOOL_CLASS_MGMT_GRADE,
  SCHOOL_CLASS_MGMT_LIST_TITLE,
  SCHOOL_CLASS_MGMT_NAME,
  SCHOOL_CLASS_MGMT_SECTION,
  SCHOOL_CLASS_MGMT_STUDENT_COUNT,
  SCHOOL_CLASS_MGMT_SUBJECT_COUNT,
} from "../../lib/school-portal/school-ui.he";

/**
 * @param {{ accessToken: string, onChanged?: () => void }} props
 */
export default function SchoolClassManagementPanel({ accessToken, onChanged }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const gradeOptions = useMemo(
    () => [{ value: "", label: "-" }, ...SCHOOL_GRADE_OPTIONS.map((g) => ({ value: g.level, label: g.label }))],
    []
  );

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError("");
    try {
      const res = await schoolAuthFetch(accessToken, "/api/school/physical-classes");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessageHe(json?.error, "שגיאה בטעינת כיתות"));
        return;
      }
      setClasses(json?.data?.physicalClasses || []);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!accessToken || !name.trim() || !gradeLevel) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await schoolAuthFetch(accessToken, "/api/school/physical-classes", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), gradeLevel }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessageHe(json?.error, "יצירת כיתה נכשלה"));
        return;
      }
      setMessage(SCHOOL_CLASS_MGMT_CREATE_SUCCESS);
      setName("");
      await load();
      onChanged?.();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={SCHOOL_CARD} data-testid="school-class-management-panel">
      <div className={SCHOOL_CARD_INNER}>
        <h2 className="text-base font-semibold mb-3 text-right">{SCHOOL_CLASS_MGMT_SECTION}</h2>

        {loading ? (
          <p className="text-sm text-white/60 text-right">טוען…</p>
        ) : error && !classes.length ? (
          <p className="text-sm text-red-300 text-right">{error}</p>
        ) : null}

        <div className="mb-4">
          <h3 className="text-sm font-medium text-white/80 mb-2 text-right">{SCHOOL_CLASS_MGMT_LIST_TITLE}</h3>
          {classes.length ? (
            <ul className="space-y-2 text-right" data-testid="school-class-list">
              {classes.map((c) => (
                <li
                  key={`${c.gradeLevel}:${c.name}`}
                  className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="text-white/50 mx-2">·</span>
                  <span className="text-white/70">{schoolGradeLabelHe(c.gradeLevel)}</span>
                  <span className="text-white/40 text-xs mr-2">
                    ({SCHOOL_CLASS_MGMT_SUBJECT_COUNT}: {c.subjectCount ?? 0},{" "}
                    {SCHOOL_CLASS_MGMT_STUDENT_COUNT}: {c.studentCount ?? 0})
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <SchoolEmptyState title={SCHOOL_CLASS_MGMT_EMPTY} />
          )}
        </div>

        <h3 className="text-sm font-medium text-white/80 mb-2 text-right">{SCHOOL_CLASS_MGMT_ADD}</h3>
        <form onSubmit={(e) => void submit(e)} className="space-y-3 max-w-md text-right">
          <label className="block text-sm">
            <span className="text-white/60 block mb-1">{SCHOOL_CLASS_MGMT_NAME}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
              placeholder={SCHOOL_CLASS_MGMT_EXISTING}
              className="w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2 text-sm"
              data-testid="school-class-name-input"
            />
          </label>
          <label className="block text-sm">
            <span className="text-white/60 block mb-1">{SCHOOL_CLASS_MGMT_GRADE}</span>
            <PortalDarkSelect
              value={gradeLevel}
              onChange={setGradeLevel}
              options={gradeOptions}
              data-testid="school-class-grade-select"
            />
          </label>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
          <SchoolPrimaryButton type="submit" disabled={busy || !name.trim() || !gradeLevel}>
            {SCHOOL_CLASS_MGMT_CREATE}
          </SchoolPrimaryButton>
        </form>
      </div>
    </section>
  );
}
