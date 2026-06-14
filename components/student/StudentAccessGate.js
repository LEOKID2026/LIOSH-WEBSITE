import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../Layout";
import { syncStudentLocalStorageIdentity } from "../../lib/learning-student-local-sync";
import { isStudentIdentityDiagnosticsEnabled } from "../../lib/dev-student-identity-client";
import { setCachedStudentMe, invalidateStudentMeClientCache } from "../../lib/learning-client/studentMeClient";
import { StudentSessionProvider } from "./StudentSessionContext";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";

/** מותר לשמור ב־next= אחרי login — ללא open redirect */
function isSafeNextPath(path) {
  return (
    typeof path === "string" &&
    !path.startsWith("//") &&
    !path.includes("://") &&
    (path.startsWith("/learning") || path.startsWith("/student/"))
  );
}

function resolveGateLayoutShell(pathname) {
  const path = pathname || "";
  if (path.startsWith("/student/")) return "home";
  return "learning";
}

function StudentGateShell({ pathname, children }) {
  const { theme } = useStudentTheme();
  return (
    <Layout studentTheme={theme} studentShell={resolveGateLayoutShell(pathname)}>
      {children}
    </Layout>
  );
}

function StudentGateLoadingPanel({ message }) {
  const { tokens: T } = useStudentTheme();
  return (
    <div className="max-w-md mx-auto px-4 py-8 md:py-12" dir="rtl" lang="he">
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center">
        <div className={T.loadingSpinner} aria-hidden />
        <p className={T.loadingText}>{message}</p>
      </div>
    </div>
  );
}

function StudentGateBlockedPanel({ loginHref }) {
  const { tokens: T } = useStudentTheme();
  return (
    <div className="max-w-md mx-auto px-4 py-8 md:py-12 space-y-4" dir="rtl" lang="he">
      <p className={`${T.loadingText} text-right`}>יש להתחבר כילד/ה כדי להמשיך</p>
      <Link href={loginHref} className={`${T.ctaPrimary} inline-flex justify-center w-full sm:w-auto`}>
        כניסת ילד/ה
      </Link>
    </div>
  );
}

export default function StudentAccessGate({ children }) {
  const router = useRouter();
  /** @type {[{ status: "loading" | "ok" | "blocked", student: object | null }, function]: any} */
  const [session, setSession] = useState({ status: "loading", student: null });
  const [loginNextPath, setLoginNextPath] = useState("/learning");

  useEffect(() => {
    if (!router.isReady) return undefined;
    let mounted = true;
    const pathForNext = router.asPath || "/learning";
    setLoginNextPath(isSafeNextPath(pathForNext) ? pathForNext : "/learning");
    invalidateStudentMeClientCache();
    fetch("/api/student/me", { credentials: "same-origin", cache: "no-store" })
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}));
        if (!mounted) return;
        if (res.ok && payload?.student?.id) {
          if (isStudentIdentityDiagnosticsEnabled()) {
            console.log("[StudentAccessGate] /me student", {
              id: payload.student?.id,
              fullName: payload.student?.full_name,
              gradeLevel: payload.student?.grade_level,
              debug: payload.debugStudentIdentity,
            });
          }
          setCachedStudentMe(payload);
          syncStudentLocalStorageIdentity(payload.student, "StudentAccessGate after /me");
          if (isStudentIdentityDiagnosticsEnabled()) {
            console.log("[StudentAccessGate] localStorage after sync", {
              liosh_active_student_id: localStorage.getItem("liosh_active_student_id"),
              mleo_player_name: localStorage.getItem("mleo_player_name"),
            });
          }
          setSession({ status: "ok", student: payload.student });
          return;
        }
        setSession({ status: "blocked", student: null });
        const target = isSafeNextPath(pathForNext) ? pathForNext : "/learning";
        router.replace(`/student/login?next=${encodeURIComponent(target)}`);
      })
      .catch(() => {
        if (!mounted) return;
        setSession({ status: "blocked", student: null });
      });
    return () => {
      mounted = false;
    };
    // רק isReady — לא router.asPath (משתנה בתדירות גבוהה בהידרציה/broadcast ומפעיל לולאת replace → שגיאת ריצה).
  }, [router.isReady]);

  const providerValue = useMemo(
    () => ({
      status: session.status,
      student: session.student,
    }),
    [session.status, session.student]
  );

  const loginHref = `/student/login?next=${encodeURIComponent(loginNextPath)}`;
  const pathname = router.pathname || "";

  return (
    <StudentSessionProvider value={providerValue}>
      {session.status === "loading" ? (
        <StudentGateShell pathname={pathname}>
          <StudentGateLoadingPanel message="בודק התחברות ילד/ה..." />
        </StudentGateShell>
      ) : session.status !== "ok" ? (
        <StudentGateShell pathname={pathname}>
          <StudentGateBlockedPanel loginHref={loginHref} />
        </StudentGateShell>
      ) : (
        children
      )}
    </StudentSessionProvider>
  );
}
