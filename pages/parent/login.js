import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../components/Layout";
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
import { AUTH_FORGOT_PASSWORD_LINK } from "../../lib/auth/auth-reset.he";

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
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8" dir="rtl" lang="he">
          {signupPolicyDeclined ? (
            <PolicyAcceptanceDeclinedBlock
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
    <Layout>
      <div className="max-w-md mx-auto px-4 py-10" dir="rtl" lang="he">
        <h1 className="text-2xl font-bold mb-2">כניסת הורים</h1>
        <p className="text-white/70 mb-6">כניסה והרשמה מהירה להורים.</p>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setMessage("");
            }}
            className={`flex-1 rounded px-3 py-2 text-sm font-semibold ${
              mode === "login" ? "bg-amber-500 text-black" : "bg-white/10 text-white/80"
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
              mode === "signup" ? "bg-amber-500 text-black" : "bg-white/10 text-white/80"
            }`}
          >
            הרשמה
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "login" ? (
            <>
              <label className="block text-sm">
                <span className="text-white/80">אימייל או שם משתמש</span>
                <input
                  className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="הקלידו אימייל או שם משתמש שקיבלתם מהמורה"
                  required
                  autoComplete="username"
                />
              </label>
              <label className="block text-sm">
                <span className="text-white/80">סיסמה או קוד כניסה</span>
                <input
                  className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="הקלידו סיסמה או קוד כניסה"
                  required
                  autoComplete="current-password"
                />
              </label>
            </>
          ) : (
            <>
              <input
                className="w-full rounded bg-black/40 border border-white/20 px-3 py-2"
                type="email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="אימייל הורה"
                required
              />
              <input
                className="w-full rounded bg-black/40 border border-white/20 px-3 py-2"
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="סיסמה"
                required
                minLength={6}
              />
              {preSignupPolicyCompleted ? (
                <p className="text-xs text-emerald-300/90">
                  ✓ המדיניות נקראה ואושרה — אפשר להמשיך בהרשמה.
                </p>
              ) : null}
            </>
          )}

          <button
            className="w-full rounded bg-amber-500 text-black font-semibold py-2 disabled:opacity-60"
            disabled={signupSubmitDisabled}
            type="submit"
          >
            {busy ? "מבצע פעולה..." : mode === "signup" ? "יצירת חשבון הורה" : "כניסה"}
          </button>
          {mode === "login" ? (
            <p className="text-sm text-center">
              <Link
                href="/auth/forgot-password?portal=parent"
                className="text-amber-300 underline"
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
              students={multiStudents}
              busy={busy}
              onSelect={(id) => void onSelectGuardianChild(id)}
            />
          </div>
        ) : null}

        {message ? (
          <p
            className={`mt-3 text-sm ${messageKind === "teacher_code" ? "text-red-300" : "text-white/80"}`}
            role="alert"
          >
            {message}
          </p>
        ) : null}

        {mode === "login" ? (
          <p className="mt-4 text-xs text-white/60 leading-relaxed">
            ביצירת חשבון או בשימוש באתר, מומלץ לעיין ב
            <Link href="/terms" className="text-amber-300 underline mx-1">
              תנאי שימוש
            </Link>
            וב
            <Link href="/privacy" className="text-amber-300 underline mx-1">
              מדיניות פרטיות
            </Link>
            .
          </p>
        ) : null}

        <p className="mt-6 text-sm text-white/70">
          <Link href="/learning" className="text-amber-300 underline">
            חזרה לאתר הלימודים
          </Link>
        </p>
      </div>
    </Layout>
  );
}
