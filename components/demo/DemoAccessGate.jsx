import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../Layout";
import { StudentSessionProvider } from "../student/StudentSessionContext";
import { StudentSubjectAccessProvider } from "../../contexts/StudentSubjectAccessContext.jsx";
import { StudentGameAccessProvider } from "../../contexts/StudentGameAccessContext.jsx";
import { buildStudentGameAccessView } from "../../hooks/useStudentGameAccess.js";
import { buildDemoDisplayStudent, readDemoSession } from "../../lib/demo/demo-mode.client.js";
import { isDemoOnlineGameRoute } from "../../lib/demo/demo-online-game-routes.client.js";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import StudentLoadingPanel from "../ui/StudentLoadingPanel.jsx";
import { DemoModeProvider, useDemoMode } from "./DemoModeContext.jsx";
import DemoModeBar from "./DemoModeBar.jsx";
import DemoTimeExpiredModal from "./DemoTimeExpiredModal.jsx";
import DemoOnlineGameUnavailable from "./DemoOnlineGameUnavailable.jsx";
import {
  fetchDemoCatalogClient,
  getCachedDemoCatalog,
} from "../../lib/demo/demo-catalog-client.js";
import { perfMount } from "../../lib/student-ui/student-session-instrumentation.client.js";
import { prefetchStudentHubRoutes } from "../../lib/student-ui/student-hub-prefetch.client.js";

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
  const bootstrappedRef = useRef(false);
  const mountCountedRef = useRef(false);
  const hubsPrefetchedRef = useRef(false);

  const gradeLevel = session?.gradeLevel || "g3";

  const [catalogState, setCatalogState] = useState("loading");
  const [catalogData, setCatalogData] = useState(null);
  const [initialColdLoad, setInitialColdLoad] = useState(true);

  useEffect(() => {
    if (!mountCountedRef.current) {
      mountCountedRef.current = true;
      perfMount("DemoAccessGate");
    }
  }, []);

  const loadCatalog = useCallback(
    async ({ force = false } = {}) => {
      const cached = getCachedDemoCatalog(gradeLevel);
      if (!force && cached) {
        setCatalogData(cached);
        setCatalogState("ready");
        setInitialColdLoad(false);
        void fetchDemoCatalogClient(gradeLevel, { force: true, background: true });
        return;
      }

      if (!cached) {
        setCatalogState("loading");
      }

      const result = await fetchDemoCatalogClient(gradeLevel, { force: true });
      if (result.ok && result.data) {
        setCatalogData(result.data);
        setCatalogState("ready");
        setInitialColdLoad(false);
        if (!hubsPrefetchedRef.current) {
          hubsPrefetchedRef.current = true;
          prefetchStudentHubRoutes(router);
        }
        return;
      }
      if (!result.fromCache) {
        setCatalogState("error");
        setCatalogData(null);
        setInitialColdLoad(false);
      }
    },
    [gradeLevel],
  );

  useEffect(() => {
    if (bootstrappedRef.current) return undefined;
    bootstrappedRef.current = true;

    const cached = getCachedDemoCatalog(gradeLevel);
    if (cached) {
      setCatalogData(cached);
      setCatalogState("ready");
      setInitialColdLoad(false);
      void fetchDemoCatalogClient(gradeLevel, { force: true, background: true });
      if (!hubsPrefetchedRef.current) {
        hubsPrefetchedRef.current = true;
        prefetchStudentHubRoutes(router);
      }
      return undefined;
    }

    void loadCatalog({ force: true });
    return undefined;
  }, [gradeLevel, loadCatalog, router]);

  useEffect(() => {
    const onGrade = () => {
      bootstrappedRef.current = false;
      void loadCatalog({ force: true });
    };
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
    if (!catalogData) return null;
    return buildStudentGameAccessView(catalogData);
  }, [catalogData]);

  if (isDemoOnlineGameRoute(pathname)) {
    return <DemoOnlineGameUnavailable />;
  }

  if (initialColdLoad && catalogState === "loading") {
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

  const pageContent = gameAccessValue
    ? wrapSubject(
        <StudentGameAccessProvider value={gameAccessValue}>{children}</StudentGameAccessProvider>,
      )
    : wrapSubject(children);

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
