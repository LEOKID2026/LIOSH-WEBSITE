import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../components/Layout";
import { getLearningSupabaseBrowserClient } from "../../lib/learning-supabase/client";

export default function ParentLoginPage() {
  const router = useRouter();
  const supabaseRef = useRef(null);

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      if (mounted && data?.session) {
        router.replace("/parent/dashboard");
      }
    });
    return () => {
      mounted = false;
    };
  }, [clientReady, router]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!supabaseRef.current) {
      setMessage("המערכת עדיין נטענת. נסו שוב בעוד רגע.");
      return;
    }
    setBusy(true);
    setMessage("");
    const supabase = supabaseRef.current;

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) {
          setMessage(`ההרשמה נכשלה: ${error.message}`);
        } else {
          setMessage("ההרשמה הושלמה. אפשר להתחבר עכשיו.");
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

  return (
    <Layout>
      <div className="max-w-md mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-2">כניסת הורים</h1>
        <p className="text-white/70 mb-6">כניסה והרשמה מהירה להורים.</p>

        <div className="flex gap-2 mb-4">
          <button
            className={`px-3 py-2 rounded ${mode === "login" ? "bg-amber-500 text-black" : "bg-white/10"}`}
            onClick={() => setMode("login")}
            type="button"
          >
            כניסה
          </button>
          <button
            className={`px-3 py-2 rounded ${mode === "signup" ? "bg-amber-500 text-black" : "bg-white/10"}`}
            onClick={() => setMode("signup")}
            type="button"
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
          <button
            className="w-full rounded bg-amber-500 text-black font-semibold py-2 disabled:opacity-60"
            disabled={busy}
            type="submit"
          >
            {busy ? "מבצע פעולה..." : mode === "signup" ? "יצירת חשבון הורה" : "כניסה"}
          </button>
        </form>

        {message ? <p className="mt-3 text-sm text-white/80">{message}</p> : null}

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
