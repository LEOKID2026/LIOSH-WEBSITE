import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import TeacherPortalShell from "../../components/teacher-portal/TeacherPortalShell";
import TeacherDashboardClient from "../../components/teacher-portal/TeacherDashboardClient";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import {
  getPrivateTeacherLayoutProps,
  getTeacherPortalTheme,
  isPrivateTeacherPortalAuth,
} from "../../lib/teacher-ui/teacher-portal-theme.client.js";
import { getLearningSupabaseBrowserClient } from "../../lib/learning-supabase/client";
import { withTimeout } from "../../lib/teacher-portal/async-utils.js";
import { resolveTeacherPortalAuth } from "../../lib/teacher-portal/use-teacher-portal-session";
import { teacherAuthFetch } from "../../lib/teacher-portal/teacher-ui.he.js";

export async function getServerSideProps() {
  const { isTeacherPortalLinkEnabled: linkEnabled } = await import(
    "../../lib/teacher-server/teacher-session.server.js"
  );
  return {
    props: {
      linkEnabled: linkEnabled(),
    },
  };
}

async function postTeacherOnboard(accessToken) {
  const res = await teacherAuthFetch(accessToken, "/api/teacher/onboard", {
    method: "POST",
    body: JSON.stringify({}),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export default function TeacherDashboardPage({ linkEnabled }) {
  const router = useRouter();
  const { theme, isBright } = useStudentTheme();
  const supabaseRef = useRef(null);
  const activityRequestRef = useRef(0);
  const [state, setState] = useState("loading");
  const [loadingHint, setLoadingHint] = useState("מאמת חיבור…");
  const [dashboard, setDashboard] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [authMethod, setAuthMethod] = useState(null);

  const loadDashboardActivity = useCallback(async (token) => {
    const requestId = activityRequestRef.current + 1;
    activityRequestRef.current = requestId;
    setActivityLoading(true);
    try {
      const res = await withTimeout(
        teacherAuthFetch(token, "/api/teacher/dashboard/activity"),
        180_000,
        "dashboard_activity_fetch"
      );
      const body = await res.json().catch(() => ({}));
      if (activityRequestRef.current !== requestId) return false;
      if (res.status === 200 && body?.data) {
        setDashboard(body.data);
        return true;
      }
    } catch {
      /* timeout or network — shell remains usable */
    } finally {
      if (activityRequestRef.current === requestId) {
        setActivityLoading(false);
      }
    }
    return false;
  }, []);

  const loadDashboardShell = useCallback(async (token, { backgroundActivity = true } = {}) => {
    setLoadingHint("טוען לוח בקרה…");
    try {
      const res = await withTimeout(
        teacherAuthFetch(token, "/api/teacher/dashboard"),
        30_000,
        "dashboard_shell_fetch"
      );
      const body = await res.json().catch(() => ({}));
      if (res.status === 200 && body?.data) {
        setDashboard(body.data);
        setState("ready");
        if (backgroundActivity) {
          void loadDashboardActivity(token);
        }
        return true;
      }
    } catch {
      /* timeout or network */
    }
    setState("data_load_error");
    return false;
  }, [loadDashboardActivity]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!supabaseRef.current) {
      supabaseRef.current = getLearningSupabaseBrowserClient();
    }

    let mounted = true;

    async function load() {
      const supabase = supabaseRef.current;
      const session = await resolveTeacherPortalAuth(supabase);
      if (!mounted) return;

      if (!session.ok) {
        if (session.code === "stale_session" || session.code === "session_timeout") {
          router.replace("/teacher/login");
          return;
        }
        router.replace("/school/staff/login");
        return;
      }

      const token = session.token;
      const isStaffCookie = session.authMethod === "staff_cookie";
      setAuthMethod(session.authMethod);
      setAccessToken(token);
      setLoadingHint("טוען לוח בקרה…");

      let dash;
      try {
        const res = await withTimeout(
          teacherAuthFetch(token, "/api/teacher/dashboard"),
          30_000,
          "dashboard_shell_fetch"
        );
        dash = { status: res.status, body: await res.json().catch(() => ({})) };
      } catch {
        if (mounted) setState("data_load_error");
        return;
      }

      if (!mounted) return;

      if (dash.status === 403) {
        const code = dash.body?.error?.code;
        if (code === "entitlement_pending" || code === "entitlement_rejected") {
          router.replace("/teacher/pending");
          return;
        }
        if (!isStaffCookie) await supabase.auth.signOut();
        router.replace(isStaffCookie ? "/school/staff/login" : "/teacher/login");
        return;
      }

      if (dash.status === 401) {
        if (!isStaffCookie) await supabase.auth.signOut();
        router.replace(isStaffCookie ? "/school/staff/login" : "/teacher/login");
        return;
      }

      if (dash.status === 404 && !isStaffCookie) {
        const onboard = await postTeacherOnboard(token);
        if (!mounted) return;
        if (onboard.status === 200 || onboard.status === 201) {
          await loadDashboardShell(token);
          return;
        }
        if (onboard.body?.error?.code === "db_schema_not_ready") {
          setState("schema_not_ready");
          return;
        }
        await supabase.auth.signOut();
        router.replace("/teacher/login");
        return;
      }

      if (dash.status === 404 && isStaffCookie) {
        router.replace("/school/staff/login");
        return;
      }

      if (dash.status !== 200 || !dash.body?.data) {
        setState("data_load_error");
        return;
      }

      setDashboard(dash.body.data);
      setState("ready");
      void loadDashboardActivity(token);
    }

    load();
    return () => {
      mounted = false;
      activityRequestRef.current += 1;
    };
  }, [router, loadDashboardShell, loadDashboardActivity]);

  const onLogout = async () => {
    const supabase = supabaseRef.current;
    if (supabase) await supabase.auth.signOut();
    router.replace("/teacher/login");
  };

  const onRefresh = useCallback(async () => {
    if (accessToken) await loadDashboardShell(accessToken);
  }, [accessToken, loadDashboardShell]);

  const isPrivateTeacher = Boolean(dashboard && !dashboard?.schoolMembership?.schoolId);
  const isPrivateTeacherSession = authMethod ? isPrivateTeacherPortalAuth(authMethod) : true;
  const usePrivateTeacherTheme =
    isPrivateTeacherSession &&
    (state === "loading" ||
      state === "schema_not_ready" ||
      state === "data_load_error" ||
      (isPrivateTeacher && state === "ready"));
  const privateLayoutProps = usePrivateTeacherTheme ? getPrivateTeacherLayoutProps(theme) : {};
  const shellTheme = getTeacherPortalTheme(usePrivateTeacherTheme && isBright);

  if (state === "loading" || state === "unauthenticated") {
    return (
      <Layout {...privateLayoutProps}>
        <TeacherPortalShell>
          <p className={shellTheme.shellLoading} data-testid="teacher-dashboard-root" data-state={state}>
            {loadingHint}
          </p>
        </TeacherPortalShell>
      </Layout>
    );
  }

  if (state === "schema_not_ready" || state === "data_load_error") {
    const msg =
      state === "schema_not_ready"
        ? "המערכת עדיין מתכוננת. נסה שנית בעוד מספר דקות."
        : "אירעה שגיאה בטעינת הנתונים. רענן את הדף ונסה שנית.";
    return (
      <Layout {...privateLayoutProps}>
        <TeacherPortalShell title="לוח הבקרה שלי" titleClassName={shellTheme.shellTitle}>
          <p className={shellTheme.shellError} data-testid="teacher-dashboard-root" data-state={state} role="alert">
            {msg}
          </p>
        </TeacherPortalShell>
      </Layout>
    );
  }

  return (
    <Layout {...privateLayoutProps}>
      <div
        data-testid="teacher-dashboard-root"
        data-state="ready"
        data-activity-loading={activityLoading ? "true" : "false"}
        data-teacher-id={dashboard?.teacher?.teacherId || ""}
        data-link-enabled={linkEnabled ? "true" : "false"}
      >
        <TeacherPortalShell
          title="לוח הבקרה שלי"
          titleClassName={shellTheme.shellTitle}
          schoolMembership={dashboard?.schoolMembership}
        >
          <TeacherDashboardClient
            accessToken={accessToken}
            dashboard={dashboard}
            activityLoading={activityLoading}
            onLogout={onLogout}
            onRefresh={onRefresh}
            bright={usePrivateTeacherTheme && isBright}
          />
        </TeacherPortalShell>
      </div>
    </Layout>
  );
}
