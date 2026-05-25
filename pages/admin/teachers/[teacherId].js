import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import AdminShell from "../../../components/admin/AdminShell";
import TeacherAdminDetailView, {
  TeacherAdminDetailHeader,
} from "../../../components/admin/TeacherAdminDetailView";
import { adminAuthFetch, useAdminSession } from "../../../lib/admin-portal/use-admin-session";
import {
  ADMIN_LOAD_ERROR,
  ADMIN_LOADING,
  ADMIN_TEACHER_DETAIL_FALLBACK,
} from "../../../lib/admin-portal/admin-ui.he.js";

export default function AdminTeacherDetailPage() {
  const router = useRouter();
  const { teacherId } = router.query;
  const { state, accessToken } = useAdminSession();
  const [teacher, setTeacher] = useState(null);
  const [audit, setAudit] = useState([]);
  const [loadError, setLoadError] = useState("");

  const loadTeacher = useCallback(async (token, id) => {
    const [detailRes, auditRes] = await Promise.all([
      adminAuthFetch(token, `/api/admin/teachers/${id}`),
      adminAuthFetch(token, `/api/admin/teachers/${id}/audit-log`),
    ]);
    const detailBody = await detailRes.json().catch(() => ({}));
    const auditBody = await auditRes.json().catch(() => ({}));
    if (detailRes.status === 200 && detailBody?.data) {
      setTeacher(detailBody.data);
      setLoadError("");
    } else {
      setLoadError(detailBody?.error?.message || ADMIN_LOAD_ERROR);
    }
    if (auditRes.status === 200) {
      setAudit(auditBody?.data?.entries || []);
    }
  }, []);

  useEffect(() => {
    if (state !== "ready" || !accessToken || !teacherId || typeof teacherId !== "string") {
      return;
    }
    loadTeacher(accessToken, teacherId);
  }, [state, accessToken, teacherId, loadTeacher]);

  const shellTitle = teacher?.displayName || teacher?.email || ADMIN_TEACHER_DETAIL_FALLBACK;

  return (
    <Layout>
      <AdminShell
        title={shellTitle}
        header={teacher ? <TeacherAdminDetailHeader teacher={teacher} /> : undefined}
      >
        {state === "loading" || !teacher ? (
          loadError ? (
            <p className="text-red-300 text-sm text-right">{loadError}</p>
          ) : (
            <p className="text-white/60 text-sm text-right">{ADMIN_LOADING}</p>
          )
        ) : (
          <TeacherAdminDetailView
            teacher={teacher}
            audit={audit}
            accessToken={accessToken}
            onUpdated={setTeacher}
            onReload={() => {
              if (accessToken && typeof teacherId === "string") {
                loadTeacher(accessToken, teacherId);
              }
            }}
          />
        )}
      </AdminShell>
    </Layout>
  );
}
