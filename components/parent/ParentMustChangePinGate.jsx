import { useState } from "react";
import {
  SC_PIN_GATE_BTN_SUBMIT,
  SC_PIN_GATE_ERROR_DIGITS_ONLY,
  SC_PIN_GATE_ERROR_MISMATCH,
  SC_PIN_GATE_ERROR_TOO_SHORT,
  SC_PIN_GATE_ERROR_WRONG_CURRENT,
  SC_PIN_GATE_EXPLANATION,
  SC_PIN_GATE_FIELD_CONFIRM,
  SC_PIN_GATE_FIELD_CURRENT,
  SC_PIN_GATE_FIELD_NEW,
  SC_PIN_GATE_HEADING,
  SC_PIN_GATE_SUCCESS,
} from "../../lib/school-portal/school-communication.he";

export default function ParentMustChangePinGate({ onSuccess }) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(newPin)) {
      setError(SC_PIN_GATE_ERROR_TOO_SHORT);
      return;
    }
    if (!/^\d+$/.test(newPin)) {
      setError(SC_PIN_GATE_ERROR_DIGITS_ONLY);
      return;
    }
    if (newPin !== confirmPin) {
      setError(SC_PIN_GATE_ERROR_MISMATCH);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/guardian/change-pin", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setError(SC_PIN_GATE_ERROR_WRONG_CURRENT);
        return;
      }
      if (!res.ok) {
        setError(SC_PIN_GATE_ERROR_TOO_SHORT);
        return;
      }
      setDone(true);
      onSuccess?.();
    } catch {
      setError(SC_PIN_GATE_ERROR_TOO_SHORT);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center text-emerald-200">
        {SC_PIN_GATE_SUCCESS}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto rounded-xl border border-amber-500/30 bg-black/40 p-6 text-right" dir="rtl">
      <h2 className="text-xl font-bold mb-2">{SC_PIN_GATE_HEADING}</h2>
      <p className="text-sm text-white/70 mb-4">{SC_PIN_GATE_EXPLANATION}</p>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm">
          {SC_PIN_GATE_FIELD_CURRENT}
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
            className="mt-1 w-full rounded-lg bg-black/50 border border-white/20 px-3 py-2 font-mono"
            required
          />
        </label>
        <label className="block text-sm">
          {SC_PIN_GATE_FIELD_NEW}
          <input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={6}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
            className="mt-1 w-full rounded-lg bg-black/50 border border-white/20 px-3 py-2 font-mono"
            required
          />
        </label>
        <label className="block text-sm">
          {SC_PIN_GATE_FIELD_CONFIRM}
          <input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={6}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
            className="mt-1 w-full rounded-lg bg-black/50 border border-white/20 px-3 py-2 font-mono"
            required
          />
        </label>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-amber-500 text-black font-semibold py-2 disabled:opacity-50"
        >
          {busy ? "…" : SC_PIN_GATE_BTN_SUBMIT}
        </button>
      </form>
    </div>
  );
}
