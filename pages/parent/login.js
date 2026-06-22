import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../components/Layout";
import PortalLoginHeading, { PortalHomeBackLink } from "../../components/auth/PortalLoginHeading";
import FullPolicyAcceptancePanel from "../../components/parent/FullPolicyAcceptancePanel";
import PolicyAcceptanceDeclinedBlock from "../../components/parent/PolicyAcceptanceDeclinedBlock";
import { getLearningSupabaseBrowserClient } from "../../lib/learning-supabase/client";
import { mapParentAuthError } from "../../lib/parent-client/parent-auth-errors.he";
import { postPolicyAcceptance } from "../../lib/parent-client/policy-acceptance-api";
import { PRIVACY_VERSION, TERMS_VERSION } from "../../data/legal/sitePolicies.he";
import GuardianChildSelectForm from "../../components/parent/GuardianChildSelectForm";
import {
  mapParentTeacherCodeLoginError,
  parseGuardianMultipleStudents,
  postParentTeacherCodeLogin,
  redirectAfterParentTeacherCodeLogin,
} from "../../lib/parent-client/parent-teacher-code-access.js";
import PasswordField from "../../components/auth/PasswordField";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import { getParentPortalTheme } from "../../lib/parent-ui/parent-portal-theme.client.js";
import { AUTH_FORGOT_PASSWORD_LINK } from "../../lib/auth/auth-reset.he";
import { trackProductEvent } from "../../lib/analytics/track-event.client.js";

async function storeSignupPolicyAcceptance(accessToken) {
  return postPolicyAcceptance(accessToken, {
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    source: "parent_signup",
  });
}

function isEmailIdentifier(value) {
  return String(value || "").includes("@");
}

export default function ParentLoginPage() {
  const router = useRouter();
  const { theme, isBright } = useStudentTheme();
  const T = getParentPortalTheme(isBright);
  const layoutProps = { studentTheme: theme, studentShell: "home" };
  const supabaseRef = useRef(null);

  const [mode, setMode] = useState("login");
  const [identifier, setIdentifier] = useState("");
  const [secret, setSecret] = useState("");
  const [signupPolicyDeclined, setSignupPolicyDeclined] = useState(false);
  const [preSignupPolicyCompleted, setPreSignupPolicyCompleted] = useState(false);
  const [signupPanelKey, setSignupPanelKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState("account");
  const [clientReady, setClientReady] = useState(false);
  const [multiStudents, setMultiStudents] = useState(null);

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
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted || !data?.session) return;
      const meta = data.session.user?.app_metadata;
      const role =
        meta && typeof meta === "object" && typeof meta.role === "string"
          ? meta.role.trim().toLowerCase()
          : "";
      if (role === "teacher" || role === "admin") return;
      router.replace("/parent/dashboard");
    });
    return () => {
      mounted = false;
    };
  }, [clientReady, router]);

  useEffect(() => {
    if (mode === "login") {
      setPreSignupPolicyCompleted(false);
      setSignupPolicyDeclined(false);
    }
  }, [mode]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setMessageKind("account");

    try {
      if (mode === "login" && !isEmailIdentifier(identifier)) {
        setMultiStudents(null);
        const result = await postParentTeacherCodeLogin(identifier.trim(), secret);
        if (result.status === 200) {
          redirectAfterParentTeacherCodeLogin();
          return;
        }
        if (result.status === 409 && result.body?.error?.code === "guardian_multiple_students") {
          setMultiStudents(parseGuardianMultipleStudents(result.body));
          setMessageKind("teacher_code");
          setMessage(mapParentTeacherCodeLoginError(result.body));
          return;
        }
        setMessageKind("teacher_code");
        setMessage(mapParentTeacherCodeLoginError(result.body));
        return;
      }

      if (!supabaseRef.current) {
        setMessage("המערכת עדיין נטענת. נסו שוב בעוד רגע.");
        return;
      }
      if (mode === "signup" && !preSignupPolicyCompleted) {
        setMessage("יש לקרוא ולאשר את תנאי השימוש ומדיניות הפרטיות לפני ההרשמה.");
        return;
      }

      const supabase = supabaseRef.current;

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: identifier.trim(),
          password: secret,
        });
        if (error) {
          setMessage(mapParentAuthError(error, "signup"));
        } else if (data?.session?.access_token) {
          const acceptRes = await storeSignupPolicyAcceptance(data.session.access_token);
          if (!acceptRes.ok) {
            setMessage("החשבון נוצר. אישור המדיניות יתבקש בכניסה הראשונה לדשבורד.");
          }
          router.push("/parent/dashboard");
        } else {
          setMessage(
            "ההרשמה הושלמה. לאחר אימות האימייל — התחברו; אישור המדיניות יתבקש בדשבורד."
          );
          setMode("login");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: identifier.trim(),
          password: secret,
        });
        if (error) {
          setMessage(mapParentAuthError(error, "login"));
        } else {
          void trackProductEvent({
            eventName: "parent_login",
            actorType: "parent",
            idempotencyKey: `parent_login:${Date.now()}`,
          });
          router.push("/parent/dashboard");
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const onSelectGuardianChild = async (studentId) => {
    setBusy(true);
    setMessage("");
    try {
      const result = await postParentTeacherCodeLogin(identifier.trim(), secret, studentId);
      if (result.status === 200) {
        redirectAfterParentTeacherCodeLogin();
        return;
      }
      setMessageKind("teacher_code");
      setMessage(mapParentTeacherCodeLoginError(result.body));
    } finally {
      setBusy(false);
    }
  };

  const signupSubmitDisabled = busy || (mode === "signup" && !preSignupPolicyCompleted);

  if (mode === "signup" && !preSignupPolicyCompleted) {
    return (
      <Layout {...layoutProps}>
        <div className="max-w-4xl mx-auto px-4 py-8" dir="rtl" lang="he">
          <div className="max-w-md mx-auto">
            <div className="flex justify-end mb-4">
              <PortalHomeBackLink bright={isBright} />
            </div>
          </div>
          {signupPolicyDeclined ? (
            <PolicyAcceptanceDeclinedBlock
              bright={isBright}
              returnLabel="חזרה למסך הכניסה"
              message="לא ניתן להמשיך בהרשמה ללא אישור תנאי השימוש ומדיניות הפרטיות."
              onReviewAgain={() => {
                setSignupPolicyDeclined(false);
                setSignupPanelKey((k) => k + 1);
              }}
              onReturnToLogin={() => {
                setSignupPolicyDeclined(false);
                setMode("login");
              }}
            />
          ) : (
            <FullPolicyAcceptancePanel
              key={signupPanelKey}
              bright={isBright}
              layout="fullPage"
              accessToken={null}
              acceptanceSource="parent_signup"
              termsVersion={TERMS_VERSION}
              privacyVersion={PRIVACY_VERSION}
              persistToApi={false}
              onAccepted={() => {
                setPreSignupPolicyCompleted(true);
                setSignupPolicyDeclined(false);
                setMessage("");
              }}
              onDeclined={() => setSignupPolicyDeclined(true)}
            />
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout {...layoutProps}>
      <div className="max-w-md mx-auto px-4 py-3 md:py-10" dir="rtl" lang="he">
        <PortalLoginHeading
          title="כניסת הורים"
          subtitle="כניסה והרשמה מהירה להורים."
          bright={isBright}
        />

        <section className={T.infoBox} aria-label="מידע לפתיחת חשבון הורה">
          <h2 className={T.infoTitle}>ברוכים הבאים הורים 👋</h2>
          <p className={T.infoText}>
            כאן תוכלו לפתוח חשבון הורה, להוסיף את הילד/ה שלכם, ולאפשר לו/לה להיכנס לאזור הלמידה של
            LEO KIDS.
          </p>
          <p className={T.infoText}>אחרי פתיחת החשבון תוכלו:</p>
          <p className={T.infoText}>
            להוסיף ילד/ה, לקבל דוחות ולעקוב אחרי ההתקדמות בלמידה ועוד
          </p>
        </section>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setMessage("");
            }}
            className={`flex-1 rounded px-3 py-2 text-sm font-semibold ${
              mode === "login" ? T.tabActive : T.tabIdle
            }`}
          >
            כניסה
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setMessage("");
            }}
            className={`flex-1 rounded px-3 py-2 text-sm font-semibold ${
              mode === "signup" ? T.tabActive : T.tabIdle
            }`}
          >
            הרשמה
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "login" ? (
            <>
              <label className="block text-sm">
                <span className={T.label}>אימייל או שם משתמש</span>
                <input
                  data-testid="parent-login-identifier"
                  className={T.inputMt}
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="הקלידו אימייל או שם משתמש שקיבלתם מהמורה"
                  required
                  autoComplete="username"
                />
              </label>
              <PasswordField
                bright={isBright}
                label="סיסמה או קוד כניסה"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="הקלידו סיסמה או קוד כניסה"
                required
                autoComplete="current-password"
                testId="parent-login-secret"
              />
            </>
          ) : (
            <>
              <input
                className={T.input}
                type="email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="אימייל הורה"
                required
              />
              <PasswordField
                bright={isBright}
                bare
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="סיסמה"
                required
                minLength={6}
                autoComplete="new-password"
                testId="parent-signup-password"
              />
              {preSignupPolicyCompleted ? (
                <p className={T.success}>✓ המדיניות נקראה ואושרה — אפשר להמשיך בהרשמה.</p>
              ) : null}
            </>
          )}

          <button className={T.submit} disabled={signupSubmitDisabled} type="submit">
            {busy ? "מבצע פעולה..." : mode === "signup" ? "יצירת חשבון הורה" : "כניסה"}
          </button>
          {mode === "login" ? (
            <p className="text-sm text-center">
              <Link
                href="/auth/forgot-password?portal=parent"
                className={T.link}
                data-testid="parent-forgot-password-link"
              >
                {AUTH_FORGOT_PASSWORD_LINK}
              </Link>
            </p>
          ) : null}
        </form>

        {multiStudents?.length ? (
          <div className="mt-4">
            <GuardianChildSelectForm
              bright={isBright}
              students={multiStudents}
              busy={busy}
              onSelect={(id) => void onSelectGuardianChild(id)}
            />
          </div>
        ) : null}

        {message ? (
          <p
            className={`mt-3 text-sm ${messageKind === "teacher_code" ? T.error : T.message}`}
            role="alert"
          >
            {message}
          </p>
        ) : null}

        {mode === "login" ? (
          <p className={`mt-4 text-xs leading-relaxed ${T.faint}`}>
            ביצירת חשבון או בשימוש באתר, מומלץ לעיין ב
            <Link href="/terms" className={T.linkInline}>
              תנאי שימוש
            </Link>
            וב
            <Link href="/privacy" className={T.linkInline}>
              מדיניות פרטיות
            </Link>
            .
          </p>
        ) : null}
      </div>
    </Layout>
  );
}
