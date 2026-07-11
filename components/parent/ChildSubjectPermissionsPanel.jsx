import { useEffect, useMemo, useState } from "react";
import { getParentPortalTheme } from "../../lib/parent-ui/parent-portal-theme.client.js";
import { mapParentPanelApiError } from "../../lib/parent-server/parent-api-errors.he.js";

const FILTER_OPTIONS = [
  { id: "all", label: "הכול" },
  { id: "enabled", label: "פתוחים" },
  { id: "disabled", label: "נעולים" },
  { id: "suitable", label: "מתאימים לכיתה" },
];

export default function ChildSubjectPermissionsPanel({ studentId, accessToken, bright = false }) {
  const T = getParentPortalTheme(bright);
  const [subjects, setSubjects] = useState([]);
  const [allowStudentGradePicker, setAllowStudentGradePicker] = useState(false);
  const [filter, setFilter] = useState("all");
  const [saving, setSaving] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!studentId || !accessToken) return;
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/parent/students/${studentId}/subject-permissions`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.ok) throw new Error(mapParentPanelApiError(data.error, "load"));
        setSubjects(data.subjects || []);
        setAllowStudentGradePicker(data.allowStudentGradePicker === true);
      } catch (err) {
        if (!cancelled) setError(mapParentPanelApiError(err.message, "load"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [studentId, accessToken]);

  const visibleSubjects = useMemo(() => {
    return subjects.filter((row) => {
      if (filter === "enabled") return row.isEnabled !== false;
      if (filter === "disabled") return row.isEnabled === false;
      if (filter === "suitable") return row.isGradeSuitable === true;
      return true;
    });
  }, [subjects, filter]);

  async function patchBody(body) {
    setError("");
    const res = await fetch(`/api/parent/students/${studentId}/subject-permissions`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(mapParentPanelApiError(data.error, "save"));
    setSubjects(data.subjects || []);
    setAllowStudentGradePicker(data.allowStudentGradePicker === true);
  }

  async function toggleSubject(subjectKey) {
    const row = subjects.find((s) => s.subjectKey === subjectKey);
    if (!row) return;
    setSaving(subjectKey);
    try {
      await patchBody({ subjectKey, isEnabled: !row.isEnabled });
    } catch (err) {
      setError(mapParentPanelApiError(err.message, "save"));
    } finally {
      setSaving(null);
    }
  }

  async function enableAll() {
    setSaving("enableAll");
    try {
      await patchBody({ enableAll: true });
    } catch (err) {
      setError(mapParentPanelApiError(err.message, "save"));
    } finally {
      setSaving(null);
    }
  }

  async function toggleGradePicker() {
    setSaving("gradePicker");
    try {
      await patchBody({ allowStudentGradePicker: !allowStudentGradePicker });
    } catch (err) {
      setError(mapParentPanelApiError(err.message, "save"));
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className={T.permissionsBox}>
        <p className={`${T.permissionsHint} text-right`}>טוען הרשאות מקצועות...</p>
      </div>
    );
  }

  return (
    <div className={`${T.permissionsBox} space-y-3`}>
      <h3 className={T.permissionsTitle}>מקצועות לימוד</h3>
      <p className={T.permissionsHint}>
        נעילת מקצוע חוסמת את הילד מלמידה חדשה במקצוע. היסטוריית למידה קודמת נשמרת.
      </p>
      {error ? (
        <p className={`text-xs text-right ${bright ? "text-rose-600" : "text-red-300"}`}>{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-2 justify-end">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setFilter(opt.id)}
            className={`rounded-full px-3 py-1 text-xs ${
              filter === opt.id
                ? bright
                  ? "bg-slate-800 text-white"
                  : "bg-white text-slate-900"
                : bright
                  ? "bg-slate-200 text-slate-700"
                  : "bg-white/10 text-white/80"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {visibleSubjects.map((row) => {
          const enabled = row.isEnabled !== false;
          return (
            <div key={row.subjectKey} className={T.permissionsRow}>
              <button
                type="button"
                disabled={saving === row.subjectKey}
                onClick={() => toggleSubject(row.subjectKey)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                  enabled ? "bg-emerald-500" : bright ? "bg-slate-300" : "bg-white/20"
                } ${saving === row.subjectKey ? "opacity-60" : ""}`}
                aria-pressed={enabled}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    enabled ? "-translate-x-1" : "-translate-x-6"
                  }`}
                />
              </button>
              <div className="flex-1 text-right">
                <span className={T.permissionsLabel}>{row.labelHe || row.subjectKey}</span>
                {row.isGradeSuitable ? (
                  <span
                    className={`mr-2 text-[10px] rounded px-1.5 py-0.5 ${
                      bright ? "bg-emerald-100 text-emerald-800" : "bg-emerald-500/20 text-emerald-200"
                    }`}
                  >
                    מתאים לכיתה
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 justify-end pt-1">
        <button
          type="button"
          disabled={saving === "enableAll"}
          onClick={enableAll}
          className={`rounded-lg px-3 py-1.5 text-xs ${
            bright ? "bg-slate-800 text-white" : "bg-white/15 text-white hover:bg-white/25"
          }`}
        >
          פתיחת הכול
        </button>
      </div>

      <div className={`${T.permissionsRow} border-t pt-3 ${bright ? "border-slate-200" : "border-white/10"}`}>
        <button
          type="button"
          disabled={saving === "gradePicker"}
          onClick={toggleGradePicker}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
            allowStudentGradePicker ? "bg-emerald-500" : bright ? "bg-slate-300" : "bg-white/20"
          } ${saving === "gradePicker" ? "opacity-60" : ""}`}
          aria-pressed={allowStudentGradePicker}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
              allowStudentGradePicker ? "-translate-x-1" : "-translate-x-6"
            }`}
          />
        </button>
        <span className={T.permissionsLabel}>לאפשר לילד לבחור כיתה בדפי הלימוד</span>
      </div>
    </div>
  );
}
