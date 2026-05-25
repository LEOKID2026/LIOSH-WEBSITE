import { useCallback, useEffect, useState } from "react";
import Layout from "../../../components/Layout";
import AdminShell from "../../../components/admin/AdminShell";
import TeacherAdminSummaryBar from "../../../components/admin/TeacherAdminSummaryBar";
import TeacherAdminTable from "../../../components/admin/TeacherAdminTable";
import { adminAuthFetch, useAdminSession } from "../../../lib/admin-portal/use-admin-session";
import { ADMIN_LOAD_ERROR, ADMIN_LOADING, ADMIN_TEACHERS_TITLE } from "../../../lib/admin-portal/admin-ui.he.js";

export default function AdminTeachersIndexPage() {
  const { state, accessToken } = useAdminSession();
  const [teachers, setTeachers] = useState([]);
  const [loadError, setLoadError] = useState("");

  const loadTeachers = useCallback(async (token) => {
    const res = await adminAuthFetch(token, "/api/admin/teachers");
    const body = await res.json().catch(() => ({}));
    if (res.status === 200 && body?.data?.teachers) {
      setTeachers(body.data.teachers);
      setLoadError("");
      return;
    }
    setLoadError(body?.error?.message || ADMIN_LOAD_ERROR);
  }, []);

  useEffect(() => {
    if (state !== "ready" || !accessToken) return;
    loadTeachers(accessToken);
  }, [state, accessToken, loadTeachers]);

  return (
    <Layout>
      <AdminShell title={ADMIN_TEACHERS_TITLE} showLogout>
        {state === "loading" ? (
          <p className="text-white/60 text-sm text-right">{ADMIN_LOADING}</p>
        ) : loadError ? (
          <p className="text-red-300 text-sm text-right">{loadError}</p>
        ) : (
          <>
            <TeacherAdminSummaryBar teachers={teachers} />
            <TeacherAdminTable teachers={teachers} />
          </>
        )}
      </AdminShell>
    </Layout>
  );
}
