import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../Layout";
import { syncStudentLocalStorageIdentity } from "../../lib/learning-student-local-sync";
import { isStudentIdentityDiagnosticsEnabled } from "../../lib/dev-student-identity-client";
import { setCachedStudentMe, invalidateStudentMeClientCache } from "../../lib/learning-client/studentMeClient";
import { StudentSessionProvider } from "./StudentSessionContext";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import StudentLoadingPanel from "../ui/StudentLoadingPanel.jsx";
import { StudentGameAccessProvider } from "../../contexts/StudentGameAccessContext.jsx";
import { StudentSubjectAccessProvider } from "../../contexts/StudentSubjectAccessContext.jsx";
import {
  buildStudentGameAccessView,
  fetchStudentGameAccessClient,
} from "../../hooks/useStudentGameAccess.js";
import { studentPathNeedsGameAccess } from "../../lib/student-ui/student-game-access-paths.client.js";

/** מותר לשמור ב next= אחרי login — ללא open redirect */
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
  const pathname = router.pathname || "";
  const needsGameAccess = studentPathNeedsGameAccess(pathname);

  /** @type {[{ status: "loading" | "ok" | "blocked", student: object | null, subjectAccess?: object|null }, function]: any} */
  const [session, setSession] = useState({ status: "loading", student: null, subjectAccess: null });
  /** @type {[{ status: "skip" | "loading" | "ready" | "error", data: object | null }, function]: any} */
  const [gameAccess, setGameAccess] = useState(() =>
    needsGameAccess ? { status: "loading", data: null } : { status: "skip", data: null }
  );
  const [loginNextPath, setLoginNextPath] = useState("/learning");

  useEffect(() => {
    if (!router.isReady) return undefined;
    let mounted = true;
    const pathForNext = router.asPath || "/learning";
    const safeNext = isSafeNextPath(pathForNext) ? pathForNext : "/learning";
    setLoginNextPath(safeNext);
    invalidateStudentMeClientCache();

    const needsGame = studentPathNeedsGameAccess(router.pathname);
    if (needsGame) {
      setGameAccess({ status: "loading", data: null });
    } else {
      setGameAccess({ status: "skip", data: null });
    }

    const load = async () => {
      const mePromise = fetch("/api/student/me", { credentials: "same-origin", cache: "no-store" })
        .then(async (meRes) => ({
          res: meRes,
          payload: await meRes.json().catch(() => ({})),
        }));
      const gamePromise = needsGame
        ? fetchStudentGameAccessClient()
        : Promise.resolve({ ok: true, data: null, error: null });

      const [{ res: meRes, payload: mePayload }, gameResult] = await Promise.all([
        mePromise,
        gamePromise,
      ]);

      if (!mounted) return;

      if (!meRes.ok || !mePayload?.student?.id) {
        setSession({ status: "blocked", student: null });
        router.replace(`/student/login?next=${encodeURIComponent(safeNext)}`);
        return;
      }

      if (isStudentIdentityDiagnosticsEnabled()) {
        console.log("[StudentAccessGate] /me student", {
          id: mePayload.student?.id,
          fullName: mePayload.student?.full_name,
          gradeLevel: mePayload.student?.grade_level,
          debug: mePayload.debugStudentIdentity,
        });
      }
      setCachedStudentMe(mePayload);
      syncStudentLocalStorageIdentity(mePayload.student, "StudentAccessGate after /me");
      if (isStudentIdentityDiagnosticsEnabled()) {
        console.log("[StudentAccessGate] localStorage after sync", {
          liosh_active_student_id: localStorage.getItem("liosh_active_student_id"),
          mleo_player_name: localStorage.getItem("mleo_player_name"),
        });
      }

      if (needsGame) {
        if (!gameResult.ok) {
          setSession({ status: "blocked", student: null });
          router.replace(`/student/login?next=${encodeURIComponent(safeNext)}`);
          return;
        }
        setGameAccess({ status: "ready", data: gameResult.data });
      }

      setSession({
        status: "ok",
        student: mePayload.student,
        subjectAccess: {
          allowStudentGradePicker: mePayload.allowStudentGradePicker === true,
          subjectPermissions: mePayload.subjectPermissions || {},
          enforced: Object.prototype.hasOwnProperty.call(mePayload, "subjectPermissions"),
        },
      });
    };

    void load().catch(() => {
      if (!mounted) return;
      setSession({ status: "blocked", student: null });
    });

    return () => {
      mounted = false;
    };
  }, [router.isReady, router.pathname, router]);

  const providerValue = useMemo(
    () => ({
      status: session.status,
      student: session.student,
    }),
    [session.status, session.student]
  );

  const gameAccessValue = useMemo(
    () => (gameAccess.status === "ready" && gameAccess.data ? buildStudentGameAccessView(gameAccess.data) : null),
    [gameAccess.status, gameAccess.data]
  );

  const loginHref = `/student/login?next=${encodeURIComponent(loginNextPath)}`;

  const showLoader =
    session.status === "loading" || (needsGameAccess && gameAccess.status === "loading");

  const subjectAccessValue = useMemo(
    () => session.subjectAccess || { enforced: false, allowStudentGradePicker: false, subjectPermissions: {} },
    [session.subjectAccess]
  );

  const wrapWithSubjectAccess = (node) => (
    <StudentSubjectAccessProvider
      enforced={subjectAccessValue.enforced}
      allowStudentGradePicker={subjectAccessValue.allowStudentGradePicker}
      subjectPermissions={subjectAccessValue.subjectPermissions}
    >
      {node}
    </StudentSubjectAccessProvider>
  );

  const pageContent =
    session.status !== "ok" ? (
      <StudentGateShell pathname={pathname}>
        <StudentGateBlockedPanel loginHref={loginHref} />
      </StudentGateShell>
    ) : needsGameAccess && gameAccessValue ? (
      wrapWithSubjectAccess(
        <StudentGameAccessProvider value={gameAccessValue}>{children}</StudentGameAccessProvider>
      )
    ) : (
      wrapWithSubjectAccess(children)
    );

  return (
    <StudentSessionProvider value={providerValue}>
      {showLoader ? (
        <StudentLoadingPanel message="טוען..." fullPage />
      ) : (
        pageContent
      )}
    </StudentSessionProvider>
  );
}
