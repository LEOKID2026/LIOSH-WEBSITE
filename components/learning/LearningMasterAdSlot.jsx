/**
 * Reserved ad placement below the active game area (learning masters).
 * Fixed height — avoids layout shift when real ads are wired later.
 */
export default function LearningMasterAdSlot({ MB }) {
  return (
    <div
      className={MB.adSlot}
      aria-label="שמור לפרסומת"
      data-ad-slot="learning-master-reserved"
    >
      <span className={MB.adSlotLabel}>שמור לפרסומת</span>
    </div>
  );
}
