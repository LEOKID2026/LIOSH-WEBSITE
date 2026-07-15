import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../components/Layout";
import AssignActivityModal from "../../components/parent/AssignActivityModal";
import ParentCurriculumModal from "../../components/parent/ParentCurriculumModal";
import ParentDashboardModal from "../../components/parent/ParentDashboardModal";
import ChildGamePermissionsPanel from "../../components/parent/ChildGamePermissionsPanel";
import ChildSubjectPermissionsPanel from "../../components/parent/ChildSubjectPermissionsPanel";
import ParentInviteOthersButton from "../../components/parent/ParentInviteOthersButton";
import { PARENT_PROMO_DESKTOP_SRC } from "../../components/parent/ParentPromoVideo";
import PromoVideoClickablePreview from "../../components/promo/PromoVideoClickablePreview";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import { getParentPortalTheme } from "../../lib/parent-ui/parent-portal-theme.client.js";
import { getLearningSupabaseBrowserClient } from "../../lib/learning-supabase/client";
import { shouldDisplayStudentAccessCode } from "../../lib/teacher-portal/student-access-display.js";
import { trackProductEvent } from "../../lib/analytics/track-event.client.js";
import {
  mapParentDashboardApiError,
  parentDashboardCreateSuccessHe,
  parentDashboardUpdateSuccessHe,
} from "../../lib/parent-server/parent-api-errors.he.js";
import {
  clearParentBearerSessionAndRedirect,
  resolveParentBearerSession,
} from "../../lib/parent-client/parent-bearer-session.client.js";
import { WORKSHEET_HUB_ENTRY_ENABLED } from "../../lib/worksheets/worksheet-hub-entry-enabled.js";
import PortalLoadingPanel from "../../components/ui/PortalLoadingPanel.jsx";

const GRADE_OPTIONS = [
  { value: "grade_1", label: "כיתה א׳" },
  { value: "grade_2", label: "כיתה ב׳" },
  { value: "grade_3", label: "כיתה ג׳" },
  { value: "grade_4", label: "כיתה ד׳" },
  { value: "grade_5", label: "כיתה ה׳" },
  { value: "grade_6", label: "כיתה ו׳" },
];

function gradeLabelFromValue(value) {
  return GRADE_OPTIONS.find((g) => g.value === value)?.label || value || "-";
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
  const lastStudentsFetchAtRef = useRef(0);

  const [session, setSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentLimit, setStudentLimit] = useState(MAX_CHILDREN_DEFAULT);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [clientReady, setClientReady] = useState(false);

  const [newName, setNewName] = useState("");
  const [newGrade, setNewGrade] = useState("");
  const [newChildUsername, setNewChildUsername] = useState("");
  const [newChildPin, setNewChildPin] = useState("");
  const [newGuestLeoNumber, setNewGuestLeoNumber] = useState("");
  const [credentialsByStudentId, setCredentialsByStudentId] = useState({});
  /** One-time display after creating or resetting credentials (new PIN shown once). */
  const [credentialConfirmation, setCredentialConfirmation] = useState(null);

  const [editById, setEditById] = useState({});
  const [deleteModalStudent, setDeleteModalStudent] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [activityModalStudent, setActivityModalStudent] = useState(null);
  const [addChildModalOpen, setAddChildModalOpen] = useState(false);
  const [curriculumModalOpen, setCurriculumModalOpen] = useState(false);
  const [detailsModalStudent, setDetailsModalStudent] = useState(null);
  const [sentActivitiesRefresh, setSentActivitiesRefresh] = useState(0);
  const [guestLeoByStudentId, setGuestLeoByStudentId] = useState({});
  const [guestLinkMessageByStudentId, setGuestLinkMessageByStudentId] = useState({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!supabaseRef.current) {
      supabaseRef.current = getLearningSupabaseBrowserClient();
    }
    setClientReady(true);
  }, []);

  const fetchStudents = useCallback(async (activeSession, allowSessionRetry = true) => {
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
        if (res.status === 401) {
          if (allowSessionRetry && supabaseRef.current) {
            const refreshed = await resolveParentBearerSession(supabaseRef.current);
            if (refreshed?.access_token) {
              setSession(refreshed);
              return fetchStudents(refreshed, false);
            }
          }
          if (supabaseRef.current) {
            await clearParentBearerSessionAndRedirect(supabaseRef.current, router);
          }
          return;
        }
        if (res.status === 403 && code === "not_a_parent") {
          // Session is valid; policy gate / entitlement heal handles provisioning.
          return;
        }
        setMessage(mapParentDashboardApiError(res.status, code, payload.error, "load_students"));
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
      lastStudentsFetchAtRef.current = Date.now();
    } catch (_err) {
      setMessage(mapParentDashboardApiError(0, null, null, "load_students"));
    }
  }, [router]);

  useEffect(() => {
    if (!clientReady || !supabaseRef.current) return;
    const supabase = supabaseRef.current;
    let mounted = true;
    resolveParentBearerSession(supabase).then((s) => {
      if (!mounted) return;
      setSession(s);
      if (!s) {
        router.replace("/parent/login");
        return;
      }
      fetchStudents(s);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession || null);
      if (!newSession) {
        router.replace("/parent/login");
        return;
      }
      if (event === "TOKEN_REFRESHED") {
        if (Date.now() - lastStudentsFetchAtRef.current < 30_000) {
          return;
        }
      }
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        fetchStudents(newSession);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [clientReady, fetchStudents, router]);

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
    const initialUsername = String(newChildUsername || "").trim().toLowerCase();
    const initialPin = String(newChildPin || "").trim();
    if (initialPin && !/^\d{4}$/.test(initialPin)) {
      setMessage("PIN חייב להיות בארבע ספרות");
      return;
    }
    if (initialPin && !initialUsername) {
      setMessage("יש להזין שם משתמש");
      return;
    }
    if (initialUsername && !/^[a-z0-9_-]{3,24}$/.test(initialUsername)) {
      setMessage("שם משתמש לא תקין");
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
      setMessage(mapParentDashboardApiError(res.status, payload?.code, payload.error, "create_student"));
    } else {
      const createdStudentId = payload?.student?.id;
      let credentialMessage = "";
      const leoDigits = String(newGuestLeoNumber || "").replace(/\D/g, "").slice(0, 8);

      if (leoDigits.length === 8 && createdStudentId) {
        const linkRes = await fetch("/api/parent/guest/link", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            targetStudentId: createdStudentId,
            leoNumber: leoDigits,
          }),
        });
        const linkPayload = await linkRes.json();
        if (!linkRes.ok) {
          credentialMessage =
            linkPayload.error || "הילד/ה נוצר/ה, אך שיוך מספר האורח נכשל";
        } else {
          credentialMessage = linkPayload.message || "המטבעות והקלפים נשמרו לילד.";
        }
      }

      if (initialUsername && initialPin && createdStudentId) {
        const credRes = await fetch("/api/parent/create-student-access-code", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            studentId: createdStudentId,
            username: initialUsername,
            pin: initialPin,
          }),
        });
        const credPayload = await credRes.json();
        if (!credRes.ok) {
          credentialMessage =
            credPayload.error || "הילד/ה נוצר/ה, אך הגדרת פרטי כניסה נכשלה - ניתן להגדיר בפרטי הילד/ה";
        } else {
          const loginUsername = credPayload.username || initialUsername;
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
      setNewChildUsername("");
      setNewChildPin("");
      setNewGuestLeoNumber("");
      setAddChildModalOpen(false);
      void trackProductEvent({
        eventName: "child_created",
        actorType: "parent",
        studentId: createdStudentId,
        grade: payload?.student?.grade_level || newGrade,
      });
      await fetchStudents(session);
      setMessage(credentialMessage || parentDashboardCreateSuccessHe());
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
      setMessage(mapParentDashboardApiError(res.status, payload?.code, payload.error, "update_student"));
    } else {
      await fetchStudents(session);
      setMessage(parentDashboardUpdateSuccessHe());
    }
    setBusy(false);
  };

  const linkGuestToStudent = async (studentId) => {
    if (!session?.access_token) return;
    const leoDigits = String(guestLeoByStudentId[studentId] || "").replace(/\D/g, "").slice(0, 8);
    if (leoDigits.length !== 8) {
      setGuestLinkMessageByStudentId((prev) => ({
        ...prev,
        [studentId]: "יש להזין מספר ליאו בן 8 ספרות.",
      }));
      return;
    }

    setBusy(true);
    setGuestLinkMessageByStudentId((prev) => ({ ...prev, [studentId]: "" }));
    try {
      const linkRes = await fetch("/api/parent/guest/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          targetStudentId: studentId,
          leoNumber: leoDigits,
        }),
      });
      const linkPayload = await linkRes.json();
      if (!linkRes.ok) {
        setGuestLinkMessageByStudentId((prev) => ({
          ...prev,
          [studentId]: linkPayload.error || "שיוך מספר האורח נכשל.",
        }));
        return;
      }
      setGuestLinkMessageByStudentId((prev) => ({
        ...prev,
        [studentId]: linkPayload.message || "המטבעות והקלפים נשמרו לילד.",
      }));
      setGuestLeoByStudentId((prev) => ({ ...prev, [studentId]: "" }));
      await fetchStudents(session);
    } catch {
      setGuestLinkMessageByStudentId((prev) => ({
        ...prev,
        [studentId]: "שגיאת רשת בשיוך האורח.",
      }));
    } finally {
      setBusy(false);
    }
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
      setDeleteError("שגיאת רשת - נסה שנית");
    }
    setBusy(false);
  };

  const copyUsername = async (username) => {
    try {
      await navigator.clipboard.writeText(username);
      setMessage("שם המשתמש הועתק ללוח");
    } catch (_e) {
      setMessage("לא ניתן להעתיק אוטומטית - העתיקו ידנית");
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
    setNewChildUsername("");
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
      <div>
        <label className={`text-sm ${T.label}`}>מספר ליאו של אורח (אופציונלי)</label>
        <input
          className={T.inputMt}
          value={newGuestLeoNumber}
          onChange={(e) => setNewGuestLeoNumber(e.target.value.replace(/\D/g, "").slice(0, 8))}
          placeholder="מספר ליאו - 8 ספרות"
          inputMode="numeric"
          autoComplete="off"
          disabled={busy || students.length >= studentLimit}
        />
      </div>
      <div className={T.panel}>
        <div className={T.panelTitle}>פרטי כניסת ילד/ה</div>
        <div>
          <label className={`text-sm ${T.label}`}>שם משתמש לילד/ה</label>
          <input
            className={T.inputMt}
            value={newChildUsername}
            onChange={(e) => setNewChildUsername(e.target.value)}
            placeholder="לדוגמה: noam123"
            autoComplete="off"
            disabled={busy || students.length >= studentLimit}
          />
        </div>
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
        <div>
          <label className={`text-sm ${T.label}`}>מספר ליאו של אורח (לשיוך)</label>
          <input
            className={T.inputMt}
            value={guestLeoByStudentId[student.id] || ""}
            onChange={(e) =>
              setGuestLeoByStudentId((prev) => ({
                ...prev,
                [student.id]: e.target.value.replace(/\D/g, "").slice(0, 8),
              }))
            }
            placeholder="מספר ליאו - 8 ספרות"
            inputMode="numeric"
            autoComplete="off"
            disabled={busy}
          />
          <button
            type="button"
            className={`mt-2 ${T.skyBtn}`}
            disabled={busy}
            onClick={() => void linkGuestToStudent(student.id)}
          >
            שיוך אורח
          </button>
          {guestLinkMessageByStudentId[student.id] ? (
            <p className={`mt-2 text-sm ${T.muted}`} role="status">
              {guestLinkMessageByStudentId[student.id]}
            </p>
          ) : null}
        </div>
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
              <div className={T.confirmTitle}>חשוב לשמור את הפרטים - ה-PIN לא יוצג שוב.</div>
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
        {session?.access_token ? (
          <ChildSubjectPermissionsPanel
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
        <div className="max-w-md mx-auto px-4 py-8" dir="rtl" lang="he">
          <PortalLoadingPanel isBright={isBright} message="בודק התחברות הורה..." />
        </div>
      </Layout>
    );
  }

  const detailsStudent = detailsModalStudent
    ? students.find((s) => s.id === detailsModalStudent.id) || detailsModalStudent
    : null;

  const promoFrameClass = isBright
    ? "border-slate-200/80 bg-slate-900/5 shadow-sm"
    : "border-white/15 bg-black/30 shadow-lg shadow-black/20";

  return (
    <Layout {...layoutProps}>
      <div className="max-w-6xl mx-auto w-full px-3 py-3 md:px-8 md:py-8 space-y-4 md:space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-x-4 md:gap-y-3">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <h1 className={`text-xl md:text-2xl font-bold leading-tight ${T.heading} min-w-0 truncate`}>
                פורטל הורים
              </h1>
              <button type="button" onClick={logout} className={`${T.secondaryBtn} shrink-0 md:hidden`}>
                יציאה
              </button>
            </div>
            <p className={`${T.subheading} mt-1 min-w-0 truncate text-sm`}>{session.user?.email}</p>
          </div>
          <div className="grid w-full min-w-0 grid-cols-2 gap-1.5 sm:grid-cols-3 md:flex md:w-auto md:flex-nowrap md:justify-end md:gap-2">
            {WORKSHEET_HUB_ENTRY_ENABLED ? (
              <Link
                href="/parent/worksheets"
                prefetch={false}
                className={`${T.headerCurriculumBtn} w-full min-w-0 md:w-auto md:flex-none`}
              >
                <span aria-hidden="true" className="me-1">
                  🖨️
                </span>
                דפי עבודה להדפסה
              </Link>
            ) : (
              <button
                type="button"
                disabled
                aria-disabled="true"
                className={`${T.headerCurriculumBtn} w-full min-w-0 md:w-auto md:flex-none opacity-55 cursor-not-allowed`}
              >
                <span aria-hidden="true" className="me-1">
                  🖨️
                </span>
                דפי עבודה להדפסה
              </button>
            )}
            <button
              type="button"
              onClick={() => setCurriculumModalOpen(true)}
              className={`${T.headerCurriculumBtn} w-full min-w-0 md:w-auto md:flex-none`}
            >
              תוכניות הלימודים
            </button>
            <button
              type="button"
              onClick={() => setAddChildModalOpen(true)}
              className={`${T.amberBtn} w-full min-w-0 px-2 text-center text-xs leading-tight md:w-auto md:flex-none md:px-4 md:text-sm`}
            >
              הוספת ילד
            </button>
            <ParentInviteOthersButton
              bright={isBright}
              label="שתף"
              inline
              className={`${T.headerShareBtn} w-full min-w-0 md:w-auto md:flex-none`}
            />
            <button type="button" onClick={logout} className={`${T.secondaryBtn} hidden md:inline-flex`}>
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
                const reportHref = `/parent/parent-report?studentId=${encodeURIComponent(student.id)}&source=parent`;

                return (
                  <div key={student.id} className={T.card}>
                    <div className="min-w-0">
                      <p className="min-w-0 truncate md:hidden">
                        <span className={`${T.cardTitle} inline truncate`}>{displayName}</span>
                        <span className={`${T.cardTitle} inline`}> - </span>
                        <span className={`${T.cardMeta} inline mt-0`}>{gradeLabel}</span>
                      </p>
                      <h3 className={`${T.cardTitle} truncate hidden md:block`}>{displayName}</h3>
                      <p className={`${T.cardMeta} hidden md:block`}>{gradeLabel}</p>
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
          <div
            className="mt-2 flex justify-center md:mt-3"
            data-testid="parent-dashboard-promo"
          >
            <PromoVideoClickablePreview
              src={PARENT_PROMO_DESKTOP_SRC}
              wrapClassName={`w-[min(62vw,240px)] md:w-[360px] aspect-video overflow-hidden rounded-xl border ${promoFrameClass}`}
              videoClassName="h-full w-full bg-black object-contain"
              ariaLabel="סרטון הורים"
              testId="parent-dashboard-promo-video"
            />
          </div>
        </section>

        <ParentCurriculumModal
          bright={isBright}
          open={curriculumModalOpen}
          onClose={() => setCurriculumModalOpen(false)}
        />

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
          title={detailsStudent ? `פרטים - ${detailsStudent.full_name || "ילד"}` : "פרטים"}
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
    </Layout>
  );
}
