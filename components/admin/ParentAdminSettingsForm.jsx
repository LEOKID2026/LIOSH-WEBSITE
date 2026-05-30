import { useState } from "react";
import PortalDarkSelect from "../platform-ui/PortalDarkSelect.jsx";
import { adminAuthFetch } from "../../lib/admin-portal/use-admin-session";
import {
  ADMIN_LABEL_PLAN,
  ADMIN_LABEL_STATUS,
  ADMIN_LIFECYCLE_SAVE,
  ADMIN_PARENT_FEATURE_COPILOT,
  ADMIN_PARENT_FEATURE_DIAGNOSTICS,
  ADMIN_PARENT_FEATURE_EXPORT,
  ADMIN_PARENT_FEATURE_REPORTS,
  ADMIN_PARENT_MAX_CHILDREN,
  ADMIN_PARENT_SETTINGS_SECTION,
  accountStatusLabelHe,
  apiErrorMessageHe,
  planCodeLabelHe,
} from "../../lib/admin-portal/admin-ui.he.js";

const PLANS = ["free", "trial", "basic", "family", "premium", "school_linked"];
const STATUSES = ["active", "trial", "suspended", "cancelled"];

/**
 * @param {{ accessToken: string, parentUserId: string, initial: object, onSaved?: (s: object) => void }} props
 */
export default function ParentAdminSettingsForm({ accessToken, parentUserId, initial, onSaved }) {
  const [planCode, setPlanCode] = useState(initial?.planCode || "free");
  const [accountStatus, setAccountStatus] = useState(initial?.accountStatus || "active");
  const [maxChildren, setMaxChildren] = useState(String(initial?.maxChildren ?? 0));
  const [reportsEnabled, setReportsEnabled] = useState(initial?.reportsEnabled === true);
  const [copilotEnabled, setCopilotEnabled] = useState(initial?.copilotEnabled === true);
  const [advancedDiagnosticsEnabled, setAdvancedDiagnosticsEnabled] = useState(
    initial?.advancedDiagnosticsEnabled === true
  );
  const [exportEnabled, setExportEnabled] = useState(initial?.exportEnabled === true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const save = async (e) => {
    e.preventDefault();
    if (!accessToken) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await adminAuthFetch(
        accessToken,
        `/api/admin/parents/${encodeURIComponent(parentUserId)}/settings`,
        {
          method: "PATCH",
          body: JSON.stringify({
            planCode,
            accountStatus,
            maxChildren: Number(maxChildren),
            reportsEnabled,
            copilotEnabled,
            advancedDiagnosticsEnabled,
            exportEnabled,
          }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessageHe(json?.error, "שמירה נכשלה"));
        return;
      }
      setMessage("נשמר");
      onSaved?.(json?.data?.settings);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-white/15 bg-black/20 p-5 text-right">
      <h2 className="text-base font-semibold mb-4">{ADMIN_PARENT_SETTINGS_SECTION}</h2>
      <form onSubmit={(e) => void save(e)} className="space-y-4 max-w-lg">
        <label className="block text-sm">
          <span className="text-white/60 block mb-1">{ADMIN_LABEL_PLAN}</span>
          <PortalDarkSelect
            data-testid="parent-admin-plan-select"
            value={planCode}
            onChange={setPlanCode}
            options={PLANS.map((p) => ({ value: p, label: planCodeLabelHe(p) }))}
          />
        </label>
        <label className="block text-sm">
          <span className="text-white/60 block mb-1">{ADMIN_LABEL_STATUS}</span>
          <PortalDarkSelect
            data-testid="parent-admin-status-select"
            value={accountStatus}
            onChange={setAccountStatus}
            options={STATUSES.map((s) => ({ value: s, label: accountStatusLabelHe(s) }))}
          />
        </label>
        <label className="block text-sm">
          <span className="text-white/60 block mb-1">{ADMIN_PARENT_MAX_CHILDREN}</span>
          <input
            type="number"
            min={0}
            value={maxChildren}
            onChange={(e) => setMaxChildren(e.target.value)}
            className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2"
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>{ADMIN_PARENT_FEATURE_REPORTS}</span>
          <input
            type="checkbox"
            checked={reportsEnabled}
            onChange={(e) => setReportsEnabled(e.target.checked)}
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>{ADMIN_PARENT_FEATURE_COPILOT}</span>
          <input
            type="checkbox"
            checked={copilotEnabled}
            onChange={(e) => setCopilotEnabled(e.target.checked)}
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>{ADMIN_PARENT_FEATURE_DIAGNOSTICS}</span>
          <input
            type="checkbox"
            checked={advancedDiagnosticsEnabled}
            onChange={(e) => setAdvancedDiagnosticsEnabled(e.target.checked)}
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>{ADMIN_PARENT_FEATURE_EXPORT}</span>
          <input
            type="checkbox"
            checked={exportEnabled}
            onChange={(e) => setExportEnabled(e.target.checked)}
          />
        </label>
        {error ? <p className="text-red-300 text-sm">{error}</p> : null}
        {message ? <p className="text-emerald-300 text-sm">{message}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 disabled:opacity-60"
        >
          {busy ? "שומר…" : ADMIN_LIFECYCLE_SAVE}
        </button>
      </form>
    </section>
  );
}
