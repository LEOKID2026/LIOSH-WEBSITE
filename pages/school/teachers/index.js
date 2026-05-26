import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../../components/Layout";
import SchoolPortalShell from "../../../components/school-portal/SchoolPortalShell";
import { useSchoolPortalLoad } from "../../../lib/school-portal/use-school-portal-session";
import { schoolAuthFetch, SCHOOL_LOADING, SCHOOL_TEACHERS_TITLE } from "../../../lib/school-portal/school-ui.he";

export default function SchoolTeachersPage() {
  const router = useRouter();
  const { state, accessToken, me } = useSchoolPortalLoad();
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    if (state === "unauthenticated") router.replace("/teacher/login");
    if (state === "forbidden") router.replace("/teacher/dashboard");
  }, [state, router]);

  useEffect(() => {
    if (state !== "ready" || !accessToken) return;
    schoolAuthFetch(accessToken, "/api/school/teachers").then(async (res) => {
      const body = await res.json().catch(() => ({}));
      if (res.status === 200) setTeachers(body.data?.teachers || []);
    });
  }, [state, accessToken]);

  return (
    <Layout>
      <SchoolPortalShell
        title={SCHOOL_TEACHERS_TITLE}
        schoolName={me?.school?.name}
        showTeacherDashboardLink={me?.hasTeacherActivity}
      >
        {state === "loading" ? (
          <p className="text-white/60 text-sm">{SCHOOL_LOADING}</p>
        ) : (
          <ul className="space-y-2 text-right">
            {teachers.map((t) => (
              <li key={t.teacherId}>
                <Link
                  href={`/school/teachers/${t.teacherId}`}
                  className="block rounded-lg border border-white/10 bg-black/20 px-3 py-2 hover:bg-white/5"
                >
                  <span className="font-medium">{t.displayName || t.teacherId}</span>
                  <span className="text-white/50 text-xs mr-2">
                    {t.role === "school_admin" ? "מנהל/ת" : "מורה"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SchoolPortalShell>
    </Layout>
  );
}
