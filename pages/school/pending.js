import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import SchoolPortalShell from "../../components/school-portal/SchoolPortalShell";
import RegistrationPendingPanel from "../../components/auth/RegistrationPendingPanel";
import { getLearningSupabaseBrowserClient } from "../../lib/learning-supabase/client";
import { resolveSchoolPortalAuth } from "../../lib/teacher-portal/use-teacher-portal-session";
import { schoolAuthFetch } from "../../lib/school-portal/school-ui.he";

export default function SchoolPendingPage() {
  const router = useRouter();
  const [state, setState] = useState("loading");
  const [rejected, setRejected] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const supabase = getLearningSupabaseBrowserClient();
      const session = await resolveSchoolPortalAuth(supabase);
      if (!mounted) return;

      if (!session.ok) {
        router.replace("/teacher/login");
        return;
      }

      const res = await schoolAuthFetch(session.token, "/api/school/me");
      const body = await res.json().catch(() => ({}));
      if (!mounted) return;

      if (res.status === 200) {
        router.replace("/school/dashboard");
        return;
      }

      const code = body?.error?.code;
      if (code === "entitlement_rejected") {
        setRejected(true);
        setState("ready");
        return;
      }
      if (code === "entitlement_pending" || code === "school_inactive") {
        setRejected(false);
        setState("ready");
        return;
      }

      router.replace("/teacher/login");
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [router]);

  const onLogout = async () => {
    const supabase = getLearningSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/teacher/login");
  };

  return (
    <Layout>
      <SchoolPortalShell title="סטטוס רישום">
        {state === "loading" ? (
          <p className="text-white/60 text-sm" data-testid="school-pending-root" data-state="loading">
            טוען…
          </p>
        ) : (
          <div data-testid="school-pending-root" data-state={rejected ? "rejected" : "pending"}>
            <RegistrationPendingPanel variant="school" rejected={rejected} />
            <button
              type="button"
              onClick={() => void onLogout()}
              className="mt-6 rounded border border-white/20 px-4 py-2 text-sm text-white/70 hover:bg-white/5"
            >
              יציאה
            </button>
          </div>
        )}
      </SchoolPortalShell>
    </Layout>
  );
}
