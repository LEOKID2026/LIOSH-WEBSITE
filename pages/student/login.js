import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import PortalLoginHeading from "../../components/auth/PortalLoginHeading";
import StudentPromoVideo from "../../components/student/StudentPromoVideo";
import StudentParentInviteModal from "../../components/student/StudentParentInviteModal";
import CopyConfirmPopup from "../../components/ui/CopyConfirmPopup.jsx";
import { buildParentInviteMessageHe } from "../../lib/site/public-site-origin.client.js";
import {
  COPY_INVITE_ERROR_MESSAGE_HE,
  COPY_INVITE_SUCCESS_MESSAGE_HE,
  copyTextToClipboard,
} from "../../lib/ui/copy-confirm-message.he.js";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import { syncStudentLocalStorageIdentity } from "../../lib/learning-student-local-sync";
import { isStudentIdentityDiagnosticsEnabled } from "../../lib/dev-student-identity-client";

function resolveNextTarget(router) {
  const raw = router.query?.next;
  if (typeof raw !== "string") return "/student/home";
  const decoded = decodeURIComponent(raw);
  if (
    decoded.startsWith("/student") &&
    !decoded.startsWith("//") &&
    !decoded.includes("://")
  ) {
    return decoded;
  }
  if (
    decoded.startsWith("/learning") &&
    !decoded.startsWith("//") &&
    !decoded.includes("://")
  ) {
    return decoded;
  }
  return "/student/home";
}

export function redirectAfterStudentLogin(router) {
  if (typeof window === "undefined") return;
  window.location.assign(resolveNextTarget(router));
}

export default function StudentLoginPage() {
  const router = useRouter();
  const { theme, tokens: T, isBright } = useStudentTheme();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sessionCheck, setSessionCheck] = useState("pending");
  const [parentInviteOpen, setParentInviteOpen] = useState(false);
  const [copyPopupOpen, setCopyPopupOpen] = useState(false);
  const [copyPopupMessage, setCopyPopupMessage] = useState("");
  const [copyPopupIsError, setCopyPopupIsError] = useState(false);

  const layoutProps = { studentTheme: theme, studentShell: "home" };
  const labelClass = isBright ? "text-slate-700" : "text-white/80";
  const inputClass = isBright
    ? "mt-1 w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
    : "mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2";
  const submitClass = isBright
    ? "w-full rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 disabled:opacity-60 shadow-sm"
    : "w-full rounded bg-amber-500 text-black font-semibold py-2 disabled:opacity-60";
  const errorClass = isBright ? "mt-3 text-sm text-rose-600" : "mt-3 text-sm text-red-300";
  const parentInviteHintClass = isBright ? "text-slate-600" : "text-white/65";
  const parentShowBtnClass = isBright
    ? "w-full rounded-lg border border-amber-400 bg-amber-300 px-3 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-400 transition shadow-sm"
    : "w-full rounded-lg border border-amber-300/50 bg-amber-400/10 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-400/20 hover:border-amber-200/60 transition";
  const parentCopyMsgBtnClass = isBright
    ? "w-full rounded-lg border border-violet-500 bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition shadow-sm"
    : "w-full rounded-lg border border-violet-300/45 bg-violet-400/10 px-3 py-2 text-sm font-semibold text-violet-100 hover:bg-violet-400/20 hover:border-violet-200/55 transition";

  useEffect(() => {
    if (!router.isReady) return undefined;
    let mounted = true;
    fetch("/api/student/me", { credentials: "same-origin", cache: "no-store" })
      .then((res) => {
        if (!mounted) return;
        if (res.ok) {
          redirectAfterStudentLogin(router);
          return;
        }
        setSessionCheck("none");
      })
      .catch(() => {
        if (mounted) setSessionCheck("none");
      });
    return () => {
      mounted = false;
    };
    // רק isReady — לא router (re-run מבטל fetch → stuck על "בודקים חיבור...").
  }, [router.isReady]);

  if (sessionCheck === "pending") {
    return (
      <Layout {...layoutProps}>
        <div className="max-w-md mx-auto px-4 py-3 md:py-10" dir="rtl" lang="he">
          <PortalLoginHeading title="כניסת ילד/ה" bright={isBright} />
          <div className="py-8 md:py-12 flex flex-col items-center justify-center">
            <div className={T.loadingSpinner} aria-hidden />
            <p className={T.loadingText}>בודקים חיבור...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const submitLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      if (isStudentIdentityDiagnosticsEnabled()) {
        console.log("[student-login-page] submitting username", username);
      }

      const res = await fetch("/api/student/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, pin }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setMessage("שם המשתמש או הקוד שגויים.");
        return;
      }

      if (payload?.student?.id) {
        syncStudentLocalStorageIdentity(payload.student, "student-login-page after login");
      }

      redirectAfterStudentLogin(router);
    } catch (_e) {
      setMessage("שגיאת רשת");
    } finally {
      setBusy(false);
    }
  };

  const handleCopyParentMessage = async () => {
    const ok = await copyTextToClipboard(buildParentInviteMessageHe());
    if (ok) {
      setCopyPopupIsError(false);
      setCopyPopupMessage(COPY_INVITE_SUCCESS_MESSAGE_HE);
    } else {
      setCopyPopupIsError(true);
      setCopyPopupMessage(COPY_INVITE_ERROR_MESSAGE_HE);
    }
    setCopyPopupOpen(true);
  };

  return (
    <Layout {...layoutProps}>
      <div className="max-w-md mx-auto px-4 py-3 md:py-10" dir="rtl" lang="he">
        <PortalLoginHeading title="כניסת ילד/ה" bright={isBright} />

        <StudentPromoVideo isBright={isBright} compact className="mb-4" />

        <form onSubmit={submitLogin} className="space-y-3">
          <label className="block text-sm">
            <span className={labelClass}>שם משתמש</span>
            <input
              data-testid="student-login-username"
              className={inputClass}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="שם משתמש"
              required
              autoComplete="username"
            />
          </label>
          <label className="block text-sm">
            <span className={labelClass}>קוד כניסה</span>
            <input
              data-testid="student-login-pin"
              className={inputClass}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="קוד כניסה"
              required
              inputMode="numeric"
              autoComplete="current-password"
            />
          </label>
          <button
            data-testid="student-login-submit"
            className={submitClass}
            disabled={busy}
            type="submit"
          >
            {busy ? "מתחבר…" : "כניסה ללמידה"}
          </button>
          <div className="pt-1 space-y-2 text-center">
            <p className={`text-sm leading-relaxed ${parentInviteHintClass}`}>
              אין לך חשבון עדיין?
              <br />
              בקש מההורה לפתוח לך חשבון
            </p>
            <button
              type="button"
              className={parentShowBtnClass}
              onClick={() => setParentInviteOpen(true)}
              data-testid="student-parent-invite-open"
            >
              הצג להורה
            </button>
            <button
              type="button"
              className={parentCopyMsgBtnClass}
              onClick={() => void handleCopyParentMessage()}
              data-testid="student-parent-invite-copy-message-inline"
            >
              העתק הודעה להורה
            </button>
          </div>
        </form>

        <CopyConfirmPopup
          open={copyPopupOpen}
          onClose={() => setCopyPopupOpen(false)}
          message={copyPopupMessage}
          isError={copyPopupIsError}
          bright={isBright}
          autoCloseMs={5000}
          testId="student-login-copy-message-popup"
        />

        <StudentParentInviteModal
          open={parentInviteOpen}
          onClose={() => setParentInviteOpen(false)}
        />

        {message ? (
          <p className={errorClass} role="alert">
            {message}
          </p>
        ) : null}
      </div>
    </Layout>
  );
}
