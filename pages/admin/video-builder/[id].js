import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import AdminShell from "../../../components/admin/AdminShell";
import AdminVideoBuilderEditor from "../../../components/admin/video-builder/AdminVideoBuilderEditor";
import { useAdminSession } from "../../../lib/admin-portal/use-admin-session";
import { ADMIN_LOADING } from "../../../lib/admin-portal/admin-ui.he.js";
import { VB_TITLE } from "../../../lib/admin-portal/admin-video-builder-ui.he.js";

export default function AdminVideoBuilderEditPage() {
  const router = useRouter();
  const { state, accessToken } = useAdminSession();
  const projectId = typeof router.query.id === "string" ? router.query.id : null;

  return (
    <Layout>
      <AdminShell title={VB_TITLE} showLogout>
        {state === "loading" || !projectId ? (
          <p className="text-white/60 text-sm text-right">{ADMIN_LOADING}</p>
        ) : (
          <AdminVideoBuilderEditor accessToken={accessToken} projectId={projectId} />
        )}
      </AdminShell>
    </Layout>
  );
}
