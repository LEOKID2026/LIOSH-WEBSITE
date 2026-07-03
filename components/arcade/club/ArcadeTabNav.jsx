const TABS = [
  { id: "games", label: "משחקים" },
  { id: "friends", label: "חברים" },
  { id: "shop", label: "חנות" },
  { id: "profile", label: "פרופיל" },
];

/** @param {{ activeTab: string, onChange: (id: string) => void, className?: string, gh?: Record<string, string>, compact?: boolean }} props */
export default function ArcadeTabNav({ activeTab, onChange, className = "", gh = {}, compact = false }) {
  const tabActive = compact
    ? gh.arcadeTabActiveCompact || "rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-black shadow"
    : gh.arcadeTabActive || "rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-black shadow";
  const tabInactive = compact
    ? gh.arcadeTabInactiveCompact ||
      "rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-sky-50"
    : gh.arcadeTabInactive ||
      "rounded-full border border-sky-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-sky-50";

  return (
    <div className={`flex flex-wrap gap-2 justify-end ${className}`} dir="rtl">
      {TABS.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={active ? tabActive : tabInactive}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
