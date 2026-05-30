import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../components/Layout";
import PortalLoginHeading from "../../components/auth/PortalLoginHeading";
import TeacherRegistrationRequestForm from "../../components/auth/TeacherRegistrationRequestForm";
import { getLearningSupabaseBrowserClient } from "../../lib/learning-supabase/client";
import { isAdminAppMetadataUser } from "../../lib/admin-portal/use-admin-session";
import {
  fetchTeacherMe,
  teacherPostLoginPath,
} from "../../lib/auth/auth-post-reset-redirect";
import { AUTH_FORGOT_PASSWORD_LINK } from "../../lib/auth/auth-reset.he";
import {
  REG_SCHOOL_LINK,
  REG_TEACHER_INVITE_ONLY_LOGIN_NOTE,
  REG_TEACHER_LOGIN_TAB,
  REG_TEACHER_TAB,
} from "../../lib/auth/auth-registration.he";
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
  const [mode, setMode] = useState("login");

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
        return;
      }
      if (me.status === 403) {
        const code = me.body?.error?.code;
        if (code === "entitlement_pending" || code === "entitlement_rejected") {
          router.replace("/teacher/pending");
        }
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

      if (me.status === 403) {
        const code = me.body?.error?.code;
        if (code === "entitlement_pending" || code === "entitlement_rejected") {
          router.replace("/teacher/pending");
          return;
        }
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

      if (me.status === 403) {
        const code = me.body?.error?.code;
        if (code === "entitlement_pending" || code === "entitlement_rejected") {
          router.replace("/teacher/pending");
          return;
        }
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
      <div
        className={`mx-auto px-4 py-6 md:py-8 ${
          mode === "request" ? "max-w-4xl" : "max-w-md"
        }`}
        dir="rtl"
        lang="he"
      >
        <PortalLoginHeading title="כניסה למורים" className="!mb-4" />

        <div
          data-testid="teacher-login-root"
          data-invite-only={inviteOnly ? "true" : "false"}
        >
          <div className={`flex gap-2 mb-3 ${mode === "request" ? "max-w-md" : ""}`}>
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded px-3 py-2 text-sm font-semibold ${
                mode === "login" ? "bg-amber-500 text-black" : "bg-white/10 text-white/80"
              }`}
              data-testid="teacher-login-tab"
            >
              {REG_TEACHER_LOGIN_TAB}
            </button>
            <button
              type="button"
              onClick={() => setMode("request")}
              className={`flex-1 rounded px-3 py-2 text-sm font-semibold ${
                mode === "request" ? "bg-amber-500 text-black" : "bg-white/10 text-white/80"
              }`}
              data-testid="teacher-request-tab"
            >
              {REG_TEACHER_TAB}
            </button>
          </div>

          {mode === "request" ? (
            <TeacherRegistrationRequestForm />
          ) : (
            <>
              {inviteOnly ? (
                <p className="text-white/70 text-sm mb-3">{REG_TEACHER_INVITE_ONLY_LOGIN_NOTE}</p>
              ) : null}
              <form onSubmit={onSubmit} className="space-y-3" autoComplete="on" noValidate>
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
                  className="w-full rounded bg-amber-500 text-black font-semibold py-2 disabled:opacity-60"
                >
                  {busy ? "מתחבר…" : "כניסה"}
                </button>
                <p className="text-sm text-center">
                  <Link
                    href="/auth/forgot-password?portal=teacher"
                    className="text-amber-300 underline"
                    data-testid="teacher-forgot-password-link"
                  >
                    {AUTH_FORGOT_PASSWORD_LINK}
                  </Link>
                </p>
              </form>
              {loginError ? (
                <p className="mt-3 text-sm text-red-300" role="alert">
                  {loginError}
                </p>
              ) : null}
            </>
          )}

          <p className="mt-3 text-xs text-white/60 leading-relaxed max-w-md">
            בית ספר מעוניין להצטרף?{" "}
            <Link href="/school/register" className="text-amber-300 underline">
              {REG_SCHOOL_LINK}
            </Link>
          </p>
          <p className="mt-2 text-xs text-white/60 leading-relaxed">
            צוות בית ספר (מורה / מזכירות)?{" "}
            <Link href="/school/staff/login" className="text-amber-300 underline">
              כניסה בקוד צוות + PIN
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}
