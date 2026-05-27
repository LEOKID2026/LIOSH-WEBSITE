import { useCallback, useEffect, useMemo, useState } from "react";
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
import SchoolSubjectSelect from "../../../components/school-portal/SchoolSubjectSelect";
import {
  schoolAuthFetch,
  schoolSubjectLabelHe,
  SCHOOL_BACK_TEACHERS,
  SCHOOL_COL_CLASSES,
  SCHOOL_COL_STUDENTS,
  SCHOOL_LOADING,
  SCHOOL_LOADING_DATA,
  SCHOOL_MANAGER_ALL_SUBJECTS,
  SCHOOL_ROLE_MANAGER,
  SCHOOL_ROLE_TEACHER,
  SCHOOL_SUBJECT_ADD,
  SCHOOL_SUBJECT_REMOVE,
  SCHOOL_SUBJECTS_TITLE,
} from "../../../lib/school-portal/school-ui.he";

export default function SchoolTeacherDetailPage() {
  const router = useRouter();
  const { isReady } = router;

  /** Prefer query; fallback to pathname so we are not blocked if isReady stalls on prerendered dynamic routes. */
  const teacherIdResolved = useMemo(() => {
    const rawQ = router.query?.teacherId;
    if (typeof rawQ === "string" && rawQ.trim()) return rawQ.trim();
    if (Array.isArray(rawQ) && typeof rawQ[0] === "string" && rawQ[0].trim()) return rawQ[0].trim();
    const bare = router.asPath?.split("?")[0] || "";
    const fromPathMatch = /^\/school\/teachers\/([^/]+)$/u.exec(bare);
    const slug = fromPathMatch?.[1]?.trim();
    if (slug && slug !== "[teacherId]" && !slug.startsWith("[")) return slug;
    if (!isReady) return undefined;
    return null;
  }, [isReady, router.asPath, router.query?.teacherId]);

  const { state, accessToken, me, error: portalError } = useSchoolPortalLoad();
  const [detail, setDetail] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [newSubject, setNewSubject] = useState("math");
  const [busy, setBusy] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    if (state === "unauthenticated") router.replace("/teacher/login");
    if (state === "forbidden") router.replace("/teacher/dashboard");
  }, [state, router]);

  const load = useCallback(async () => {
    if (!accessToken || typeof teacherIdResolved !== "string") return;
    setDetailLoading(true);
    setDetailError("");
    try {
      const [dRes, sRes] = await Promise.all([
        schoolAuthFetch(accessToken, `/api/school/teachers/${teacherIdResolved}`),
        schoolAuthFetch(accessToken, `/api/school/teachers/${teacherIdResolved}/subjects`),
      ]);
      const dBody = await dRes.json().catch(() => ({}));
      const sBody = await sRes.json().catch(() => ({}));
      if (dRes.status === 200) {
        setDetail(dBody.data?.teacher);
      } else {
        setDetail(null);
        setDetailError(dBody?.error?.message || "שגיאה בטעינת פרטי המורה");
      }
      if (sRes.status === 200) {
        setSubjects(sBody.data?.subjects || []);
      } else if (dRes.status === 200) {
        setSubjects([]);
      }
    } catch {
      setDetailError("שגיאת רשת בטעינת פרטי המורה");
    } finally {
      setDetailLoading(false);
    }
  }, [accessToken, teacherIdResolved]);

  useEffect(() => {
    if (state !== "ready" || typeof teacherIdResolved !== "string") return;
    void load();
  }, [state, accessToken, teacherIdResolved, load]);

  const grantSubject = async (e) => {
    e.preventDefault();
    if (!accessToken || typeof teacherIdResolved !== "string") return;
    setBusy(true);
    try {
      await schoolAuthFetch(accessToken, `/api/school/teachers/${teacherIdResolved}/subjects`, {
        method: "POST",
        body: JSON.stringify({ subject: newSubject }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (subjectId) => {
    if (!accessToken || typeof teacherIdResolved !== "string") return;
    await schoolAuthFetch(accessToken, `/api/school/teachers/${teacherIdResolved}/subjects/${subjectId}`, {
      method: "DELETE",
    });
    await load();
  };

  const isManager = detail?.role === "school_admin";
  const displayTitle = detail?.displayName || SCHOOL_SUBJECTS_TITLE;

  const portalBlocking = state === "loading";
  const hydrationWaiting = state === "ready" && !isReady;
  const routeInvalid = state === "ready" && isReady && teacherIdResolved === null;
  const detailBlocking =
    state === "ready" &&
    typeof teacherIdResolved === "string" &&
    detailLoading &&
    !detail &&
    !detailError;

  return (
    <Layout>
      <SchoolPortalShell
        title={displayTitle}
        schoolName={me?.school?.name}
        showTeacherDashboardLink={me?.hasTeacherActivity}
      >
        {state === "error" ? (
          <p className="text-red-300 text-sm text-right" role="alert">
            {portalError || "שגיאה בטעינת הפורטל"}
          </p>
        ) : null}
        {state !== "error" && portalBlocking ? (
          <p className="text-white/60 text-sm text-right">{SCHOOL_LOADING}</p>
        ) : null}
        {state !== "error" && !portalBlocking && hydrationWaiting ? (
          <p className="text-white/60 text-sm text-right">{SCHOOL_LOADING_DATA}</p>
        ) : null}
        {state !== "error" && !portalBlocking && !hydrationWaiting && routeInvalid ? (
          <p className="text-white/60 text-sm text-right">לא נמצא מזהה מורה בכתובת.</p>
        ) : null}
        {state !== "error" && !portalBlocking && !hydrationWaiting && !routeInvalid && detailBlocking ? (
          <p className="text-white/60 text-sm text-right">{SCHOOL_LOADING_DATA}</p>
        ) : null}
        {state !== "error" && !portalBlocking && !hydrationWaiting && !routeInvalid && !detailBlocking ? (
          <div
            className="space-y-6"
            data-testid={detail && !detailError ? "school-teacher-page-ready" : undefined}
          >
            <Link href="/school/teachers" className="text-amber-300 text-sm hover:underline inline-block">
              {SCHOOL_BACK_TEACHERS}
            </Link>

            {detailError ? (
              <p className="text-red-300 text-sm text-right" role="alert">
                {detailError}
              </p>
            ) : null}

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
                <p className="text-sm text-white/70">{SCHOOL_MANAGER_ALL_SUBJECTS}</p>
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
                    <SchoolSubjectSelect value={newSubject} onChange={setNewSubject} />
                  </label>
                  <SchoolPrimaryButton disabled={busy} type="submit">
                    {busy ? "…" : SCHOOL_SUBJECT_ADD}
                  </SchoolPrimaryButton>
                </form>
              </SchoolSection>
            )}
          </div>
        ) : null}
      </SchoolPortalShell>
    </Layout>
  );
}
