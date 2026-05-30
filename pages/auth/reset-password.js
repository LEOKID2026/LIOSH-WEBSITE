import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { resolvePostPasswordResetPath } from "../../lib/auth/auth-post-reset-redirect";
import {
  AUTH_RESET_MIN_PASSWORD_LENGTH,
  AUTH_RESET_PASSWORD_CONFIRM_LABEL,
  AUTH_RESET_PASSWORD_ERROR_EXPIRED,
  AUTH_RESET_PASSWORD_ERROR_GENERIC,
  AUTH_RESET_PASSWORD_ERROR_MISMATCH,
  AUTH_RESET_PASSWORD_ERROR_WEAK,
  AUTH_RESET_PASSWORD_NEW_LABEL,
  AUTH_RESET_PASSWORD_REQUEST_NEW,
  AUTH_RESET_PASSWORD_SUBMIT,
  AUTH_RESET_PASSWORD_SUCCESS,
  AUTH_RESET_PASSWORD_TITLE,
} from "../../lib/auth/auth-reset.he";
import { getLearningSupabaseBrowserClient } from "../../lib/learning-supabase/client";

function isRecoveryContext() {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash || "";
  const search = window.location.search || "";
  return hash.includes("type=recovery") || hash.includes("access_token") || search.includes("code=");
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabaseRef = useRef(null);
  const [clientReady, setClientReady] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionInvalid, setSessionInvalid] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const portal = router.query?.portal === "teacher" ? "teacher" : "parent";

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!supabaseRef.current) {
      supabaseRef.current = getLearningSupabaseBrowserClient();
    }
    setClientReady(true);
  }, []);

  useEffect(() => {
    if (!clientReady || !supabaseRef.current) return;
    let cancelled = false;
    const supabase = supabaseRef.current;

    const finishInvalid = () => {
      if (!cancelled) {
        setSessionInvalid(true);
        setSessionReady(false);
      }
    };

    const finishReady = () => {
      if (!cancelled) {
        setSessionReady(true);
        setSessionInvalid(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        finishReady();
      }
    });

    (async () => {
      await new Promise((r) => setTimeout(r, 150));
      if (cancelled) return;

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        finishInvalid();
        return;
      }
      if (data?.session) {
        finishReady();
        return;
      }
      if (isRecoveryContext()) {
        await new Promise((r) => setTimeout(r, 400));
        if (cancelled) return;
        const retry = await supabase.auth.getSession();
        if (retry.data?.session) {
          finishReady();
          return;
        }
      }
      finishInvalid();
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [clientReady]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < AUTH_RESET_MIN_PASSWORD_LENGTH) {
      setError(AUTH_RESET_PASSWORD_ERROR_WEAK);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(AUTH_RESET_PASSWORD_ERROR_MISMATCH);
      return;
    }
    if (!supabaseRef.current) {
      setError(AUTH_RESET_PASSWORD_ERROR_GENERIC);
      return;
    }

    setBusy(true);
    try {
      const { error: updateError } = await supabaseRef.current.auth.updateUser({
        password: newPassword,
      });
      if (updateError) {
        const msg = String(updateError.message || "").toLowerCase();
        if (msg.includes("session") || msg.includes("token") || msg.includes("expired")) {
          setError(AUTH_RESET_PASSWORD_ERROR_EXPIRED);
        } else if (msg.includes("password") && msg.includes("short")) {
          setError(AUTH_RESET_PASSWORD_ERROR_WEAK);
        } else {
          setError(AUTH_RESET_PASSWORD_ERROR_GENERIC);
        }
        return;
      }

      setSuccess(true);
      const destination = await resolvePostPasswordResetPath(supabaseRef.current);
      await new Promise((r) => setTimeout(r, 800));
      router.replace(destination);
    } catch {
      setError(AUTH_RESET_PASSWORD_ERROR_GENERIC);
    } finally {
      setBusy(false);
    }
  };

  if (!clientReady) {
    return (
      <Layout>
        <div className="max-w-md mx-auto px-4 py-10 text-white/60 text-sm" dir="rtl" lang="he">
          טוען…
        </div>
      </Layout>
    );
  }

  if (sessionInvalid) {
    return (
      <Layout>
        <div
          className="max-w-md mx-auto px-4 py-10"
          dir="rtl"
          lang="he"
          data-testid="auth-reset-password-expired"
        >
          <h1 className="text-2xl font-bold mb-4">{AUTH_RESET_PASSWORD_TITLE}</h1>
          <p className="text-red-300 text-sm mb-6" role="alert">
            {AUTH_RESET_PASSWORD_ERROR_EXPIRED}
          </p>
          <Link
            href={`/auth/forgot-password?portal=${portal}`}
            className="text-amber-300 underline text-sm"
            data-testid="auth-reset-password-request-new"
          >
            {AUTH_RESET_PASSWORD_REQUEST_NEW}
          </Link>
        </div>
      </Layout>
    );
  }

  if (!sessionReady) {
    return (
      <Layout>
        <div className="max-w-md mx-auto px-4 py-10 text-white/60 text-sm" dir="rtl" lang="he">
          טוען…
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div
        className="max-w-md mx-auto px-4 py-10"
        dir="rtl"
        lang="he"
        data-testid="auth-reset-password-page"
      >
        <h1 className="text-2xl font-bold mb-4">{AUTH_RESET_PASSWORD_TITLE}</h1>

        {success ? (
          <p className="text-emerald-300 text-sm" role="status">
            {AUTH_RESET_PASSWORD_SUCCESS}
          </p>
        ) : (
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            <label className="block text-sm">
              <span className="text-white/80">{AUTH_RESET_PASSWORD_NEW_LABEL}</span>
              <input
                type="password"
                value={newPassword}
                onChange={(ev) => setNewPassword(ev.target.value)}
                required
                minLength={AUTH_RESET_MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
                data-testid="auth-reset-password-new"
              />
            </label>
            <label className="block text-sm">
              <span className="text-white/80">{AUTH_RESET_PASSWORD_CONFIRM_LABEL}</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(ev) => setConfirmPassword(ev.target.value)}
                required
                minLength={AUTH_RESET_MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
                data-testid="auth-reset-password-confirm"
              />
            </label>
            {error ? (
              <p className="text-red-300 text-sm" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded bg-amber-500 text-black font-semibold py-2 disabled:opacity-60"
              data-testid="auth-reset-password-submit"
            >
              {busy ? "שומר…" : AUTH_RESET_PASSWORD_SUBMIT}
            </button>
          </form>
        )}
      </div>
    </Layout>
  );
}
