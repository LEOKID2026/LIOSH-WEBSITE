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
  ADMIN_PARENT_UNLINKED_DETAIL_NOTE,
  ADMIN_PARENT_UNLINKED_STATUS,
  apiErrorMessageHe,
} from "../../../lib/admin-portal/admin-ui.he.js";

export default function AdminParentDetailPage() {
  const router = useRouter();
  const { userId } = router.query;
  const { state, accessToken } = useAdminSession();
  const [email, setEmail] = useState("");
  const [settings, setSettings] = useState(null);
  const [isOrphanUnlinked, setIsOrphanUnlinked] = useState(false);
  const [detailReady, setDetailReady] = useState(false);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async (token, id) => {
    const settingsRes = await adminAuthFetch(
      token,
      `/api/admin/parents/${encodeURIComponent(id)}/settings`
    );
    const settingsBody = await settingsRes.json().catch(() => ({}));

    if (settingsRes.status === 200 && settingsBody?.data) {
      const data = settingsBody.data;
      setEmail(data.email || "");
      setSettings(data.settings || null);
      setIsOrphanUnlinked(data.isOrphanUnlinked === true);
      setDetailReady(true);
      setLoadError("");
      return;
    }

    setDetailReady(false);
    setLoadError(apiErrorMessageHe(settingsBody?.error, ADMIN_LOAD_ERROR));
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
        {state === "loading" || !detailReady ? (
          loadError ? (
            <p className="text-red-300 text-sm text-right">{loadError}</p>
          ) : (
            <p className="text-white/60 text-sm text-right">{ADMIN_LOADING}</p>
          )
        ) : (
          <>
            <div className="mb-4 text-right text-sm" data-testid="parent-detail-header">
              <p className="text-white/50">{ADMIN_COL_EMAIL}</p>
              <p dir="ltr" className="break-all">
                {email || "-"}
              </p>
              <p className="text-xs text-white/40 font-mono mt-2" dir="ltr">
                {userId}
              </p>
              {isOrphanUnlinked ? (
                <p
                  className="text-amber-200/90 text-xs mt-2"
                  data-testid="parent-detail-unlinked-badge"
                >
                  {ADMIN_PARENT_UNLINKED_STATUS}
                </p>
              ) : null}
            </div>
            {isOrphanUnlinked ? (
              <p className="text-white/60 text-sm text-right mb-4" data-testid="parent-detail-unlinked-note">
                {ADMIN_PARENT_UNLINKED_DETAIL_NOTE}
              </p>
            ) : null}
            <AdminUserLifecyclePanel
              accessToken={accessToken}
              userId={String(userId)}
              persona="parent"
              accountStatus={settings?.accountStatus ?? null}
              targetEmail={email}
              onChanged={() => load(accessToken, String(userId))}
              onDeleted={() => router.push("/admin/parents")}
            />
            {settings ? (
              <ParentAdminSettingsForm
                accessToken={accessToken}
                parentUserId={String(userId)}
                initial={settings}
                onSaved={setSettings}
              />
            ) : null}
          </>
        )}
      </AdminShell>
    </Layout>
  );
}
