import { useState } from "react";
import {
  SCHOOL_STAFF_PIN_CHANGE_BUSY,
  SCHOOL_STAFF_PIN_CHANGED_SUCCESS,
  SCHOOL_STAFF_PIN_CONFIRM_LABEL,
  SCHOOL_STAFF_PIN_CURRENT_LABEL,
  SCHOOL_STAFF_PIN_INVALID_NEW,
  SCHOOL_STAFF_PIN_MISMATCH,
  SCHOOL_STAFF_PIN_NEW_LABEL,
  SCHOOL_STAFF_PIN_SAVE,
  SCHOOL_STAFF_PIN_WRONG_CURRENT,
  SCHOOL_STAFF_CHANGE_PIN_EXPLANATION,
  SCHOOL_STAFF_CHANGE_PIN_REQUIRED,
} from "../../lib/school-portal/school-ui.he";

/**
 * @param {{ onSuccess?: (redirectPath?: string) => void }} props
 */
export default function SchoolStaffChangePinForm({ onSuccess }) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^\d{4}$/.test(newPin)) {
      setError(SCHOOL_STAFF_PIN_INVALID_NEW);
      return;
    }
    if (newPin !== confirmPin) {
      setError(SCHOOL_STAFF_PIN_MISMATCH);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/school/staff/change-pin", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin, confirmPin }),
      });
      const body = await res.json().catch(() => ({}));
      const code = body?.error?.code;
      if (code === "invalid_current_pin") {
        setError(SCHOOL_STAFF_PIN_WRONG_CURRENT);
        return;
      }
      if (code === "invalid_new_pin" || code === "pin_mismatch" || code === "validation_failed") {
        setError(SCHOOL_STAFF_PIN_INVALID_NEW);
        return;
      }
      if (!res.ok) {
        setError(SCHOOL_STAFF_PIN_INVALID_NEW);
        return;
      }
      setDone(true);
      onSuccess?.(body?.data?.redirectPath);
    } catch {
      setError(SCHOOL_STAFF_PIN_INVALID_NEW);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center text-emerald-200">
        {SCHOOL_STAFF_PIN_CHANGED_SUCCESS}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto rounded-xl border border-amber-500/30 bg-black/40 p-6 text-right" dir="rtl">
      <h2 className="text-xl font-bold mb-2">{SCHOOL_STAFF_CHANGE_PIN_REQUIRED}</h2>
      <p className="text-sm text-white/70 mb-4">{SCHOOL_STAFF_CHANGE_PIN_EXPLANATION}</p>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm">
          {SCHOOL_STAFF_PIN_CURRENT_LABEL}
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="mt-1 w-full rounded-lg bg-black/50 border border-white/20 px-3 py-2 font-mono"
            dir="ltr"
            required
          />
        </label>
        <label className="block text-sm">
          {SCHOOL_STAFF_PIN_NEW_LABEL}
          <input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={4}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="mt-1 w-full rounded-lg bg-black/50 border border-white/20 px-3 py-2 font-mono"
            dir="ltr"
            required
          />
        </label>
        <label className="block text-sm">
          {SCHOOL_STAFF_PIN_CONFIRM_LABEL}
          <input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={4}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="mt-1 w-full rounded-lg bg-black/50 border border-white/20 px-3 py-2 font-mono"
            dir="ltr"
            required
          />
        </label>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-amber-500 text-black font-semibold py-2 disabled:opacity-50"
        >
          {busy ? SCHOOL_STAFF_PIN_CHANGE_BUSY : SCHOOL_STAFF_PIN_SAVE}
        </button>
      </form>
    </div>
  );
}
