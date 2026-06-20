import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../../components/Layout";
import AdminShell from "../../../components/admin/AdminShell";
import AdminSchoolLifecyclePanel from "../../../components/admin/AdminSchoolLifecyclePanel";
import AdminSchoolRegistrationPanel from "../../../components/admin/AdminSchoolRegistrationPanel";
import {
  SchoolTeacherAssignPanel,
  SchoolTeachersList,
} from "../../../components/admin/SchoolAssignForm";
import { adminAuthFetch, useAdminSession } from "../../../lib/admin-portal/use-admin-session";
import {
  ADMIN_LOAD_ERROR,
  ADMIN_LOADING,
  ADMIN_SCHOOL_DETAIL_FALLBACK,
  ADMIN_SCHOOL_TEACHERS,
  ADMIN_SECTION_AUDIT,
  auditActionLabelHe,
  apiErrorMessageHe,
} from "../../../lib/admin-portal/admin-ui.he.js";

export default function AdminSchoolDetailPage() {
  const router = useRouter();
  const { schoolId } = router.query;
  const { state, accessToken } = useAdminSession();
  const [school, setSchool] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [registrationRequest, setRegistrationRequest] = useState(null);
  const [audit, setAudit] = useState([]);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async (token, id) => {
    const [detailRes, auditRes] = await Promise.all([
      adminAuthFetch(token, `/api/admin/schools/${id}`),
      adminAuthFetch(token, `/api/admin/schools/${id}/audit-log`),
    ]);
    const detailBody = await detailRes.json().catch(() => ({}));
    const auditBody = await auditRes.json().catch(() => ({}));
    if (detailRes.status === 200 && detailBody?.data?.school) {
      setSchool(detailBody.data.school);
      setTeachers(detailBody.data.teachers || []);
      setRegistrationRequest(detailBody.data.registrationRequest || null);
      setLoadError("");
    } else {
      setLoadError(apiErrorMessageHe(detailBody?.error, ADMIN_LOAD_ERROR));
    }
    if (auditRes.status === 200) {
      setAudit(auditBody?.data?.entries || []);
    }
  }, []);

  useEffect(() => {
    if (state !== "ready" || !accessToken || !schoolId || typeof schoolId !== "string") return;
    load(accessToken, schoolId);
  }, [state, accessToken, schoolId, load]);

  const title = school?.name || ADMIN_SCHOOL_DETAIL_FALLBACK;

  return (
    <Layout>
      <AdminShell title={title} showLogout>
        {state === "loading" || !school ? (
          loadError ? (
            <p className="text-red-300 text-sm text-right">{loadError}</p>
          ) : (
            <p className="text-white/60 text-sm text-right">{ADMIN_LOADING}</p>
          )
        ) : (
          <div className="space-y-8 text-right">
            <div>
              <Link href="/admin/schools" className="text-amber-300 text-sm hover:underline">
                ← חזרה לבתי ספר
              </Link>
            </div>

            <AdminSchoolRegistrationPanel
              accessToken={accessToken}
              school={school}
              registrationRequest={registrationRequest}
              onChanged={() => load(accessToken, school.schoolId)}
            />

            <AdminSchoolLifecyclePanel
              accessToken={accessToken}
              school={school}
              onChanged={() => load(accessToken, school.schoolId)}
            />

            <section className="rounded-xl border border-white/15 bg-black/25 p-4">
              <h2 className="font-semibold mb-3">{ADMIN_SCHOOL_TEACHERS}</h2>
              <SchoolTeachersList
              teachers={teachers}
              accessToken={accessToken}
              onReload={() => load(accessToken, school.schoolId)}
            />
            </section>

            <section className="rounded-xl border border-white/15 bg-black/25 p-4">
              <h2 className="font-semibold mb-3">שיוך מורים</h2>
              <SchoolTeacherAssignPanel
                accessToken={accessToken}
                schoolId={school.schoolId}
                onReload={() => load(accessToken, school.schoolId)}
              />
            </section>

            <section className="rounded-xl border border-white/15 bg-black/25 p-4">
              <h2 className="font-semibold mb-3">{ADMIN_SECTION_AUDIT}</h2>
              {audit.length ? (
                <ul className="space-y-2 text-sm text-white/70 max-h-64 overflow-y-auto">
                  {audit.map((e) => (
                    <li key={e.id} className="border-b border-white/10 pb-2">
                      <span className="text-white/90">{auditActionLabelHe(e.action)}</span>
                      <span className="text-white/40 text-xs mr-2">{e.createdAt}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-white/50 text-sm">אין רשומות.</p>
              )}
            </section>
          </div>
        )}
      </AdminShell>
    </Layout>
  );
}
