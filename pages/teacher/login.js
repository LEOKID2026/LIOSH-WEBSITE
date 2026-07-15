import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../components/Layout";
import PageSeo from "../../components/seo/PageSeo";
import { getPublicPageSeo } from "../../lib/site/public-page-seo.he";
import PortalLoginHeading from "../../components/auth/PortalLoginHeading";
import TeacherRegistrationRequestForm from "../../components/auth/TeacherRegistrationRequestForm";
import PortalLoadingPanel from "../../components/ui/PortalLoadingPanel.jsx";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import {
  getPrivateTeacherLayoutProps,
  getTeacherPortalTheme,
} from "../../lib/teacher-ui/teacher-portal-theme.client.js";
import { getLearningSupabaseBrowserClient } from "../../lib/learning-supabase/client";
import { isAdminAppMetadataUser } from "../../lib/admin-portal/use-admin-session";
import {
  fetchTeacherMe,
  teacherPostLoginPath,
} from "../../lib/auth/auth-post-reset-redirect";
import PasswordField from "../../components/auth/PasswordField";
import { AUTH_FORGOT_PASSWORD_LINK } from "../../lib/auth/auth-reset.he";
import { trackProductEvent } from "../../lib/analytics/track-event.client.js";
import {
  REG_TEACHER_INVITE_ONLY_LOGIN_NOTE,
  REG_TEACHER_LOGIN_TAB,
  REG_TEACHER_TAB,
} from "../../lib/auth/auth-registration.he";
import { resolveTeacherAccessToken } from "../../lib/teacher-portal/use-teacher-portal-session";

const teacherLoginSeo = getPublicPageSeo("teacher-login");

function portalTabBtnClass(T, active, disabled) {
  return `flex-1 min-w-0 rounded px-3 py-2 text-sm font-semibold text-center transition ${
    active ? T.loginTabActive : T.loginTabIdle
  } ${disabled ? "opacity-60 pointer-events-none" : ""}`;
}

function TeacherPortalAuxButtons({ T, className = "", disabled = false }) {
  return (
    <div className={`grid grid-cols-2 gap-2 w-full md:contents ${className}`}>
      <Link
        href="/school/staff/login"
        className={`${T.portalAuxBtn} ${disabled ? "pointer-events-none opacity-60" : ""}`}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
      >
        מורה בית ספר / צוות בית ספר
      </Link>
      <Link
        href="/school/register"
        className={`${T.portalAuxBtn} ${disabled ? "pointer-events-none opacity-60" : ""}`}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
      >
        רישום בית ספר
      </Link>
    </div>
  );
}

function TeacherPortalTopActions({ mode, setMode, T, disabled = false }) {
  return (
    <div className="flex flex-col md:flex-row gap-2 mb-1.5 md:mb-3">
      <div
        className={`flex gap-2 w-full md:contents ${
          mode === "request" ? "max-w-md md:max-w-none" : ""
        }`}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setMode("login");
          }}
          className={portalTabBtnClass(T, mode === "login", disabled)}
          data-testid="teacher-login-tab"
        >
          {REG_TEACHER_LOGIN_TAB}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setMode("request");
          }}
          className={portalTabBtnClass(T, mode === "request", disabled)}
          data-testid="teacher-request-tab"
        >
          {REG_TEACHER_TAB}
        </button>
      </div>
      <TeacherPortalAuxButtons T={T} disabled={disabled} />
    </div>
  );
}

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
  const { theme, isBright } = useStudentTheme();
  const layoutProps = getPrivateTeacherLayoutProps(theme);
  const T = getTeacherPortalTheme(isBright);
  const supabaseRef = useRef(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [clientReady, setClientReady] = useState(false);
  const [sessionCheckPending, setSessionCheckPending] = useState(true);
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
      if (!mounted) return;
      if (!session.ok) {
        setSessionCheckPending(false);
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      if (isAdminAppMetadataUser(userData?.user)) {
        router.replace("/admin/teachers");
        return;
      }
      const me = await fetchTeacherMe(session.token);
      if (!mounted) return;
      if (me.status === 200) {
        void trackProductEvent({
          eventName: "teacher_login",
          actorType: "teacher",
          idempotencyKey: `teacher_login:${Date.now()}`,
        });
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
      setSessionCheckPending(false);
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
    if (busy) return;
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
          "כתובת הדוא״ל או הסיסמה שגויים. אם אתה מורה רשום - נסה שנית."
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
          "כתובת הדוא״ל או הסיסמה שגויים. אם אתה מורה רשום - נסה שנית."
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
            "כתובת הדוא״ל או הסיסמה שגויים. אם אתה מורה רשום - נסה שנית."
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
        "כתובת הדוא״ל או הסיסמה שגויים. אם אתה מורה רשום - נסה שנית."
      );
      await signOutAndStayOnLogin();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout {...layoutProps}>
      <PageSeo
        title={teacherLoginSeo.title}
        description={teacherLoginSeo.description}
        canonicalPath={teacherLoginSeo.canonicalPath}
        noindex={teacherLoginSeo.noindex}
      />
      <div
        className={`mx-auto px-3 md:px-4 py-3 md:py-8 ${
          mode === "request" ? "max-w-4xl" : "max-w-md"
        }`}
        dir="rtl"
        lang="he"
      >
        <PortalLoginHeading title="כניסה למורים" className="!mb-2 md:!mb-4" bright={isBright} homeHref="/teachers" />

        {sessionCheckPending ? (
          <div data-testid="teacher-login-root" data-state="loading">
            <PortalLoadingPanel isBright={isBright} message="מאמת חיבור…" />
          </div>
        ) : (
          <div
            data-testid="teacher-login-root"
            data-invite-only={inviteOnly ? "true" : "false"}
            data-state="ready"
          >
            <TeacherPortalTopActions mode={mode} setMode={setMode} T={T} disabled={busy} />

            {mode === "request" ? (
              <TeacherRegistrationRequestForm bright={isBright} />
            ) : (
              <>
                {inviteOnly ? (
                  <p className={`${T.inviteNote} mb-3`}>{REG_TEACHER_INVITE_ONLY_LOGIN_NOTE}</p>
                ) : null}
                <form onSubmit={onSubmit} className="space-y-3" autoComplete="on" noValidate>
                  <label className="block text-sm">
                    <span className={T.loginLabel}>כתובת דוא״ל</span>
                    <input
                      type="email"
                      name="email"
                      value={email}
                      onChange={(ev) => setEmail(ev.target.value)}
                      required
                      autoComplete="username"
                      placeholder="המייל שלך"
                      className={T.loginInputMt}
                      disabled={busy}
                    />
                  </label>
                  <PasswordField
                    label="סיסמה"
                    name="password"
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    required
                    autoComplete="current-password"
                    testId="teacher-login-password"
                    bright={isBright}
                    disabled={busy}
                  />
                  <button type="submit" disabled={busy} className={T.submitBtn}>
                    {busy ? "מתחבר…" : "כניסה"}
                  </button>
                  <p className="text-sm text-center">
                    <Link
                      href="/auth/forgot-password?portal=teacher"
                      className={T.forgotLink}
                      data-testid="teacher-forgot-password-link"
                    >
                      {AUTH_FORGOT_PASSWORD_LINK}
                    </Link>
                  </p>
                </form>
                {loginError ? (
                  <p className={`mt-3 ${T.error}`} role="alert">
                    {loginError}
                  </p>
                ) : null}
              </>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
