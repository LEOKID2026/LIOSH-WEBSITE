import { useCallback, useEffect, useState } from "react";
import Layout from "../../../components/Layout";
import AdminShell from "../../../components/admin/AdminShell";
import TeacherAdminSummaryBar from "../../../components/admin/TeacherAdminSummaryBar";
import TeacherAdminTable from "../../../components/admin/TeacherAdminTable";
import { adminAuthFetch, useAdminSession } from "../../../lib/admin-portal/use-admin-session";
import {
  ADMIN_LOAD_ERROR,
  ADMIN_LOADING,
  ADMIN_TEACHERS_TITLE,
  apiErrorMessageHe,
} from "../../../lib/admin-portal/admin-ui.he.js";
import { ADMIN_PENDING_REQUESTS_TAB } from "../../../lib/auth/auth-registration.he.js";

export default function AdminTeachersIndexPage() {
  const { state, accessToken } = useAdminSession();
  const [teachers, setTeachers] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadTeachers = useCallback(async (token, filter) => {
    const qs = filter === "pending" ? "?status=pending" : "";
    const res = await adminAuthFetch(token, `/api/admin/teachers${qs}`);
    const body = await res.json().catch(() => ({}));
    if (res.status === 200 && Array.isArray(body?.data?.teachers)) {
      setTeachers(body.data.teachers);
      setLoadError("");
      return;
    }
    setTeachers([]);
    setLoadError(apiErrorMessageHe(body?.error, ADMIN_LOAD_ERROR));
  }, []);

  useEffect(() => {
    if (state !== "ready" || !accessToken) return;
    loadTeachers(accessToken, statusFilter);
  }, [state, accessToken, statusFilter, loadTeachers]);

  return (
    <Layout>
      <AdminShell title={ADMIN_TEACHERS_TITLE} showLogout>
        {state === "loading" ? (
          <p className="text-white/60 text-sm text-right">{ADMIN_LOADING}</p>
        ) : loadError ? (
          <p className="text-red-300 text-sm text-right">{loadError}</p>
        ) : (
          <>
            <div
              className="flex flex-wrap gap-2 justify-end mb-4"
              data-testid="admin-teachers-status-filter"
            >
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  statusFilter === "all"
                    ? "bg-amber-500/20 text-amber-200 border border-amber-400/40"
                    : "border border-white/15 text-white/60"
                }`}
                data-testid="admin-teachers-filter-all"
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
                data-testid="admin-teachers-filter-pending"
              >
                {ADMIN_PENDING_REQUESTS_TAB}
              </button>
            </div>
            <TeacherAdminSummaryBar teachers={teachers} />
            <TeacherAdminTable teachers={teachers} />
          </>
        )}
      </AdminShell>
    </Layout>
  );
}
