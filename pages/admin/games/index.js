import { useState } from "react";
import Layout from "../../../components/Layout";
import AdminShell from "../../../components/admin/AdminShell";
import AdminGamesCatalogTab from "../../../components/admin/games/AdminGamesCatalogTab";
import { useAdminSession } from "../../../lib/admin-portal/use-admin-session";
import { ADMIN_LOADING } from "../../../lib/admin-portal/admin-ui.he.js";

export default function AdminGamesPage() {
  const { state, accessToken } = useAdminSession();

  return (
    <Layout>
      <AdminShell title="משחקים" showLogout>
        {state === "loading" ? (
          <p className="text-white/60 text-sm text-right">{ADMIN_LOADING}</p>
        ) : (
          <AdminGamesCatalogTab accessToken={accessToken} />
        )}
      </AdminShell>
    </Layout>
  );
}
