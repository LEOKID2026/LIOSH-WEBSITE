import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import SchoolOperatorGrantPanel from "../../../components/school-portal/SchoolOperatorGrantPanel";
import SchoolPortalShell from "../../../components/school-portal/SchoolPortalShell";
import { getOperatorGrants, operatorHasAnyGrant } from "../../../lib/school-portal/operator-grants";
import { useSchoolPortalLoad } from "../../../lib/school-portal/use-school-portal-session";
import {
  SCHOOL_LOADING,
  SCHOOL_OPERATOR_ACCESS_ADMIN_DESC,
  SCHOOL_OPERATOR_ACCESS_ADMIN_SECTION,
  SCHOOL_OPERATOR_DASHBOARD_TITLE,
  SCHOOL_OPERATOR_DATA_VIEWER_DESC,
  SCHOOL_OPERATOR_DATA_VIEWER_SECTION,
  SCHOOL_OPERATOR_GO_TO_STUDENTS,
  SCHOOL_OPERATOR_NO_PERMISSIONS,
  SCHOOL_OPERATOR_NO_PERMISSIONS_DETAIL,
  SCHOOL_OPERATOR_NO_TEACHING,
  SCHOOL_OPERATOR_WORKSPACE,
} from "../../../lib/school-portal/school-ui.he";
import { SCHOOL_CARD, SCHOOL_CARD_INNER } from "../../../components/school-portal/SchoolPortalUi";

function WorkspaceCard({ title, description, href, ctaLabel, testId }) {
  return (
    <section className={SCHOOL_CARD} data-testid={testId}>
      <div className={`${SCHOOL_CARD_INNER} space-y-3`}>
        <h2 className="text-base font-semibold text-amber-100">{title}</h2>
        <p className="text-sm text-white/65 leading-relaxed">{description}</p>
        <Link
          href={href}
          className="inline-flex rounded-lg bg-amber-500/90 hover:bg-amber-400 text-black text-sm font-bold px-4 py-2"
        >
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}

export default function SchoolOperatorDashboardPage() {
  const router = useRouter();
  const { state, authMethod, me } = useSchoolPortalLoad();
  const grants = getOperatorGrants(me);
  const hasAnyGrant = operatorHasAnyGrant(me);

  useEffect(() => {
    if (state === "unauthenticated") router.replace("/school/staff/login");
    if (state === "forbidden") router.replace("/teacher/dashboard");
    if (state === "ready" && me?.portalRole === "school_manager") {
      router.replace("/school/dashboard");
    }
  }, [state, me, router]);

  return (
    <Layout>
      <SchoolPortalShell
        title={SCHOOL_OPERATOR_DASHBOARD_TITLE}
        subtitle={SCHOOL_OPERATOR_NO_TEACHING}
        schoolName={me?.school?.name}
        portalRole="school_operator"
        authMethod={authMethod}
        operatorGrants={grants}
      >
        {state === "loading" ? (
          <p className="text-white/60 text-sm">{SCHOOL_LOADING}</p>
        ) : (
          <div className="space-y-6" data-testid="school-operator-dashboard">
            <section className={SCHOOL_CARD}>
              <div className={SCHOOL_CARD_INNER}>
                <h2 className="text-sm font-semibold text-white/80 mb-3">{SCHOOL_OPERATOR_WORKSPACE}</h2>
                <SchoolOperatorGrantPanel grants={grants} editable={false} />
              </div>
            </section>

            {grants.studentAccessAdmin ? (
              <WorkspaceCard
                title={SCHOOL_OPERATOR_ACCESS_ADMIN_SECTION}
                description={SCHOOL_OPERATOR_ACCESS_ADMIN_DESC}
                href="/school/students"
                ctaLabel={SCHOOL_OPERATOR_GO_TO_STUDENTS}
                testId="school-operator-access-admin-workspace"
              />
            ) : null}

            {grants.studentDataViewer ? (
              <WorkspaceCard
                title={SCHOOL_OPERATOR_DATA_VIEWER_SECTION}
                description={SCHOOL_OPERATOR_DATA_VIEWER_DESC}
                href="/school/students"
                ctaLabel={SCHOOL_OPERATOR_GO_TO_STUDENTS}
                testId="school-operator-data-viewer-workspace"
              />
            ) : null}

            {!hasAnyGrant ? (
              <section className={SCHOOL_CARD} data-testid="school-operator-no-permissions">
                <div className={`${SCHOOL_CARD_INNER} space-y-2`}>
                  <p className="text-amber-200/90 text-sm font-semibold">{SCHOOL_OPERATOR_NO_PERMISSIONS}</p>
                  <p className="text-white/55 text-sm">{SCHOOL_OPERATOR_NO_PERMISSIONS_DETAIL}</p>
                </div>
              </section>
            ) : null}
          </div>
        )}
      </SchoolPortalShell>
    </Layout>
  );
}
