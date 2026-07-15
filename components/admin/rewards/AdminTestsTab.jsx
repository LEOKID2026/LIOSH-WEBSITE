import { useState } from "react";
import { adminAuthFetch } from "../../../lib/admin-portal/use-admin-session.js";
import { formatApiOkHe } from "../../../lib/admin-portal/admin-rewards-ui.he.js";

export default function AdminTestsTab({ accessToken }) {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const runCheck = async (label, path, method = "GET", body) => {
    setBusy(label);
    setError("");
    setResult(null);
    try {
      const res = await adminAuthFetch(accessToken, path, {
        method,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      setResult({
        label,
        status: res.status,
        ok: json?.ok,
        preview: JSON.stringify(json, null, 2).slice(0, 1200),
      });
      if (!res.ok) setError(`בדיקת "${label}" החזירה קוד ${res.status}`);
    } catch {
      setError(`שגיאת רשת בבדיקת "${label}"`);
    } finally {
      setBusy("");
    }
  };

  const checks = [
    { label: "הגדרות", path: "/api/admin/rewards/settings" },
    { label: "משימות יומיות", path: "/api/admin/rewards/economy/daily-missions" },
    { label: "מדרגות חודשיות", path: "/api/admin/rewards/economy/monthly-tiers" },
    { label: "קלפים (פעילים)", path: "/api/admin/rewards/cards" },
    { label: "סדרות (פעילות)", path: "/api/admin/rewards/series" },
    { label: "יומן שינויים", path: "/api/admin/rewards/economy/change-log?limit=5" },
  ];

  return (
    <div className="text-right overflow-x-hidden">
      <p className="text-xs text-white/60 mb-4">
        בדיקות קריאה לשרת - קטלוג סגור (059/060/061): 40 חנות · 24 הישג · 12 אירוע = 76
        קלפים פעילים. ברירת מחדל: רק פעילים; ארכיון דורש{" "}
        <code className="text-white/80" dir="ltr">
          ?includeInactive=true
        </code>
        .
      </p>
      <div className="flex flex-wrap gap-2 justify-end mb-4">
        {checks.map((c) => (
          <button
            key={c.label}
            type="button"
            disabled={!!busy}
            onClick={() => void runCheck(c.label, c.path, c.method, c.body)}
            className="rounded border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5 disabled:opacity-50"
          >
            {busy === c.label ? "בודק..." : c.label}
          </button>
        ))}
      </div>
      {error ? <p className="text-red-300 text-sm mb-2">{error}</p> : null}
      {result ? (
        <pre className="rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-left overflow-x-auto whitespace-pre-wrap break-words max-h-96" dir="ltr">
          {`[${result.label}] קוד תשובה ${result.status} · הצלחה=${formatApiOkHe(result.ok)}\n${result.preview}`}
        </pre>
      ) : null}
    </div>
  );
}
