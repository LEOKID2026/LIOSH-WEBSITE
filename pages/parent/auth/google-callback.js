import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../../components/Layout";
import PortalLoadingPanel from "../../../components/ui/PortalLoadingPanel.jsx";
import { getLearningSupabaseBrowserClient } from "../../../lib/learning-supabase/client";
import {
  clearParentGoogleOAuthFlow,
  completeParentGoogleSession,
  establishParentGoogleOAuthSession,
} from "../../../lib/auth/parent-google-oauth.client.js";
import { useStudentTheme } from "../../../contexts/StudentThemeContext.jsx";
import { getParentPortalTheme } from "../../../lib/parent-ui/parent-portal-theme.client.js";

export default function ParentGoogleOAuthCallbackPage() {
  const router = useRouter();
  const { theme, isBright } = useStudentTheme();
  const T = getParentPortalTheme(isBright);
  const layoutProps = { studentTheme: theme, studentShell: "home" };
  const supabaseRef = useRef(null);
  const startedRef = useRef(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!supabaseRef.current) {
      supabaseRef.current = getLearningSupabaseBrowserClient();
    }
  }, []);

  useEffect(() => {
    if (!router.isReady || startedRef.current || !supabaseRef.current) return;
    startedRef.current = true;

    (async () => {
      const supabase = supabaseRef.current;
      const result = await establishParentGoogleOAuthSession(supabase, router);

      if (!result.ok || !result.session?.access_token) {
        clearParentGoogleOAuthFlow();
        await supabase.auth.signOut();
        const query = new URLSearchParams({
          oauth_error: "1",
        });
        router.replace(`/parent/login?${query.toString()}`);
        return;
      }

      const finished = await completeParentGoogleSession(result.session);
      clearParentGoogleOAuthFlow();

      if (!finished.ok) {
        await supabase.auth.signOut();
        const query = new URLSearchParams({
          oauth_error: "1",
          oauth_message: finished.messageHe || "",
        });
        router.replace(`/parent/login?${query.toString()}`);
        return;
      }

      router.replace(finished.redirectTo || "/parent/dashboard");
    })().catch(() => {
      clearParentGoogleOAuthFlow();
      setMessage("שגיאה בהתחברות עם Google. נסו שוב.");
    });
  }, [router]);

  return (
    <Layout {...layoutProps}>
      <div className="max-w-md mx-auto px-4 py-10" dir="rtl" lang="he">
        {message ? (
          <div className="space-y-3">
            <p className={T.error} role="alert">
              {message}
            </p>
            <Link href="/parent/login" className={T.link}>
              חזרה לכניסת הורים
            </Link>
          </div>
        ) : (
          <PortalLoadingPanel isBright={isBright} message="משלימים התחברות עם Google..." />
        )}
      </div>
    </Layout>
  );
}
