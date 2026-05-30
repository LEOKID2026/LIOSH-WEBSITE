import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import SchoolOperatorGrantPanel from "../../../components/school-portal/SchoolOperatorGrantPanel";
import { useSchoolPortalLoad } from "../../../lib/school-portal/use-school-portal-session";
import {
  SCHOOL_LOADING,
  SCHOOL_OPERATOR_NO_TEACHING,
  SCHOOL_OPERATOR_NO_PERMISSIONS,
  SCHOOL_PLATFORM_LABEL,
} from "../../../lib/school-portal/school-ui.he";
import { SCHOOL_CARD, SCHOOL_CARD_INNER } from "../../../components/school-portal/SchoolPortalUi";

export default function SchoolOperatorDashboardPage() {
  const router = useRouter();
  const { state, me } = useSchoolPortalLoad();

  useEffect(() => {
    if (state === "unauthenticated") router.replace("/school/staff/login");
    if (state === "forbidden") router.replace("/teacher/dashboard");
    if (state === "ready" && me?.portalRole === "school_manager") {
      router.replace("/school/dashboard");
    }
  }, [state, me, router]);

  const grants = me?.operator?.grants || {};

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8 text-white" dir="rtl" lang="he">
        <p className="text-xs text-white/50 mb-1">{SCHOOL_PLATFORM_LABEL}</p>
        <h1 className="text-xl font-bold mb-1">{me?.school?.name || "בית ספר"}</h1>
        <p className="text-sm text-white/60 mb-6">{SCHOOL_OPERATOR_NO_TEACHING}</p>

        {state === "loading" ? (
          <p className="text-white/60 text-sm">{SCHOOL_LOADING}</p>
        ) : (
          <section className={SCHOOL_CARD}>
            <div className={SCHOOL_CARD_INNER}>
              <SchoolOperatorGrantPanel grants={grants} editable={false} />
              {grants.studentDataViewer ? (
                <Link href="/school/students" className="text-amber-300 text-sm hover:underline block mt-4">
                  צפייה בתלמידים
                </Link>
              ) : null}
              {!grants.studentAccessAdmin && !grants.studentDataViewer ? (
                <p className="text-white/50 text-sm mt-4">{SCHOOL_OPERATOR_NO_PERMISSIONS}</p>
              ) : null}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
