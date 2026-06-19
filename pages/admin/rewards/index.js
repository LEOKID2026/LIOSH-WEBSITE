import { useState } from "react";
import Layout from "../../../components/Layout";
import AdminShell from "../../../components/admin/AdminShell";
import AdminRewardsShell from "../../../components/admin/rewards/AdminRewardsShell";
import AdminGeneralTab from "../../../components/admin/rewards/AdminGeneralTab";
import AdminEconomyTab from "../../../components/admin/rewards/AdminEconomyTab";
import AdminCardsTab from "../../../components/admin/rewards/AdminCardsTab";
import AdminSeriesTab from "../../../components/admin/rewards/AdminSeriesTab";
import AdminBoxTab from "../../../components/admin/rewards/AdminBoxTab";
import AdminShopTab from "../../../components/admin/rewards/AdminShopTab";
import AdminDuplicatesTab from "../../../components/admin/rewards/AdminDuplicatesTab";
import AdminEventsTab from "../../../components/admin/rewards/AdminEventsTab";
import AdminTestsTab from "../../../components/admin/rewards/AdminTestsTab";
import { useAdminSession } from "../../../lib/admin-portal/use-admin-session";
import { isRewardsAdminEnabledClient } from "../../../lib/rewards/reward-feature-flags.client.js";
import {
  ADMIN_LOADING,
  ADMIN_NAV_REWARDS,
} from "../../../lib/admin-portal/admin-ui.he.js";

function renderTab(tabId, accessToken, setActiveTab) {
  switch (tabId) {
    case "general":
      return <AdminGeneralTab accessToken={accessToken} />;
    case "economy":
      return <AdminEconomyTab accessToken={accessToken} onNavigateTab={setActiveTab} />;
    case "cards":
      return <AdminCardsTab accessToken={accessToken} />;
    case "series":
      return <AdminSeriesTab accessToken={accessToken} />;
    case "box":
      return <AdminBoxTab accessToken={accessToken} />;
    case "shop":
      return <AdminShopTab accessToken={accessToken} />;
    case "duplicates":
      return <AdminDuplicatesTab accessToken={accessToken} />;
    case "events":
      return <AdminEventsTab accessToken={accessToken} />;
    case "tests":
      return <AdminTestsTab accessToken={accessToken} />;
    default:
      return null;
  }
}

export default function AdminRewardsPage() {
  const { state, accessToken } = useAdminSession();
  const [activeTab, setActiveTab] = useState("general");
  const rewardsAdminEnabled = isRewardsAdminEnabledClient();

  if (!rewardsAdminEnabled) {
    return (
      <Layout>
        <AdminShell title={ADMIN_NAV_REWARDS} showLogout>
          <p className="text-white/60 text-sm text-right">עמוד תגמולים אינו זמין — דגלי CARD_REWARDS / REWARD_ECONOMY כבויים.</p>
        </AdminShell>
      </Layout>
    );
  }

  return (
    <Layout>
      <AdminShell title={ADMIN_NAV_REWARDS} showLogout>
        {state === "loading" ? (
          <p className="text-white/60 text-sm text-right">{ADMIN_LOADING}</p>
        ) : (
          <AdminRewardsShell activeTab={activeTab} onTabChange={setActiveTab}>
            {(tabId) => renderTab(tabId, accessToken, setActiveTab)}
          </AdminRewardsShell>
        )}
      </AdminShell>
    </Layout>
  );
}
