import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../components/Layout";
import ParentPolicyAcceptanceGate from "../../components/parent/ParentPolicyAcceptanceGate";
import AssignActivityModal from "../../components/parent/AssignActivityModal";
import ParentDashboardModal from "../../components/parent/ParentDashboardModal";
import ParentSentActivitiesPanel from "../../components/parent/ParentSentActivitiesPanel";
import { getLearningSupabaseBrowserClient } from "../../lib/learning-supabase/client";
import { shouldDisplayStudentAccessCode } from "../../lib/teacher-portal/student-access-display.js";

const GRADE_OPTIONS = [
  { value: "grade_1", label: "כיתה א׳" },
  { value: "grade_2", label: "כיתה ב׳" },
  { value: "grade_3", label: "כיתה ג׳" },
  { value: "grade_4", label: "כיתה ד׳" },
  { value: "grade_5", label: "כיתה ה׳" },
  { value: "grade_6", label: "כיתה ו׳" },
];

function gradeLabelFromValue(value) {
  return GRADE_OPTIONS.find((g) => g.value === value)?.label || value || "—";
}

/** Neutral action buttons on child cards — responsive sizing, no per-action colors */
const CHILD_CARD_ACTION_CLASS =
  "flex-1 min-w-0 inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] " +
  "px-2 py-2 text-xs font-medium text-white/85 text-center " +
  "sm:text-sm sm:py-2.5 " +
  "md:px-3 md:py-2.5 md:min-h-[42px] md:text-sm " +
  "hover:bg-white/[0.07] hover:border-white/25 transition disabled:opacity-60 leading-snug";

function normalizeBalance(student) {
  const rel = student?.student_coin_balances;
  if (Array.isArray(rel)) return rel[0] || null;
  return rel || null;
}

/**
 * Default per-parent cap. The authoritative cap is decided server-side
 * (see lib/parent-server/parent-student-limit.server.js) and returned by
 * /api/parent/list-students as `studentLimit`. We keep this constant as
 * a safe fallback so the UI never accidentally allows more than 3 when
 * the API response is missing the field (e.g. older cached deploys).
 */
const MAX_CHILDREN_DEFAULT = 3;

export default function ParentDashboardPage() {
  const router = useRouter();
  const supabaseRef = useRef(null);

  const [session, setSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentLimit, setStudentLimit] = useState(MAX_CHILDREN_DEFAULT);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [clientReady, setClientReady] = useState(false);

  const [newName, setNewName] = useState("");
  const [newGrade, setNewGrade] = useState("");
  const [credentialsByStudentId, setCredentialsByStudentId] = useState({});
  /** One-time display after creating or resetting credentials (new PIN shown once). */
  const [credentialConfirmation, setCredentialConfirmation] = useState(null);

  const [editById, setEditById] = useState({});
  const [deleteModalStudent, setDeleteModalStudent] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [activityModalStudent, setActivityModalStudent] = useState(null);
  const [addChildModalOpen, setAddChildModalOpen] = useState(false);
  const [detailsModalStudent, setDetailsModalStudent] = useState(null);
  const [sentActivitiesRefresh, setSentActivitiesRefresh] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!supabaseRef.current) {
      supabaseRef.current = getLearningSupabaseBrowserClient();
    }
    setClientReady(true);
  }, []);

  const fetchStudents = useCallback(async (activeSession) => {
    if (!activeSession?.access_token) return;

    try {
      const res = await fetch("/api/parent/list-students", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${activeSession.access_token}`,
        },
      });
      const payload = await res.json();
      if (!res.ok) {
        const code = payload?.error || payload?.errorCode;
        if (res.status === 403 && code === "not_a_parent") {
          // Session is valid; policy gate / entitlement heal handles provisioning.
          return;
        }
        setMessage(payload.error || "Failed to load students");
        return;
      }
      setStudents(payload.students || []);
      // The API returns the resolved cap for the authenticated parent
      // (3 by default; QA allowlist may raise it). Fall back to the
      // hardcoded default if the field is missing so we never allow
      // more than 3 by mistake.
      const apiLimit = Number(payload?.studentLimit);
      setStudentLimit(
        Number.isFinite(apiLimit) && apiLimit >= MAX_CHILDREN_DEFAULT
          ? apiLimit
          : MAX_CHILDREN_DEFAULT
      );
      setMessage("");
    } catch (_err) {
      setMessage("Network error while loading students");
    }
  }, [router]);

  useEffect(() => {
    if (!clientReady || !supabaseRef.current) return;
    const supabase = supabaseRef.current;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const s = data?.session || null;
      setSession(s);
      if (!s) {
        router.replace("/parent/login");
        return;
      }
      fetchStudents(s);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession || null);
      if (!newSession) {
        router.replace("/parent/login");
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [clientReady, router]);

  const createStudent = async (e) => {
    e.preventDefault();
    if (!session?.access_token) return;
    if (students.length >= studentLimit) {
      setMessage(`ניתן להוסיף עד ${studentLimit} ילדים בלבד לחשבון הורה`);
      return;
    }
    if (!newGrade) {
      setMessage("יש לבחור כיתה");
      return;
    }
    setBusy(true);
    setMessage("");

    const res = await fetch("/api/parent/create-student", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        fullName: newName,
        gradeLevel: newGrade,
      }),
    });
    const payload = await res.json();

    if (!res.ok) {
      setMessage(payload.error || "Failed to create student");
    } else {
      setNewName("");
      setNewGrade("");
      setAddChildModalOpen(false);
      await fetchStudents(session);
      setMessage("Student created.");
    }
    setBusy(false);
  };

  const saveStudent = async (studentId) => {
    if (!session?.access_token) return;
    const edit = editById[studentId];
    if (!edit) return;

    setBusy(true);
    setMessage("");

    const res = await fetch("/api/parent/update-student", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        studentId,
        fullName: edit.fullName,
        gradeLevel: edit.gradeLevel,
        isActive: edit.isActive,
      }),
    });
    const payload = await res.json();

    if (!res.ok) {
      setMessage(payload.error || "Failed to update student");
    } else {
      await fetchStudents(session);
      setMessage("Student updated.");
    }
    setBusy(false);
  };

  const saveStudentCredentials = async (studentId, childFullName) => {
    if (!session?.access_token) return;
    const form = credentialsByStudentId[studentId] || {};
    const username = String(form.username || "").trim();
    const pin = String(form.pin || "").trim();

    if (!username || !pin) {
      setMessage("יש להזין שם משתמש ו-PIN");
      return;
    }

    if (
      process.env.NODE_ENV !== "production" &&
      process.env.NEXT_PUBLIC_DEBUG_STUDENT_IDENTITY === "true"
    ) {
      console.log("[parent-dashboard] saving credentials", {
        studentId,
        childName: childFullName ?? "",
        username,
      });
    }

    setBusy(true);
    setMessage("");

    const res = await fetch("/api/parent/create-student-access-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ studentId, username, pin }),
    });
    const payload = await res.json();
    if (!res.ok) {
      setMessage(payload.error || "שמירת פרטי כניסה נכשלה");
    } else {
      setCredentialConfirmation({
        studentId,
        username: payload.username || username,
        pin,
      });
      setCredentialsByStudentId((prev) => ({
        ...prev,
        [studentId]: { ...(prev[studentId] || {}), username: "", pin: "" },
      }));
      setMessage("");
      await fetchStudents(session);
    }
    setBusy(false);
  };

  const savePinReset = async (studentId, loginUsername, childFullName) => {
    if (!session?.access_token) return;
    const pin = String(credentialsByStudentId[studentId]?.pin || "").trim();
    if (!loginUsername) {
      setMessage("חסר שם משתמש לכרטיס");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setMessage("יש להזין PIN חדש בארבע ספרות");
      return;
    }

    if (
      process.env.NODE_ENV !== "production" &&
      process.env.NEXT_PUBLIC_DEBUG_STUDENT_IDENTITY === "true"
    ) {
      console.log("[parent-dashboard] resetting PIN", {
        studentId,
        childName: childFullName ?? "",
        username: loginUsername,
      });
    }

    setBusy(true);
    setMessage("");

    const res = await fetch("/api/parent/create-student-access-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ studentId, username: loginUsername, pin }),
    });
    const payload = await res.json();
    if (!res.ok) {
      setMessage(payload.error || "שינוי ה-PIN נכשל");
    } else {
      setCredentialConfirmation({
        studentId,
        username: payload.username || loginUsername,
        pin,
      });
      setCredentialsByStudentId((prev) => ({
        ...prev,
        [studentId]: { ...(prev[studentId] || {}), pin: "" },
      }));
      setMessage("");
      await fetchStudents(session);
    }
    setBusy(false);
  };

  const confirmDeleteStudent = async () => {
    if (!session?.access_token || !deleteModalStudent) return;
    const expected = String(deleteModalStudent.full_name || "").trim();
    if (String(deleteConfirmName).trim() !== expected) return;

    const deletedId = deleteModalStudent.id;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/parent/delete-student", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ studentId: deletedId }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setMessage(payload.error || "מחיקה נכשלה");
      } else {
        setDeleteModalStudent(null);
        setDeleteConfirmName("");
        if (detailsModalStudent?.id === deletedId) {
          setDetailsModalStudent(null);
        }
        setCredentialConfirmation((prev) => (prev?.studentId === deletedId ? null : prev));
        setEditById((prev) => {
          const next = { ...prev };
          delete next[deletedId];
          return next;
        });
        setCredentialsByStudentId((prev) => {
          const next = { ...prev };
          delete next[deletedId];
          return next;
        });
        await fetchStudents(session);
        setMessage("הילד נמחק לצמיתות");
      }
    } catch (_err) {
      setMessage("שגיאת רשת במחיקה");
    }
    setBusy(false);
  };

  const copyUsername = async (username) => {
    try {
      await navigator.clipboard.writeText(username);
      setMessage("שם המשתמש הועתק ללוח");
    } catch (_e) {
      setMessage("לא ניתן להעתיק אוטומטית — העתיקו ידנית");
    }
  };

  const logout = async () => {
    if (!supabaseRef.current) {
      router.push("/parent/login");
      return;
    }
    const supabase = supabaseRef.current;
    await supabase.auth.signOut();
    router.push("/parent/login");
  };

  const openDetailsModal = (student) => {
    setDetailsModalStudent(student);
    setEditById((prev) => {
      if (prev[student.id]) return prev;
      return {
        ...prev,
        [student.id]: {
          fullName: student.full_name || "",
          gradeLevel: student.grade_level || "",
          isActive: Boolean(student.is_active),
        },
      };
    });
  };

  const renderAddChildForm = () => (
    <form
      onSubmit={createStudent}
      className={`space-y-2 ${students.length >= studentLimit ? "opacity-60" : ""}`}
    >
      <p className="text-sm text-white/75">
        ילדים בחשבון: {students.length} / {studentLimit}
      </p>
      {students.length >= studentLimit ? (
        <p className="text-sm text-amber-200">{`הגעת למגבלת ${studentLimit} ילדים לחשבון`}</p>
      ) : null}
      <input
        className="w-full rounded bg-black/40 border border-white/20 px-3 py-2 disabled:opacity-50"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        placeholder="שם הילד"
        required
        disabled={busy || students.length >= studentLimit}
      />
      <select
        className="w-full rounded bg-black/40 border border-white/20 px-3 py-2 disabled:opacity-50"
        value={newGrade}
        onChange={(e) => setNewGrade(e.target.value)}
        required
        disabled={busy || students.length >= studentLimit}
      >
        <option value="">בחר כיתה</option>
        {GRADE_OPTIONS.map((g) => (
          <option key={g.value} value={g.value}>
            {g.label}
          </option>
        ))}
      </select>
      <button
        className="w-full rounded bg-amber-500 text-black px-3 py-2 font-semibold disabled:opacity-60"
        disabled={busy || students.length >= studentLimit}
      >
        הוסף ילד
      </button>
    </form>
  );

  const renderChildDetailsContent = (student) => {
    const edit = editById[student.id] || {
      fullName: student.full_name || "",
      gradeLevel: student.grade_level || "",
      isActive: Boolean(student.is_active),
    };
    const balance = normalizeBalance(student);
    const loginUsername = student.login_username || null;
    const visibleLoginUsername = shouldDisplayStudentAccessCode(loginUsername)
      ? loginUsername
      : null;
    const hasHiddenDemoAccess = Boolean(loginUsername && !visibleLoginUsername);
    const showConfirmationHere =
      credentialConfirmation && credentialConfirmation.studentId === student.id;

    return (
      <div className="space-y-3">
        <input
          className="w-full rounded bg-black/40 border border-white/20 px-3 py-2"
          value={edit.fullName}
          onChange={(e) =>
            setEditById((prev) => ({
              ...prev,
              [student.id]: { ...edit, fullName: e.target.value },
            }))
          }
        />
        <select
          className="w-full rounded bg-black/40 border border-white/20 px-3 py-2"
          value={edit.gradeLevel}
          onChange={(e) =>
            setEditById((prev) => ({
              ...prev,
              [student.id]: { ...edit, gradeLevel: e.target.value },
            }))
          }
        >
          <option value="">בחר כיתה</option>
          {GRADE_OPTIONS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={edit.isActive}
            onChange={(e) =>
              setEditById((prev) => ({
                ...prev,
                [student.id]: { ...edit, isActive: e.target.checked },
              }))
            }
          />
          פעיל
        </label>
        <div className="text-sm text-white/80">יתרת מטבעות: {balance ? balance.balance : 0}</div>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            className="rounded bg-amber-500 text-black px-3 py-2 font-semibold disabled:opacity-60"
            disabled={busy}
            onClick={() => saveStudent(student.id)}
            type="button"
          >
            שמור
          </button>
          <button
            type="button"
            className="rounded border border-red-500/60 text-red-300 px-3 py-2 text-sm disabled:opacity-60 hover:bg-red-950/40"
            disabled={busy}
            onClick={() => {
              setDeleteConfirmName("");
              setDeleteModalStudent({
                id: student.id,
                full_name: student.full_name || "",
              });
            }}
          >
            מחיקת ילד
          </button>
        </div>

        <div className="rounded border border-white/15 p-3 bg-black/30 space-y-3">
          <div className="font-semibold">פרטי כניסת תלמיד</div>

          {showConfirmationHere ? (
            <div className="rounded border border-emerald-500/40 bg-emerald-950/40 p-3 space-y-2 text-sm">
              <div className="font-semibold text-emerald-200">
                חשוב לשמור את הפרטים — ה-PIN לא יוצג שוב.
              </div>
              <div>
                שם משתמש: <strong className="text-white">{credentialConfirmation.username}</strong>
              </div>
              <div>
                PIN חדש: <strong className="text-white">{credentialConfirmation.pin}</strong>
              </div>
              <button
                type="button"
                className="rounded bg-white/15 px-3 py-1 text-xs"
                onClick={() => setCredentialConfirmation(null)}
              >
                סגירה
              </button>
            </div>
          ) : null}

          {visibleLoginUsername ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span>
                  שם משתמש: <strong className="text-white">{visibleLoginUsername}</strong>
                </span>
                <button
                  type="button"
                  className="rounded bg-white/10 px-2 py-1 text-xs"
                  onClick={() => copyUsername(visibleLoginUsername)}
                >
                  העתק שם משתמש
                </button>
              </div>
              <div className="text-sm">
                PIN: {student.has_active_access_code ? "מוגדר" : "לא מוגדר"}
              </div>
              <div>
                <label className="text-sm text-white/80">PIN חדש (איפוס / שינוי)</label>
                <input
                  className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
                  value={credentialsByStudentId[student.id]?.pin || ""}
                  onChange={(e) =>
                    setCredentialsByStudentId((prev) => ({
                      ...prev,
                      [student.id]: {
                        ...(prev[student.id] || {}),
                        pin: e.target.value.replace(/\D/g, "").slice(0, 4),
                      },
                    }))
                  }
                  placeholder="4 ספרות"
                  inputMode="numeric"
                  type="password"
                  autoComplete="new-password"
                  maxLength={4}
                />
              </div>
              <button
                className="rounded bg-sky-400 text-black px-3 py-2 font-semibold disabled:opacity-60"
                disabled={busy}
                onClick={() => savePinReset(student.id, visibleLoginUsername, student.full_name)}
                type="button"
              >
                איפוס PIN / שינוי PIN
              </button>
            </div>
          ) : hasHiddenDemoAccess ? (
            <div className="space-y-2">
              <div className="text-sm text-white/80">כניסת תלמיד פעילה</div>
              <div className="text-sm">
                PIN: {student.has_active_access_code ? "מוגדר" : "לא מוגדר"}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-amber-200/95">שם משתמש: טרם נקבע שם משתמש</div>
              <div className="text-sm">
                PIN: {student.has_active_access_code ? "מוגדר" : "לא מוגדר"}
              </div>
              <p className="text-xs text-white/60">
                יש להגדיר שם משתמש ו-PIN לכניסת התלמיד. אם כבר קיימת כניסה ישנה, הגדרה זו תחליף אותה.
              </p>
              <div>
                <label className="text-sm text-white/80">שם משתמש לתלמיד</label>
                <input
                  className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
                  value={credentialsByStudentId[student.id]?.username || ""}
                  onChange={(e) =>
                    setCredentialsByStudentId((prev) => ({
                      ...prev,
                      [student.id]: {
                        ...(prev[student.id] || {}),
                        username: e.target.value,
                      },
                    }))
                  }
                  placeholder="לדוגמה: noam123"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="text-sm text-white/80">PIN לתלמיד</label>
                <input
                  className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
                  value={credentialsByStudentId[student.id]?.pin || ""}
                  onChange={(e) =>
                    setCredentialsByStudentId((prev) => ({
                      ...prev,
                      [student.id]: {
                        ...(prev[student.id] || {}),
                        pin: e.target.value.replace(/\D/g, "").slice(0, 4),
                      },
                    }))
                  }
                  placeholder="4 ספרות"
                  inputMode="numeric"
                  type="password"
                  autoComplete="new-password"
                  maxLength={4}
                />
              </div>
              <button
                className="rounded bg-sky-400 text-black px-3 py-2 font-semibold disabled:opacity-60"
                disabled={busy}
                onClick={() => saveStudentCredentials(student.id, student.full_name)}
                type="button"
              >
                קביעת שם משתמש ו-PIN
              </button>
            </div>
          )}
        </div>

        {session?.access_token ? (
          <ParentSentActivitiesPanel
            studentId={student.id}
            accessToken={session.access_token}
            refreshKey={sentActivitiesRefresh}
          />
        ) : null}
      </div>
    );
  };

  if (!session) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-3 py-4 text-sm text-white/70">בודק התחברות הורה...</div>
      </Layout>
    );
  }

  const detailsStudent = detailsModalStudent
    ? students.find((s) => s.id === detailsModalStudent.id) || detailsModalStudent
    : null;

  return (
    <Layout>
      <ParentPolicyAcceptanceGate
        accessToken={session.access_token}
        onLogout={logout}
        onReady={() => fetchStudents(session)}
      >
      <div className="max-w-6xl mx-auto w-full px-3 py-3 md:px-8 md:py-8 space-y-4 md:space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 md:gap-y-3">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold leading-tight">דשבורד הורים</h1>
            <p className="text-white/60 text-sm truncate mt-1">{session.user?.email}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setAddChildModalOpen(true)}
              className="rounded-lg bg-amber-500 text-black px-3 py-2 md:px-4 md:py-2.5 text-sm font-semibold hover:bg-amber-400 transition"
            >
              הוספת ילד
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 md:px-4 md:py-2.5 text-sm text-white/80 hover:bg-white/[0.07] hover:border-white/25 transition"
            >
              יציאה
            </button>
          </div>
        </div>

        {message ? <p className="text-sm text-white/75 leading-relaxed">{message}</p> : null}

        <section>
          {students.length === 0 ? (
            <p className="text-sm text-white/60">עדיין לא נוספו ילדים</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 md:gap-5">
              {students.map((student) => {
                const displayName = student.full_name || "ילד";
                const gradeLabel = gradeLabelFromValue(student.grade_level);
                const reportHref = `/learning/parent-report?studentId=${encodeURIComponent(student.id)}&source=parent`;

                return (
                  <div
                    key={student.id}
                    className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5 md:p-5 md:min-h-[168px] flex flex-col justify-between gap-3 md:gap-4"
                  >
                    <div className="min-w-0">
                      <h3 className="font-bold text-base md:text-lg text-white truncate">
                        {displayName}
                      </h3>
                      <p className="text-sm text-white/55 mt-1">{gradeLabel}</p>
                    </div>
                    <div className="flex gap-2 md:gap-2.5">
                      <Link
                        href={reportHref}
                        prefetch={false}
                        className={CHILD_CARD_ACTION_CLASS}
                      >
                        דוח הורים
                      </Link>
                      <button
                        type="button"
                        className={CHILD_CARD_ACTION_CLASS}
                        disabled={busy}
                        onClick={() =>
                          setActivityModalStudent({
                            id: student.id,
                            full_name: student.full_name,
                            grade_level: student.grade_level,
                          })
                        }
                      >
                        פעילות
                      </button>
                      <button
                        type="button"
                        className={CHILD_CARD_ACTION_CLASS}
                        disabled={busy}
                        onClick={() => openDetailsModal(student)}
                      >
                        פרטים
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <ParentDashboardModal
          open={addChildModalOpen}
          title="הוספת ילד"
          onClose={() => setAddChildModalOpen(false)}
          size="md"
        >
          {renderAddChildForm()}
        </ParentDashboardModal>

        <ParentDashboardModal
          open={Boolean(detailsStudent)}
          title={detailsStudent ? `פרטים — ${detailsStudent.full_name || "ילד"}` : "פרטים"}
          onClose={() => setDetailsModalStudent(null)}
          size="2xl"
        >
          {detailsStudent ? renderChildDetailsContent(detailsStudent) : null}
        </ParentDashboardModal>

        {activityModalStudent && session?.access_token ? (
          <AssignActivityModal
            student={activityModalStudent}
            accessToken={session.access_token}
            onClose={() => setActivityModalStudent(null)}
            onSuccess={() => {
              setActivityModalStudent(null);
              setMessage("הפעילות נשלחה בהצלחה!");
              setSentActivitiesRefresh((n) => n + 1);
            }}
          />
        ) : null}

        {deleteModalStudent ? (
          <div
            className="fixed inset-0 z-[160] flex items-center justify-center bg-black/75 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-child-title"
          >
            <div className="max-w-md w-full rounded-lg border border-red-500/35 bg-[#0f1629] p-4 space-y-3 shadow-xl" dir="rtl">
              <h3 id="delete-child-title" className="text-lg font-bold text-white">
                מחיקת ילד לצמיתות
              </h3>
              <p className="text-sm text-white/85 leading-relaxed">
                מחיקה זו תמחק לצמיתות את הילד, פרטי הכניסה, הסשנים, התשובות, הדוחות, המטבעות וכל הנתונים הקשורים אליו.
                לא ניתן לשחזר פעולה זו.
              </p>
              <p className="text-xs text-white/65">
                הקלידו את שם הילד בדיוק:{" "}
                <strong className="text-white">{deleteModalStudent.full_name}</strong>
              </p>
              <input
                className="w-full rounded bg-black/40 border border-white/20 px-3 py-2 text-white"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder="הקלדת שם לאישור"
                dir="rtl"
                autoComplete="off"
              />
              <div className="flex flex-wrap gap-2 justify-end pt-1">
                <button
                  type="button"
                  className="rounded bg-white/10 px-4 py-2 text-sm text-white"
                  onClick={() => {
                    setDeleteModalStudent(null);
                    setDeleteConfirmName("");
                  }}
                >
                  ביטול
                </button>
                <button
                  type="button"
                  className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  disabled={
                    busy ||
                    String(deleteConfirmName).trim() !==
                      String(deleteModalStudent.full_name || "").trim()
                  }
                  onClick={() => void confirmDeleteStudent()}
                >
                  מחק לצמיתות
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      </ParentPolicyAcceptanceGate>
    </Layout>
  );
}
