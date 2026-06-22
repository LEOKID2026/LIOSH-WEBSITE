import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import TeacherPortalShell from "../../components/teacher-portal/TeacherPortalShell";
import RegistrationPendingPanel from "../../components/auth/RegistrationPendingPanel";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import {
  getPrivateTeacherLayoutProps,
  getTeacherPortalTheme,
} from "../../lib/teacher-ui/teacher-portal-theme.client.js";
import { getLearningSupabaseBrowserClient } from "../../lib/learning-supabase/client";
import { fetchTeacherMe, teacherPostLoginPath } from "../../lib/auth/auth-post-reset-redirect";
import { resolveTeacherAccessToken } from "../../lib/teacher-portal/use-teacher-portal-session";

export default function TeacherPendingPage() {
  const router = useRouter();
  const { theme, isBright } = useStudentTheme();
  const layoutProps = getPrivateTeacherLayoutProps(theme);
  const T = getTeacherPortalTheme(isBright);
  const supabaseRef = useRef(null);
  const [state, setState] = useState("loading");
  const [rejected, setRejected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!supabaseRef.current) {
      supabaseRef.current = getLearningSupabaseBrowserClient();
    }

    let mounted = true;

    async function load() {
      const supabase = supabaseRef.current;
      const session = await resolveTeacherAccessToken(supabase);
      if (!mounted) return;

      if (!session.ok) {
        router.replace("/teacher/login");
        return;
      }

      const me = await fetchTeacherMe(session.token);
      if (!mounted) return;

      if (me.status === 200) {
        router.replace(teacherPostLoginPath(me.body));
        return;
      }

      const code = me.body?.error?.code;
      if (code === "entitlement_rejected") {
        setRejected(true);
        setState("ready");
        return;
      }
      if (code === "entitlement_pending") {
        setRejected(false);
        setState("ready");
        return;
      }

      await supabase.auth.signOut();
      router.replace("/teacher/login");
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [router]);

  const onLogout = async () => {
    const supabase = supabaseRef.current;
    if (supabase) await supabase.auth.signOut();
    router.replace("/teacher/login");
  };

  return (
    <Layout {...layoutProps}>
      <TeacherPortalShell title="סטטוס בקשה" titleClassName={T.shellTitle}>
        {state === "loading" ? (
          <p className={T.shellLoading} data-testid="teacher-pending-root" data-state="loading">
            טוען…
          </p>
        ) : (
          <div data-testid="teacher-pending-root" data-state={rejected ? "rejected" : "pending"}>
            <RegistrationPendingPanel variant="teacher" rejected={rejected} bright={isBright} />
            <button
              type="button"
              onClick={() => void onLogout()}
              className={`mt-6 ${T.logoutBtn}`}
            >
              יציאה
            </button>
          </div>
        )}
      </TeacherPortalShell>
    </Layout>
  );
}
