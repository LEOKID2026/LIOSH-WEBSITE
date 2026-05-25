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
import {
  fetchParentTeacherCodeSessionStatus,
  mapParentTeacherCodeLoginError,
  parentTeacherCodeReportPath,
  postParentTeacherCodeLogin,
} from "../../lib/parent-client/parent-teacher-code-access.js";

async function storeSignupPolicyAcceptance(accessToken) {
  return postPolicyAcceptance(accessToken, {
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    source: "parent_signup",
  });
}

export default function ParentLoginPage() {
  const router = useRouter();
  const supabaseRef = useRef(null);

  const [mode, setMode] = useState("login");
  const [authView, setAuthView] = useState("account");
  const [teacherUsername, setTeacherUsername] = useState("");
  const [teacherPin, setTeacherPin] = useState("");
  const [teacherCodeBusy, setTeacherCodeBusy] = useState(false);
  const [teacherCodeError, setTeacherCodeError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupPolicyDeclined, setSignupPolicyDeclined] = useState(false);
  const [preSignupPolicyCompleted, setPreSignupPolicyCompleted] = useState(false);
  const [signupPanelKey, setSignupPanelKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [clientReady, setClientReady] = useState(false);

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

  useEffect(() => {
    if (!clientReady || authView !== "teacher_code") return;
    let mounted = true;
    fetchParentTeacherCodeSessionStatus().then((status) => {
      if (!mounted || status !== 200) return;
      router.replace(parentTeacherCodeReportPath());
    });
    return () => {
      mounted = false;
    };
  }, [clientReady, authView, router]);

  const onTeacherCodeSubmit = async (e) => {
    e.preventDefault();
    setTeacherCodeBusy(true);
    setTeacherCodeError("");
    try {
      const result = await postParentTeacherCodeLogin(teacherUsername, teacherPin);
      if (result.status === 200) {
        router.replace(parentTeacherCodeReportPath());
        return;
      }
      setTeacherCodeError(mapParentTeacherCodeLoginError(result.body));
    } finally {
      setTeacherCodeBusy(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!supabaseRef.current) {
      setMessage("המערכת עדיין נטענת. נסו שוב בעוד רגע.");
      return;
    }
    if (mode === "signup" && !preSignupPolicyCompleted) {
      setMessage("יש לקרוא ולאשר את תנאי השימוש ומדיניות הפרטיות לפני ההרשמה.");
      return;
    }
    setBusy(true);
    setMessage("");
    const supabase = supabaseRef.current;

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
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
          email: email.trim(),
          password,
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
        <p className="text-white/70 mb-6">
          {authView === "teacher_code"
            ? "כניסה עם קוד מהמורה לצפייה בדוח הילד."
            : "כניסה והרשמה מהירה להורים."}
        </p>

        {authView === "account" ? (
          <>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex-1 rounded px-3 py-2 text-sm font-semibold ${
                  mode === "login" ? "bg-amber-500 text-black" : "bg-white/10 text-white/80"
                }`}
              >
                כניסה
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`flex-1 rounded px-3 py-2 text-sm font-semibold ${
                  mode === "signup" ? "bg-amber-500 text-black" : "bg-white/10 text-white/80"
                }`}
              >
                הרשמה
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
              <input
                className="w-full rounded bg-black/40 border border-white/20 px-3 py-2"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="אימייל הורה"
                required
              />
              <input
                className="w-full rounded bg-black/40 border border-white/20 px-3 py-2"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="סיסמה"
                required
                minLength={6}
              />

              {mode === "signup" && preSignupPolicyCompleted ? (
                <p className="text-xs text-emerald-300/90">
                  ✓ המדיניות נקראה ואושרה — אפשר להמשיך בהרשמה.
                </p>
              ) : null}

              <button
                className="w-full rounded bg-amber-500 text-black font-semibold py-2 disabled:opacity-60"
                disabled={signupSubmitDisabled}
                type="submit"
              >
                {busy ? "מבצע פעולה..." : mode === "signup" ? "יצירת חשבון הורה" : "כניסה"}
              </button>
            </form>

            {message ? (
              <p className="mt-3 text-sm text-white/80" role="alert">
                {message}
              </p>
            ) : null}

            {mode === "login" ? (
              <>
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

                <div className="mt-6 pt-6 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthView("teacher_code");
                      setTeacherCodeError("");
                      setMessage("");
                    }}
                    className="w-full rounded border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    קיבלתי קוד מהמורה
                  </button>
                </div>
              </>
            ) : null}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setAuthView("account");
                setTeacherCodeError("");
              }}
              className="mb-4 text-sm text-amber-300 hover:underline"
            >
              ← חזרה לכניסת חשבון הורה
            </button>

            <form
              onSubmit={onTeacherCodeSubmit}
              className="space-y-3 rounded-xl border border-white/15 bg-black/30 p-4"
            >
              <label className="block text-sm">
                <span className="text-white/80">שם משתמש</span>
                <input
                  className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
                  value={teacherUsername}
                  onChange={(e) => setTeacherUsername(e.target.value)}
                  autoComplete="username"
                  placeholder="שם המשתמש שקיבלתם מהמורה"
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="text-white/80">קוד כניסה</span>
                <input
                  className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
                  value={teacherPin}
                  onChange={(e) => setTeacherPin(e.target.value)}
                  inputMode="numeric"
                  autoComplete="current-password"
                  placeholder="הקוד שקיבלתם מהמורה"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={teacherCodeBusy}
                className="w-full rounded bg-amber-500 text-black font-semibold py-2 disabled:opacity-60"
              >
                {teacherCodeBusy ? "מתחבר…" : "כניסה לדוח הילד"}
              </button>
            </form>

            {teacherCodeError ? (
              <p className="mt-3 text-sm text-red-300" role="alert">
                {teacherCodeError}
              </p>
            ) : null}
          </>
        )}

        <p className="mt-6 text-sm text-white/70">
          <Link href="/learning" className="text-amber-300 underline">
            חזרה לאתר הלימודים
          </Link>
        </p>
      </div>
    </Layout>
  );
}
