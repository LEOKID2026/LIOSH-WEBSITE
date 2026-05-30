import { useState } from "react";
import { adminAuthFetch } from "../../lib/admin-portal/use-admin-session";
import {
  ADMIN_LIFECYCLE_NETWORK_ERROR,
  ADMIN_SCHOOL_LIFECYCLE_ACTIVE,
  ADMIN_SCHOOL_LIFECYCLE_REACTIVATE,
  ADMIN_SCHOOL_LIFECYCLE_SECTION,
  ADMIN_SCHOOL_LIFECYCLE_STATUS,
  ADMIN_SCHOOL_LIFECYCLE_SUSPEND,
  ADMIN_SCHOOL_LIFECYCLE_SUSPENDED,
  apiErrorMessageHe,
} from "../../lib/admin-portal/admin-ui.he.js";

/**
 * @param {{ accessToken: string, school: object, onChanged?: () => void }} props
 */
export default function AdminSchoolLifecyclePanel({ accessToken, school, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isActive = school?.isActive !== false;

  const patchSchool = async (nextActive) => {
    if (!accessToken || !school?.schoolId) return;
    setBusy(true);
    setError("");
    try {
      const res = await adminAuthFetch(accessToken, `/api/admin/schools/${school.schoolId}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: nextActive }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessageHe(json?.error, "עדכון נכשל"));
        return;
      }
      onChanged?.();
    } catch {
      setError(ADMIN_LIFECYCLE_NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="rounded-xl border border-white/15 bg-black/25 p-4 mb-6"
      data-testid="admin-school-lifecycle-panel"
    >
      <h2 className="font-semibold mb-2">{ADMIN_SCHOOL_LIFECYCLE_SECTION}</h2>
      <p className="text-sm text-white/70 mb-3">
        {ADMIN_SCHOOL_LIFECYCLE_STATUS}:{" "}
        <span data-testid="school-lifecycle-status">
          {isActive ? ADMIN_SCHOOL_LIFECYCLE_ACTIVE : ADMIN_SCHOOL_LIFECYCLE_SUSPENDED}
        </span>
      </p>
      <div className="flex flex-wrap gap-2 justify-end">
        {isActive ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void patchSchool(false)}
            className="rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-sm disabled:opacity-50"
            data-testid="school-lifecycle-suspend"
          >
            {ADMIN_SCHOOL_LIFECYCLE_SUSPEND}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void patchSchool(true)}
            className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-sm disabled:opacity-50"
            data-testid="school-lifecycle-reactivate"
          >
            {ADMIN_SCHOOL_LIFECYCLE_REACTIVATE}
          </button>
        )}
      </div>
      {error ? <p className="text-red-300 text-sm mt-2">{error}</p> : null}
    </section>
  );
}
