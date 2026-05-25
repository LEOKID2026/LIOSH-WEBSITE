import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import AdminShell from "../../../components/admin/AdminShell";
import AdminSectionCard, { AdminFieldRow, AdminStatTile } from "../../../components/admin/AdminSectionCard";
import TeacherQuotaForm from "../../../components/admin/TeacherQuotaForm";
import { adminAuthFetch, useAdminSession } from "../../../lib/admin-portal/use-admin-session";
import {
  ADMIN_BACK_TO_TEACHERS,
  ADMIN_CLASS_COL_NAME,
  ADMIN_CLASS_COL_STUDENTS,
  ADMIN_LABEL_CLASSES,
  ADMIN_LABEL_CLASS_STUDENTS,
  ADMIN_LABEL_CREATED,
  ADMIN_LABEL_DIRECT_STUDENTS,
  ADMIN_LABEL_EMAIL,
  ADMIN_LABEL_INDIV_ACTIVITIES,
  ADMIN_LABEL_NAME,
  ADMIN_LABEL_PLAN,
  ADMIN_LABEL_STATUS,
  ADMIN_LABEL_TOTAL_STUDENTS,
  ADMIN_LOAD_ERROR,
  ADMIN_LOADING,
  ADMIN_NO_AUDIT,
  ADMIN_NO_CLASSES,
  ADMIN_SECTION_AUDIT,
  ADMIN_SECTION_CLASSES,
  ADMIN_SECTION_IDENTITY,
  ADMIN_SECTION_USAGE,
  ADMIN_TEACHER_DETAIL_FALLBACK,
  adminAccountStatusHe,
  adminFormatDateHe,
  adminGradeLabelHe,
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

  const pageTitle = teacher?.displayName || teacher?.email || ADMIN_TEACHER_DETAIL_FALLBACK;

  return (
    <Layout>
      <AdminShell title={pageTitle}>
        <p className="mb-5 text-right">
          <Link href="/admin/teachers" className="text-amber-300 text-sm hover:underline">
            {ADMIN_BACK_TO_TEACHERS}
          </Link>
        </p>

        {state === "loading" || !teacher ? (
          loadError ? (
            <p className="text-red-300 text-sm text-right">{loadError}</p>
          ) : (
            <p className="text-white/60 text-sm text-right">{ADMIN_LOADING}</p>
          )
        ) : (
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-5 lg:items-start">
              <AdminSectionCard title={ADMIN_SECTION_IDENTITY} className="lg:col-span-2">
                <AdminFieldRow label={ADMIN_LABEL_NAME} value={teacher.displayName || "—"} />
                <AdminFieldRow label={ADMIN_LABEL_EMAIL} value={teacher.email || "—"} />
                <AdminFieldRow label={ADMIN_LABEL_PLAN} value={teacher.planCode || "—"} />
                <AdminFieldRow label={ADMIN_LABEL_STATUS}>
                  <span
                    className={
                      teacher.isAccountActive !== false && teacher.isActive
                        ? "text-emerald-300"
                        : "text-white/50"
                    }
                  >
                    {adminAccountStatusHe(teacher)}
                  </span>
                </AdminFieldRow>
                <AdminFieldRow label={ADMIN_LABEL_CREATED} value={adminFormatDateHe(teacher.createdAt)} />
              </AdminSectionCard>

              <AdminSectionCard title={ADMIN_SECTION_USAGE} className="lg:col-span-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <AdminStatTile label={ADMIN_LABEL_CLASSES} value={teacher.classCount ?? 0} />
                  <AdminStatTile label={ADMIN_LABEL_TOTAL_STUDENTS} value={teacher.totalActiveStudents ?? 0} />
                  <AdminStatTile
                    label={ADMIN_LABEL_CLASS_STUDENTS}
                    value={teacher.classStudentCount ?? 0}
                  />
                  <AdminStatTile
                    label={ADMIN_LABEL_DIRECT_STUDENTS}
                    value={teacher.directStudentCount ?? 0}
                  />
                  <AdminStatTile
                    label={ADMIN_LABEL_INDIV_ACTIVITIES}
                    value={teacher.individualActivityCount ?? 0}
                  />
                </div>
              </AdminSectionCard>
            </div>

            <AdminSectionCard title={ADMIN_SECTION_CLASSES}>
              {(teacher.classes || []).length === 0 ? (
                <p className="text-white/60 text-sm">{ADMIN_NO_CLASSES}</p>
              ) : (
                <>
                  <div className="md:hidden space-y-2">
                    {(teacher.classes || []).map((c) => (
                      <div
                        key={c.classId}
                        className="rounded-lg border border-white/10 bg-black/20 p-3 text-right"
                      >
                        <p className="font-medium text-sm break-words">{c.name}</p>
                        {c.gradeLevel ? (
                          <p className="text-xs text-white/45 mt-0.5">{adminGradeLabelHe(c.gradeLevel)}</p>
                        ) : null}
                        <p className="text-sm text-white/70 mt-2">
                          {ADMIN_CLASS_COL_STUDENTS}:{" "}
                          <span className="font-semibold tabular-nums">{c.activeStudentCount ?? 0}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="hidden md:block overflow-x-auto rounded-lg border border-white/10">
                    <table className="w-full text-sm text-right">
                      <thead className="bg-black/30 text-white/60">
                        <tr>
                          <th className="px-3 py-2 font-medium">{ADMIN_CLASS_COL_NAME}</th>
                          <th className="px-3 py-2 font-medium text-center w-32">
                            {ADMIN_CLASS_COL_STUDENTS}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(teacher.classes || []).map((c) => (
                          <tr key={c.classId} className="border-t border-white/10">
                            <td className="px-3 py-2">
                              <span className="font-medium">{c.name}</span>
                              {c.gradeLevel ? (
                                <span className="text-white/45 text-xs mr-2">
                                  · {adminGradeLabelHe(c.gradeLevel)}
                                </span>
                              ) : null}
                            </td>
                            <td className="px-3 py-2 text-center tabular-nums">
                              {c.activeStudentCount ?? 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </AdminSectionCard>

            <TeacherQuotaForm
              teacher={teacher}
              accessToken={accessToken}
              onUpdated={(updated) => {
                setTeacher(updated);
                if (accessToken && teacherId) loadTeacher(accessToken, teacherId);
              }}
            />

            <AdminSectionCard title={ADMIN_SECTION_AUDIT}>
              {audit.length === 0 ? (
                <p className="text-white/60 text-sm">{ADMIN_NO_AUDIT}</p>
              ) : (
                <ul className="text-xs space-y-2 max-h-56 overflow-y-auto">
                  {audit.map((e) => (
                    <li
                      key={e.id}
                      className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 pb-2"
                    >
                      <span className="text-amber-200 font-medium">{e.action}</span>
                      <span className="text-white/50">{adminFormatDateHe(e.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </AdminSectionCard>
          </div>
        )}
      </AdminShell>
    </Layout>
  );
}
