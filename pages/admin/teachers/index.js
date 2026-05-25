import { useCallback, useEffect, useState } from "react";
import Layout from "../../../components/Layout";
import AdminShell from "../../../components/admin/AdminShell";
import TeacherAdminTable from "../../../components/admin/TeacherAdminTable";
import { adminAuthFetch, useAdminSession } from "../../../lib/admin-portal/use-admin-session";

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
    setLoadError(body?.error?.message || "Failed to load teachers");
  }, []);

  useEffect(() => {
    if (state !== "ready" || !accessToken) return;
    loadTeachers(accessToken);
  }, [state, accessToken, loadTeachers]);

  return (
    <Layout>
      <AdminShell title="Teachers">
        {state === "loading" ? (
          <p className="text-white/60 text-sm">Loading…</p>
        ) : loadError ? (
          <p className="text-red-300 text-sm">{loadError}</p>
        ) : (
          <TeacherAdminTable teachers={teachers} />
        )}
      </AdminShell>
    </Layout>
  );
}
