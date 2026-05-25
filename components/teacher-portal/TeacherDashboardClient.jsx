import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { teacherAuthFetch } from "../../lib/teacher-portal/teacher-ui.he.js";

const FILTER_OPTIONS = [
  { key: "all", label: "הכל" },
  { key: "struggling", label: "צריכים חיזוק" },
  { key: "low_activity", label: "פעילות נמוכה" },
  { key: "watch", label: "במעקב" },
  { key: "strong", label: "חזקים" },
];

const SORT_OPTIONS = [
  { key: "name", label: "שם" },
  { key: "activity", label: "פעילות אחרונה" },
  { key: "status", label: "מצב לימודי" },
];

function formatCompactStudentStats(student) {
  const sessions = Number(student.totalSessions) || 0;
  const answers = Number(student.totalAnswers) || 0;
  const acc =
    student.accuracy != null && Number.isFinite(Number(student.accuracy))
      ? `${Math.round(Number(student.accuracy))}%`
      : "—";
  return `מפגשים: ${sessions} · תשובות: ${answers} · הצלחה: ${acc}`;
}

function StudentDashboardCard({ student }) {
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
          student.statusBadge
        )}`}
      >
        {student.statusBadge}
      </span>
      <p className="text-[10px] sm:text-xs text-white/60 leading-snug break-words">
        {formatCompactStudentStats(student)}
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
    case "פעילות נמוכה":
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

function ClassManagePanel({ accessToken, classInfo, allStudents, onClose, onRefresh }) {
  const [className, setClassName] = useState(classInfo?.name || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [members, setMembers] = useState([]);
  const [newStudentName, setNewStudentName] = useState("");
  const [editStudentId, setEditStudentId] = useState(null);
  const [editName, setEditName] = useState("");

  const loadMembers = async () => {
    const res = await teacherAuthFetch(
      accessToken,
      `/api/teacher/classes/${classInfo.classId}`
    );
    const body = await res.json().catch(() => ({}));
    if (res.status === 200) {
      setMembers(body.data?.members || []);
    }
  };

  useEffect(() => {
    if (classInfo?.classId) loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classInfo?.classId]);

  const memberIds = new Set(members.map((m) => m.studentId));
  const addableStudents = allStudents.filter((s) => !memberIds.has(s.studentId));

  const onRenameClass = async () => {
    if (!className.trim()) return;
    setBusy(true);
    setError("");
    const res = await teacherAuthFetch(accessToken, `/api/teacher/classes/${classInfo.classId}`, {
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
        classId: classInfo.classId,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status !== 201) {
      setError("לא ניתן להוסיף תלמיד.");
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
      `/api/teacher/classes/${classInfo.classId}/members`,
      {
        method: "POST",
        body: JSON.stringify({ studentId }),
      }
    );
    setBusy(false);
    if (res.status !== 201) {
      setError("לא ניתן להוסיף את התלמיד לכיתה.");
      return;
    }
    await loadMembers();
    onRefresh();
  };

  const onRemoveFromClass = async (membershipId) => {
    if (!window.confirm("להסיר את התלמיד מהכיתה?")) return;
    setBusy(true);
    const res = await teacherAuthFetch(
      accessToken,
      `/api/teacher/classes/${classInfo.classId}/members/${membershipId}`,
      { method: "DELETE" }
    );
    setBusy(false);
    if (res.status !== 200) {
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
              disabled={busy}
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
                    disabled={busy}
                    onClick={() => onAddExisting(s.studentId)}
                    className="text-amber-300 text-xs font-semibold shrink-0"
                  >
                    הוסף לכיתה
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section>
          <h4 className="text-sm font-semibold mb-2">תלמידים בכיתה ({members.length})</h4>
          {members.length === 0 ? (
            <p className="text-sm text-white/60">אין תלמידים בכיתה.</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {members.map((m) => (
                <li
                  key={m.membershipId}
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
                          onClick={() => onRemoveFromClass(m.membershipId)}
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

export default function TeacherDashboardClient({ accessToken, dashboard, onLogout, onRefresh }) {
  const [search, setSearch] = useState("");
  const [filterKey, setFilterKey] = useState("all");
  const [sortKey, setSortKey] = useState("name");
  const [manageClass, setManageClass] = useState(null);

  const primaryClass = useMemo(() => {
    const classes = dashboard?.classes || [];
    return classes.find((c) => c.isPrimary) || classes[0] || null;
  }, [dashboard]);

  const filteredStudents = useMemo(() => {
    let list = [...(dashboard?.students || [])];
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
        return (Number(b.totalAnswers) || 0) - (Number(a.totalAnswers) || 0);
      }
      if (sortKey === "status") {
        return (a.statusSortRank || 99) - (b.statusSortRank || 99);
      }
      return 0;
    });
    return list;
  }, [dashboard?.students, search, filterKey, sortKey]);

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
          <SummaryStat label="תלמידים" value={dashboard?.summary?.studentCount ?? 0} />
          <SummaryStat label="כיתות" value={dashboard?.summary?.classCount ?? 0} />
          <div className="col-span-2">
            <p className="text-xs text-white/50 mb-1">נושא/פעילות אחרונה</p>
            <p className="text-sm font-medium leading-snug">
              {dashboard?.summary?.latestSubjectLabel || "עדיין אין מספיק נתונים"}
            </p>
          </div>
        </div>
        {primaryClass ? (
          <div className="mt-4 pt-4 border-t border-white/10">
            <Link
              href={`/teacher/class/${primaryClass.classId}`}
              className="inline-flex items-center justify-center rounded bg-amber-500 text-black text-sm font-semibold px-4 py-2 w-full sm:w-auto"
            >
              דוח כיתה
            </Link>
          </div>
        ) : null}
      </section>

      {primaryClass ? (
        <section className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-4 sm:p-5">
          <ClassCardRow>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold break-words">{primaryClass.name}</h2>
              <p className="text-sm text-white/70 mt-1">
                {primaryClass.gradeLevelLabel || "כיתה"}
                {" · "}
                {primaryClass.studentCount ?? 0} תלמידים
              </p>
              {primaryClass.latestSubjectLabel ? (
                <p className="text-sm text-white/60 mt-2 break-words">
                  מיקוד אחרון: {primaryClass.latestSubjectLabel}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
              <Link
                href={`/teacher/class/${primaryClass.classId}`}
                className="text-center rounded bg-amber-500 text-black text-sm font-semibold px-4 py-2.5"
              >
                דוח כיתה
              </Link>
              <button
                type="button"
                onClick={() => setManageClass(primaryClass)}
                className="text-center rounded border border-white/25 text-sm font-semibold px-4 py-2.5 hover:bg-white/10"
              >
                ניהול כיתה
              </button>
            </div>
          </ClassCardRow>
        </section>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold mb-3">תלמידים</h2>

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
          <p className="text-white/60 text-sm">לא נמצאו תלמידים לפי הסינון.</p>
        ) : (
          <ul className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
            {filteredStudents.map((s) => (
              <StudentDashboardCard key={s.studentId} student={s} />
            ))}
          </ul>
        )}
      </section>

      {manageClass ? (
        <ClassManagePanel
          accessToken={accessToken}
          classInfo={manageClass}
          allStudents={dashboard?.students || []}
          onClose={() => setManageClass(null)}
          onRefresh={onRefresh}
        />
      ) : null}
    </div>
  );
}

function SummaryStat({ label, value }) {
  return (
    <div>
      <p className="text-xs text-white/50 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function ClassCardRow({ children }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      {children}
    </div>
  );
}
