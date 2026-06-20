import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Layout from "../../../components/Layout";
import AdminShell from "../../../components/admin/AdminShell";
import AllAccountsAdminTable from "../../../components/admin/AllAccountsAdminTable";
import { adminAuthFetch, useAdminSession } from "../../../lib/admin-portal/use-admin-session";
import {
  ADMIN_ALL_ACCOUNTS_LIST_DEGRADED,
  ADMIN_ALL_ACCOUNTS_MAIN_ADMIN_ONLY,
  ADMIN_ALL_ACCOUNTS_SCHOOLS_LINK,
  ADMIN_ALL_ACCOUNTS_TITLE,
  ADMIN_LOADING,
  ADMIN_LOAD_ERROR,
  ADMIN_NO_ALL_ACCOUNTS,
  apiErrorMessageHe,
} from "../../../lib/admin-portal/admin-ui.he.js";

export default function AdminAllAccountsPage() {
  const { state, accessToken } = useAdminSession();
  const [accounts, setAccounts] = useState([]);
  const [fullDeleteConfigured, setFullDeleteConfigured] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [listNotice, setListNotice] = useState("");
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async (token) => {
    setLoadError("");
    setForbidden(false);
    setListNotice("");
    setLoaded(false);

    const res = await adminAuthFetch(token, "/api/admin/accounts");
    const body = await res.json().catch(() => ({}));
    const code = body?.error?.code;

    if (!res.ok) {
      setAccounts([]);
      if (res.status === 403 && code === "main_admin_required") {
        setForbidden(true);
      }
      setLoadError(apiErrorMessageHe(body?.error, ADMIN_LOAD_ERROR));
      setLoaded(true);
      return;
    }

    if (!body?.data || !Array.isArray(body.data.accounts)) {
      setAccounts([]);
      setLoadError(ADMIN_LOAD_ERROR);
      setLoaded(true);
      return;
    }

    setAccounts(body.data.accounts);
    setFullDeleteConfigured(body.data.fullDeleteConfigured === true);
    if (body.data.listMeta?.source === "db_fallback") {
      setListNotice(ADMIN_ALL_ACCOUNTS_LIST_DEGRADED);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (state !== "ready" || !accessToken) return;
    void load(accessToken);
  }, [state, accessToken, load]);

  const showEmpty = loaded && !loadError && !forbidden && accounts.length === 0;

  return (
    <Layout>
      <AdminShell title={ADMIN_ALL_ACCOUNTS_TITLE} showLogout>
        <div className="flex justify-end mb-4">
          <Link href="/admin/schools" className="text-amber-300 text-sm hover:underline">
            {ADMIN_ALL_ACCOUNTS_SCHOOLS_LINK}
          </Link>
        </div>
        {state === "loading" || !loaded ? (
          <p className="text-white/60 text-sm text-right">{ADMIN_LOADING}</p>
        ) : loadError ? (
          <p className="text-red-300 text-sm text-right" data-testid="all-accounts-error">
            {loadError}
          </p>
        ) : forbidden ? (
          <p className="text-amber-200 text-sm text-right" data-testid="all-accounts-forbidden">
            {ADMIN_ALL_ACCOUNTS_MAIN_ADMIN_ONLY}
          </p>
        ) : showEmpty ? (
          <p className="text-white/60 text-sm text-right" data-testid="all-accounts-empty">
            {ADMIN_NO_ALL_ACCOUNTS}
          </p>
        ) : (
          <>
            {listNotice ? (
              <p className="text-amber-200/90 text-xs text-right mb-3" data-testid="all-accounts-degraded">
                {listNotice}
              </p>
            ) : null}
            <AllAccountsAdminTable
              accounts={accounts}
              accessToken={accessToken}
              fullDeleteConfigured={fullDeleteConfigured}
              onDeleted={() => load(accessToken)}
            />
          </>
        )}
      </AdminShell>
    </Layout>
  );
}
