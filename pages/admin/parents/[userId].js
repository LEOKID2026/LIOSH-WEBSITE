import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import AdminShell from "../../../components/admin/AdminShell";
import AdminUserLifecyclePanel from "../../../components/admin/AdminUserLifecyclePanel";
import ParentAdminSettingsForm from "../../../components/admin/ParentAdminSettingsForm";
import { adminAuthFetch, useAdminSession } from "../../../lib/admin-portal/use-admin-session";
import {
  ADMIN_BACK_TO_PARENTS,
  ADMIN_COL_EMAIL,
  ADMIN_LOAD_ERROR,
  ADMIN_LOADING,
  ADMIN_PARENT_DETAIL_FALLBACK,
  apiErrorMessageHe,
} from "../../../lib/admin-portal/admin-ui.he.js";

export default function AdminParentDetailPage() {
  const router = useRouter();
  const { userId } = router.query;
  const { state, accessToken } = useAdminSession();
  const [email, setEmail] = useState("");
  const [settings, setSettings] = useState(null);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async (token, id) => {
    const [listRes, settingsRes] = await Promise.all([
      adminAuthFetch(token, "/api/admin/parents"),
      adminAuthFetch(token, `/api/admin/parents/${encodeURIComponent(id)}/settings`),
    ]);
    const listBody = await listRes.json().catch(() => ({}));
    const settingsBody = await settingsRes.json().catch(() => ({}));

    if (listRes.status === 200) {
      const match = (listBody?.data?.parents || []).find((p) => p.parentUserId === id);
      setEmail(match?.email || "");
    }

    if (settingsRes.status === 200 && settingsBody?.data?.settings) {
      setSettings(settingsBody.data.settings);
      setLoadError("");
    } else {
      setLoadError(apiErrorMessageHe(settingsBody?.error, ADMIN_LOAD_ERROR));
    }
  }, []);

  useEffect(() => {
    if (state !== "ready" || !accessToken || !userId || typeof userId !== "string") return;
    load(accessToken, userId);
  }, [state, accessToken, userId, load]);

  const title = email || ADMIN_PARENT_DETAIL_FALLBACK;

  return (
    <Layout>
      <AdminShell title={title} showLogout>
        <Link href="/admin/parents" className="text-amber-300 text-sm hover:underline inline-block mb-4">
          {ADMIN_BACK_TO_PARENTS}
        </Link>
        {state === "loading" || !settings ? (
          loadError ? (
            <p className="text-red-300 text-sm text-right">{loadError}</p>
          ) : (
            <p className="text-white/60 text-sm text-right">{ADMIN_LOADING}</p>
          )
        ) : (
          <>
            <div className="mb-4 text-right text-sm">
              <p className="text-white/50">{ADMIN_COL_EMAIL}</p>
              <p dir="ltr" className="break-all">
                {email || "—"}
              </p>
              <p className="text-xs text-white/40 font-mono mt-2" dir="ltr">
                {userId}
              </p>
            </div>
            <AdminUserLifecyclePanel
              accessToken={accessToken}
              userId={String(userId)}
              persona="parent"
              accountStatus={settings.accountStatus}
              onChanged={() => load(accessToken, String(userId))}
            />
            <ParentAdminSettingsForm
              accessToken={accessToken}
              parentUserId={String(userId)}
              initial={settings}
              onSaved={setSettings}
            />
          </>
        )}
      </AdminShell>
    </Layout>
  );
}
