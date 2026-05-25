import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import AdminShell from "../../../components/admin/AdminShell";
import TeacherQuotaForm from "../../../components/admin/TeacherQuotaForm";
import { adminAuthFetch, useAdminSession } from "../../../lib/admin-portal/use-admin-session";

export default function AdminTeacherDetailPage() {
  const router = useRouter();
  const { teacherId } = router.query;
  const { state, accessToken } = useAdminSession();
  const [teacher, setTeacher] = useState(null);
  const [audit, setAudit] = useState([]);
  const [loadError, setLoadError] = useState("");

  const loadTeacher = useCallback(
    async (token, id) => {
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
        setLoadError(detailBody?.error?.message || "Failed to load teacher");
      }
      if (auditRes.status === 200) {
        setAudit(auditBody?.data?.entries || []);
      }
    },
    []
  );

  useEffect(() => {
    if (state !== "ready" || !accessToken || !teacherId || typeof teacherId !== "string") {
      return;
    }
    loadTeacher(accessToken, teacherId);
  }, [state, accessToken, teacherId, loadTeacher]);

  return (
    <Layout>
      <AdminShell title={teacher?.displayName || teacher?.email || "Teacher"}>
        <p className="mb-4">
          <Link href="/admin/teachers" className="text-amber-300 text-sm hover:underline">
            ← Back to teachers
          </Link>
        </p>

        {state === "loading" || !teacher ? (
          loadError ? (
            <p className="text-red-300 text-sm">{loadError}</p>
          ) : (
            <p className="text-white/60 text-sm">Loading…</p>
          )
        ) : (
          <>
            <div className="mb-6 rounded-lg border border-white/15 bg-black/30 p-4 text-sm space-y-1">
              <p>
                <span className="text-white/50">Email:</span> {teacher.email || "—"}
              </p>
              <p>
                <span className="text-white/50">Plan:</span> {teacher.planCode}
              </p>
              <p>
                <span className="text-white/50">Classes:</span> {teacher.classCount} ·{" "}
                <span className="text-white/50">Total students:</span>{" "}
                {teacher.totalActiveStudents}
              </p>
              <p>
                <span className="text-white/50">In class:</span>{" "}
                {teacher.classStudentCount ?? "—"} ·{" "}
                <span className="text-white/50">Direct (no class):</span>{" "}
                {teacher.directStudentCount ?? "—"} ·{" "}
                <span className="text-white/50">Individual activities:</span>{" "}
                {teacher.individualActivityCount ?? "—"}
              </p>
              <ul className="mt-2 text-white/70 list-disc pl-5">
                {(teacher.classes || []).map((c) => (
                  <li key={c.classId}>
                    {c.name}: {c.activeStudentCount} students
                  </li>
                ))}
              </ul>
            </div>

            <TeacherQuotaForm
              teacher={teacher}
              accessToken={accessToken}
              onUpdated={(updated) => {
                setTeacher(updated);
                if (accessToken && teacherId) loadTeacher(accessToken, teacherId);
              }}
            />

            <section className="mt-8 rounded-lg border border-white/15 bg-black/30 p-4">
              <h2 className="font-semibold mb-2">Admin audit log</h2>
              {audit.length === 0 ? (
                <p className="text-white/60 text-sm">No audit entries yet.</p>
              ) : (
                <ul className="text-xs space-y-2 max-h-64 overflow-y-auto">
                  {audit.map((e) => (
                    <li key={e.id} className="border-b border-white/10 pb-2">
                      <span className="text-amber-200">{e.action}</span> ·{" "}
                      {new Date(e.created_at).toLocaleString()}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </AdminShell>
    </Layout>
  );
}
