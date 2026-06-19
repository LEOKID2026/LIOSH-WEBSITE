import { useMemo } from "react";
import {
  isAdminManualCoinCreditEnabledClient,
  isCardRewardsEnabledClient,
  isRewardEconomySettingsEnabledClient,
} from "../../../lib/rewards/reward-feature-flags.client.js";

export const ADMIN_REWARDS_TABS = [
  { id: "manual-coins", label: "מטבעות לילד", manualCoinOnly: true, cardOnly: false, economyOnly: false },
  { id: "general", label: "הגדרות כלליות", cardOnly: false },
  { id: "economy", label: "כלכלת מטבעות", cardOnly: false, economyOnly: true },
  { id: "cards", label: "קלפים", cardOnly: true },
  { id: "series", label: "סדרות", cardOnly: true },
  { id: "box", label: "קופסת הפתעה", cardOnly: true },
  { id: "shop", label: "חנות", cardOnly: true },
  { id: "duplicates", label: "כפילויות", cardOnly: true },
  { id: "events", label: "אירועים", cardOnly: true },
  { id: "tests", label: "בדיקות", cardOnly: true },
];

function tabBtnClass(active) {
  return active
    ? "rounded-lg bg-amber-500/25 border border-amber-400/50 text-amber-100 font-semibold px-3 py-1.5 text-sm shrink-0"
    : "rounded-lg border border-white/15 text-white/70 hover:text-white hover:bg-white/5 px-3 py-1.5 text-sm shrink-0";
}

export default function AdminRewardsShell({ activeTab, onTabChange, children }) {
  const cardsEnabled = isCardRewardsEnabledClient();
  const economyEnabled = isRewardEconomySettingsEnabledClient();
  const manualCoinsEnabled = isAdminManualCoinCreditEnabledClient();
  const rewardsConfigEnabled = cardsEnabled || economyEnabled;

  const visibleTabs = useMemo(
    () =>
      ADMIN_REWARDS_TABS.filter((t) => {
        if (t.manualCoinOnly) return manualCoinsEnabled;
        if (t.economyOnly && !economyEnabled) return false;
        if (t.cardOnly && !cardsEnabled) return false;
        if (!t.manualCoinOnly && !t.cardOnly && !t.economyOnly && !rewardsConfigEnabled) {
          return false;
        }
        return true;
      }),
    [cardsEnabled, economyEnabled, manualCoinsEnabled, rewardsConfigEnabled]
  );

  const safeTab = visibleTabs.some((t) => t.id === activeTab)
    ? activeTab
    : visibleTabs[0]?.id || "general";

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-white/60">
        <span>
          דגל קלפים: {process.env.NEXT_PUBLIC_CARD_REWARDS_ENABLED === "true" ? "פעיל" : "כבוי"}
        </span>
        <span>·</span>
        <span>
          דגל כלכלה:{" "}
          {process.env.NEXT_PUBLIC_REWARD_ECONOMY_SETTINGS_ENABLED === "true" ? "פעיל" : "כבוי"}
        </span>
        <span>·</span>
        <span>
          מטבעות ידנית:{" "}
          {process.env.NEXT_PUBLIC_ENABLE_ADMIN_MANUAL_COIN_CREDIT === "true" ? "פעיל" : "כבוי"}
        </span>
      </div>

      <nav
        className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1"
        aria-label="לשוניות תגמולים"
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={tabBtnClass(safeTab === tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="w-full max-w-full overflow-x-hidden">{children(safeTab)}</div>
    </div>
  );
}
