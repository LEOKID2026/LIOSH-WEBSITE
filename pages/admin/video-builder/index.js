import Layout from "../../../components/Layout";
import AdminShell from "../../../components/admin/AdminShell";
import AdminVideoBuilderList from "../../../components/admin/video-builder/AdminVideoBuilderList";
import { useAdminSession } from "../../../lib/admin-portal/use-admin-session";
import { ADMIN_LOADING } from "../../../lib/admin-portal/admin-ui.he.js";
import { VB_TITLE } from "../../../lib/admin-portal/admin-video-builder-ui.he.js";

export default function AdminVideoBuilderIndexPage() {
  const { state, accessToken } = useAdminSession();

  return (
    <Layout>
      <AdminShell title={VB_TITLE} showLogout>
        {state === "loading" ? (
          <p className="text-white/60 text-sm text-right">{ADMIN_LOADING}</p>
        ) : (
          <AdminVideoBuilderList accessToken={accessToken} />
        )}
      </AdminShell>
    </Layout>
  );
}
