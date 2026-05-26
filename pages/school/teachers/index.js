import { useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import SchoolPortalShell from "../../../components/school-portal/SchoolPortalShell";
import {
  SchoolCardGrid,
  SchoolErrorBlock,
  SchoolLoadingBlock,
  SchoolTeacherCard,
} from "../../../components/school-portal/SchoolDrillDown";
import { SchoolEmptyState, SchoolSection } from "../../../components/school-portal/SchoolPortalUi";
import { useSchoolDataFetch } from "../../../lib/school-portal/use-school-data-fetch";
import { useSchoolPortalLoad } from "../../../lib/school-portal/use-school-portal-session";
import {
  SCHOOL_ALL_SUBJECTS,
  SCHOOL_EMPTY_TEACHERS,
  SCHOOL_INACTIVE,
  SCHOOL_LOADING,
  SCHOOL_MANAGE_SUBJECTS,
  SCHOOL_ROLE_MANAGER,
  SCHOOL_ROLE_TEACHER,
  SCHOOL_TEACHERS_SUBTITLE,
  SCHOOL_TEACHERS_TITLE,
  SCHOOL_VIEW_DETAILS,
} from "../../../lib/school-portal/school-ui.he";

export default function SchoolTeachersPage() {
  const router = useRouter();
  const { state, accessToken, me } = useSchoolPortalLoad();

  useEffect(() => {
    if (state === "unauthenticated") router.replace("/teacher/login");
    if (state === "forbidden") router.replace("/teacher/dashboard");
  }, [state, router]);

  const parseTeachers = useMemo(() => (body) => body?.data?.teachers || [], []);

  const { data: teachers, loading, error, reload } = useSchoolDataFetch(
    accessToken,
    "/api/school/teachers",
    parseTeachers,
    state === "ready"
  );

  return (
    <Layout>
      <SchoolPortalShell
        title={SCHOOL_TEACHERS_TITLE}
        subtitle={SCHOOL_TEACHERS_SUBTITLE}
        schoolName={me?.school?.name}
        showTeacherDashboardLink={me?.hasTeacherActivity}
      >
        {state === "loading" ? (
          <SchoolLoadingBlock message={SCHOOL_LOADING} />
        ) : loading ? (
          <SchoolLoadingBlock />
        ) : error ? (
          <SchoolErrorBlock message={error} onRetry={() => void reload()} />
        ) : (
          <SchoolSection>
            {teachers?.length ? (
              <SchoolCardGrid columns={2}>
                {teachers.map((t) => {
                  const isManager = t.role === "school_admin";
                  return (
                    <SchoolTeacherCard
                      key={t.teacherId}
                      teacher={t}
                      manageHref={`/school/teachers/${t.teacherId}`}
                      manageLabel={isManager ? SCHOOL_VIEW_DETAILS : SCHOOL_MANAGE_SUBJECTS}
                      roleLabel={isManager ? SCHOOL_ROLE_MANAGER : SCHOOL_ROLE_TEACHER}
                      allSubjectsLabel={SCHOOL_ALL_SUBJECTS}
                      inactiveLabel={SCHOOL_INACTIVE}
                    />
                  );
                })}
              </SchoolCardGrid>
            ) : (
              <SchoolEmptyState title={SCHOOL_EMPTY_TEACHERS} />
            )}
          </SchoolSection>
        )}
      </SchoolPortalShell>
    </Layout>
  );
}
