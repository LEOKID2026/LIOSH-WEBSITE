import { useCallback, useEffect, useState } from "react";
import SchoolCredentialShownOnceBox from "./SchoolCredentialShownOnceBox";
import SchoolStudentParentAccessRow from "./SchoolStudentParentAccessRow";
import { SchoolPrimaryButton } from "./SchoolPortalUi";
import { apiErrorMessageHe, schoolAuthFetch } from "../../lib/school-portal/school-ui.he";
import {
  SC_BTN_ADD_PARENT,
  SC_BTN_BLOCK,
  SC_BTN_CREATE_ACCOUNT,
  SC_BTN_RESET_PIN,
  SC_BTN_REVOKE,
  SC_BTN_UNBLOCK,
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

export default function SchoolStudentAccessPanel({ accessToken, studentId, studentName }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [showAddParent, setShowAddParent] = useState(false);
  const [relation, setRelation] = useState("mother");
  const [displayLabel, setDisplayLabel] = useState("");

  const base = `/api/school/students/${encodeURIComponent(studentId)}/accounts`;

  const load = useCallback(async () => {
    if (!accessToken || !studentId) return;
    setLoading(true);
    setError("");
    try {
      const res = await schoolAuthFetch(accessToken, `${base}`, { method: "GET" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessageHe(body?.error, SC_ERROR_GENERIC));
        return;
      }
      setData(body.data || null);
    } catch {
      setError(SC_ERROR_GENERIC);
    } finally {
      setLoading(false);
    }
  }, [accessToken, studentId, base]);

  useEffect(() => {
    void load();
  }, [load]);

  const post = async (path, body = {}) => {
    setBusy(true);
    setError("");
    try {
      const res = await schoolAuthFetch(accessToken, path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessageHe(json?.error, SC_ERROR_GENERIC));
        return null;
      }
      return json.data;
    } catch {
      setError(SC_ERROR_GENERIC);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const student = data?.studentAccess;
  const parents = data?.parentAccesses || [];

  if (loading) {
    return <p className="text-sm text-white/50 text-right py-6">{SC_LOADING}</p>;
  }

  return (
    <div className="space-y-6 text-right overflow-y-auto max-h-[min(60vh,480px)] px-1" dir="rtl">
      {studentName ? (
        <p className="text-sm text-white/60">{studentName}</p>
      ) : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {credentials ? (
        <SchoolCredentialShownOnceBox credentials={credentials} onDismiss={() => setCredentials(null)} />
      ) : null}

      <section>
        <h3 className="font-semibold text-amber-200 mb-2">{SC_SECTION_STUDENT_ACCOUNT}</h3>
        {!student?.accessId ? (
          <div className="space-y-2">
            <p className="text-sm text-white/50">{SC_EMPTY_STUDENT_ACCOUNT}</p>
            <SchoolPrimaryButton
              disabled={busy}
              onClick={async () => {
                const result = await post(`${base}/student/create`);
                if (result?.loginPinOnce) {
                  setCredentials({
                    loginUsername: result.loginUsername,
                    loginPinOnce: result.loginPinOnce,
                  });
                }
                void load();
              }}
            >
              {SC_BTN_CREATE_ACCOUNT}
            </SchoolPrimaryButton>
          </div>
        ) : (
          <div className="rounded-lg border border-white/15 bg-white/5 p-3 text-sm space-y-2">
            <p className="font-mono">{student.loginUsername}</p>
            <p className="text-white/55">{studentStatusLabel(student.status)}</p>
            <div className="flex flex-wrap gap-2 justify-end">
              {student.status === "active" || student.status === "blocked" ? (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded border border-white/20 px-2 py-1 text-xs"
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
                      className="rounded border border-white/20 px-2 py-1 text-xs"
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
                      className="rounded border border-white/20 px-2 py-1 text-xs"
                      onClick={async () => {
                        await post(`${base}/student/unblock`, { accessId: student.accessId });
                        void load();
                      }}
                    >
                      {SC_BTN_UNBLOCK}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300"
                    onClick={async () => {
                      if (!window.confirm(SC_CONFIRM_REVOKE_STUDENT)) return;
                      await post(`${base}/student/revoke`, { accessId: student.accessId });
                      void load();
                    }}
                  >
                    {SC_BTN_REVOKE}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 className="font-semibold text-amber-200">{SC_SECTION_PARENT_ACCOUNTS}</h3>
          <div className="flex gap-2">
            <button
              type="button"
              className="text-xs text-amber-300 underline"
              onClick={() => {
                setShowAddParent((v) => !v);
              }}
            >
              {SC_BTN_ADD_PARENT}
            </button>
          </div>
        </div>

        {showAddParent ? (
          <form
            className="mb-3 rounded-lg border border-white/15 p-3 space-y-2 text-sm"
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
                className="mt-1 w-full rounded bg-black/40 border border-white/20 px-2 py-1"
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
                className="mt-1 w-full rounded bg-black/40 border border-white/20 px-2 py-1"
              />
            </label>
            <SchoolPrimaryButton disabled={busy} type="submit">
              {SC_BTN_ADD_PARENT}
            </SchoolPrimaryButton>
          </form>
        ) : null}

        {parents.length ? (
          <div className="space-y-2">
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
                  await post(`${base}/parent/revoke`, { accessId: r.accessId });
                  void load();
                }}
                onUnlink={async (r) => {
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
