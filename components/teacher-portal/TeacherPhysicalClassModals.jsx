import { useCallback, useEffect, useMemo, useState } from "react";
import {
  activityModeLabelHe,
  activityStatusLabelHe,
} from "../../lib/classroom-activities/classroom-activities-labels.client.js";
import { sanitizeActivityTitleHe } from "../../lib/platform-ui/hebrew-display-labels.js";
import { subjectLabelHe, teacherAuthFetch } from "../../lib/teacher-portal/teacher-ui.he.js";

function Overlay({ onClose, children, title }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/70" aria-hidden="true" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[min(88vh,720px)] overflow-y-auto">
        <div className="rounded-xl border border-white/15 bg-gray-900 p-5 w-full shadow-xl">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button type="button" onClick={onClose} className="text-white/60 text-sm">
              סגור
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * @param {{
 *   accessToken: string,
 *   classCard: {
 *     name: string,
 *     subjectClassIds: Array<{ classId: string, subjectLabel: string, subjectFocus?: string|null }>,
 *   },
 *   onClose: () => void,
 * }} props
 */
export function TeacherPhysicalClassActivitiesModal({ accessToken, classCard, onClose }) {
  const classIds = (classCard?.subjectClassIds || []).map((s) => s.classId).filter(Boolean);
  const [phase, setPhase] = useState("loading");
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState("");

  const subjectLabelByClassId = useMemo(() => {
    const map = new Map();
    for (const s of classCard?.subjectClassIds || []) {
      map.set(s.classId, s.subjectLabel);
    }
    return map;
  }, [classCard]);

  const load = useCallback(async () => {
    if (!classIds.length) {
      setPhase("ready");
      return;
    }
    setPhase("loading");
    setError("");
    const qs = classIds.map((id) => `classIds=${encodeURIComponent(id)}`).join("&");
    const res = await teacherAuthFetch(accessToken, `/api/teacher/activities?${qs}`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body?.error?.message || "שגיאה בטעינת פעילויות");
      setPhase("error");
      return;
    }
    setActivities(body?.data?.activities || []);
    setPhase("ready");
  }, [accessToken, classIds.join(",")]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Overlay title={`פעילויות - ${classCard.name}`} onClose={onClose}>
      {phase === "loading" ? (
        <p className="text-sm text-white/60">טוען פעילויות…</p>
      ) : null}
      {phase === "error" ? (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      {phase === "ready" && activities.length === 0 ? (
        <p className="text-sm text-white/60">אין פעילויות כיתה להצגה.</p>
      ) : null}
      {phase === "ready" && activities.length > 0 ? (
        <ul className="space-y-2">
          {activities.map((a) => (
            <li
              key={a.activityId}
              className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm"
              data-testid={`teacher-physical-activity-${a.activityId}`}
            >
              <p className="font-medium">{sanitizeActivityTitleHe(a.title, a.subject)}</p>
              <p className="text-white/60 text-xs mt-1">
                {subjectLabelByClassId.get(a.classId) || subjectLabelHe(a.subject)} ·{" "}
                {activityStatusLabelHe(a.status)} · {activityModeLabelHe(a.mode)}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </Overlay>
  );
}
