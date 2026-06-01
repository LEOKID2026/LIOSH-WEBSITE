import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { filterStudentsByRosterKey } from "../../lib/teacher-portal/teacher-dashboard-roster.js";
import { effectivePhysicalClassStudentCount } from "../../lib/teacher-portal/teacher-physical-class.js";
import {
  DASHBOARD_CREATE_CLASS_BUTTON,
  DASHBOARD_CREATE_CLASS_LABEL,
  DASHBOARD_CREATE_CLASS_PLACEHOLDER,
  DASHBOARD_NO_CLASSES_HINT,
  DASHBOARD_NO_CLASSES_TITLE,
  formatTeacherAttentionStudentLineHe,
  rosterFilterLabelHe,
  subjectLabelHe,
  teacherAuthFetch,
} from "../../lib/teacher-portal/teacher-ui.he.js";

const FILTER_OPTIONS = [
  { key: "all", label: "הכל" },
  { key: "struggling", label: "דורש התערבות / חיזוק" },
  { key: "low_activity", label: "פעילות נמוכה" },
  { key: "watch", label: "במעקב" },
  { key: "strong", label: "חזקים" },
];

const SORT_OPTIONS = [
  { key: "name", label: "שם" },
  { key: "activity", label: "פעילות אחרונה" },
  { key: "status", label: "מצב לימודי" },
];

function formatCompactStudentStats(student, { activityLoading = false } = {}) {
  if (student.activityPending || activityLoading) {
    return "טוען נתוני פעילות…";
  }
  const sessions = Number(student.totalSessions) || 0;
  const answers = Number(student.totalAnswers) || 0;
  const acc =
    student.accuracy != null && Number.isFinite(Number(student.accuracy))
      ? `${Math.round(Number(student.accuracy))}%`
      : "—";
  return `מפגשים: ${sessions} · תשובות: ${answers} · הצלחה: ${acc}`;
}

function StudentDashboardCard({ student, activityLoading = false }) {
  const pending = Boolean(student.activityPending || activityLoading);
  const badgeLabel = pending ? "טוען…" : student.statusBadge || "—";

  return (
    <li className="rounded-lg border border-white/10 bg-black/30 p-2.5 sm:p-3 flex flex-col gap-1.5 min-w-0 h-full">
      <p
        className="font-semibold text-sm leading-tight truncate"
        title={student.studentFullName}
      >
        {student.studentFullName}
      </p>
      <span
        className={`self-start text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full border leading-none ${statusBadgeClass(
          pending ? null : student.statusBadge
        )}`}
      >
        {badgeLabel}
      </span>
      <p className="text-[10px] sm:text-xs text-white/60 leading-snug break-words">
        {formatCompactStudentStats(student, { activityLoading })}
      </p>
      <Link
        href={`/teacher/student/${student.studentId}`}
        className="mt-auto w-full rounded border border-amber-400/40 text-amber-300 text-xs font-semibold px-2 py-1.5 hover:bg-amber-500/10 text-center"
      >
        צפייה בדוח
      </Link>
    </li>
  );
}

function statusBadgeClass(badge) {
  switch (badge) {
    case "חזק":
      return "bg-emerald-500/20 text-emerald-200 border-emerald-400/40";
    case "תקין":
      return "bg-sky-500/20 text-sky-200 border-sky-400/40";
    case "במעקב":
      return "bg-amber-500/20 text-amber-200 border-amber-400/40";
    case "צריך חיזוק":
      return "bg-orange-500/20 text-orange-200 border-orange-400/40";
    case "דורש התערבות":
      return "bg-red-500/20 text-red-200 border-red-400/40";
    case "פעילות נמוכה":
    case "אין מספיק נתונים":
      return "bg-white/10 text-white/70 border-white/20";
    default:
      return "bg-white/10 text-white/70 border-white/20";
  }
}

function Modal({ title, onClose, children }) {
  return (
    <OverlayFixed>
      <div className="absolute inset-0 bg-black/70" aria-hidden="true" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <ModalCard>
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button type="button" onClick={onClose} className="text-white/60 text-sm">
              סגור
            </button>
          </div>
          {children}
        </ModalCard>
      </div>
    </OverlayFixed>
  );
}

function classLimitErrorMessage(body) {
  const code = body?.error?.code;
  if (code === "class_student_limit_reached") {
    return "הכיתה הגיעה למגבלת 40 תלמידים. לא ניתן להוסיף עוד תלמידים לכיתה זו.";
  }
  return null;
}

function resolveManageClassIds(classInfo) {
  const fromGroup = (classInfo?.subjectClassIds || []).map((s) => s.classId).filter(Boolean);
  if (fromGroup.length) return fromGroup;
  return classInfo?.primaryClassId || classInfo?.classId ? [classInfo.primaryClassId || classInfo.classId] : [];
}

function ClassManagePanel({ accessToken, classInfo, allStudents, maxStudentsPerClass, onClose, onRefresh }) {
  const manageClassIds = useMemo(() => resolveManageClassIds(classInfo), [classInfo]);
  const primaryClassId = classInfo?.primaryClassId || classInfo?.classId;
  const [className, setClassName] = useState(classInfo?.name || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [members, setMembers] = useState([]);
  const [newStudentName, setNewStudentName] = useState("");
  const [editStudentId, setEditStudentId] = useState(null);
  const [editName, setEditName] = useState("");

  const loadMembers = async () => {
    /** @type {Map<string, Record<string, unknown>>} */
    const merged = new Map();
    for (const cid of manageClassIds) {
      const res = await teacherAuthFetch(accessToken, `/api/teacher/classes/${cid}`);
      const body = await res.json().catch(() => ({}));
      if (res.status !== 200) continue;
      for (const m of body.data?.members || []) {
        if (!merged.has(m.studentId)) {
          merged.set(m.studentId, { ...m, membershipIdsByClass: { [cid]: m.membershipId } });
        } else {
          const row = merged.get(m.studentId);
          row.membershipIdsByClass = { ...row.membershipIdsByClass, [cid]: m.membershipId };
        }
      }
    }
    setMembers([...merged.values()]);
  };

  useEffect(() => {
    if (manageClassIds.length) loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manageClassIds.join(",")]);

  const memberIds = new Set(members.map((m) => m.studentId));
  const addableStudents = allStudents.filter((s) => !memberIds.has(s.studentId));

  const onRenameClass = async () => {
    if (!className.trim()) return;
    setBusy(true);
    setError("");
    const res = await teacherAuthFetch(accessToken, `/api/teacher/classes/${primaryClassId}`, {
      method: "PATCH",
      body: JSON.stringify({ name: className.trim() }),
    });
    setBusy(false);
    if (res.status !== 200) {
      setError("לא ניתן לעדכן את שם הכיתה.");
      return;
    }
    onRefresh();
  };

  const onCreateAndAdd = async () => {
    if (!newStudentName.trim()) return;
    setBusy(true);
    setError("");
    const res = await teacherAuthFetch(accessToken, "/api/teacher/students/create", {
      method: "POST",
      body: JSON.stringify({
        fullName: newStudentName.trim(),
        gradeLevel: classInfo.gradeLevel,
        classId: primaryClassId,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status !== 201) {
      setError(classLimitErrorMessage(body) || "לא ניתן להוסיף תלמיד.");
      return;
    }
    setNewStudentName("");
    await loadMembers();
    onRefresh();
    if (body.data?.loginUsername) {
      window.alert(`תלמיד נוסף.\nשם משתמש: ${body.data.loginUsername}\nPIN: 1234`);
    }
  };

  const onAddExisting = async (studentId) => {
    setBusy(true);
    setError("");
    const res = await teacherAuthFetch(
      accessToken,
      `/api/teacher/classes/${primaryClassId}/members`,
      {
        method: "POST",
        body: JSON.stringify({ studentId }),
      }
    );
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status !== 201) {
      setError(classLimitErrorMessage(body) || "לא ניתן להוסיף את התלמיד לכיתה.");
      return;
    }
    await loadMembers();
    onRefresh();
  };

  const perClassCap =
    maxStudentsPerClass != null && Number.isFinite(maxStudentsPerClass)
      ? maxStudentsPerClass
      : null;
  const atClassCap = perClassCap != null && members.length >= perClassCap;

  const onRemoveFromClass = async (member) => {
    if (!window.confirm("להסיר את התלמיד מהכיתה?")) return;
    setBusy(true);
    setError("");
    const idsByClass = member.membershipIdsByClass || {};
    const pairs = Object.entries(idsByClass);
    if (!pairs.length && member.membershipId && primaryClassId) {
      pairs.push([primaryClassId, member.membershipId]);
    }
    let failed = false;
    for (const [cid, membershipId] of pairs) {
      const res = await teacherAuthFetch(
        accessToken,
        `/api/teacher/classes/${cid}/members/${membershipId}`,
        { method: "DELETE" }
      );
      if (res.status !== 200) failed = true;
    }
    setBusy(false);
    if (failed) {
      setError("לא ניתן להסיר מהכיתה.");
      return;
    }
    await loadMembers();
    onRefresh();
  };

  const onSaveStudentName = async (studentId) => {
    if (!editName.trim()) return;
    setBusy(true);
    const res = await teacherAuthFetch(accessToken, `/api/teacher/students/${studentId}`, {
      method: "PATCH",
      body: JSON.stringify({ fullName: editName.trim() }),
    });
    setBusy(false);
    if (res.status !== 200) {
      setError("לא ניתן לעדכן את שם התלמיד.");
      return;
    }
    setEditStudentId(null);
    await loadMembers();
    onRefresh();
  };

  const onArchiveStudent = async (studentId) => {
    if (!window.confirm("להסיר את התלמיד מרשימת המורה?")) return;
    setBusy(true);
    const res = await teacherAuthFetch(accessToken, `/api/teacher/students/${studentId}/archive`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    setBusy(false);
    if (res.status !== 200) {
      setError("לא ניתן להסיר את התלמיד.");
      return;
    }
    await loadMembers();
    onRefresh();
  };

  return (
    <Modal title="ניהול כיתה" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-white/70 mb-1">שם הכיתה</label>
          <div className="flex flex-wrap gap-2">
            <input
              className="flex-1 min-w-0 rounded bg-black/40 border border-white/20 px-3 py-2 text-sm"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            />
            <button
              type="button"
              disabled={busy}
              onClick={onRenameClass}
              className="shrink-0 rounded bg-amber-500 text-black text-sm font-semibold px-3 py-2 disabled:opacity-60"
            >
              שמור
            </button>
          </div>
        </div>

        <section>
          <h4 className="text-sm font-semibold mb-2">הוספת תלמיד</h4>
          <div className="flex flex-wrap gap-2">
            <input
              className="flex-1 min-w-0 rounded bg-black/40 border border-white/20 px-3 py-2 text-sm"
              placeholder="שם מלא של תלמיד חדש"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
            />
            <button
              type="button"
              disabled={busy || atClassCap}
              onClick={onCreateAndAdd}
              className="shrink-0 rounded bg-emerald-600 text-white text-sm font-semibold px-3 py-2 disabled:opacity-60"
            >
              הוסף
            </button>
          </div>
          {addableStudents.length > 0 ? (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-white/50">תלמידים מקושרים שלא בכיתה:</p>
              {addableStudents.slice(0, 5).map((s) => (
                <div key={s.studentId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{s.studentFullName}</span>
                  <button
                    type="button"
                    disabled={busy || atClassCap}
                    onClick={() => onAddExisting(s.studentId)}
                    className="text-amber-300 text-xs font-semibold shrink-0 disabled:opacity-50"
                  >
                    הוסף לכיתה
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section>
          <h4 className="text-sm font-semibold mb-2">
            תלמידים בכיתה ({members.length}
            {perClassCap != null ? ` / ${perClassCap}` : ""})
          </h4>
          {atClassCap ? (
            <p className="text-sm text-amber-200 mb-2">
              הכיתה הגיעה למגבלת {perClassCap} תלמידים.
            </p>
          ) : null}
          {members.length === 0 ? (
            <p className="text-sm text-white/60">אין תלמידים בכיתה.</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {members.map((m) => (
                <li
                  key={m.studentId}
                  className="rounded-lg border border-white/10 bg-black/30 p-3 space-y-2"
                >
                  {editStudentId === m.studentId ? (
                    <EditRow>
                      <input
                        className="flex-1 min-w-0 rounded bg-black/40 border border-white/20 px-2 py-1.5 text-sm"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onSaveStudentName(m.studentId)}
                        className="text-emerald-300 text-xs font-semibold"
                      >
                        שמור
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditStudentId(null)}
                        className="text-white/50 text-xs"
                      >
                        ביטול
                      </button>
                    </EditRow>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium truncate">
                        {m.studentFullName || m.studentFullNameMasked || "תלמיד"}
                      </span>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <button
                          type="button"
                          className="text-xs text-amber-300"
                          onClick={() => {
                            setEditStudentId(m.studentId);
                            setEditName(m.studentFullName || m.studentFullNameMasked || "");
                          }}
                        >
                          שנה שם
                        </button>
                        <button
                          type="button"
                          className="text-xs text-white/60"
                          onClick={() => onRemoveFromClass(m)}
                        >
                          הסר מהכיתה
                        </button>
                        <button
                          type="button"
                          className="text-xs text-red-300"
                          onClick={() => onArchiveStudent(m.studentId)}
                        >
                          הסר מרשימה
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {error ? (
          <p className="text-red-300 text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

function OverlayFixed({ children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {children}
    </div>
  );
}

function ModalCard({ children }) {
  return (
    <div className="rounded-xl border border-white/15 bg-gray-900 p-5 w-full shadow-xl">
      {children}
    </div>
  );
}

function EditRow({ children }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function rosterFilterLabel(option) {
  return rosterFilterLabelHe(option) || "";
}

function ClassesEmptyState({ accessToken, onCreated }) {
  const [className, setClassName] = useState("כיתה ג׳ - LEO");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onCreateClass = async () => {
    const name = className.trim();
    if (!name) return;
    setBusy(true);
    setError("");
    const res = await teacherAuthFetch(accessToken, "/api/teacher/classes", {
      method: "POST",
      body: JSON.stringify({ name, gradeLevel: "g3" }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status !== 201) {
      setError(body?.error?.message || "לא ניתן ליצור כיתה.");
      return;
    }
    onCreated?.();
  };

  return (
    <section
      className="rounded-xl border border-dashed border-white/20 bg-black/20 p-4 sm:p-5"
      data-testid="teacher-classes-empty-state"
    >
      <h2 className="text-lg font-semibold mb-2">כיתות</h2>
      <p className="text-sm text-white/70 mb-1">{DASHBOARD_NO_CLASSES_TITLE}</p>
      <p className="text-sm text-white/50 mb-4">{DASHBOARD_NO_CLASSES_HINT}</p>
      <label className="block text-sm mb-3">
        <span className="text-white/70">{DASHBOARD_CREATE_CLASS_LABEL}</span>
        <input
          className="mt-1 w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2 text-sm text-right"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          placeholder={DASHBOARD_CREATE_CLASS_PLACEHOLDER}
        />
      </label>
      <button
        type="button"
        disabled={busy || !className.trim()}
        onClick={() => void onCreateClass()}
        className="rounded-lg bg-amber-500 text-black text-sm font-semibold px-4 py-2 disabled:opacity-60"
      >
        {busy ? "יוצר…" : DASHBOARD_CREATE_CLASS_BUTTON}
      </button>
      {error ? (
        <p className="text-red-300 text-sm mt-3" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export default function TeacherDashboardClient({ accessToken, dashboard, activityLoading = false, onLogout, onRefresh }) {
  const [search, setSearch] = useState("");
  const [rosterFilterKey, setRosterFilterKey] = useState(
    () => dashboard?.defaultRosterFilterKey || "all"
  );
  const [filterKey, setFilterKey] = useState("all");
  const [sortKey, setSortKey] = useState("name");
  const [manageClass, setManageClass] = useState(null);

  const rosterFilters = dashboard?.rosterFilters || [];

  const filteredStudents = useMemo(() => {
    let list = filterStudentsByRosterKey(
      dashboard?.students || [],
      rosterFilterKey,
      rosterFilters
    );
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((s) => String(s.studentFullName || "").toLowerCase().includes(q));
    }
    if (filterKey !== "all") {
      list = list.filter((s) => s.statusFilterKey === filterKey);
    }
    list.sort((a, b) => {
      if (sortKey === "name") {
        return String(a.studentFullName || "").localeCompare(String(b.studentFullName || ""), "he");
      }
      if (sortKey === "activity") {
        const pendingA = a.activityPending ? 1 : 0;
        const pendingB = b.activityPending ? 1 : 0;
        if (pendingA !== pendingB) return pendingA - pendingB;
        return (Number(b.totalAnswers) || 0) - (Number(a.totalAnswers) || 0);
      }
      if (sortKey === "status") {
        return (a.statusSortRank || 99) - (b.statusSortRank || 99);
      }
      return 0;
    });
    return list;
  }, [dashboard?.students, rosterFilterKey, rosterFilters, search, filterKey, sortKey]);

  const activeRosterOption = useMemo(
    () => rosterFilters.find((o) => o.key === rosterFilterKey) || null,
    [rosterFilters, rosterFilterKey]
  );

  const displayName = dashboard?.teacher?.displayName;

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xl font-semibold">
            {displayName ? `שלום, ${displayName}` : "שלום, מורה"}
          </p>
          <p className="text-sm text-white/60 mt-1">לוח בקרה — כיתות ותלמידים</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="text-sm px-3 py-1.5 rounded border border-white/20 hover:bg-white/10 shrink-0"
        >
          יציאה
        </button>
      </div>

      <section className="rounded-xl border border-white/15 bg-black/30 p-4 sm:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryStat
            label="תלמידים"
            value={dashboard?.summary?.studentCount ?? 0}
            testId="teacher-dashboard-summary-students"
          />
          <SummaryStat label="כיתות" value={dashboard?.summary?.classCount ?? 0} />
          <div className="col-span-2 flex flex-col justify-center gap-2">
            <p className="text-xs text-white/50 mb-1">נושא/פעילות אחרונה</p>
            <p
              className="text-sm font-medium leading-snug"
              data-testid="teacher-dashboard-latest-subject"
            >
              {activityLoading
                ? "טוען נתוני פעילות…"
                : dashboard?.summary?.latestSubjectLabel || "עדיין אין מספיק נתונים"}
            </p>
            <Link
              href="/teacher/worksheets"
              className="text-sm text-violet-300 hover:underline font-medium w-fit"
              data-testid="teacher-dashboard-worksheets-link"
            >
              דפי עבודה →
            </Link>
            <Link
              href="/teacher/students/activities/new"
              className="text-sm text-emerald-300 hover:underline font-medium w-fit"
              data-testid="teacher-dashboard-private-students-activity-link"
            >
              שלח פעילות לתלמידים פרטיים →
            </Link>
          </div>
        </div>
      </section>

      {(dashboard?.teacherAttentionSignals?.topAttentionStudents || []).length > 0 ? (
        <section
          className="rounded-xl border border-amber-400/25 bg-amber-500/5 p-4 sm:p-5"
          data-testid="teacher-dashboard-attention-signals"
        >
          <h2 className="text-lg font-semibold mb-3">תלמידים הדורשים תשומת לב</h2>
          <ul className="grid gap-2 sm:grid-cols-3">
            {dashboard.teacherAttentionSignals.topAttentionStudents.map((s) => (
              <li
                key={s.studentId}
                className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm flex flex-col gap-1"
              >
                <span className="font-semibold truncate">
                  {formatTeacherAttentionStudentLineHe(
                    s.studentFullNameMasked,
                    s.classDisplayLabel
                  )}
                </span>
                <span className="text-xs text-amber-200">
                  {s.guidanceSeverityTier === "critical"
                    ? "דורש התערבות מיידית"
                    : s.guidanceSeverityTier === "needs_reinforcement"
                      ? "דורש חיזוק"
                      : s.riskLevel === "high"
                        ? "דורש התערבות מיידית"
                        : "כדאי לעקוב"}
                </span>
                {s.topWeakTopicLabelHe ? (
                  <span className="text-white/70 text-xs">{s.topWeakTopicLabelHe}</span>
                ) : null}
                <span className="text-white/50 text-xs">
                  {s.accuracyPct != null ? `${Math.round(s.accuracyPct)}% הצלחה` : ""}
                  {s.totalAnswers ? ` · ${s.totalAnswers} תשובות` : ""}
                </span>
                <Link
                  href={`/teacher/student/${encodeURIComponent(s.studentId)}`}
                  className="text-amber-300 text-xs hover:underline mt-1"
                >
                  צפייה בדוח
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(dashboard?.classes || []).length > 0 ? (
        <section
          className="rounded-xl border border-white/15 bg-black/30 p-4 sm:p-5"
          data-testid="teacher-class-cards-section"
        >
          <h2 className="text-lg font-semibold mb-3">כיתות שלי</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {(dashboard.classes || []).map((c) => {
              const rosterKey = c.physicalGroupKey || c.classId;
              const subjectClasses = (c.subjectClassIds || []).filter((s) => s?.classId);
              const classRouteId =
                subjectClasses[0]?.classId || c.primaryClassId || c.classId;
              const classBase = classRouteId
                ? `/teacher/class/${encodeURIComponent(classRouteId)}`
                : "";
              const studentCount = effectivePhysicalClassStudentCount(c);
              const subjectLinkLabel = (s) =>
                s.subjectLabel || subjectLabelHe(s.subjectFocus) || "כיתה";
              const reportLinks =
                subjectClasses.length > 1
                  ? subjectClasses.map((s) => ({
                      classId: s.classId,
                      href: `/teacher/class/${encodeURIComponent(s.classId)}`,
                      label: `דוח ${subjectLinkLabel(s)}`,
                    }))
                  : classBase
                    ? [
                        {
                          classId: classRouteId,
                          href: classBase,
                          label: "דוח כיתה",
                        },
                      ]
                    : [];
              const activityLinks =
                subjectClasses.length > 1
                  ? subjectClasses.map((s) => ({
                      classId: s.classId,
                      href: `/teacher/class/${encodeURIComponent(s.classId)}/activities/new`,
                      label: `פעילות ${subjectLinkLabel(s)}`,
                    }))
                  : classBase
                    ? [
                        {
                          classId: classRouteId,
                          href: `${classBase}/activities`,
                          label: "פעילויות",
                        },
                      ]
                    : [];
              return (
              <li
                key={rosterKey}
                className={`rounded-lg border p-3 flex flex-col gap-2 ${
                  rosterFilterKey === rosterKey
                    ? "border-amber-400/50 bg-amber-500/10"
                    : "border-white/10 bg-black/20"
                }`}
                data-testid={`teacher-physical-class-card-${rosterKey}`}
              >
                <div>
                  <p className="font-semibold break-words">{c.name}</p>
                  <p className="text-sm text-white/65 mt-1">
                    תלמידים: {studentCount}
                  </p>
                  {c.subjectsLabel ? (
                    <p className="text-sm text-white/55 mt-0.5">מקצועות: {c.subjectsLabel}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setRosterFilterKey(rosterKey)}
                    className="text-xs rounded border border-white/25 px-3 py-1.5 hover:bg-white/10"
                    data-testid={`teacher-roster-filter-class-${rosterKey}`}
                  >
                    הצגת תלמידי הכיתה
                  </button>
                  {reportLinks.map((link) => (
                    <Link
                      key={link.classId}
                      href={link.href}
                      className="text-xs rounded bg-amber-500 text-black font-semibold px-3 py-1.5"
                      data-testid={`teacher-class-report-${link.classId}`}
                    >
                      {link.label}
                    </Link>
                  ))}
                  {activityLinks.map((link) => (
                    <Link
                      key={link.classId}
                      href={link.href}
                      className="text-xs rounded border border-amber-400/40 text-amber-200 px-3 py-1.5 hover:bg-amber-500/10"
                      data-testid={`teacher-class-activities-${link.classId}`}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={() => setManageClass(c)}
                    className="text-xs rounded border border-white/25 px-3 py-1.5 hover:bg-white/10"
                    data-testid={`teacher-class-manage-${rosterKey}`}
                  >
                    ניהול כיתה
                  </button>
                </div>
              </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <ClassesEmptyState accessToken={accessToken} onCreated={onRefresh} />
      )}

      <section data-testid="teacher-student-roster-section">
        <h2 className="text-lg font-semibold mb-1">תלמידים</h2>
        {activeRosterOption && rosterFilterLabel(activeRosterOption) ? (
          <p className="text-sm text-white/60 mb-3" data-testid="teacher-roster-active-label">
            מציג: {rosterFilterLabel(activeRosterOption)}
          </p>
        ) : null}

        {rosterFilters.length > 0 ? (
          <div
            className="flex flex-wrap gap-2 mb-4"
            role="tablist"
            aria-label="סינון רשימת תלמידים"
            data-testid="teacher-roster-filter-tabs"
          >
            {rosterFilters.map((opt) => {
              const tabLabel = rosterFilterLabel(opt);
              if (!tabLabel) return null;
              return (
              <button
                key={opt.key}
                type="button"
                role="tab"
                aria-selected={rosterFilterKey === opt.key}
                onClick={() => setRosterFilterKey(opt.key)}
                className={`text-xs sm:text-sm px-3 py-1.5 rounded-full border transition ${
                  rosterFilterKey === opt.key
                    ? opt.type === "direct"
                      ? "bg-violet-500/25 border-violet-400/50 text-violet-100"
                      : "bg-amber-500/20 border-amber-400/50 text-amber-100"
                    : "border-white/15 text-white/70 hover:bg-white/5"
                }`}
                data-testid={`teacher-roster-tab-${opt.key}`}
              >
                {tabLabel}
              </button>
              );
            })}
          </div>
        ) : null}

        <div className="space-y-3 mb-4">
          <input
            type="search"
            placeholder="חיפוש לפי שם…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2.5 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilterKey(f.key)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  filterKey === f.key
                    ? "bg-amber-500/20 border-amber-400/50 text-amber-100"
                    : "border-white/15 text-white/70 hover:bg-white/5"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-white/50">מיון:</span>
            {SORT_OPTIONS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSortKey(s.key)}
                className={`px-2 py-1 rounded ${
                  sortKey === s.key ? "text-amber-300 font-semibold" : "text-white/60"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <p className="text-white/60 text-sm" data-testid="teacher-roster-empty">
            אין תלמידים להצגה בסינון זה.
          </p>
        ) : (
          <ul className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
            {filteredStudents.map((s) => (
              <StudentDashboardCard
                key={s.studentId}
                student={s}
                activityLoading={activityLoading && !dashboard?.activityLoaded}
              />
            ))}
          </ul>
        )}
      </section>

      {manageClass ? (
        <ClassManagePanel
          accessToken={accessToken}
          classInfo={manageClass}
          allStudents={dashboard?.students || []}
          maxStudentsPerClass={dashboard?.limits?.maxStudentsPerClass ?? null}
          onClose={() => setManageClass(null)}
          onRefresh={onRefresh}
        />
      ) : null}
    </div>
  );
}

function SummaryStat({ label, value, testId }) {
  return (
    <div data-testid={testId}>
      <p className="text-xs text-white/50 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

