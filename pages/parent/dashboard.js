import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../components/Layout";
import ParentPolicyAcceptanceGate from "../../components/parent/ParentPolicyAcceptanceGate";
import AssignActivityModal from "../../components/parent/AssignActivityModal";
import ParentDashboardModal from "../../components/parent/ParentDashboardModal";
import ChildGamePermissionsPanel from "../../components/parent/ChildGamePermissionsPanel";
import ParentInviteOthersButton from "../../components/parent/ParentInviteOthersButton";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import { getParentPortalTheme } from "../../lib/parent-ui/parent-portal-theme.client.js";
import { getLearningSupabaseBrowserClient } from "../../lib/learning-supabase/client";
import { shouldDisplayStudentAccessCode } from "../../lib/teacher-portal/student-access-display.js";
import { trackProductEvent } from "../../lib/analytics/track-event.client.js";

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

/** Neutral action buttons on child cards — theme applied via getParentPortalTheme(). */

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

/** Deterministic login username for optional PIN-at-create (unique per student id). */
function suggestLoginUsernameForNewStudent(studentId) {
  const compact = String(studentId || "").replace(/-/g, "");
  return `kid${compact.slice(-9)}`;
}

const CHILD_PIN_INPUT_PROPS = {
  type: "tel",
  inputMode: "numeric",
  pattern: "[0-9]*",
  autoComplete: "one-time-code",
  maxLength: 4,
};

export default function ParentDashboardPage() {
  const router = useRouter();
  const { theme, isBright } = useStudentTheme();
  const T = getParentPortalTheme(isBright);
  const layoutProps = { studentTheme: theme, studentShell: "home" };
  const supabaseRef = useRef(null);
  const trackedDashboardOpenRef = useRef(false);

  const [session, setSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentLimit, setStudentLimit] = useState(MAX_CHILDREN_DEFAULT);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [clientReady, setClientReady] = useState(false);

  const [newName, setNewName] = useState("");
  const [newGrade, setNewGrade] = useState("");
  const [newChildPin, setNewChildPin] = useState("");
  const [credentialsByStudentId, setCredentialsByStudentId] = useState({});
  /** One-time display after creating or resetting credentials (new PIN shown once). */
  const [credentialConfirmation, setCredentialConfirmation] = useState(null);

  const [editById, setEditById] = useState({});
  const [deleteModalStudent, setDeleteModalStudent] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteError, setDeleteError] = useState("");
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

  useEffect(() => {
    if (!session?.access_token || trackedDashboardOpenRef.current) return;
    trackedDashboardOpenRef.current = true;
    void trackProductEvent({
      eventName: "parent_dashboard_opened",
      actorType: "parent",
    });
  }, [session?.access_token]);

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
    const initialPin = String(newChildPin || "").trim();
    if (initialPin && !/^\d{4}$/.test(initialPin)) {
      setMessage("PIN חייב להיות בארבע ספרות");
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
      const createdStudentId = payload?.student?.id;
      let credentialMessage = "";

      if (initialPin && createdStudentId) {
        const username = suggestLoginUsernameForNewStudent(createdStudentId);
        const credRes = await fetch("/api/parent/create-student-access-code", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ studentId: createdStudentId, username, pin: initialPin }),
        });
        const credPayload = await credRes.json();
        if (!credRes.ok) {
          credentialMessage =
            credPayload.error || "הילד/ה נוצר/ה, אך הגדרת PIN נכשלה — ניתן להגדיר בפרטי הילד/ה";
        } else {
          const loginUsername = credPayload.username || username;
          setCredentialConfirmation({
            studentId: createdStudentId,
            username: loginUsername,
            pin: initialPin,
          });
          setDetailsModalStudent({
            id: createdStudentId,
            full_name: payload.student.full_name,
            grade_level: payload.student.grade_level,
            is_active: payload.student.is_active,
            login_username: loginUsername,
            has_active_access_code: true,
          });
        }
      }

      setNewName("");
      setNewGrade("");
      setNewChildPin("");
      setAddChildModalOpen(false);
      void trackProductEvent({
        eventName: "child_created",
        actorType: "parent",
        studentId: createdStudentId,
        grade: payload?.student?.grade_level || newGrade,
      });
      await fetchStudents(session);
      setMessage(credentialMessage || "Student created.");
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
    setDeleteError("");
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
        const detail =
          payload.detail && payload.detail !== payload.error ? ` (${payload.detail})` : "";
        setDeleteError((payload.error || "מחיקה נכשלה") + detail);
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
      setDeleteError("שגיאת רשת — נסה שנית");
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

  const closeAddChildModal = useCallback(() => {
    setAddChildModalOpen(false);
    setNewChildPin("");
  }, []);

  const closeDetailsModal = useCallback(() => {
    setDetailsModalStudent(null);
  }, []);

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
      <p className={`text-sm ${T.muted}`}>
        ילדים בחשבון: {students.length} / {studentLimit}
      </p>
      {students.length >= studentLimit ? (
        <p className={T.warning}>{`הגעת למגבלת ${studentLimit} ילדים לחשבון`}</p>
      ) : null}
      <input
        className={T.input}
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        placeholder="שם הילד"
        autoComplete="name"
        enterKeyHint="next"
        required
        disabled={busy || students.length >= studentLimit}
      />
      <select
        className={T.input}
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
      <div className={T.panel}>
        <div className={T.panelTitle}>פרטי כניסת ילד/ה</div>
        <p className={`text-xs ${T.faint}`}>ניתן להגדיר PIN ראשוני לילד/ה כבר עכשיו.</p>
        <div>
          <label className={`text-sm ${T.label}`}>PIN לילד/ה</label>
          <input
            className={T.inputMt}
            value={newChildPin}
            onChange={(e) => setNewChildPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="4 ספרות"
            disabled={busy || students.length >= studentLimit}
            {...CHILD_PIN_INPUT_PROPS}
          />
        </div>
      </div>
      <button className={`w-full ${T.amberBtn}`} disabled={busy || students.length >= studentLimit}>
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
          className={T.input}
          value={edit.fullName}
          onChange={(e) =>
            setEditById((prev) => ({
              ...prev,
              [student.id]: { ...edit, fullName: e.target.value },
            }))
          }
        />
        <select
          className={T.input}
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
        <label className={`flex items-center gap-2 text-sm ${T.label}`}>
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
        <div className={`text-sm ${T.muted}`}>יתרת מטבעות: {balance ? balance.balance : 0}</div>

        <div className={T.panel}>
          <div className={T.panelTitle}>פרטי כניסת ילד/ה</div>

          {showConfirmationHere ? (
            <div className={T.confirmBox}>
              <div className={T.confirmTitle}>חשוב לשמור את הפרטים — ה-PIN לא יוצג שוב.</div>
              <div>
                שם משתמש: <strong className={T.confirmStrong}>{credentialConfirmation.username}</strong>
              </div>
              <div>
                PIN חדש: <strong className={T.confirmStrong}>{credentialConfirmation.pin}</strong>
              </div>
              <button type="button" className={T.ghostBtn} onClick={() => setCredentialConfirmation(null)}>
                סגירה
              </button>
            </div>
          ) : null}

          {visibleLoginUsername ? (
            <div className="space-y-2">
              <div className={`flex flex-wrap items-center gap-2 text-sm ${T.muted}`}>
                <span>
                  שם משתמש: <strong className={T.confirmStrong}>{visibleLoginUsername}</strong>
                </span>
                <button
                  type="button"
                  className={T.copyBtn}
                  onClick={() => copyUsername(visibleLoginUsername)}
                >
                  העתק שם משתמש
                </button>
              </div>
              <div className={`text-sm ${T.muted}`}>
                PIN: {student.has_active_access_code ? "מוגדר" : "לא מוגדר"}
              </div>
              <div>
                <label className={`text-sm ${T.label}`}>PIN חדש (איפוס / שינוי)</label>
                <input
                  className={T.inputMt}
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
                  {...CHILD_PIN_INPUT_PROPS}
                />
              </div>
              <button
                className={T.skyBtn}
                disabled={busy}
                onClick={() => savePinReset(student.id, visibleLoginUsername, student.full_name)}
                type="button"
              >
                איפוס PIN / שינוי PIN
              </button>
            </div>
          ) : hasHiddenDemoAccess ? (
            <div className="space-y-2">
              <div className={`text-sm ${T.muted}`}>כניסת ילד/ה פעילה</div>
              <div className={`text-sm ${T.muted}`}>
                PIN: {student.has_active_access_code ? "מוגדר" : "לא מוגדר"}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className={T.warning}>שם משתמש: טרם נקבע שם משתמש</div>
              <div className={`text-sm ${T.muted}`}>
                PIN: {student.has_active_access_code ? "מוגדר" : "לא מוגדר"}
              </div>
              <p className={`text-xs ${T.faint}`}>
                יש להגדיר שם משתמש ו-PIN לכניסת הילד/ה. אם כבר קיימת כניסה ישנה, הגדרה זו תחליף אותה.
              </p>
              <div>
                <label className={`text-sm ${T.label}`}>שם משתמש לילד/ה</label>
                <input
                  className={T.inputMt}
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
                <label className={`text-sm ${T.label}`}>PIN לילד/ה</label>
                <input
                  className={T.inputMt}
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
                  {...CHILD_PIN_INPUT_PROPS}
                />
              </div>
              <button
                className={T.skyBtn}
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
          <ChildGamePermissionsPanel
            bright={isBright}
            studentId={student.id}
            accessToken={session.access_token}
          />
        ) : null}
        <div className="flex flex-wrap gap-2 items-center">
          <button
            className={T.amberBtn}
            disabled={busy}
            onClick={() => saveStudent(student.id)}
            type="button"
          >
            שמור
          </button>
          <button
            type="button"
            className={T.deleteBtn}
            disabled={busy}
            onClick={() => {
              setDeleteConfirmName("");
              setDeleteError("");
              setDeleteModalStudent({
                id: student.id,
                full_name: student.full_name || "",
              });
            }}
          >
            מחיקת ילד
          </button>
        </div>
      </div>
    );
  };

  if (!session) {
    return (
      <Layout {...layoutProps}>
        <div className={`max-w-6xl mx-auto px-3 py-4 text-sm ${T.loading}`}>בודק התחברות הורה...</div>
      </Layout>
    );
  }

  const detailsStudent = detailsModalStudent
    ? students.find((s) => s.id === detailsModalStudent.id) || detailsModalStudent
    : null;

  return (
    <Layout {...layoutProps}>
      <ParentPolicyAcceptanceGate
        bright={isBright}
        accessToken={session.access_token}
        onLogout={logout}
        onReady={() => fetchStudents(session)}
      >
      <div className="max-w-6xl mx-auto w-full px-3 py-3 md:px-8 md:py-8 space-y-4 md:space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 md:gap-y-3">
          <div className="min-w-0">
            <h1 className={`text-xl md:text-2xl font-bold leading-tight ${T.heading}`}>דשבורד הורים</h1>
            <p className={`${T.subheading} text-sm truncate mt-1`}>{session.user?.email}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={() => setAddChildModalOpen(true)} className={T.amberBtn}>
              הוספת ילד
            </button>
            <button type="button" onClick={logout} className={T.secondaryBtn}>
              יציאה
            </button>
          </div>
        </div>

        {message ? <p className={T.message}>{message}</p> : null}

        <section>
          {students.length === 0 ? (
            <p className={`text-sm ${T.faint}`}>עדיין לא נוספו ילדים</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 md:gap-5">
              {students.map((student) => {
                const displayName = student.full_name || "ילד";
                const gradeLabel = gradeLabelFromValue(student.grade_level);
                const reportHref = `/learning/parent-report?studentId=${encodeURIComponent(student.id)}&source=parent`;

                return (
                  <div key={student.id} className={T.card}>
                    <div className="min-w-0">
                      <h3 className={T.cardTitle}>{displayName}</h3>
                      <p className={T.cardMeta}>{gradeLabel}</p>
                    </div>
                    <div className="flex gap-2 md:gap-2.5">
                      <Link
                        href={reportHref}
                        prefetch={false}
                        className={T.cardReportBtn}
                      >
                        דוח הורים
                      </Link>
                      <button
                        type="button"
                        className={T.cardActivityBtn}
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
                        className={T.cardDetailsBtn}
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
          <ParentInviteOthersButton bright={isBright} />
        </section>

        <ParentDashboardModal
          bright={isBright}
          open={addChildModalOpen}
          title="הוספת ילד"
          onClose={closeAddChildModal}
          size="md"
        >
          {renderAddChildForm()}
        </ParentDashboardModal>

        <ParentDashboardModal
          bright={isBright}
          open={Boolean(detailsStudent)}
          title={detailsStudent ? `פרטים — ${detailsStudent.full_name || "ילד"}` : "פרטים"}
          onClose={closeDetailsModal}
          size="2xl"
        >
          {detailsStudent ? renderChildDetailsContent(detailsStudent) : null}
        </ParentDashboardModal>

        {activityModalStudent && session?.access_token ? (
          <AssignActivityModal
            bright={isBright}
            student={activityModalStudent}
            accessToken={session.access_token}
            refreshKey={sentActivitiesRefresh}
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
            className={T.deleteOverlay}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-child-title"
          >
            <div className={T.deletePanel} dir="rtl">
              <h3 id="delete-child-title" className={T.deleteTitle}>
                מחיקת ילד לצמיתות
              </h3>
              <p className={T.deleteText}>
                מחיקה זו תמחק לצמיתות את הילד, פרטי הכניסה, הסשנים, התשובות, הדוחות, המטבעות וכל הנתונים הקשורים אליו.
                לא ניתן לשחזר פעולה זו.
              </p>
              <p className={T.deleteHint}>
                הקלידו את שם הילד בדיוק:{" "}
                <strong className={T.deleteStrong}>{deleteModalStudent.full_name}</strong>
              </p>
              <input
                className={T.input}
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder="הקלדת שם לאישור"
                dir="rtl"
                autoComplete="off"
              />
              {deleteError ? (
                <p className="text-sm text-red-500 text-right" role="alert">{deleteError}</p>
              ) : null}
              <div className="flex flex-wrap gap-2 justify-end pt-1">
                <button
                  type="button"
                  className={T.deleteCancel}
                  onClick={() => {
                    setDeleteModalStudent(null);
                    setDeleteConfirmName("");
                    setDeleteError("");
                  }}
                >
                  ביטול
                </button>
                <button
                  type="button"
                  className={T.deleteConfirm}
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
