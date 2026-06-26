import { computePreviewTotalDurationSec } from "../../../lib/admin-portal/admin-video-builder-utils.js";
import { VB_TIMELINE } from "../../../lib/admin-portal/admin-video-builder-ui.he.js";

/**
 * @param {{ scenes: Array<Record<string, unknown>>, activeIndex?: number, onSelect?: (index: number) => void }} props
 */
export default function AdminVideoTimeline({ scenes, activeIndex = 0, onSelect }) {
  const total = computePreviewTotalDurationSec(scenes) || 1;

  return (
    <div className="rounded-lg border border-white/10 bg-black/25 p-3 text-right">
      <p className="text-xs text-white/50 mb-2">{VB_TIMELINE} · {total} שנ׳</p>
      <div className="flex gap-1 h-10 items-stretch">
        {scenes.map((scene, i) => {
          const pct = ((Number(scene.durationSec) || 1) / total) * 100;
          const active = i === activeIndex;
          return (
            <button
              key={String(scene.id || i)}
              type="button"
              title={String(scene.title || `סצנה ${i + 1}`)}
              onClick={() => onSelect?.(i)}
              style={{ width: `${Math.max(pct, 8)}%` }}
              className={`rounded px-1 text-[10px] truncate transition-colors ${
                active
                  ? "bg-amber-500/40 border border-amber-400/50 text-amber-100"
                  : "bg-white/10 border border-white/10 text-white/70 hover:bg-white/15"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
