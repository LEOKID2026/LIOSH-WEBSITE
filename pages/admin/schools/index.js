import { useCallback, useEffect, useState } from "react";
import Layout from "../../../components/Layout";
import AdminShell from "../../../components/admin/AdminShell";
import SchoolAdminTable from "../../../components/admin/SchoolAdminTable";
import { SchoolCreateForm } from "../../../components/admin/SchoolAssignForm";
import { adminAuthFetch, useAdminSession } from "../../../lib/admin-portal/use-admin-session";
import {
  ADMIN_LOAD_ERROR,
  ADMIN_LOADING,
  ADMIN_SCHOOLS_TITLE,
  apiErrorMessageHe,
} from "../../../lib/admin-portal/admin-ui.he.js";
import { ADMIN_PENDING_REQUESTS_TAB } from "../../../lib/auth/auth-registration.he.js";

export default function AdminSchoolsIndexPage() {
  const { state, accessToken } = useAdminSession();
  const [schools, setSchools] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const loadSchools = useCallback(async (token, filter) => {
    const qs = filter === "pending" ? "?status=pending" : "";
    const res = await adminAuthFetch(token, `/api/admin/schools${qs}`);
    const body = await res.json().catch(() => ({}));
    if (res.status === 200 && body?.data?.schools) {
      setSchools(body.data.schools);
      setLoadError("");
      return;
    }
    setLoadError(apiErrorMessageHe(body?.error, ADMIN_LOAD_ERROR));
  }, []);

  useEffect(() => {
    if (state !== "ready" || !accessToken) return;
    loadSchools(accessToken, statusFilter);
  }, [state, accessToken, statusFilter, loadSchools]);

  const onCreate = async (payload) => {
    if (!accessToken) return;
    setCreateBusy(true);
    try {
      const res = await adminAuthFetch(accessToken, "/api/admin/schools", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (res.status === 201) {
        await loadSchools(accessToken, statusFilter);
      }
    } finally {
      setCreateBusy(false);
    }
  };

  return (
    <Layout>
      <AdminShell title={ADMIN_SCHOOLS_TITLE} showLogout>
        {state === "loading" ? (
          <p className="text-white/60 text-sm text-right">{ADMIN_LOADING}</p>
        ) : loadError ? (
          <p className="text-red-300 text-sm text-right">{loadError}</p>
        ) : (
          <div className="space-y-8">
            <div
              className="flex flex-wrap gap-2 justify-end"
              data-testid="admin-schools-status-filter"
            >
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  statusFilter === "all"
                    ? "bg-amber-500/20 text-amber-200 border border-amber-400/40"
                    : "border border-white/15 text-white/60"
                }`}
                data-testid="admin-schools-filter-all"
              >
                הכל
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("pending")}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  statusFilter === "pending"
                    ? "bg-amber-500/20 text-amber-200 border border-amber-400/40"
                    : "border border-white/15 text-white/60"
                }`}
                data-testid="admin-schools-filter-pending"
              >
                {ADMIN_PENDING_REQUESTS_TAB}
              </button>
            </div>
            <SchoolCreateForm onCreate={onCreate} busy={createBusy} />
            <SchoolAdminTable schools={schools} />
          </div>
        )}
      </AdminShell>
    </Layout>
  );
}
