import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import SchoolPortalShell from "../../../components/school-portal/SchoolPortalShell";
import { useSchoolPortalLoad } from "../../../lib/school-portal/use-school-portal-session";
import { schoolAuthFetch, SCHOOL_CLASSES_TITLE, SCHOOL_LOADING } from "../../../lib/school-portal/school-ui.he";

export default function SchoolClassesPage() {
  const router = useRouter();
  const { state, accessToken, me } = useSchoolPortalLoad();
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    if (state === "unauthenticated") router.replace("/teacher/login");
    if (state === "forbidden") router.replace("/teacher/dashboard");
  }, [state, router]);

  useEffect(() => {
    if (state !== "ready" || !accessToken) return;
    schoolAuthFetch(accessToken, "/api/school/classes").then(async (res) => {
      const body = await res.json().catch(() => ({}));
      if (res.status === 200) setClasses(body.data?.classes || []);
    });
  }, [state, accessToken]);

  return (
    <Layout>
      <SchoolPortalShell
        title={SCHOOL_CLASSES_TITLE}
        schoolName={me?.school?.name}
        showTeacherDashboardLink={me?.hasTeacherActivity}
      >
        {state === "loading" ? (
          <p className="text-white/60 text-sm">{SCHOOL_LOADING}</p>
        ) : (
          <ul className="space-y-2 text-right">
            {classes.map((c) => (
              <li
                key={c.classId}
                className="rounded-lg border border-white/10 bg-black/20 px-3 py-2"
              >
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-white/50">
                  {c.subjectFocus || "—"} · מורה: {c.teacherId?.slice(0, 8)}…
                </p>
              </li>
            ))}
          </ul>
        )}
      </SchoolPortalShell>
    </Layout>
  );
}
