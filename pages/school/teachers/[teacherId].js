import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import SchoolPortalShell from "../../../components/school-portal/SchoolPortalShell";
import SchoolTeacherDetailContent from "../../../components/school-portal/SchoolTeacherDetailContent";
import { useSchoolPortalLoad } from "../../../lib/school-portal/use-school-portal-session";
import {
  SCHOOL_LOADING,
  SCHOOL_LOADING_DATA,
  SCHOOL_SUBJECTS_TITLE,
  schoolAuthFetch,
} from "../../../lib/school-portal/school-ui.he";

export default function SchoolTeacherDetailPage() {
  const router = useRouter();
  const { isReady } = router;

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

  const { state, accessToken, me, schoolId, error: portalError } = useSchoolPortalLoad();
  const [shellTitle, setShellTitle] = useState(SCHOOL_SUBJECTS_TITLE);

  useEffect(() => {
    if (state === "unauthenticated") router.replace("/teacher/login");
    if (state === "forbidden") router.replace("/teacher/dashboard");
    if (state === "ready" && me?.portalRole === "school_operator") {
      router.replace("/school/operator/dashboard");
    }
  }, [state, me, router]);

  useEffect(() => {
    if (state !== "ready" || !accessToken || typeof teacherIdResolved !== "string") return;
    (async () => {
      const res = await schoolAuthFetch(accessToken, "/api/school/operators");
      if (res.status !== 200) return;
      const json = await res.json().catch(() => ({}));
      const isOperator = (json?.data?.operators || []).some(
        (o) => o.operatorUserId === teacherIdResolved
      );
      if (isOperator) {
        router.replace(`/school/operators/${teacherIdResolved}`);
      }
    })();
  }, [state, accessToken, teacherIdResolved, router]);

  const portalBlocking = state === "loading";
  const hydrationWaiting = state === "ready" && !isReady;
  const routeInvalid = state === "ready" && isReady && teacherIdResolved === null;

  return (
    <Layout>
      <SchoolPortalShell
        title={shellTitle}
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
        {state !== "error" && !portalBlocking && !hydrationWaiting && !routeInvalid ? (
          <SchoolTeacherDetailContent
            teacherId={teacherIdResolved}
            accessToken={accessToken}
            schoolId={schoolId}
            schoolName={me?.school?.name}
            showBackLink
            enabled={state === "ready" && typeof teacherIdResolved === "string"}
            onDetailLoaded={(t) => setShellTitle(t?.displayName || SCHOOL_SUBJECTS_TITLE)}
          />
        ) : null}
      </SchoolPortalShell>
    </Layout>
  );
}
