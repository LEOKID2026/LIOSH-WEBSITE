import { useMemo } from "react";
import {
  isAdminManualCoinCreditEnabledClient,
  isCardRewardsEnabledClient,
  isRewardEconomySettingsEnabledClient,
} from "../../../lib/rewards/reward-feature-flags.client.js";

export const ADMIN_REWARDS_TABS = [
  { id: "manual-coins", label: "מטבעות לילד", manualCoinOnly: true, cardOnly: false, economyOnly: false },
  { id: "diamonds", label: "יהלומים", cardOnly: false, economyOnly: true },
  { id: "general", label: "הגדרות כלליות", cardOnly: false },
  { id: "economy", label: "כלכלת מטבעות", cardOnly: false, economyOnly: true },
  { id: "arcade", label: "ארקייד", cardOnly: false, economyOnly: true },
  { id: "cards", label: "קלפים", cardOnly: true },
  { id: "series", label: "סדרות", cardOnly: true },
  { id: "box", label: "קופסת הפתעה", cardOnly: true },
  { id: "shop", label: "חנות", cardOnly: true },
  { id: "duplicates", label: "מכירת כפילויות", cardOnly: true },
  { id: "events", label: "אירועים", cardOnly: true },
  { id: "tests", label: "בדיקות", cardOnly: true },
];

function tabBtnClass(active) {
  return [
    "inline-flex items-center justify-center rounded-lg border px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold transition-colors text-center min-w-0 w-full xl:w-auto xl:whitespace-nowrap",
    active
      ? "bg-amber-500/25 border-amber-400/50 text-amber-100"
      : "border-white/15 text-white/70 hover:text-white hover:bg-white/5",
  ].join(" ");
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
      <nav
        className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-2 w-full mb-6 xl:flex xl:flex-nowrap xl:justify-start xl:w-auto xl:gap-2"
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
