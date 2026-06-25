import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { getLearningSupabaseBrowserClient } from "../../lib/learning-supabase/client";
import {
  AUTH_FORGOT_PASSWORD_BACK,
  AUTH_FORGOT_PASSWORD_EMAIL_LABEL,
  AUTH_FORGOT_PASSWORD_SUBMIT,
  AUTH_FORGOT_PASSWORD_TITLE,
} from "../../lib/auth/auth-reset.he";

function loginBackPath(portal) {
  return portal === "teacher" ? "/teacher/login" : "/parent/login";
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const supabaseRef = useRef(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [clientReady, setClientReady] = useState(false);
  const portal = router.query?.portal === "teacher" ? "teacher" : "parent";

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!supabaseRef.current) {
      supabaseRef.current = getLearningSupabaseBrowserClient();
    }
    setClientReady(true);
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!clientReady) return;
    if (!supabaseRef.current) {
      supabaseRef.current = getLearningSupabaseBrowserClient();
    }
    setBusy(true);
    try {
      const redirectTo = `${window.location.origin}/auth/reset-password?portal=${portal}`;
      await supabaseRef.current.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <div
        className="max-w-md mx-auto px-4 py-10"
        dir="rtl"
        lang="he"
        data-testid="auth-forgot-password-page"
      >
        <h1 className="text-2xl font-bold mb-2">{AUTH_FORGOT_PASSWORD_TITLE}</h1>

        {submitted ? (
          <p className="text-emerald-300 text-sm mb-6" role="status">
            {`אם קיים חשבון עם הכתובת ${email.trim()}, ישלח קישור לאיפוס הסיסמה.`}
          </p>
        ) : (
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            <label className="block text-sm">
              <span className="text-white/80">{AUTH_FORGOT_PASSWORD_EMAIL_LABEL}</span>
              <input
                type="email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                required
                autoComplete="email"
                className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
                data-testid="auth-forgot-password-email"
              />
            </label>
            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="w-full rounded bg-amber-500 text-black font-semibold py-2 disabled:opacity-60"
              data-testid="auth-forgot-password-submit"
            >
              {busy ? "שולח…" : AUTH_FORGOT_PASSWORD_SUBMIT}
            </button>
          </form>
        )}

        <p className="mt-6 text-sm">
          <Link
            href={loginBackPath(portal)}
            className="text-amber-300 underline"
            data-testid="auth-forgot-password-back"
          >
            {AUTH_FORGOT_PASSWORD_BACK}
          </Link>
        </p>
      </div>
    </Layout>
  );
}
