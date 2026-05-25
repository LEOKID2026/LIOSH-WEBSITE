import { useState } from "react";
import { DEFAULT_TEACHER_FEATURE_FLAGS } from "../../lib/teacher-portal/teacher-feature-flags.js";

const FEATURE_LABELS = {
  classroom_activities: "Classroom activities",
  parent_messaging: "Parent messaging",
  ai_reports: "AI / reports",
  live_audio: "Live audio (future)",
};

export default function TeacherQuotaForm({ teacher, accessToken, onUpdated }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [perClassOverride, setPerClassOverride] = useState(
    teacher?.quotas?.maxStudentsPerClassOverride ?? ""
  );
  const [notes, setNotes] = useState(teacher?.notes ?? "");
  const [flags, setFlags] = useState({
    ...DEFAULT_TEACHER_FEATURE_FLAGS,
    ...(teacher?.featureFlags || {}),
  });
  const [accountActive, setAccountActive] = useState(teacher?.isAccountActive !== false);

  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const saveQuotas = async () => {
    setBusy(true);
    setError("");
    const body = {
      notes: notes || null,
      maxStudentsPerClassOverride:
        perClassOverride === "" || perClassOverride == null
          ? null
          : Number(perClassOverride),
    };
    const res = await fetch(`/api/admin/teachers/${teacher.teacherId}/quotas`, {
      method: "PATCH",
      headers: authHeaders,
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status !== 200) {
      setError(json?.error?.message || "Failed to save quotas");
      return;
    }
    onUpdated?.(json.data);
  };

  const saveFeatures = async () => {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/teachers/${teacher.teacherId}/features`, {
      method: "PATCH",
      headers: authHeaders,
      credentials: "same-origin",
      body: JSON.stringify({ featureFlags: flags }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status !== 200) {
      setError(json?.error?.message || "Failed to save features");
      return;
    }
    onUpdated?.(json.data);
  };

  const saveStatus = async () => {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/teachers/${teacher.teacherId}/status`, {
      method: "PATCH",
      headers: authHeaders,
      credentials: "same-origin",
      body: JSON.stringify({ isAccountActive: accountActive }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status !== 200) {
      setError(json?.error?.message || "Failed to save status");
      return;
    }
    onUpdated?.(json.data);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/15 bg-black/30 p-4 space-y-3">
        <h2 className="font-semibold">Quotas</h2>
        <p className="text-sm text-white/60">
          Effective per-class limit: {teacher?.quotas?.maxStudentsPerClass ?? 40} (plan default 40;
          blank override uses plan)
        </p>
        <label className="block text-sm">
          <span className="text-white/70">Max students per class override</span>
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2"
            placeholder="blank = plan default (40)"
            value={perClassOverride}
            onChange={(e) => setPerClassOverride(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-white/70">Internal notes</span>
          <textarea
            className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2 min-h-[80px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={saveQuotas}
          className="rounded bg-amber-500 text-black font-semibold px-4 py-2 disabled:opacity-60"
        >
          Save quotas
        </button>
      </section>

      <section className="rounded-lg border border-white/15 bg-black/30 p-4 space-y-3">
        <h2 className="font-semibold">Feature flags</h2>
        {Object.keys(FEATURE_LABELS).map((key) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(flags[key])}
              onChange={(e) => setFlags((f) => ({ ...f, [key]: e.target.checked }))}
            />
            {FEATURE_LABELS[key]}
          </label>
        ))}
        <button
          type="button"
          disabled={busy}
          onClick={saveFeatures}
          className="rounded bg-amber-500 text-black font-semibold px-4 py-2 disabled:opacity-60"
        >
          Save features
        </button>
      </section>

      <section className="rounded-lg border border-white/15 bg-black/30 p-4 space-y-3">
        <h2 className="font-semibold">Account access</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={accountActive}
            onChange={(e) => setAccountActive(e.target.checked)}
          />
          Teacher account active (API access)
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={saveStatus}
          className="rounded bg-amber-500 text-black font-semibold px-4 py-2 disabled:opacity-60"
        >
          Save status
        </button>
      </section>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
