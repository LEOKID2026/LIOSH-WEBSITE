import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../../components/Layout";
import SchoolPortalShell from "../../../components/school-portal/SchoolPortalShell";
import {
  SchoolPageIntro,
  SchoolPrimaryButton,
  SchoolSection,
  SchoolStatCard,
  SchoolSubjectBadges,
  SCHOOL_CARD,
  SCHOOL_CARD_INNER,
} from "../../../components/school-portal/SchoolPortalUi";
import { useSchoolPortalLoad } from "../../../lib/school-portal/use-school-portal-session";
import {
  schoolAuthFetch,
  schoolSubjectLabelHe,
  SCHOOL_BACK_TEACHERS,
  SCHOOL_COL_CLASSES,
  SCHOOL_COL_STUDENTS,
  SCHOOL_LOADING,
  SCHOOL_MANAGER_ALL_SUBJECTS,
  SCHOOL_ROLE_MANAGER,
  SCHOOL_ROLE_TEACHER,
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

  const isManager = detail?.role === "school_admin";
  const displayTitle = detail?.displayName || SCHOOL_SUBJECTS_TITLE;

  return (
    <Layout>
      <SchoolPortalShell
        title={displayTitle}
        schoolName={me?.school?.name}
        showTeacherDashboardLink={me?.hasTeacherActivity}
      >
        {state === "loading" ? (
          <p className="text-white/60 text-sm text-right">{SCHOOL_LOADING}</p>
        ) : (
          <div className="space-y-6">
            <Link href="/school/teachers" className="text-amber-300 text-sm hover:underline inline-block">
              {SCHOOL_BACK_TEACHERS}
            </Link>

            <SchoolPageIntro
              title={displayTitle}
              subtitle={isManager ? SCHOOL_ROLE_MANAGER : SCHOOL_ROLE_TEACHER}
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl">
              <SchoolStatCard label={SCHOOL_COL_CLASSES} value={detail?.activeClassCount ?? 0} accent="sky" />
              <SchoolStatCard
                label={SCHOOL_COL_STUDENTS}
                value={detail?.activeStudentLinkCount ?? 0}
                accent="emerald"
              />
            </div>

            {isManager ? (
              <div className={`${SCHOOL_CARD} ${SCHOOL_CARD_INNER} text-right`}>
                <p className="text-white/70 text-sm">{SCHOOL_MANAGER_ALL_SUBJECTS}</p>
              </div>
            ) : (
              <SchoolSection title={SCHOOL_SUBJECTS_TITLE}>
                <div className="mb-4">
                  <p className="text-sm text-white/55 mb-2">מקצועות מורשים:</p>
                  <SchoolSubjectBadges subjects={subjects.map((s) => s.subject)} max={12} />
                </div>
                <ul className="space-y-2 mb-6">
                  {subjects.map((s) => (
                    <li
                      key={s.id}
                      className="flex flex-wrap justify-between items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2"
                    >
                      <span className="font-medium">
                        {schoolSubjectLabelHe(s.subject)}
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
                <form onSubmit={grantSubject} className="flex flex-wrap gap-3 items-end border-t border-white/10 pt-4">
                  <label className="text-sm text-white/70">
                    מקצוע
                    <input
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      className="block mt-1 rounded-lg bg-black/40 border border-white/20 px-3 py-2 min-w-[10rem]"
                    />
                  </label>
                  <SchoolPrimaryButton disabled={busy} type="submit">
                    {busy ? "…" : SCHOOL_SUBJECT_ADD}
                  </SchoolPrimaryButton>
                </form>
              </SchoolSection>
            )}
          </div>
        )}
      </SchoolPortalShell>
    </Layout>
  );
}
