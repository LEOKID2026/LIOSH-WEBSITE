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
import SchoolStaffEmailInviteForm from "../../../components/school-portal/SchoolStaffEmailInviteForm";
import SchoolStaffCreateForm from "../../../components/school-portal/SchoolStaffCreateForm";
import SchoolStaffAccessActions from "../../../components/school-portal/SchoolStaffAccessActions";
import {
  SCHOOL_ALL_SUBJECTS,
  SCHOOL_EMPTY_TEACHERS,
  SCHOOL_INACTIVE,
  SCHOOL_INVITE_TEACHER_SECTION,
  SCHOOL_INVITE_TEACHER_SUBMIT,
  SCHOOL_INVITE_TEACHER_HELP,
  SCHOOL_LOADING,
  SCHOOL_MANAGE_SUBJECTS,
  SCHOOL_ROLE_MANAGER,
  SCHOOL_ROLE_TEACHER,
  SCHOOL_STAFF_CREATE_TEACHER_SECTION,
  SCHOOL_STAFF_INVITE_EMAIL_SECTION,
  SCHOOL_TEACHERS_SUBTITLE,
  SCHOOL_TEACHERS_TITLE,
  SCHOOL_VIEW_DETAILS,
} from "../../../lib/school-portal/school-ui.he";

export default function SchoolTeachersPage() {
  const router = useRouter();
  const { state, accessToken, me, schoolId } = useSchoolPortalLoad();

  useEffect(() => {
    if (state === "unauthenticated") router.replace("/teacher/login");
    if (state === "forbidden") router.replace("/teacher/dashboard");
    if (state === "ready" && me?.portalRole === "school_operator") {
      router.replace("/school/operator/dashboard");
    }
  }, [state, me, router]);

  const parseTeachers = useMemo(() => (body) => body?.data?.teachers || [], []);

  const { data: teachers, loading, error, reload } = useSchoolDataFetch(
    accessToken,
    schoolId,
    "/api/school/teachers",
    parseTeachers,
    state === "ready",
    { cacheKind: "list" }
  );

  return (
    <Layout>
      <SchoolPortalShell
        title={SCHOOL_TEACHERS_TITLE}
        subtitle={SCHOOL_TEACHERS_SUBTITLE}
        schoolName={me?.school?.name}
        showTeacherDashboardLink={me?.hasTeacherActivity}
        portalRole={me?.portalRole || "school_manager"}
      >
        {state === "loading" ? (
          <SchoolLoadingBlock message={SCHOOL_LOADING} />
        ) : loading ? (
          <SchoolLoadingBlock />
        ) : error ? (
          <SchoolErrorBlock message={error} onRetry={() => void reload()} />
        ) : (
          <>
            <SchoolStaffCreateForm
              accessToken={accessToken}
              apiPath="/api/school/teachers"
              sectionTitle={SCHOOL_STAFF_CREATE_TEACHER_SECTION}
              staffKind="teacher"
              onSuccess={() => void reload()}
            />
            <SchoolStaffEmailInviteForm
              accessToken={accessToken}
              apiPath="/api/school/teachers"
              userIdBodyKey="teacherUserId"
              sectionTitle={SCHOOL_STAFF_INVITE_EMAIL_SECTION}
              submitLabel={SCHOOL_INVITE_TEACHER_SUBMIT}
              helpText={SCHOOL_INVITE_TEACHER_HELP}
              onSuccess={() => void reload()}
            />
            <SchoolSection>
            {teachers?.length ? (
              <SchoolCardGrid columns={2}>
                {teachers.map((t) => {
                  const isManager = t.role === "school_admin";
                  return (
                    <div key={t.teacherId} className="min-w-0">
                      <SchoolTeacherCard
                        teacher={t}
                        manageHref={`/school/teachers/${t.teacherId}`}
                        manageLabel={isManager ? SCHOOL_VIEW_DETAILS : SCHOOL_MANAGE_SUBJECTS}
                        roleLabel={isManager ? SCHOOL_ROLE_MANAGER : SCHOOL_ROLE_TEACHER}
                        allSubjectsLabel={SCHOOL_ALL_SUBJECTS}
                        inactiveLabel={SCHOOL_INACTIVE}
                        staffCode={t.staffCode}
                        staffAccessStatus={t.staffAccessStatus}
                      />
                      {!isManager ? (
                        <SchoolStaffAccessActions
                          accessToken={accessToken}
                          userId={t.teacherId}
                          apiBasePath="/api/school/teachers"
                          staffCode={t.staffCode}
                          staffAccessStatus={t.staffAccessStatus}
                          hasStaffCodeLogin={t.hasStaffCodeLogin}
                          onChanged={() => void reload()}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </SchoolCardGrid>
            ) : (
              <SchoolEmptyState title={SCHOOL_EMPTY_TEACHERS} />
            )}
          </SchoolSection>
          </>
        )}
      </SchoolPortalShell>
    </Layout>
  );
}
