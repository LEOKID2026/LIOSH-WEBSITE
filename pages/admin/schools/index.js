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

export default function AdminSchoolsIndexPage() {
  const { state, accessToken } = useAdminSession();
  const [schools, setSchools] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [createBusy, setCreateBusy] = useState(false);

  const loadSchools = useCallback(async (token) => {
    const res = await adminAuthFetch(token, "/api/admin/schools");
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
    loadSchools(accessToken);
  }, [state, accessToken, loadSchools]);

  const onCreate = async (payload) => {
    if (!accessToken) return;
    setCreateBusy(true);
    try {
      const res = await adminAuthFetch(accessToken, "/api/admin/schools", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (res.status === 201) {
        await loadSchools(accessToken);
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
            <SchoolCreateForm onCreate={onCreate} busy={createBusy} />
            <SchoolAdminTable schools={schools} />
          </div>
        )}
      </AdminShell>
    </Layout>
  );
}
