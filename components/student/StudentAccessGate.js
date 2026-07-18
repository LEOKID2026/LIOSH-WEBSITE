import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../Layout";
import { syncStudentLocalStorageIdentity } from "../../lib/learning-student-local-sync";
import { isStudentIdentityDiagnosticsEnabled } from "../../lib/dev-student-identity-client";
import {
  fetchStudentMeClient,
  getCachedStudentMe,
  invalidateStudentMeClientCache,
} from "../../lib/learning-client/studentMeClient";
import { StudentSessionProvider } from "./StudentSessionContext";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import StudentLoadingPanel from "../ui/StudentLoadingPanel.jsx";
import { StudentGameAccessProvider } from "../../contexts/StudentGameAccessContext.jsx";
import { StudentSubjectAccessProvider } from "../../contexts/StudentSubjectAccessContext.jsx";
import {
  buildStudentGameAccessView,
} from "../../hooks/useStudentGameAccess.js";
import {
  fetchStudentGameAccessCached,
  getCachedStudentGameAccess,
  invalidateStudentGameAccessClientCache,
} from "../../lib/learning-client/studentGameAccessClient.js";
import { prefetchStudentHubRoutes } from "../../lib/student-ui/student-hub-prefetch.client.js";
import {
  perfCount,
  perfMark,
  perfMeasure,
  perfMount,
} from "../../lib/student-ui/student-session-instrumentation.client.js";
import {
  perfBeginScenario,
  perfMarkGateMount,
  perfMarkShellVisible,
} from "../../lib/student-ui/student-runtime-perf.client.js";

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

function buildSubjectAccessFromMe(mePayload) {
  return {
    allowStudentGradePicker: mePayload?.allowStudentGradePicker === true,
    subjectPermissions: mePayload?.subjectPermissions || {},
    enforced: Object.prototype.hasOwnProperty.call(mePayload || {}, "subjectPermissions"),
  };
}

const EMPTY_SESSION = { status: "loading", student: null, subjectAccess: null };
const EMPTY_GAME_ACCESS = { status: "loading", data: null };

function applyCachedSession(setters) {
  const cached = getCachedStudentMe();
  if (!cached?.student?.id) return false;

  setters.setSession({
    status: "ok",
    student: cached.student,
    subjectAccess: buildSubjectAccessFromMe(cached),
  });
  setters.setInitialColdLoad(false);

  const gameCached = getCachedStudentGameAccess(cached.student.id);
  if (gameCached) {
    setters.setGameAccess({ status: "ready", data: gameCached });
  }
  perfMarkShellVisible();
  return true;
}

export default function StudentAccessGate({ children }) {
  const router = useRouter();
  const pathname = router.pathname || "";
  const bootstrappedRef = useRef(false);
  const mountCountedRef = useRef(false);
  const hubsPrefetchedRef = useRef(false);

  /** @type {[{ status: "loading" | "ok" | "blocked", student: object | null, subjectAccess?: object|null }, function]: any} */
  const [session, setSession] = useState(EMPTY_SESSION);
  /** @type {[{ status: "loading" | "ready" | "error", data: object | null }, function]: any} */
  const [gameAccess, setGameAccess] = useState(EMPTY_GAME_ACCESS);
  const [loginNextPath, setLoginNextPath] = useState("/learning");
  const [initialColdLoad, setInitialColdLoad] = useState(true);
  const [bootstrapMessage] = useState("טוען...");

  useEffect(() => {
    if (!mountCountedRef.current) {
      mountCountedRef.current = true;
      perfMount("StudentAccessGate");
      perfMarkGateMount();
    }
  }, []);

  const bootstrapSession = useCallback(async () => {
    perfBeginScenario("cold-start");
    perfMark("student_gate_bootstrap_start");
    perfCount("api:/api/student/me");

    const meResult = await fetchStudentMeClient({
      force: session.status !== "ok",
      background: session.status === "ok",
    });

    if (!meResult.ok || !meResult.payload?.student?.id) {
      setSession({ status: "blocked", student: null, subjectAccess: null });
      const pathForNext = router.asPath || "/learning";
      const safeNext = isSafeNextPath(pathForNext) ? pathForNext : "/learning";
      router.replace(`/student/login?next=${encodeURIComponent(safeNext)}`);
      return;
    }

    const mePayload = meResult.payload;
    if (isStudentIdentityDiagnosticsEnabled()) {
      console.log("[StudentAccessGate] /me student", {
        id: mePayload.student?.id,
        fullName: mePayload.student?.full_name,
        gradeLevel: mePayload.student?.grade_level,
        fromCache: meResult.fromCache,
      });
    }

    syncStudentLocalStorageIdentity(mePayload.student, "StudentAccessGate after /me");

    setSession({
      status: "ok",
      student: mePayload.student,
      subjectAccess: buildSubjectAccessFromMe(mePayload),
    });
    setInitialColdLoad(false);
    perfMeasure("student_me_ready", "student_gate_bootstrap_start");
    perfMark("student-shell-visible");
    perfMarkShellVisible();

    if (!hubsPrefetchedRef.current) {
      hubsPrefetchedRef.current = true;
      prefetchStudentHubRoutes(router);
    }

    const sid = mePayload.student.id;
    perfCount("api:/api/student/game-access");
    void fetchStudentGameAccessCached(sid, {
      force: !getCachedStudentGameAccess(sid),
      background: Boolean(getCachedStudentGameAccess(sid)),
    }).then((gameResult) => {
      if (gameResult.ok && gameResult.data) {
        setGameAccess({ status: "ready", data: gameResult.data });
      } else if (!gameResult.fromCache) {
        setGameAccess({ status: "error", data: null });
      }
    });
  }, [router, session.status]);

  useEffect(() => {
    if (!router.isReady || bootstrappedRef.current) return undefined;
    bootstrappedRef.current = true;

    const pathForNext = router.asPath || "/learning";
    const safeNext = isSafeNextPath(pathForNext) ? pathForNext : "/learning";
    setLoginNextPath(safeNext);

    applyCachedSession({ setSession, setGameAccess, setInitialColdLoad });

    void bootstrapSession().catch(() => {
      setSession({ status: "blocked", student: null, subjectAccess: null });
      setInitialColdLoad(false);
    });

    return undefined;
  }, [router.isReady, router.asPath, bootstrapSession]);

  const providerValue = useMemo(
    () => ({
      status: session.status,
      student: session.student,
    }),
    [session.status, session.student],
  );

  const gameAccessValue = useMemo(() => {
    if (gameAccess.status === "ready" && gameAccess.data) {
      return buildStudentGameAccessView(gameAccess.data);
    }
    return {
      state: gameAccess.status === "error" ? "error" : "loading",
      data: null,
      error: gameAccess.status === "error" ? "load_failed" : null,
      reload: async () => null,
      gamesByKey: {},
      categoryState: () => null,
      playableGames: () => [],
      enabledGames: () => [],
      permissions: null,
      isGuest: false,
    };
  }, [gameAccess.status, gameAccess.data]);

  const loginHref = `/student/login?next=${encodeURIComponent(loginNextPath)}`;

  const showFullLoader =
    initialColdLoad && session.status === "loading" && !session.student;

  const subjectAccessValue = useMemo(
    () => session.subjectAccess || { enforced: false, allowStudentGradePicker: false, subjectPermissions: {} },
    [session.subjectAccess],
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
    session.status === "blocked" ? (
      <StudentGateShell pathname={pathname}>
        <StudentGateBlockedPanel loginHref={loginHref} />
      </StudentGateShell>
    ) : (
      wrapWithSubjectAccess(
        <StudentGameAccessProvider value={gameAccessValue}>{children}</StudentGameAccessProvider>,
      )
    );

  return (
    <StudentSessionProvider value={providerValue}>
      {showFullLoader ? (
        <StudentLoadingPanel message={bootstrapMessage} fullPage />
      ) : (
        pageContent
      )}
    </StudentSessionProvider>
  );
}

export {
  invalidateStudentMeClientCache,
  invalidateStudentGameAccessClientCache,
};
