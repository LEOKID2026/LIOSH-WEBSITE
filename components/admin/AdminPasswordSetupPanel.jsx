import { useState } from "react";
import { adminAuthFetch } from "../../lib/admin-portal/use-admin-session";
import {
  ADMIN_PASSWORD_SETUP_FAILED,
  ADMIN_PASSWORD_SETUP_NOT_SENT,
  ADMIN_PASSWORD_SETUP_SENDING,
  ADMIN_PASSWORD_SETUP_SENT,
  ADMIN_PASSWORD_SETUP_STATUS,
  ADMIN_SEND_PASSWORD_SETUP,
} from "../../lib/auth/auth-registration.he.js";
import { ADMIN_LIFECYCLE_NETWORK_ERROR, adminFormatDateHe, apiErrorMessageHe } from "../../lib/admin-portal/admin-ui.he.js";

/**
 * @param {{
 *   accessToken: string,
 *   userId: string,
 *   passwordSetupSentAt?: string|null,
 *   passwordSetupLastError?: string|null,
 *   onChanged?: () => void,
 * }} props
 */
export default function AdminPasswordSetupPanel({
  accessToken,
  userId,
  passwordSetupSentAt = null,
  passwordSetupLastError = null,
  onChanged,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sentAt, setSentAt] = useState(passwordSetupSentAt);
  const [lastError, setLastError] = useState(passwordSetupLastError);

  const send = async () => {
    if (!accessToken || !userId) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await adminAuthFetch(
        accessToken,
        `/api/admin/users/${encodeURIComponent(userId)}/send-password-setup`,
        { method: "POST", body: JSON.stringify({ portal: "teacher" }) }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessageHe(json?.error, ADMIN_PASSWORD_SETUP_FAILED));
        return;
      }
      const setup = json?.data?.passwordSetup;
      if (setup?.sentAt) setSentAt(setup.sentAt);
      setLastError(setup?.ok === false ? setup.message || setup.code : null);
      setMessage(ADMIN_PASSWORD_SETUP_SENT);
      onChanged?.();
    } catch {
      setError(ADMIN_LIFECYCLE_NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="rounded-xl border border-white/15 bg-black/20 p-4 text-right mb-6"
      data-testid="admin-password-setup-panel"
    >
      <h2 className="text-base font-semibold mb-3">{ADMIN_PASSWORD_SETUP_STATUS}</h2>
      <p className="text-sm text-white/70 mb-3">
        {sentAt
          ? `${ADMIN_PASSWORD_SETUP_SENT} · ${adminFormatDateHe(sentAt)}`
          : ADMIN_PASSWORD_SETUP_NOT_SENT}
      </p>
      {lastError ? <p className="text-sm text-amber-200/90 mb-3">{lastError}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void send()}
        className="rounded-lg border border-sky-400/40 bg-sky-500/15 hover:bg-sky-500/25 px-3 py-1.5 text-sm disabled:opacity-50"
        data-testid="admin-send-password-setup"
      >
        {busy ? ADMIN_PASSWORD_SETUP_SENDING : ADMIN_SEND_PASSWORD_SETUP}
      </button>
      {message ? <p className="text-emerald-300 text-sm mt-2">{message}</p> : null}
      {error ? <p className="text-red-300 text-sm mt-2">{error}</p> : null}
    </section>
  );
}
