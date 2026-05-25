import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import TeacherPortalShell from "../../components/teacher-portal/TeacherPortalShell";
import TeacherDashboardClient from "../../components/teacher-portal/TeacherDashboardClient";
import { getLearningSupabaseBrowserClient } from "../../lib/learning-supabase/client";
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

async function fetchTeacherDashboard(accessToken) {
  const res = await teacherAuthFetch(accessToken, "/api/teacher/dashboard");
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
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
  const supabaseRef = useRef(null);
  const [state, setState] = useState("loading");
  const [dashboard, setDashboard] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  const loadDashboard = useCallback(async (token) => {
    const dash = await fetchTeacherDashboard(token);
    if (dash.status === 200 && dash.body?.data) {
      setDashboard(dash.body.data);
      setState("ready");
      return true;
    }
    setState("data_load_error");
    return false;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!supabaseRef.current) {
      supabaseRef.current = getLearningSupabaseBrowserClient();
    }

    let mounted = true;

    async function load() {
      const supabase = supabaseRef.current;
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) {
        if (mounted) {
          setState("unauthenticated");
          router.replace("/teacher/login");
        }
        return;
      }

      let dash = await fetchTeacherDashboard(token);
      if (!mounted) return;

      if (dash.status === 401 || dash.status === 403) {
        await supabase.auth.signOut();
        router.replace(dash.status === 403 ? "/" : "/teacher/login");
        return;
      }

      if (dash.status === 404) {
        const onboard = await postTeacherOnboard(token);
        if (!mounted) return;
        if (onboard.status === 200 || onboard.status === 201) {
          dash = await fetchTeacherDashboard(token);
        } else if (onboard.body?.error?.code === "db_schema_not_ready") {
          setState("schema_not_ready");
          return;
        } else {
          await supabase.auth.signOut();
          router.replace("/teacher/login");
          return;
        }
      }

      if (dash.status !== 200 || !dash.body?.data) {
        setState("data_load_error");
        return;
      }

      setAccessToken(token);
      setDashboard(dash.body.data);
      setState("ready");
    }

    load();
    return () => {
      mounted = false;
    };
  }, [router]);

  const onLogout = async () => {
    const supabase = supabaseRef.current;
    if (supabase) await supabase.auth.signOut();
    router.replace("/teacher/login");
  };

  const onRefresh = useCallback(async () => {
    if (accessToken) await loadDashboard(accessToken);
  }, [accessToken, loadDashboard]);

  if (state === "loading" || state === "unauthenticated") {
    return (
      <Layout>
        <TeacherPortalShell>
          <p className="text-white/60" data-testid="teacher-dashboard-root" data-state={state}>
            טוען…
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
      <Layout>
        <TeacherPortalShell title="לוח הבקרה שלי">
          <p className="text-red-300" data-testid="teacher-dashboard-root" data-state={state} role="alert">
            {msg}
          </p>
        </TeacherPortalShell>
      </Layout>
    );
  }

  return (
    <Layout>
      <div
        data-testid="teacher-dashboard-root"
        data-state="ready"
        data-teacher-id={dashboard?.teacher?.teacherId || ""}
        data-link-enabled={linkEnabled ? "true" : "false"}
      >
        <TeacherPortalShell title="לוח הבקרה שלי">
          <TeacherDashboardClient
            accessToken={accessToken}
            dashboard={dashboard}
            onLogout={onLogout}
            onRefresh={onRefresh}
          />
        </TeacherPortalShell>
      </div>
    </Layout>
  );
}
