import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import PasswordField from "../../components/auth/PasswordField";
import { resolvePostPasswordResetPath } from "../../lib/auth/auth-post-reset-redirect";
import {
  clearRecoveryActive,
  establishRecoverySession,
} from "../../lib/auth/auth-recovery-session.client";
import {
  mapRecoveryEstablishErrorHe,
  mapSupabasePasswordUpdateErrorHe,
  sanitizeAuthErrorForLog,
} from "../../lib/auth/auth-reset-errors";
import {
  AUTH_RESET_MIN_PASSWORD_LENGTH,
  AUTH_RESET_PASSWORD_CONFIRM_LABEL,
  AUTH_RESET_PASSWORD_ERROR_EXPIRED,
  AUTH_RESET_PASSWORD_ERROR_GENERIC,
  AUTH_RESET_PASSWORD_ERROR_MISMATCH,
  AUTH_RESET_PASSWORD_ERROR_NO_SESSION,
  AUTH_RESET_PASSWORD_ERROR_WEAK,
  AUTH_RESET_PASSWORD_NEW_LABEL,
  AUTH_RESET_PASSWORD_REQUEST_NEW,
  AUTH_RESET_PASSWORD_SUBMIT,
  AUTH_RESET_PASSWORD_SUCCESS,
  AUTH_RESET_PASSWORD_TITLE,
} from "../../lib/auth/auth-reset.he";
import { getLearningSupabaseBrowserClient } from "../../lib/learning-supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabaseRef = useRef(null);
  const recoverySessionRef = useRef(false);
  const [clientReady, setClientReady] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionInvalid, setSessionInvalid] = useState(false);
  const [establishError, setEstablishError] = useState("");
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

    (async () => {
      const result = await establishRecoverySession(supabase, router);
      if (cancelled) return;

      recoverySessionRef.current = Boolean(result.recoverySession && result.ok);

      if (result.error) {
        console.error("[auth-reset-password] recovery establish failed", sanitizeAuthErrorForLog(result.error), {
          reason: result.reason,
          recoverySession: recoverySessionRef.current,
          urlInfo: result.urlInfo ?? null,
        });
      } else if (result.ok) {
        console.info("[auth-reset-password] recovery session ready", {
          reason: result.reason,
          recoverySession: recoverySessionRef.current,
          hasSession: Boolean(result.session),
          urlInfo: result.urlInfo ?? null,
        });
      } else {
        console.warn("[auth-reset-password] recovery establish incomplete", {
          reason: result.reason,
          urlInfo: result.urlInfo ?? null,
        });
      }

      if (result.ok && result.session) {
        setSessionReady(true);
        setSessionInvalid(false);
        setEstablishError("");
        return;
      }

      setSessionInvalid(true);
      setSessionReady(false);
      setEstablishError(mapRecoveryEstablishErrorHe(result.error));
    })();

    return () => {
      cancelled = true;
    };
  }, [clientReady, router]);

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
      const { data: preSubmit, error: preSubmitError } = await supabaseRef.current.auth.getSession();
      const hasSession = Boolean(preSubmit?.session);
      const recoverySession = recoverySessionRef.current;

      console.info("[auth-reset-password] before password update", {
        hasSession,
        recoverySession,
        sessionKind: recoverySession ? "recovery" : hasSession ? "normal" : "none",
        preSubmitError: sanitizeAuthErrorForLog(preSubmitError),
      });

      if (!hasSession) {
        setError(AUTH_RESET_PASSWORD_ERROR_NO_SESSION);
        return;
      }
      if (!recoverySession) {
        setError(AUTH_RESET_PASSWORD_ERROR_NO_SESSION);
        return;
      }

      const { error: updateError } = await supabaseRef.current.auth.updateUser({
        password: newPassword,
      });
      if (updateError) {
        console.error("[auth-reset-password] password update failed", sanitizeAuthErrorForLog(updateError), {
          hasSession,
          recoverySession,
          sessionKind: recoverySession ? "recovery" : "normal",
        });
        setError(
          mapSupabasePasswordUpdateErrorHe(updateError, {
            hasRecoverySession: recoverySession,
          })
        );
        return;
      }

      clearRecoveryActive();
      setSuccess(true);
      const destination = await resolvePostPasswordResetPath(supabaseRef.current);
      await new Promise((r) => setTimeout(r, 800));
      router.replace(destination);
    } catch (caught) {
      console.error("[auth-reset-password] password update threw", sanitizeAuthErrorForLog(caught));
      setError(
        mapSupabasePasswordUpdateErrorHe(caught, {
          hasRecoverySession: recoverySessionRef.current,
        })
      );
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
            {establishError || AUTH_RESET_PASSWORD_ERROR_EXPIRED}
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
            <PasswordField
              label={AUTH_RESET_PASSWORD_NEW_LABEL}
              value={newPassword}
              onChange={(ev) => setNewPassword(ev.target.value)}
              required
              minLength={AUTH_RESET_MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              testId="auth-reset-password-new"
            />
            <PasswordField
              label={AUTH_RESET_PASSWORD_CONFIRM_LABEL}
              value={confirmPassword}
              onChange={(ev) => setConfirmPassword(ev.target.value)}
              required
              minLength={AUTH_RESET_MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              testId="auth-reset-password-confirm"
            />
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
