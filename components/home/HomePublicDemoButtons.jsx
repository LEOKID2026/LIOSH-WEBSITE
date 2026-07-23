import HomeDemoButton from "./HomeDemoButton.jsx";
import HomeParentDemoButton from "./HomeParentDemoButton.jsx";

export default function HomePublicDemoButtons({
  showChild,
  showParent,
  onDismiss,
  bottomStyle,
  className = "",
}) {
  if (!showChild && !showParent) return null;

  return (
    <div
      className={`pointer-events-none fixed inset-x-6 z-50 flex flex-row items-end justify-between gap-3 md:inset-x-8 ${className}`}
      style={bottomStyle}
      dir="rtl"
      lang="he"
      data-testid="home-public-demo-buttons"
    >
      <div className="pointer-events-auto relative shrink-0">
        {showParent ? <HomeParentDemoButton variant="inline" onDismiss={onDismiss} /> : null}
      </div>
      <div className="pointer-events-auto relative shrink-0">
        {showChild ? <HomeDemoButton variant="inline" onDismiss={onDismiss} /> : null}
      </div>
    </div>
  );
}
