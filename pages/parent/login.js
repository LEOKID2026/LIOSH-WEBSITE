import { useEffect, useRef, useState } from "react";

import { useRouter } from "next/router";

import Link from "next/link";

import Layout from "../../components/Layout";

import FullPolicyAcceptancePanel from "../../components/parent/FullPolicyAcceptancePanel";

import { getLearningSupabaseBrowserClient } from "../../lib/learning-supabase/client";

import {

  fetchPolicyAcceptanceStatus,

  postPolicyAcceptance,

} from "../../lib/parent-client/policy-acceptance-api";

import {

  PRIVACY_VERSION,

  TERMS_VERSION,

} from "../../data/legal/sitePolicies.he";



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

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [showPolicyPanel, setShowPolicyPanel] = useState(false);

  const [preSignupPolicyCompleted, setPreSignupPolicyCompleted] = useState(false);

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

      fetchPolicyAcceptanceStatus(data.session.access_token).then(({ ok, payload }) => {

        if (!mounted) return;

        if (ok && payload?.accepted) {

          router.replace("/parent/dashboard");

        }

      });

    });

    return () => {

      mounted = false;

    };

  }, [clientReady, router]);



  useEffect(() => {

    if (mode === "login") {

      setPreSignupPolicyCompleted(false);

      setShowPolicyPanel(false);

    }

  }, [mode]);



  const onSubmit = async (e) => {

    e.preventDefault();

    if (!supabaseRef.current) {

      setMessage("המערכת עדיין נטענת. נסו שוב בעוד רגע.");

      return;

    }

    if (mode === "signup" && !preSignupPolicyCompleted) {

      setMessage("יש לפתוח, לקרוא ולאשר את תנאי השימוש ומדיניות הפרטיות לפני ההרשמה.");

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

          setMessage(`ההרשמה נכשלה: ${error.message}`);

        } else if (data?.session?.access_token) {

          const acceptRes = await storeSignupPolicyAcceptance(data.session.access_token);

          if (!acceptRes.ok) {

            setMessage("החשבון נוצר. אישור המדיניות יתבקש בכניסה הראשונה לדשבורד.");

          }

          router.push("/parent/dashboard");

        } else {

          setMessage("ההרשמה הושלמה. לאחר אימות האימייל — התחברו; אישור המדיניות יתבקש בדשבורד.");

          setMode("login");

        }

      } else {

        const { error } = await supabase.auth.signInWithPassword({

          email: email.trim(),

          password,

        });

        if (error) {

          setMessage(`הכניסה נכשלה: ${error.message}`);

        } else {

          router.push("/parent/dashboard");

        }

      }

    } finally {

      setBusy(false);

    }

  };



  const signupSubmitDisabled = busy || (mode === "signup" && !preSignupPolicyCompleted);



  if (mode === "signup" && showPolicyPanel) {

    return (

      <Layout>

        <div className="max-w-3xl mx-auto px-4 py-8" dir="rtl" lang="he">

          <FullPolicyAcceptancePanel

            accessToken={null}

            acceptanceSource="parent_signup"

            termsVersion={TERMS_VERSION}

            privacyVersion={PRIVACY_VERSION}

            persistToApi={false}

            onBack={() => setShowPolicyPanel(false)}

            onAccepted={() => {

              setPreSignupPolicyCompleted(true);

              setShowPolicyPanel(false);

              setMessage("");

            }}

            onDeclined={() => {

              setPreSignupPolicyCompleted(false);

              setShowPolicyPanel(false);

              setMessage("לא ניתן להמשיך בהרשמה ללא אישור תנאי השימוש ומדיניות הפרטיות.");

            }}

          />

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



          {mode === "signup" ? (

            <div className="space-y-2">

              <button

                type="button"

                onClick={() => {

                  setMessage("");

                  setShowPolicyPanel(true);

                }}

                className="w-full rounded border border-amber-400/40 bg-amber-950/25 px-3 py-2.5 text-sm font-semibold text-amber-100 hover:bg-amber-950/40"

              >

                פתחו וקראו את תנאי השימוש ומדיניות הפרטיות

              </button>

              {preSignupPolicyCompleted ? (

                <p className="text-xs text-emerald-300/90">✓ המדיניות נקראה ואושרה — אפשר להמשיך בהרשמה.</p>

              ) : (

                <p className="text-xs text-white/55">יש לקרוא ולאשר את המדיניות לפני יצירת החשבון.</p>

              )}

            </div>

          ) : null}



          <button

            className="w-full rounded bg-amber-500 text-black font-semibold py-2 disabled:opacity-60"

            disabled={signupSubmitDisabled}

            type="submit"

          >

            {busy ? "מבצע פעולה..." : mode === "signup" ? "יצירת חשבון הורה" : "כניסה"}

          </button>

        </form>



        {message ? <p className="mt-3 text-sm text-white/80">{message}</p> : null}



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

          אחרי כניסה:{" "}

          <Link href="/parent/dashboard" className="text-amber-300 underline">

            מעבר לדשבורד הורים

          </Link>

        </p>

        <p className="mt-2 text-sm text-white/70">

          <Link href="/learning" className="text-amber-300 underline">

            חזרה לאתר הלימודים

          </Link>

        </p>

      </div>

    </Layout>

  );

}

