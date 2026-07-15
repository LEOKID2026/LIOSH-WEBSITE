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
import TeacherInviteOthersButton from "./TeacherInviteOthersButton";
import {
  getTeacherPortalTheme,
  teacherStatusBadgeClass,
} from "../../lib/teacher-ui/teacher-portal-theme.client.js";

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
      : "-";
  return `מפגשים: ${sessions} · תשובות: ${answers} · הצלחה: ${acc}`;
}

function StudentDashboardCard({ student, activityLoading = false, T, bright = false }) {
  const pending = Boolean(student.activityPending || activityLoading);
  const badgeLabel = pending ? "טוען…" : student.statusBadge || "-";

  return (
    <li className={T.studentCard}>
      <p
        className="font-semibold text-sm leading-tight truncate"
        title={student.studentFullName}
      >
        {student.studentFullName}
      </p>
      <span
        className={`self-start text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full border leading-none ${teacherStatusBadgeClass(
          pending ? null : student.statusBadge,
          bright
        )}`}
      >
        {badgeLabel}
      </span>
      <p className={T.studentStats}>
        {formatCompactStudentStats(student, { activityLoading })}
      </p>
      <Link href={`/teacher/student/${student.studentId}`} className={T.studentReportLink}>
        צפייה בדוח
      </Link>
    </li>
  );
}

function Modal({ title, onClose, children, T }) {
  return (
    <OverlayFixed>
      <div className={T.modalOverlay} aria-hidden="true" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <ModalCard T={T}>
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button type="button" onClick={onClose} className={T.modalClose}>
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
    return "הכיתה הגיעה למגבלת 40 ילדים. לא ניתן להוסיף עוד ילדים לכיתה זו.";
  }
  return null;
}

function resolveManageClassIds(classInfo) {
  const fromGroup = (classInfo?.subjectClassIds || []).map((s) => s.classId).filter(Boolean);
  if (fromGroup.length) return fromGroup;
  return classInfo?.primaryClassId || classInfo?.classId ? [classInfo.primaryClassId || classInfo.classId] : [];
}

function ClassManagePanel({
  accessToken,
  classInfo,
  allStudents,
  maxStudentsPerClass,
  onClose,
  onRefresh,
  T,
}) {
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
      setError(classLimitErrorMessage(body) || "לא ניתן להוסיף ילד/ה.");
      return;
    }
    setNewStudentName("");
    await loadMembers();
    onRefresh();
    if (body.data?.loginUsername) {
      window.alert(`ילד/ה נוסף.\nשם משתמש: ${body.data.loginUsername}\nPIN: 1234`);
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
      setError(classLimitErrorMessage(body) || "לא ניתן להוסיף את הילד/ה לכיתה.");
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
    if (!window.confirm("להסיר את הילד/ה מהכיתה?")) return;
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
      setError("לא ניתן לעדכן את שם הילד/ה.");
      return;
    }
    setEditStudentId(null);
    await loadMembers();
    onRefresh();
  };

  const onArchiveStudent = async (studentId) => {
    if (!window.confirm("להסיר את הילד/ה מרשימת המורה?")) return;
    setBusy(true);
    const res = await teacherAuthFetch(accessToken, `/api/teacher/students/${studentId}/archive`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    setBusy(false);
    if (res.status !== 200) {
      setError("לא ניתן להסיר את הילד/ה.");
      return;
    }
    await loadMembers();
    onRefresh();
  };

  return (
    <Modal title="ניהול כיתה" onClose={onClose} T={T}>
      <div className="space-y-4">
        <div>
          <label className={T.label}>שם הכיתה</label>
          <div className="flex flex-wrap gap-2">
            <input
              className={T.input}
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            />
            <button
              type="button"
              disabled={busy}
              onClick={onRenameClass}
              className={T.primaryBtn}
            >
              שמור
            </button>
          </div>
        </div>

        <section>
          <h4 className="text-sm font-semibold mb-2">הוספת ילד/ה</h4>
          <div className="flex flex-wrap gap-2">
            <input
              className={T.input}
              placeholder="שם מלא של ילד/ה חדש"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
            />
            <button
              type="button"
              disabled={busy || atClassCap}
              onClick={onCreateAndAdd}
              className={T.emeraldBtn}
            >
              הוסף
            </button>
          </div>
          {addableStudents.length > 0 ? (
            <div className="mt-2 space-y-1">
              <p className={`text-xs ${T.faint}`}>ילדים מקושרים שלא בכיתה:</p>
              {addableStudents.slice(0, 5).map((s) => (
                <div key={s.studentId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{s.studentFullName}</span>
                  <button
                    type="button"
                    disabled={busy || atClassCap}
                    onClick={() => onAddExisting(s.studentId)}
                    className={`${T.ghostLink} disabled:opacity-50`}
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
            ילדים בכיתה ({members.length}
            {perClassCap != null ? ` / ${perClassCap}` : ""})
          </h4>
          {atClassCap ? <p className={T.warningText}>הכיתה הגיעה למגבלת {perClassCap} ילדים.</p> : null}
          {members.length === 0 ? (
            <p className={T.muted}>אין ילדים בכיתה.</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {members.map((m) => (
                <li key={m.studentId} className={T.panelListItem}>
                  {editStudentId === m.studentId ? (
                    <EditRow>
                      <input
                        className={T.inputSm}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onSaveStudentName(m.studentId)}
                        className={T.successLink}
                      >
                        שמור
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditStudentId(null)}
                        className={T.mutedLink}
                      >
                        ביטול
                      </button>
                    </EditRow>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium truncate">
                        {m.studentFullName || m.studentFullNameMasked || "ילד/ה"}
                      </span>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <button
                          type="button"
                          className={T.ghostLink}
                          onClick={() => {
                            setEditStudentId(m.studentId);
                            setEditName(m.studentFullName || m.studentFullNameMasked || "");
                          }}
                        >
                          שנה שם
                        </button>
                        <button
                          type="button"
                          className={T.mutedLink}
                          onClick={() => onRemoveFromClass(m)}
                        >
                          הסר מהכיתה
                        </button>
                        <button
                          type="button"
                          className={T.dangerLink}
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
          <p className={T.error} role="alert">
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

function ModalCard({ children, T }) {
  return <div className={T.modalPanel}>{children}</div>;
}

function EditRow({ children }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function rosterFilterLabel(option) {
  return rosterFilterLabelHe(option) || "";
}

function ClassesEmptyState({ accessToken, onCreated, T }) {
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
    <section className={T.emptySection} data-testid="teacher-classes-empty-state">
      <h2 className="text-lg font-semibold mb-2">כיתות</h2>
      <p className={`text-sm mb-1 ${T.muted}`}>{DASHBOARD_NO_CLASSES_TITLE}</p>
      <p className={`text-sm mb-4 ${T.faint}`}>{DASHBOARD_NO_CLASSES_HINT}</p>
      <label className="block text-sm mb-3">
        <span className={T.emptyLabel}>{DASHBOARD_CREATE_CLASS_LABEL}</span>
        <input
          className={T.emptyInput}
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          placeholder={DASHBOARD_CREATE_CLASS_PLACEHOLDER}
        />
      </label>
      <button
        type="button"
        disabled={busy || !className.trim()}
        onClick={() => void onCreateClass()}
        className={T.primaryBtn}
      >
        {busy ? "יוצר…" : DASHBOARD_CREATE_CLASS_BUTTON}
      </button>
      {error ? (
        <p className={`${T.error} mt-3`} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export default function TeacherDashboardClient({
  accessToken,
  dashboard,
  activityLoading = false,
  onLogout,
  onRefresh,
  bright = false,
}) {
  const T = getTeacherPortalTheme(bright);
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
          <p className={`text-xl font-semibold ${T.heading}`}>
            {displayName ? `שלום, ${displayName}` : "שלום, מורה"}
          </p>
          <p className={`text-sm mt-1 ${T.subheading}`}>לוח בקרה - כיתות וילדים</p>
        </div>
        <button type="button" onClick={onLogout} className={T.logoutBtn}>
          יציאה
        </button>
      </div>

      <section className={T.section}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryStat
            label="ילדים"
            value={dashboard?.summary?.studentCount ?? 0}
            testId="teacher-dashboard-summary-students"
            T={T}
          />
          <SummaryStat label="כיתות" value={dashboard?.summary?.classCount ?? 0} T={T} />
          <div className="col-span-2 flex flex-col justify-center gap-2">
            <p className={`text-xs mb-1 ${T.faint}`}>נושא/פעילות אחרונה</p>
            <p
              className={`text-sm font-medium leading-snug ${T.heading}`}
              data-testid="teacher-dashboard-latest-subject"
            >
              {activityLoading
                ? "טוען נתוני פעילות…"
                : dashboard?.summary?.latestSubjectLabel || "עדיין אין מספיק נתונים"}
            </p>
            <Link
              href="/teacher/worksheets"
              className={T.linkViolet}
              data-testid="teacher-dashboard-worksheets-link"
            >
              דפי עבודה →
            </Link>
            <Link
              href="/teacher/students/activities/new"
              className={T.linkEmerald}
              data-testid="teacher-dashboard-private-students-activity-link"
            >
              שלח פעילות לילדים פרטיים →
            </Link>
          </div>
        </div>
      </section>

      {(dashboard?.teacherAttentionSignals?.topAttentionStudents || []).length > 0 ? (
        <section className={T.attentionSection} data-testid="teacher-dashboard-attention-signals">
          <h2 className={`text-lg font-semibold mb-3 ${T.heading}`}>ילדים הדורשים תשומת לב</h2>
          <ul className="grid gap-2 sm:grid-cols-3">
            {dashboard.teacherAttentionSignals.topAttentionStudents.map((s) => (
              <li key={s.studentId} className={T.attentionCard}>
                <span className="font-semibold truncate">
                  {formatTeacherAttentionStudentLineHe(
                    s.studentFullNameMasked,
                    s.classDisplayLabel
                  )}
                </span>
                <span className={T.attentionSeverity}>
                  {s.guidanceSeverityTier === "critical"
                    ? "דורש התערבות מיידית"
                    : s.guidanceSeverityTier === "needs_reinforcement"
                      ? "דורש חיזוק"
                      : s.riskLevel === "high"
                        ? "דורש התערבות מיידית"
                        : "כדאי לעקוב"}
                </span>
                {s.topWeakTopicLabelHe ? (
                  <span className={T.attentionTopic}>{s.topWeakTopicLabelHe}</span>
                ) : null}
                <span className={T.attentionMeta}>
                  {s.accuracyPct != null ? `${Math.round(s.accuracyPct)}% הצלחה` : ""}
                  {s.totalAnswers ? ` · ${s.totalAnswers} תשובות` : ""}
                </span>
                <Link
                  href={`/teacher/student/${encodeURIComponent(s.studentId)}`}
                  className={T.attentionLink}
                >
                  צפייה בדוח
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(dashboard?.classes || []).length > 0 ? (
        <section className={T.classSection} data-testid="teacher-class-cards-section">
          <h2 className={`text-lg font-semibold mb-3 ${T.heading}`}>כיתות שלי</h2>
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
                  className={
                    rosterFilterKey === rosterKey ? T.classCardActive : T.classCard
                  }
                  data-testid={`teacher-physical-class-card-${rosterKey}`}
                >
                  <div>
                    <p className="font-semibold break-words">{c.name}</p>
                    <p className={T.classMeta}>ילדים: {studentCount}</p>
                    {c.subjectsLabel ? (
                      <p className={T.classSubjects}>מקצועות: {c.subjectsLabel}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setRosterFilterKey(rosterKey)}
                      className={T.secondaryBtn}
                      data-testid={`teacher-roster-filter-class-${rosterKey}`}
                    >
                      הצגת ילדי הכיתה
                    </button>
                    {reportLinks.map((link) => (
                      <Link
                        key={link.classId}
                        href={link.href}
                        className={T.amberReportBtn}
                        data-testid={`teacher-class-report-${link.classId}`}
                      >
                        {link.label}
                      </Link>
                    ))}
                    {activityLinks.map((link) => (
                      <Link
                        key={link.classId}
                        href={link.href}
                        className={T.amberOutlineBtn}
                        data-testid={`teacher-class-activities-${link.classId}`}
                      >
                        {link.label}
                      </Link>
                    ))}
                    <button
                      type="button"
                      onClick={() => setManageClass(c)}
                      className={T.secondaryBtn}
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
        <ClassesEmptyState accessToken={accessToken} onCreated={onRefresh} T={T} />
      )}

      <section data-testid="teacher-student-roster-section">
        <h2 className={`text-lg font-semibold mb-1 ${T.heading}`}>ילדים</h2>
        {activeRosterOption && rosterFilterLabel(activeRosterOption) ? (
          <p className={`text-sm mb-3 ${T.muted}`} data-testid="teacher-roster-active-label">
            מציג: {rosterFilterLabel(activeRosterOption)}
          </p>
        ) : null}

        {rosterFilters.length > 0 ? (
          <div
            className="flex flex-wrap gap-2 mb-4"
            role="tablist"
            aria-label="סינון רשימת ילדים"
            data-testid="teacher-roster-filter-tabs"
          >
            {rosterFilters.map((opt) => {
              const tabLabel = rosterFilterLabel(opt);
              if (!tabLabel) return null;
              const isActive = rosterFilterKey === opt.key;
              const activeClass =
                opt.type === "direct" ? T.rosterTabActiveDirect : T.rosterTabActiveClass;
              return (
                <button
                  key={opt.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setRosterFilterKey(opt.key)}
                  className={isActive ? activeClass : T.rosterTabIdle}
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
            className={T.searchInput}
          />
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilterKey(f.key)}
                className={filterKey === f.key ? T.filterChipActive : T.filterChipIdle}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={T.faint}>מיון:</span>
            {SORT_OPTIONS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSortKey(s.key)}
                className={sortKey === s.key ? T.sortActive : T.sortIdle}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <p className={T.emptyHint} data-testid="teacher-roster-empty">
            אין ילדים להצגה בסינון זה.
          </p>
        ) : (
          <ul className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
            {filteredStudents.map((s) => (
              <StudentDashboardCard
                key={s.studentId}
                student={s}
                activityLoading={activityLoading && !dashboard?.activityLoaded}
                T={T}
                bright={bright}
              />
            ))}
          </ul>
        )}
      </section>

      <TeacherInviteOthersButton bright={bright} />

      {manageClass ? (
        <ClassManagePanel
          accessToken={accessToken}
          classInfo={manageClass}
          allStudents={dashboard?.students || []}
          maxStudentsPerClass={dashboard?.limits?.maxStudentsPerClass ?? null}
          onClose={() => setManageClass(null)}
          onRefresh={onRefresh}
          T={T}
        />
      ) : null}
    </div>
  );
}

function SummaryStat({ label, value, testId, T }) {
  return (
    <div data-testid={testId}>
      <p className={T.statLabel}>{label}</p>
      <p className={T.statValue}>{value}</p>
    </div>
  );
}

