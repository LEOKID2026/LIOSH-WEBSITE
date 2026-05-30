import { useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import SchoolPortalShell from "../../../components/school-portal/SchoolPortalShell";
import SchoolOperatorsManager from "../../../components/school-portal/SchoolOperatorsManager";
import { useSchoolPortalLoad } from "../../../lib/school-portal/use-school-portal-session";
import {
  SCHOOL_LOADING,
  SCHOOL_OPERATORS_TITLE,
  SCHOOL_OPERATOR_NO_TEACHING,
} from "../../../lib/school-portal/school-ui.he";

export default function SchoolOperatorsPage() {
  const router = useRouter();
  const { state, accessToken, me, schoolId } = useSchoolPortalLoad();

  useEffect(() => {
    if (state === "unauthenticated") router.replace("/teacher/login");
    if (state === "forbidden") router.replace("/teacher/dashboard");
    if (state === "ready" && me?.portalRole === "school_operator") {
      router.replace("/school/operator/dashboard");
    }
  }, [state, me, router]);

  return (
    <Layout>
      <SchoolPortalShell
        title={SCHOOL_OPERATORS_TITLE}
        subtitle={SCHOOL_OPERATOR_NO_TEACHING}
        schoolName={me?.school?.name}
        showTeacherDashboardLink={me?.hasTeacherActivity}
        portalRole={me?.portalRole}
      >
        {state === "loading" ? (
          <p className="text-white/60 text-sm text-right">{SCHOOL_LOADING}</p>
        ) : (
          <SchoolOperatorsManager accessToken={accessToken} enabled={state === "ready" && schoolId} />
        )}
      </SchoolPortalShell>
    </Layout>
  );
}
