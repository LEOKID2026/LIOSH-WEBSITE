import { useCallback, useEffect, useState } from "react";
import Layout from "../../../components/Layout";
import AdminShell from "../../../components/admin/AdminShell";
import SchoolAdminTable from "../../../components/admin/SchoolAdminTable";
import { SchoolCreateFormFields } from "../../../components/admin/SchoolAssignForm";
import AdminModal, { AdminModalButton } from "../../../components/admin/AdminModal.jsx";
import { adminAuthFetch, useAdminSession } from "../../../lib/admin-portal/use-admin-session";
import {
  ADMIN_LOAD_ERROR,
  ADMIN_LOADING,
  ADMIN_SCHOOLS_TITLE,
  apiErrorMessageHe,
} from "../../../lib/admin-portal/admin-ui.he.js";
import { ADMIN_PENDING_REQUESTS_TAB } from "../../../lib/auth/auth-registration.he.js";

const EMPTY_SCHOOL = { name: "", city: "", contactEmail: "" };

export default function AdminSchoolsIndexPage() {
  const { state, accessToken } = useAdminSession();
  const [schools, setSchools] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState(EMPTY_SCHOOL);
  const [createError, setCreateError] = useState("");
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

  const closeCreate = () => {
    if (createBusy) return;
    setCreateOpen(false);
    setCreateDraft(EMPTY_SCHOOL);
    setCreateError("");
  };

  const onCreate = async () => {
    if (!accessToken || !createDraft.name?.trim()) return;
    setCreateBusy(true);
    setCreateError("");
    try {
      const res = await adminAuthFetch(accessToken, "/api/admin/schools", {
        method: "POST",
        body: JSON.stringify(createDraft),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 201) {
        setCreateOpen(false);
        setCreateDraft(EMPTY_SCHOOL);
        setCreateError("");
        await loadSchools(accessToken, statusFilter);
        return;
      }
      setCreateError(apiErrorMessageHe(body?.error, "יצירה נכשלה"));
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
            <div className="flex flex-wrap gap-2 justify-end items-center">
              <button
                type="button"
                onClick={() => {
                  setCreateError("");
                  setCreateOpen(true);
                }}
                className="rounded-lg bg-emerald-500/20 border border-emerald-400/30 px-3 py-1.5 text-sm font-semibold"
              >
                בית ספר חדש
              </button>
              <div
                className="flex flex-wrap gap-2"
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
            </div>
            <SchoolAdminTable schools={schools} />

            <AdminModal
              open={createOpen}
              onClose={closeCreate}
              title="בית ספר חדש"
              size="md"
              footer={
                <>
                  <AdminModalButton onClick={closeCreate} disabled={createBusy}>
                    ביטול
                  </AdminModalButton>
                  <AdminModalButton
                    variant="primary"
                    onClick={() => void onCreate()}
                    disabled={createBusy || !createDraft.name?.trim()}
                    busy={createBusy}
                    busyLabel="שומר…"
                  >
                    יצירה
                  </AdminModalButton>
                </>
              }
            >
              {createError ? <p className="text-red-300 text-sm mb-3">{createError}</p> : null}
              <SchoolCreateFormFields draft={createDraft} setDraft={setCreateDraft} />
            </AdminModal>
          </div>
        )}
      </AdminShell>
    </Layout>
  );
}
