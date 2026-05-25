import { useState } from "react";
import { DEFAULT_TEACHER_FEATURE_FLAGS } from "../../lib/teacher-portal/teacher-feature-flags.js";
import AdminSectionCard from "./AdminSectionCard.jsx";
import {
  ADMIN_ACCOUNT_ACTIVE_LABEL,
  ADMIN_FEATURE_LABELS_HE,
  ADMIN_LABEL_EFFECTIVE_CLASS_CAP,
  ADMIN_LABEL_NOTES,
  ADMIN_LABEL_OVERRIDE,
  ADMIN_OVERRIDE_HINT,
  ADMIN_PLACEHOLDER_OVERRIDE,
  ADMIN_SAVE_FEATURES,
  ADMIN_SAVE_QUOTAS,
  ADMIN_SAVE_STATUS,
  ADMIN_SECTION_PERMISSIONS,
  ADMIN_SECTION_QUOTAS,
} from "../../lib/admin-portal/admin-ui.he.js";

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
        perClassOverride === "" || perClassOverride == null ? null : Number(perClassOverride),
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
      setError(json?.error?.message || "שמירת המכסות נכשלה");
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
      setError(json?.error?.message || "שמירת ההרשאות נכשלה");
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
      setError(json?.error?.message || "שמירת הסטטוס נכשלה");
      return;
    }
    onUpdated?.(json.data);
  };

  const effectiveCap = teacher?.quotas?.maxStudentsPerClass ?? 40;

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <AdminSectionCard title={ADMIN_SECTION_QUOTAS}>
        <p className="text-sm text-white/60 mb-4">
          {ADMIN_LABEL_EFFECTIVE_CLASS_CAP}:{" "}
          <span className="text-white font-semibold tabular-nums">{effectiveCap}</span>
        </p>
        <p className="text-xs text-white/45 mb-4">{ADMIN_OVERRIDE_HINT}</p>
        <label className="block text-sm mb-4">
          <span className="text-white/70">{ADMIN_LABEL_OVERRIDE}</span>
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2 text-right"
            placeholder={ADMIN_PLACEHOLDER_OVERRIDE}
            value={perClassOverride}
            onChange={(e) => setPerClassOverride(e.target.value)}
          />
        </label>
        <label className="block text-sm mb-4">
          <span className="text-white/70">{ADMIN_LABEL_NOTES}</span>
          <textarea
            className="mt-1 w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2 min-h-[88px] text-right"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={saveQuotas}
          className="rounded-lg bg-amber-500 text-black font-semibold px-4 py-2 text-sm disabled:opacity-60"
        >
          {ADMIN_SAVE_QUOTAS}
        </button>
      </AdminSectionCard>

      <AdminSectionCard title={ADMIN_SECTION_PERMISSIONS}>
        <p className="text-xs text-white/45 mb-3">תכונות זמינות למורה</p>
        <div className="space-y-2 mb-4">
          {Object.keys(ADMIN_FEATURE_LABELS_HE).map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm justify-end flex-row-reverse">
              <input
                type="checkbox"
                checked={Boolean(flags[key])}
                onChange={(e) => setFlags((f) => ({ ...f, [key]: e.target.checked }))}
              />
              {ADMIN_FEATURE_LABELS_HE[key]}
            </label>
          ))}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={saveFeatures}
          className="rounded-lg bg-amber-500 text-black font-semibold px-4 py-2 text-sm disabled:opacity-60 mb-5"
        >
          {ADMIN_SAVE_FEATURES}
        </button>

        <div className="border-t border-white/10 pt-4">
          <p className="text-xs text-white/45 mb-3">גישה לחשבון</p>
          <label className="flex items-center gap-2 text-sm justify-end flex-row-reverse mb-4">
            <input
              type="checkbox"
              checked={accountActive}
              onChange={(e) => setAccountActive(e.target.checked)}
            />
            {ADMIN_ACCOUNT_ACTIVE_LABEL}
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={saveStatus}
            className="rounded-lg bg-amber-500 text-black font-semibold px-4 py-2 text-sm disabled:opacity-60"
          >
            {ADMIN_SAVE_STATUS}
          </button>
        </div>
      </AdminSectionCard>

      {error ? <p className="text-sm text-red-300 lg:col-span-2 text-right">{error}</p> : null}
    </div>
  );
}
