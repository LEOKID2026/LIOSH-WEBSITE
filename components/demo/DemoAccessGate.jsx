import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../Layout";
import { StudentSessionProvider } from "../student/StudentSessionContext";
import { StudentSubjectAccessProvider } from "../../contexts/StudentSubjectAccessContext.jsx";
import { StudentGameAccessProvider } from "../../contexts/StudentGameAccessContext.jsx";
import { buildStudentGameAccessView } from "../../hooks/useStudentGameAccess.js";
import { studentPathNeedsGameAccess } from "../../lib/student-ui/student-game-access-paths.client.js";
import { buildDemoDisplayStudent, readDemoSession } from "../../lib/demo/demo-mode.client.js";
import { isDemoOnlineGameRoute } from "../../lib/demo/demo-online-game-routes.client.js";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import StudentLoadingPanel from "../ui/StudentLoadingPanel.jsx";
import { DemoModeProvider, useDemoMode } from "./DemoModeContext.jsx";
import DemoModeBar from "./DemoModeBar.jsx";
import DemoTimeExpiredModal from "./DemoTimeExpiredModal.jsx";
import DemoOnlineGameUnavailable from "./DemoOnlineGameUnavailable.jsx";

function resolveGateLayoutShell(pathname) {
  const path = pathname || "";
  if (path.startsWith("/student/")) return "home";
  return "learning";
}

function DemoGateShell({ pathname, children }) {
  const { theme } = useStudentTheme();
  return (
    <Layout studentTheme={theme} studentShell={resolveGateLayoutShell(pathname)}>
      {children}
    </Layout>
  );
}

function DemoAccessGateInner({ children }) {
  const router = useRouter();
  const pathname = router.pathname || "";
  const { session, timeExpiredModalOpen, setTimeExpiredModalOpen } = useDemoMode();
  const needsGameAccess = studentPathNeedsGameAccess(pathname);

  const [catalogState, setCatalogState] = useState("loading");
  const [catalogData, setCatalogData] = useState(null);

  const gradeLevel = session?.gradeLevel || readDemoSession()?.gradeLevel || "g3";

  const loadCatalog = useCallback(async () => {
    setCatalogState("loading");
    try {
      const res = await fetch(
        `/api/demo/catalog?gradeLevel=${encodeURIComponent(gradeLevel)}`,
        { credentials: "same-origin", cache: "no-store" },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setCatalogState("error");
        setCatalogData(null);
        return;
      }
      setCatalogData(json);
      setCatalogState("ready");
    } catch {
      setCatalogState("error");
      setCatalogData(null);
    }
  }, [gradeLevel]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    const onGrade = () => void loadCatalog();
    window.addEventListener("leokids:demo-grade-changed", onGrade);
    return () => window.removeEventListener("leokids:demo-grade-changed", onGrade);
  }, [loadCatalog]);

  const displayStudent = useMemo(() => buildDemoDisplayStudent(session), [session]);

  const sessionValue = useMemo(
    () => ({
      status: "ok",
      student: displayStudent,
    }),
    [displayStudent],
  );

  const subjectAccessValue = useMemo(
    () =>
      catalogData?.subjectAccess || {
        enforced: true,
        allowStudentGradePicker: true,
        subjectPermissions: {},
      },
    [catalogData?.subjectAccess],
  );

  const gameAccessValue = useMemo(() => {
    if (!needsGameAccess || !catalogData) return null;
    return buildStudentGameAccessView(catalogData);
  }, [needsGameAccess, catalogData]);

  if (isDemoOnlineGameRoute(pathname)) {
    return <DemoOnlineGameUnavailable />;
  }

  if (catalogState === "loading") {
    return (
      <DemoGateShell pathname={pathname}>
        <StudentLoadingPanel message="טוען מצב הדגמה..." fullPage />
      </DemoGateShell>
    );
  }

  if (catalogState === "error") {
    return (
      <DemoGateShell pathname={pathname}>
        <div className="px-4 py-8 text-center text-sm text-red-600" dir="rtl" lang="he">
          לא ניתן לטעון את מצב ההדגמה. נסו לרענן את הדף.
        </div>
      </DemoGateShell>
    );
  }

  const wrapSubject = (node) => (
    <StudentSubjectAccessProvider
      enforced={subjectAccessValue.enforced === true}
      allowStudentGradePicker={subjectAccessValue.allowStudentGradePicker === true}
      subjectPermissions={subjectAccessValue.subjectPermissions || {}}
    >
      {node}
    </StudentSubjectAccessProvider>
  );

  const pageContent =
    needsGameAccess && gameAccessValue ? (
      wrapSubject(
        <StudentGameAccessProvider value={gameAccessValue}>{children}</StudentGameAccessProvider>,
      )
    ) : (
      wrapSubject(children)
    );

  return (
    <StudentSessionProvider value={sessionValue}>
      <DemoModeBar />
      {timeExpiredModalOpen ? (
        <DemoTimeExpiredModal onClose={() => setTimeExpiredModalOpen(false)} />
      ) : null}
      {pageContent}
    </StudentSessionProvider>
  );
}

/** @param {{ children: import("react").ReactNode }} props */
export default function DemoAccessGate({ children }) {
  return (
    <DemoModeProvider>
      <DemoAccessGateInner>{children}</DemoAccessGateInner>
    </DemoModeProvider>
  );
}
