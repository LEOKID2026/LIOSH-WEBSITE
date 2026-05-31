import { useCallback, useEffect, useState } from "react";
import SchoolCredentialShownOnceBox from "./SchoolCredentialShownOnceBox";
import SchoolStudentParentAccessRow from "./SchoolStudentParentAccessRow";
import {
  SchoolPrimaryButton,
  SCHOOL_PORTAL_BTN_CURSOR,
  SCHOOL_PORTAL_MODAL_SCROLL_CLASS,
} from "./SchoolPortalUi";
import { apiErrorMessageHe, schoolAuthFetch } from "../../lib/school-portal/school-ui.he";
import { hasSchoolPortalSession } from "../../lib/school-portal/operator-grants.js";
import {
  SC_BTN_ADD_PARENT,
  SC_BTN_BLOCK,
  SC_BTN_CREATE_ACCOUNT,
  SC_BTN_CREATE_NEW_ACCOUNT,
  SC_BTN_RESET_PIN,
  SC_BTN_REVOKE,
  SC_BTN_UNBLOCK,
  SC_CONFIRM_DISCONNECT_PARENT,
  SC_CONFIRM_REVOKE_PARENT,
  SC_CONFIRM_REVOKE_STUDENT,
  SC_EMPTY_PARENT_ACCOUNTS,
  SC_EMPTY_STUDENT_ACCOUNT,
  SC_ERROR_GENERIC,
  SC_LABEL_DISPLAY_NAME,
  SC_LABEL_RELATION,
  SC_LOADING,
  SC_RELATION_FATHER,
  SC_RELATION_GUARDIAN,
  SC_RELATION_MOTHER,
  SC_RELATION_OTHER,
  SC_REVOKE_RECOVERY_HINT,
  SC_SECTION_PARENT_ACCOUNTS,
  SC_SECTION_STUDENT_ACCOUNT,
  SC_STATUS_ACTIVE,
  SC_STATUS_BLOCKED,
  SC_STATUS_NOT_CREATED,
  SC_STATUS_REVOKED,
} from "../../lib/school-portal/school-communication.he";

function studentStatusLabel(status) {
  if (status === "active") return SC_STATUS_ACTIVE;
  if (status === "blocked") return SC_STATUS_BLOCKED;
  if (status === "revoked") return SC_STATUS_REVOKED;
  if (status === "not_created") return SC_STATUS_NOT_CREATED;
  return status;
}

function AccessCard({ title, children, variant = "default" }) {
  const border =
    variant === "destructive"
      ? "border-red-500/20 bg-red-950/20"
      : "border-white/15 bg-white/5";
  return (
    <div className={`rounded-xl border p-4 text-sm space-y-3 ${border}`}>
      {title ? <h4 className="font-semibold text-amber-200/90 text-sm">{title}</h4> : null}
      {children}
    </div>
  );
}

function ActionGroup({ label, children }) {
  return (
    <div className="space-y-2 pt-2 border-t border-white/10">
      {label ? <p className="text-xs text-white/45">{label}</p> : null}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 justify-end">{children}</div>
    </div>
  );
}

function actionBtnClass(variant = "default") {
  const cursor = SCHOOL_PORTAL_BTN_CURSOR;
  if (variant === "primary") {
    return `rounded-lg bg-amber-500/15 border border-amber-500/35 text-amber-100 px-3 py-2 text-sm font-medium disabled:opacity-50 ${cursor}`;
  }
  if (variant === "danger") {
    return `rounded-lg border border-red-500/50 bg-red-950/30 text-red-200 px-3 py-2 text-sm font-medium disabled:opacity-50 ${cursor}`;
  }
  return `rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm disabled:opacity-50 ${cursor}`;
}

export default function SchoolStudentAccessPanel({ accessToken, authMethod = "supabase_jwt", studentId, studentName }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [showAddParent, setShowAddParent] = useState(false);
  const [relation, setRelation] = useState("mother");
  const [displayLabel, setDisplayLabel] = useState("");

  const base = `/api/school/students/${encodeURIComponent(studentId)}/accounts`;

  const load = useCallback(async () => {
    if (!hasSchoolPortalSession(accessToken, authMethod) || !studentId) {
      setLoading(false);
      setLoadError("");
      setData(null);
      return;
    }
    setLoading(true);
    setLoadError("");
    try {
      const res = await schoolAuthFetch(accessToken, `${base}`, { method: "GET" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setData(null);
        setLoadError(apiErrorMessageHe(body?.error, SC_ERROR_GENERIC));
        return;
      }
      setData(
        body.data || {
          studentAccess: null,
          legacyStudentAccess: null,
          parentAccesses: [],
          legacyParentAccesses: [],
        }
      );
    } catch {
      setData(null);
      setLoadError(SC_ERROR_GENERIC);
    } finally {
      setLoading(false);
    }
  }, [accessToken, authMethod, studentId, base]);

  useEffect(() => {
    void load();
  }, [load]);

  const post = async (path, body = {}) => {
    if (!hasSchoolPortalSession(accessToken, authMethod) || !studentId) return null;
    setBusy(true);
    setActionError("");
    try {
      const res = await schoolAuthFetch(accessToken, path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(apiErrorMessageHe(json?.error, SC_ERROR_GENERIC));
        return null;
      }
      return json.data;
    } catch {
      setActionError(SC_ERROR_GENERIC);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const createStudentAccount = async () => {
    const result = await post(`${base}/student/create`);
    if (result?.loginPinOnce) {
      setCredentials({
        loginUsername: result.loginUsername,
        loginPinOnce: result.loginPinOnce,
      });
    }
    void load();
  };

  const student = data?.studentAccess;
  const parents = data?.parentAccesses || [];

  const hasSchoolStudent = Boolean(student?.accessId);
  const canCreateSchoolStudent = !hasSchoolStudent || student?.status === "revoked";
  const studentCanManage = hasSchoolStudent && student?.status !== "revoked";

  if (loading) {
    return <p className="text-sm text-white/50 text-right py-6">{SC_LOADING}</p>;
  }

  return (
    <div
      className={`space-y-6 text-right overflow-y-auto max-h-[min(70vh,520px)] px-1 pb-2 ${SCHOOL_PORTAL_MODAL_SCROLL_CLASS}`}
      dir="rtl"
    >
      {studentName ? <p className="text-sm text-white/60">{studentName}</p> : null}
      {loadError ? <p className="text-sm text-red-300">{loadError}</p> : null}
      {actionError ? <p className="text-sm text-amber-200">{actionError}</p> : null}
      {credentials ? (
        <SchoolCredentialShownOnceBox credentials={credentials} onDismiss={() => setCredentials(null)} />
      ) : null}

      <section className="space-y-3">
        <h3 className="font-semibold text-amber-200">{SC_SECTION_STUDENT_ACCOUNT}</h3>

        {!hasSchoolStudent ? (
          <AccessCard>
            <p className="text-white/55">{SC_EMPTY_STUDENT_ACCOUNT}</p>
            {canCreateSchoolStudent ? (
              <SchoolPrimaryButton disabled={busy} onClick={() => void createStudentAccount()}>
                {SC_BTN_CREATE_ACCOUNT}
              </SchoolPrimaryButton>
            ) : null}
          </AccessCard>
        ) : (
          <AccessCard>
            <p className="font-mono text-base text-white/90 break-all">{student.loginUsername}</p>
            <p className="text-white/60">{studentStatusLabel(student.status)}</p>
            {student.status === "revoked" ? (
              <p className="text-xs text-white/50 leading-relaxed">{SC_REVOKE_RECOVERY_HINT}</p>
            ) : null}

            {studentCanManage ? (
              <ActionGroup label="פעולות חשבון">
                <button
                  type="button"
                  disabled={busy}
                  className={actionBtnClass("primary")}
                  onClick={async () => {
                    const result = await post(`${base}/student/reset-pin`, {
                      accessId: student.accessId,
                    });
                    if (result?.loginPinOnce) {
                      setCredentials({
                        loginUsername: student.loginUsername,
                        loginPinOnce: result.loginPinOnce,
                      });
                    }
                    void load();
                  }}
                >
                  {SC_BTN_RESET_PIN}
                </button>
                {student.status === "active" ? (
                  <button
                    type="button"
                    disabled={busy}
                    className={actionBtnClass()}
                    onClick={async () => {
                      await post(`${base}/student/block`, { accessId: student.accessId });
                      void load();
                    }}
                  >
                    {SC_BTN_BLOCK}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    className={actionBtnClass("primary")}
                    onClick={async () => {
                      await post(`${base}/student/unblock`, { accessId: student.accessId });
                      void load();
                    }}
                  >
                    {SC_BTN_UNBLOCK}
                  </button>
                )}
              </ActionGroup>
            ) : null}

            {studentCanManage ? (
              <ActionGroup label="פעולות בלתי הפיכות">
                <button
                  type="button"
                  disabled={busy}
                  className={actionBtnClass("danger")}
                  onClick={async () => {
                    if (!window.confirm(SC_CONFIRM_REVOKE_STUDENT)) return;
                    await post(`${base}/student/revoke`, { accessId: student.accessId });
                    void load();
                  }}
                >
                  {SC_BTN_REVOKE}
                </button>
              </ActionGroup>
            ) : null}

            {student.status === "revoked" ? (
              <SchoolPrimaryButton disabled={busy} onClick={() => void createStudentAccount()}>
                {SC_BTN_CREATE_NEW_ACCOUNT}
              </SchoolPrimaryButton>
            ) : null}
          </AccessCard>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-amber-200">{SC_SECTION_PARENT_ACCOUNTS}</h3>
          <button
            type="button"
            className={`rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-100 ${SCHOOL_PORTAL_BTN_CURSOR}`}
            onClick={() => setShowAddParent((v) => !v)}
          >
            {SC_BTN_ADD_PARENT}
          </button>
        </div>

        {showAddParent ? (
          <form
            className="rounded-xl border border-white/15 p-4 space-y-3 text-sm bg-black/20"
            onSubmit={async (e) => {
              e.preventDefault();
              const result = await post(`${base}/parent/create`, { relation, displayLabel });
              if (result?.loginPinOnce) {
                setCredentials({
                  loginUsername: result.loginUsername,
                  loginPinOnce: result.loginPinOnce,
                });
              }
              setShowAddParent(false);
              void load();
            }}
          >
            <label className="block">
              {SC_LABEL_RELATION}
              <select
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                className="mt-1 w-full rounded-lg bg-black/40 border border-white/20 px-2 py-2"
              >
                <option value="mother">{SC_RELATION_MOTHER}</option>
                <option value="father">{SC_RELATION_FATHER}</option>
                <option value="guardian">{SC_RELATION_GUARDIAN}</option>
                <option value="other">{SC_RELATION_OTHER}</option>
              </select>
            </label>
            <label className="block">
              {SC_LABEL_DISPLAY_NAME}
              <input
                value={displayLabel}
                onChange={(e) => setDisplayLabel(e.target.value)}
                className="mt-1 w-full rounded-lg bg-black/40 border border-white/20 px-2 py-2"
              />
            </label>
            <SchoolPrimaryButton disabled={busy} type="submit">
              {SC_BTN_ADD_PARENT}
            </SchoolPrimaryButton>
          </form>
        ) : null}

        {parents.length ? (
          <div className="space-y-3">
            {parents.map((row) => (
              <SchoolStudentParentAccessRow
                key={row.accessId}
                row={row}
                busy={busy}
                onResetPin={async (r) => {
                  const result = await post(`${base}/parent/reset-pin`, { accessId: r.accessId });
                  if (result?.loginPinOnce) {
                    setCredentials({
                      loginUsername: r.loginUsername,
                      loginPinOnce: result.loginPinOnce,
                    });
                  }
                  void load();
                }}
                onBlock={async (r) => {
                  await post(`${base}/parent/block`, { accessId: r.accessId });
                  void load();
                }}
                onUnblock={async (r) => {
                  await post(`${base}/parent/unblock`, { accessId: r.accessId });
                  void load();
                }}
                onRevoke={async (r) => {
                  if (!window.confirm(SC_CONFIRM_REVOKE_PARENT)) return;
                  await post(`${base}/parent/revoke`, { accessId: r.accessId });
                  void load();
                }}
                onUnlink={async (r) => {
                  if (!window.confirm(SC_CONFIRM_DISCONNECT_PARENT)) return;
                  await post(`${base}/parent/unlink`, { accessId: r.accessId });
                  void load();
                }}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/50">{SC_EMPTY_PARENT_ACCOUNTS}</p>
        )}
      </section>
    </div>
  );
}
