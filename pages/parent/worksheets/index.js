import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import ParentWorksheetsHub from "../../../components/worksheets/ParentWorksheetsHub.jsx";
import { useStudentTheme } from "../../../contexts/StudentThemeContext.jsx";
import { getParentPortalTheme } from "../../../lib/parent-ui/parent-portal-theme.client.js";
import { getLearningSupabaseBrowserClient } from "../../../lib/learning-supabase/client";
import {
  clearParentBearerSessionAndRedirect,
  resolveParentBearerSession,
} from "../../../lib/parent-client/parent-bearer-session.client.js";

export default function ParentWorksheetsPage() {
  const router = useRouter();
  const { theme, isBright } = useStudentTheme();
  const T = getParentPortalTheme(isBright);
  const layoutProps = { studentTheme: theme, studentShell: "home" };
  const supabaseRef = useRef(null);

  const [session, setSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [clientReady, setClientReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!supabaseRef.current) {
      supabaseRef.current = getLearningSupabaseBrowserClient();
    }
    setClientReady(true);
  }, []);

  const bootstrap = useCallback(async () => {
    if (!supabaseRef.current) return;
    setLoading(true);
    const activeSession = await resolveParentBearerSession(supabaseRef.current);
    if (!activeSession?.access_token) {
      await clearParentBearerSessionAndRedirect(supabaseRef.current, router);
      return;
    }
    setSession(activeSession);

    try {
      const res = await fetch("/api/parent/list-students", {
        headers: { Authorization: `Bearer ${activeSession.access_token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (res.status === 401) {
          await clearParentBearerSessionAndRedirect(supabaseRef.current, router);
          return;
        }
        setStudents([]);
      } else {
        setStudents(data.students || []);
      }
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!clientReady) return;
    bootstrap();
  }, [clientReady, bootstrap]);

  if (!clientReady || loading || !session) {
    return (
      <Layout {...layoutProps}>
        <div dir="rtl" className="p-4 text-center text-slate-500">
          טוען…
        </div>
      </Layout>
    );
  }

  return (
    <Layout {...layoutProps}>
      <div className="worksheet-hub-container mx-auto px-4 py-4 md:px-6 md:py-6">
        <ParentWorksheetsHub session={session} students={students} T={T} />
      </div>
    </Layout>
  );
}
