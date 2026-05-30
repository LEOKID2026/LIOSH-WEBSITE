import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import SchoolPortalShell from "../../../components/school-portal/SchoolPortalShell";
import SchoolOperatorGrantPanel from "../../../components/school-portal/SchoolOperatorGrantPanel";
import { useSchoolPortalLoad } from "../../../lib/school-portal/use-school-portal-session";
import {
  apiErrorMessageHe,
  schoolAuthFetch,
  SCHOOL_LOADING,
  SCHOOL_OPERATOR_IDENTITY,
  SCHOOL_OPERATOR_NO_TEACHING,
} from "../../../lib/school-portal/school-ui.he";
import { SCHOOL_CARD, SCHOOL_CARD_INNER } from "../../../components/school-portal/SchoolPortalUi";

export default function SchoolOperatorDetailPage() {
  const router = useRouter();
  const operatorId = typeof router.query?.operatorId === "string" ? router.query.operatorId : "";
  const { state, accessToken, me } = useSchoolPortalLoad();
  const [operator, setOperator] = useState(null);
  const [error, setError] = useState("");
  const [grantBusy, setGrantBusy] = useState(false);

  useEffect(() => {
    if (state === "unauthenticated") router.replace("/teacher/login");
    if (state === "forbidden") router.replace("/teacher/dashboard");
    if (state === "ready" && me?.portalRole === "school_operator") {
      router.replace("/school/operator/dashboard");
    }
  }, [state, me, router]);

  const load = async () => {
    const res = await schoolAuthFetch(accessToken, "/api/school/operators");
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(apiErrorMessageHe(json?.error, "שגיאה בטעינה"));
      return;
    }
    const match = (json?.data?.operators || []).find((o) => o.operatorUserId === operatorId);
    setOperator(match || null);
  };

  useEffect(() => {
    if (state !== "ready" || !accessToken || !operatorId) return;
    void load();
  }, [state, accessToken, operatorId]);

  const patchGrant = async (patch) => {
    setGrantBusy(true);
    try {
      const res = await schoolAuthFetch(
        accessToken,
        `/api/school/operators/${encodeURIComponent(operatorId)}/grants`,
        { method: "PATCH", body: JSON.stringify(patch) }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(apiErrorMessageHe(json?.error, "עדכון הרשאות נכשל"));
        return;
      }
      await load();
    } finally {
      setGrantBusy(false);
    }
  };

  const isManager = me?.portalRole === "school_manager";

  return (
    <Layout>
      <SchoolPortalShell
        title={operator?.displayName || operator?.email || "מזכיר/ה"}
        subtitle={SCHOOL_OPERATOR_NO_TEACHING}
        schoolName={me?.school?.name}
        portalRole={me?.portalRole}
      >
        <Link href="/school/operators" className="text-amber-300 text-sm hover:underline inline-block mb-4">
          ← חזרה
        </Link>
        {state === "loading" ? (
          <p className="text-white/60 text-sm">{SCHOOL_LOADING}</p>
        ) : error ? (
          <p className="text-red-300 text-sm">{error}</p>
        ) : !operator ? (
          <p className="text-white/60 text-sm">לא נמצא/ה.</p>
        ) : (
          <section className={SCHOOL_CARD}>
            <div className={SCHOOL_CARD_INNER}>
              <p className="text-xs text-white/50 mb-2">{SCHOOL_OPERATOR_IDENTITY}</p>
              {operator.email ? (
                <p className="text-sm mb-2" dir="ltr">
                  {operator.email}
                </p>
              ) : null}
              <p className="text-xs text-white/40 font-mono mb-4" dir="ltr">
                {operator.operatorUserId}
              </p>
              <SchoolOperatorGrantPanel
                grants={operator.grants}
                editable={isManager}
                disabled={grantBusy}
                onPatch={(patch) => void patchGrant(patch)}
              />
            </div>
          </section>
        )}
      </SchoolPortalShell>
    </Layout>
  );
}
