import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import TeacherPortalShell from "../../components/teacher-portal/TeacherPortalShell";
import { getLearningSupabaseBrowserClient } from "../../lib/learning-supabase/client";
import { isAdminAppMetadataUser } from "../../lib/admin-portal/use-admin-session";
import { resolveTeacherAccessToken } from "../../lib/teacher-portal/use-teacher-portal-session";

export async function getServerSideProps() {
  const { isTeacherPortalInviteOnly } = await import(
    "../../lib/teacher-server/teacher-session.server.js"
  );
  return {
    props: {
      inviteOnly: isTeacherPortalInviteOnly(),
    },
  };
}

function teacherPostLoginPath(meBody) {
  if (meBody?.data?.schoolMembership?.isSchoolManager) {
    return "/school/dashboard";
  }
  return "/teacher/dashboard";
}

async function fetchTeacherMe(accessToken) {
  const res = await fetch("/api/teacher/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: "same-origin",
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function postTeacherOnboard(accessToken, payload) {
  const res = await fetch("/api/teacher/onboard", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify(payload || {}),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export default function TeacherLoginPage({ inviteOnly }) {
  const router = useRouter();
  const supabaseRef = useRef(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [clientReady, setClientReady] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!supabaseRef.current) {
      supabaseRef.current = getLearningSupabaseBrowserClient();
    }
    setClientReady(true);
  }, []);

  useEffect(() => {
    if (!clientReady || !supabaseRef.current) return;
    let mounted = true;
    const supabase = supabaseRef.current;
    supabase.auth.getSession().then(async () => {
      const session = await resolveTeacherAccessToken(supabase);
      if (!mounted || !session.ok) return;
      const { data: userData } = await supabase.auth.getUser();
      if (isAdminAppMetadataUser(userData?.user)) {
        router.replace("/admin/teachers");
        return;
      }
      const me = await fetchTeacherMe(session.token);
      if (me.status === 200) {
        router.replace(teacherPostLoginPath(me.body));
      }
    });
    return () => {
      mounted = false;
    };
  }, [clientReady, router]);

  const signOutAndStayOnLogin = async () => {
    const supabase = supabaseRef.current;
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!supabaseRef.current) {
      try {
        supabaseRef.current = getLearningSupabaseBrowserClient();
      } catch (err) {
        setLoginError("שגיאת חיבור (תצורת לקוח חסרה). רענן את הדף או צור קשר עם התמיכה.");
        return;
      }
    }
    setBusy(true);
    setLoginError("");
    const supabase = supabaseRef.current;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error || !data?.session?.access_token) {
        setLoginError(
          "כתובת הדוא״ל או הסיסמה שגויים. אם אתה מורה רשום — נסה שנית."
        );
        await signOutAndStayOnLogin();
        return;
      }

      const token = data.session.access_token;

      if (isAdminAppMetadataUser(data.session.user)) {
        router.replace("/admin/teachers");
        return;
      }

      let me = await fetchTeacherMe(token);

      if (me.status === 503 && me.body?.error?.code === "feature_disabled") {
        setLoginError("פורטל המורים אינו זמין כרגע.");
        await signOutAndStayOnLogin();
        return;
      }

      if (me.status === 403 || me.body?.error?.code === "not_a_teacher") {
        setLoginError(
          "כתובת הדוא״ל או הסיסמה שגויים. אם אתה מורה רשום — נסה שנית."
        );
        await signOutAndStayOnLogin();
        return;
      }

      if (me.status === 404 && me.body?.error?.code === "teacher_profile_missing") {
        const onboard = await postTeacherOnboard(token, {});
        if (
          onboard.status !== 200 &&
          onboard.status !== 201 &&
          onboard.body?.error?.code !== "db_schema_not_ready"
        ) {
          setLoginError(
            "כתובת הדוא״ל או הסיסמה שגויים. אם אתה מורה רשום — נסה שנית."
          );
          await signOutAndStayOnLogin();
          return;
        }
        if (onboard.body?.error?.code === "db_schema_not_ready") {
          setLoginError("המערכת עדיין מתכוננת. נסה שנית בעוד מספר דקות.");
          await signOutAndStayOnLogin();
          return;
        }
        me = await fetchTeacherMe(token);
      }

      if (me.status === 200) {
        router.replace(teacherPostLoginPath(me.body));
        return;
      }

      setLoginError(
        "כתובת הדוא״ל או הסיסמה שגויים. אם אתה מורה רשום — נסה שנית."
      );
      await signOutAndStayOnLogin();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <TeacherPortalShell title="כניסה למורים">
        <div
          data-testid="teacher-login-root"
          data-invite-only={inviteOnly ? "true" : "false"}
        >
          {inviteOnly ? (
            <p className="text-white/70 text-sm mb-6">
              הכניסה מיועדת למורים שהתווספו על ידי צוות לִישׁ.
            </p>
          ) : null}
          <form onSubmit={onSubmit} className="space-y-4 max-w-md" autoComplete="on" noValidate>
            <label className="block text-sm">
              <span className="text-white/80">כתובת דוא״ל</span>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                required
                autoComplete="username"
                placeholder="המייל שלך"
                className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-white/80">סיסמה</span>
              <input
                type="password"
                name="password"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                required
                autoComplete="current-password"
                className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-amber-500 text-black font-semibold px-6 py-2 disabled:opacity-60"
            >
              {busy ? "מתחבר…" : "כניסה"}
            </button>
          </form>
          {loginError ? (
            <p className="mt-4 text-sm text-red-300" role="alert">
              {loginError}
            </p>
          ) : null}
        </div>
      </TeacherPortalShell>
    </Layout>
  );
}
