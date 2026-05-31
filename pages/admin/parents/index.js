import { useCallback, useEffect, useState } from "react";
import Layout from "../../../components/Layout";
import AdminShell from "../../../components/admin/AdminShell";
import ParentAdminTable from "../../../components/admin/ParentAdminTable";
import { adminAuthFetch, useAdminSession } from "../../../lib/admin-portal/use-admin-session";
import {
  ADMIN_LOAD_ERROR,
  ADMIN_LOADING,
  ADMIN_PARENTS_TITLE,
  apiErrorMessageHe,
} from "../../../lib/admin-portal/admin-ui.he.js";

export default function AdminParentsIndexPage() {
  const { state, accessToken } = useAdminSession();
  const [parents, setParents] = useState([]);
  const [loadError, setLoadError] = useState("");

  const loadParents = useCallback(async (token) => {
    const res = await adminAuthFetch(token, "/api/admin/parents");
    const body = await res.json().catch(() => ({}));
    if (res.status === 200 && Array.isArray(body?.data?.parents)) {
      setParents(body.data.parents);
      setLoadError("");
      return;
    }
    setParents([]);
    setLoadError(apiErrorMessageHe(body?.error, ADMIN_LOAD_ERROR));
  }, []);

  useEffect(() => {
    if (state !== "ready" || !accessToken) return;
    loadParents(accessToken);
  }, [state, accessToken, loadParents]);

  return (
    <Layout>
      <AdminShell title={ADMIN_PARENTS_TITLE} showLogout>
        {state === "loading" ? (
          <p className="text-white/60 text-sm text-right">{ADMIN_LOADING}</p>
        ) : loadError ? (
          <p className="text-red-300 text-sm text-right">{loadError}</p>
        ) : (
          <ParentAdminTable parents={parents} />
        )}
      </AdminShell>
    </Layout>
  );
}
