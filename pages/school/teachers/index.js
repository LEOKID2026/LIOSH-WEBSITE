import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../../components/Layout";
import SchoolPortalShell from "../../../components/school-portal/SchoolPortalShell";
import {
  SchoolDataTable,
  SchoolEmptyState,
  SchoolSection,
  SchoolSubjectBadges,
  SchoolTableCell,
  SchoolTableRow,
} from "../../../components/school-portal/SchoolPortalUi";
import { useSchoolPortalLoad } from "../../../lib/school-portal/use-school-portal-session";
import {
  schoolAuthFetch,
  SCHOOL_ALL_SUBJECTS,
  SCHOOL_COL_ACTIONS,
  SCHOOL_COL_CLASSES,
  SCHOOL_COL_NAME,
  SCHOOL_COL_ROLE,
  SCHOOL_COL_STUDENTS,
  SCHOOL_COL_SUBJECTS,
  SCHOOL_EMPTY_TEACHERS,
  SCHOOL_INACTIVE,
  SCHOOL_LOADING,
  SCHOOL_MANAGE_SUBJECTS,
  SCHOOL_VIEW_DETAILS,
  SCHOOL_ROLE_MANAGER,
  SCHOOL_ROLE_TEACHER,
  SCHOOL_TEACHERS_SUBTITLE,
  SCHOOL_TEACHERS_TITLE,
} from "../../../lib/school-portal/school-ui.he";

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

  const columns = [
    { key: "name", label: SCHOOL_COL_NAME },
    { key: "role", label: SCHOOL_COL_ROLE },
    { key: "subjects", label: SCHOOL_COL_SUBJECTS },
    { key: "classes", label: SCHOOL_COL_CLASSES, className: "text-center" },
    { key: "students", label: SCHOOL_COL_STUDENTS, className: "text-center" },
    { key: "actions", label: SCHOOL_COL_ACTIONS, className: "text-center" },
  ];

  return (
    <Layout>
      <SchoolPortalShell
        title={SCHOOL_TEACHERS_TITLE}
        subtitle={SCHOOL_TEACHERS_SUBTITLE}
        schoolName={me?.school?.name}
        showTeacherDashboardLink={me?.hasTeacherActivity}
      >
        {state === "loading" ? (
          <p className="text-white/60 text-sm text-right">{SCHOOL_LOADING}</p>
        ) : (
          <>
            <SchoolSection>
              {teachers.length ? (
                <SchoolDataTable columns={columns} emptyMessage={SCHOOL_EMPTY_TEACHERS}>
                  {teachers.map((t) => {
                    const isManager = t.role === "school_admin";
                    return (
                      <SchoolTableRow key={t.teacherId}>
                        <SchoolTableCell>
                          <p className="font-medium">{t.displayName || t.teacherId}</p>
                          {!t.isActive ? (
                            <p className="text-xs text-red-300/90 mt-0.5">{SCHOOL_INACTIVE}</p>
                          ) : null}
                        </SchoolTableCell>
                        <SchoolTableCell>
                          <span className="text-white/80">
                            {isManager ? SCHOOL_ROLE_MANAGER : SCHOOL_ROLE_TEACHER}
                          </span>
                        </SchoolTableCell>
                        <SchoolTableCell>
                          {isManager ? (
                            <span className="text-xs text-white/50">{SCHOOL_ALL_SUBJECTS}</span>
                          ) : (
                            <SchoolSubjectBadges subjects={t.subjects} />
                          )}
                        </SchoolTableCell>
                        <SchoolTableCell className="text-center tabular-nums">
                          {t.activeClassCount ?? 0}
                        </SchoolTableCell>
                        <SchoolTableCell className="text-center tabular-nums">
                          {t.activeStudentLinkCount ?? 0}
                        </SchoolTableCell>
                        <SchoolTableCell className="text-center">
                          <Link
                            href={`/school/teachers/${t.teacherId}`}
                            className="inline-flex rounded-lg bg-amber-500/90 hover:bg-amber-400 text-black text-xs font-bold px-3 py-1.5"
                          >
                            {isManager ? SCHOOL_VIEW_DETAILS : SCHOOL_MANAGE_SUBJECTS}
                          </Link>
                        </SchoolTableCell>
                      </SchoolTableRow>
                    );
                  })}
                </SchoolDataTable>
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
