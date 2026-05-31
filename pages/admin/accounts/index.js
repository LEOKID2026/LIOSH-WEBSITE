import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Layout from "../../../components/Layout";
import AdminShell from "../../../components/admin/AdminShell";
import AllAccountsAdminTable from "../../../components/admin/AllAccountsAdminTable";
import { adminAuthFetch, useAdminSession } from "../../../lib/admin-portal/use-admin-session";
import {
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

  const load = useCallback(async (token) => {
    const res = await adminAuthFetch(token, "/api/admin/accounts");
    const body = await res.json().catch(() => ({}));
    if (res.status === 403 && body?.error?.code === "main_admin_required") {
      setForbidden(true);
      setLoadError(ADMIN_ALL_ACCOUNTS_MAIN_ADMIN_ONLY);
      return;
    }
    if (res.status === 200 && body?.data?.accounts) {
      setAccounts(body.data.accounts);
      setFullDeleteConfigured(body.data.fullDeleteConfigured === true);
      setForbidden(false);
      setLoadError("");
      return;
    }
    setLoadError(apiErrorMessageHe(body?.error, ADMIN_LOAD_ERROR));
  }, []);

  useEffect(() => {
    if (state !== "ready" || !accessToken) return;
    void load(accessToken);
  }, [state, accessToken, load]);

  return (
    <Layout>
      <AdminShell title={ADMIN_ALL_ACCOUNTS_TITLE} showLogout>
        <div className="flex flex-wrap gap-3 justify-between items-center mb-4">
          <p className="text-white/60 text-sm">
            תצוגה מאוחדת לכל משתמשי Auth · שורה אחת לכל חשבון
          </p>
          <Link href="/admin/schools" className="text-amber-300 text-sm hover:underline">
            {ADMIN_ALL_ACCOUNTS_SCHOOLS_LINK}
          </Link>
        </div>
        {state === "loading" ? (
          <p className="text-white/60 text-sm text-right">{ADMIN_LOADING}</p>
        ) : loadError ? (
          <p className="text-red-300 text-sm text-right" data-testid="all-accounts-error">
            {loadError}
          </p>
        ) : forbidden ? (
          <p className="text-amber-200 text-sm text-right" data-testid="all-accounts-forbidden">
            {ADMIN_ALL_ACCOUNTS_MAIN_ADMIN_ONLY}
          </p>
        ) : accounts.length === 0 ? (
          <p className="text-white/60 text-sm text-right">{ADMIN_NO_ALL_ACCOUNTS}</p>
        ) : (
          <AllAccountsAdminTable
            accounts={accounts}
            accessToken={accessToken}
            fullDeleteConfigured={fullDeleteConfigured}
            onDeleted={() => load(accessToken)}
          />
        )}
      </AdminShell>
    </Layout>
  );
}
