import Layout from "../../../components/Layout";
import AdminShell from "../../../components/admin/AdminShell";
import AdminLeoMinersConfigTab from "../../../components/admin/games/AdminLeoMinersConfigTab";
import { useAdminSession } from "../../../lib/admin-portal/use-admin-session";
import { ADMIN_LOADING } from "../../../lib/admin-portal/admin-ui.he.js";

export default function AdminLeoMinersPage() {
  const { state, accessToken } = useAdminSession();

  return (
    <Layout>
      <AdminShell title="Leo Miners" showLogout>
        {state === "loading" ? (
          <p className="text-white/60 text-sm text-right">{ADMIN_LOADING}</p>
        ) : (
          <AdminLeoMinersConfigTab accessToken={accessToken} />
        )}
      </AdminShell>
    </Layout>
  );
}
