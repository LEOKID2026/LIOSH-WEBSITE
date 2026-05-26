import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import SchoolPortalShell from "../../../components/school-portal/SchoolPortalShell";
import { useSchoolPortalLoad } from "../../../lib/school-portal/use-school-portal-session";
import {
  schoolAuthFetch,
  SCHOOL_ENROLL_STUDENT,
  SCHOOL_LOADING,
  SCHOOL_STUDENT_ID,
  SCHOOL_STUDENTS_TITLE,
} from "../../../lib/school-portal/school-ui.he";

export default function SchoolStudentsPage() {
  const router = useRouter();
  const { state, accessToken, me } = useSchoolPortalLoad();
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (state === "unauthenticated") router.replace("/teacher/login");
    if (state === "forbidden") router.replace("/teacher/dashboard");
  }, [state, router]);

  const load = async () => {
    if (!accessToken) return;
    const res = await schoolAuthFetch(accessToken, "/api/school/students");
    const body = await res.json().catch(() => ({}));
    if (res.status === 200) setStudents(body.data?.students || []);
  };

  useEffect(() => {
    if (state === "ready") void load();
  }, [state, accessToken]);

  const enroll = async (e) => {
    e.preventDefault();
    if (!accessToken) return;
    setBusy(true);
    try {
      await schoolAuthFetch(accessToken, "/api/school/students", {
        method: "POST",
        body: JSON.stringify({ studentId: studentId.trim() }),
      });
      setStudentId("");
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <SchoolPortalShell
        title={SCHOOL_STUDENTS_TITLE}
        schoolName={me?.school?.name}
        showTeacherDashboardLink={me?.hasTeacherActivity}
      >
        {state === "loading" ? (
          <p className="text-white/60 text-sm">{SCHOOL_LOADING}</p>
        ) : (
          <div className="space-y-6 text-right">
            <form
              onSubmit={enroll}
              className="rounded-xl border border-white/15 bg-black/25 p-4 space-y-3"
            >
              <h2 className="font-semibold text-sm">{SCHOOL_ENROLL_STUDENT}</h2>
              <label className="block text-sm">
                {SCHOOL_STUDENT_ID}
                <input
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                  className="mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2 font-mono text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="rounded bg-amber-500 text-black font-semibold px-4 py-2 disabled:opacity-60"
              >
                {busy ? "רושם…" : SCHOOL_ENROLL_STUDENT}
              </button>
            </form>
            <ul className="space-y-2">
              {students.map((s) => (
                <li
                  key={s.studentId}
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2"
                >
                  <p className="font-medium font-mono text-sm">{s.studentId}</p>
                  {s.linkedTeachers?.length ? (
                    <p className="text-xs text-white/50 mt-1">
                      מורים מקושרים: {s.linkedTeachers.length}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </SchoolPortalShell>
    </Layout>
  );
}
