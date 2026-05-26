import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../../components/Layout";
import SchoolPortalShell from "../../../components/school-portal/SchoolPortalShell";
import { useSchoolPortalLoad } from "../../../lib/school-portal/use-school-portal-session";
import {
  schoolAuthFetch,
  SCHOOL_LOADING,
  SCHOOL_SUBJECT_ADD,
  SCHOOL_SUBJECT_REMOVE,
  SCHOOL_SUBJECTS_TITLE,
} from "../../../lib/school-portal/school-ui.he";

export default function SchoolTeacherDetailPage() {
  const router = useRouter();
  const { teacherId } = router.query;
  const { state, accessToken, me } = useSchoolPortalLoad();
  const [detail, setDetail] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [newSubject, setNewSubject] = useState("math");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (state === "unauthenticated") router.replace("/teacher/login");
    if (state === "forbidden") router.replace("/teacher/dashboard");
  }, [state, router]);

  const load = async () => {
    if (!accessToken || typeof teacherId !== "string") return;
    const [dRes, sRes] = await Promise.all([
      schoolAuthFetch(accessToken, `/api/school/teachers/${teacherId}`),
      schoolAuthFetch(accessToken, `/api/school/teachers/${teacherId}/subjects`),
    ]);
    const dBody = await dRes.json().catch(() => ({}));
    const sBody = await sRes.json().catch(() => ({}));
    if (dRes.status === 200) setDetail(dBody.data?.teacher);
    if (sRes.status === 200) setSubjects(sBody.data?.subjects || []);
  };

  useEffect(() => {
    if (state === "ready") void load();
  }, [state, accessToken, teacherId]);

  const grantSubject = async (e) => {
    e.preventDefault();
    if (!accessToken || typeof teacherId !== "string") return;
    setBusy(true);
    try {
      await schoolAuthFetch(accessToken, `/api/school/teachers/${teacherId}/subjects`, {
        method: "POST",
        body: JSON.stringify({ subject: newSubject }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (subjectId) => {
    if (!accessToken || typeof teacherId !== "string") return;
    await schoolAuthFetch(accessToken, `/api/school/teachers/${teacherId}/subjects/${subjectId}`, {
      method: "DELETE",
    });
    await load();
  };

  return (
    <Layout>
      <SchoolPortalShell
        title={detail?.displayName || SCHOOL_SUBJECTS_TITLE}
        schoolName={me?.school?.name}
        showTeacherDashboardLink={me?.hasTeacherActivity}
      >
        {state === "loading" ? (
          <p className="text-white/60 text-sm">{SCHOOL_LOADING}</p>
        ) : (
          <div className="space-y-6 text-right">
            <Link href="/school/teachers" className="text-amber-300 text-sm hover:underline">
              ← חזרה למורים
            </Link>
            {detail?.role !== "school_admin" ? (
              <section className="rounded-xl border border-white/15 bg-black/25 p-4">
                <h2 className="font-semibold mb-3">{SCHOOL_SUBJECTS_TITLE}</h2>
                <ul className="space-y-2 mb-4">
                  {subjects.map((s) => (
                    <li
                      key={s.id}
                      className="flex justify-between items-center gap-2 border-b border-white/10 pb-2"
                    >
                      <span>
                        {s.subject}
                        {s.gradeLevel ? ` (${s.gradeLevel})` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => void revoke(s.id)}
                        className="text-xs text-red-300 hover:underline"
                      >
                        {SCHOOL_SUBJECT_REMOVE}
                      </button>
                    </li>
                  ))}
                </ul>
                <form onSubmit={grantSubject} className="flex flex-wrap gap-2 items-end">
                  <label className="text-sm">
                    מקצוע
                    <input
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      className="block mt-1 rounded bg-black/40 border border-white/20 px-3 py-2"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded bg-amber-500 text-black font-semibold px-4 py-2 disabled:opacity-60"
                  >
                    {busy ? "…" : SCHOOL_SUBJECT_ADD}
                  </button>
                </form>
              </section>
            ) : (
              <p className="text-white/60 text-sm">למנהל/ת בית הספר יש גישה לכל המקצועות.</p>
            )}
          </div>
        )}
      </SchoolPortalShell>
    </Layout>
  );
}
