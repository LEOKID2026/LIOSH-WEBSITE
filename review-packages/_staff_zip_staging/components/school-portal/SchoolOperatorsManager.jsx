import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SchoolCardGrid, SchoolErrorBlock, SchoolLoadingBlock } from "./SchoolDrillDown";
import { SchoolEmptyState, SchoolSection, SCHOOL_CARD, SCHOOL_CARD_INNER } from "./SchoolPortalUi";
import SchoolStaffEmailInviteForm from "./SchoolStaffEmailInviteForm";
import SchoolStaffCreateForm from "./SchoolStaffCreateForm";
import SchoolStaffAccessActions from "./SchoolStaffAccessActions";
import SchoolOperatorGrantPanel from "./SchoolOperatorGrantPanel";
import {
  apiErrorMessageHe,
  schoolAuthFetch,
  SCHOOL_INVITE_OPERATOR_SUBMIT,
  SCHOOL_INVITE_OPERATOR_HELP,
  SCHOOL_OPERATOR_IDENTITY,
  SCHOOL_STAFF_CREATE_OPERATOR_SECTION,
  SCHOOL_STAFF_INVITE_EMAIL_SECTION,
} from "../../lib/school-portal/school-ui.he";

/**
 * @param {{ accessToken: string, enabled?: boolean }} props
 */
export default function SchoolOperatorsManager({ accessToken, enabled = true }) {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [grantBusy, setGrantBusy] = useState("");

  const load = useCallback(async () => {
    if (!accessToken || !enabled) return;
    setLoading(true);
    setError("");
    try {
      const res = await schoolAuthFetch(accessToken, "/api/school/operators");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessageHe(json?.error, "שגיאה בטעינה"));
        return;
      }
      setOperators(json?.data?.operators || []);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }, [accessToken, enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchGrant = async (operatorUserId, patch) => {
    setGrantBusy(operatorUserId);
    try {
      const res = await schoolAuthFetch(
        accessToken,
        `/api/school/operators/${encodeURIComponent(operatorUserId)}/grants`,
        { method: "PATCH", body: JSON.stringify(patch) }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(apiErrorMessageHe(json?.error, "עדכון הרשאות נכשל"));
        return;
      }
      await load();
    } finally {
      setGrantBusy("");
    }
  };

  return (
    <div className="space-y-6">
      <SchoolStaffCreateForm
        accessToken={accessToken}
        apiPath="/api/school/operators"
        sectionTitle={SCHOOL_STAFF_CREATE_OPERATOR_SECTION}
        staffKind="operator"
        onSuccess={() => void load()}
      />
      <SchoolStaffEmailInviteForm
        accessToken={accessToken}
        apiPath="/api/school/operators"
        userIdBodyKey="operatorUserId"
        sectionTitle={SCHOOL_STAFF_INVITE_EMAIL_SECTION}
        submitLabel={SCHOOL_INVITE_OPERATOR_SUBMIT}
        helpText={SCHOOL_INVITE_OPERATOR_HELP}
        showDisplayName
        onSuccess={() => void load()}
      />

      <SchoolSection>
        {loading ? (
          <SchoolLoadingBlock />
        ) : error ? (
          <SchoolErrorBlock message={error} onRetry={() => void load()} />
        ) : operators.length === 0 ? (
          <SchoolEmptyState title="אין מזכיר/ות משויכ/ים" />
        ) : (
          <SchoolCardGrid columns={1}>
            {operators.map((op) => (
              <article key={op.operatorUserId} className={SCHOOL_CARD}>
                <div className={SCHOOL_CARD_INNER}>
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="text-xs text-white/50 mb-1">{SCHOOL_OPERATOR_IDENTITY}</p>
                      <h3 className="font-semibold">{op.displayName || op.email || op.operatorUserId}</h3>
                      {op.email ? (
                        <p className="text-xs text-white/60 mt-1" dir="ltr">
                          {op.email}
                        </p>
                      ) : null}
                      {op.staffCode ? (
                        <p className="text-xs text-white/50 mt-1 font-mono" dir="ltr">
                          {op.staffCode}
                          {op.staffAccessStatus === "suspended" ? " · מושעה" : ""}
                        </p>
                      ) : null}
                    </div>
                    <Link
                      href={`/school/operators/${op.operatorUserId}`}
                      className="text-amber-300 text-sm hover:underline"
                    >
                      פרטים
                    </Link>
                  </div>
                  <SchoolOperatorGrantPanel
                    grants={op.grants}
                    editable
                    disabled={grantBusy === op.operatorUserId}
                    onPatch={(patch) => void patchGrant(op.operatorUserId, patch)}
                  />
                  <SchoolStaffAccessActions
                    accessToken={accessToken}
                    userId={op.operatorUserId}
                    apiBasePath="/api/school/operators"
                    staffCode={op.staffCode}
                    staffAccessStatus={op.staffAccessStatus}
                    hasStaffCodeLogin={op.hasStaffCodeLogin}
                    onChanged={() => void load()}
                  />
                </div>
              </article>
            ))}
          </SchoolCardGrid>
        )}
      </SchoolSection>
    </div>
  );
}
