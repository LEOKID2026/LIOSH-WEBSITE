import { computePreviewTotalDurationSec } from "../../../lib/admin-portal/admin-video-builder-utils.js";
import { VB_TIMELINE } from "../../../lib/admin-portal/admin-video-builder-ui.he.js";

/**
 * @param {{ scenes: Array<Record<string, unknown>>, activeIndex?: number, onSelect?: (index: number) => void }} props
 */
export default function AdminVideoTimeline({ scenes, activeIndex = 0, onSelect }) {
  const total = computePreviewTotalDurationSec(scenes) || 1;

  return (
    <div className="rounded-lg border border-white/10 bg-black/25 p-3 text-right">
      <p className="text-xs text-white/50 mb-2">
        {VB_TIMELINE} · {total} שנ׳ · {scenes.length} סצנות
      </p>
      <div className="flex flex-wrap gap-1.5 content-start max-h-36 overflow-y-auto overscroll-contain">
        {scenes.map((scene, i) => {
          const dur = Number(scene.durationSec) || 1;
          const active = i === activeIndex;
          const label = String(scene.title || "").trim() || `סצנה ${i + 1}`;
          return (
            <button
              key={String(scene.id || i)}
              type="button"
              title={`${label} · ${dur}ש׳`}
              onClick={() => onSelect?.(i)}
              className={`min-w-[2.75rem] h-9 px-2 shrink-0 rounded border text-[11px] font-semibold tabular-nums transition-colors ${
                active
                  ? "bg-amber-500/40 border-amber-400/50 text-amber-100 ring-1 ring-amber-400/30"
                  : "bg-white/10 border-white/10 text-white/70 hover:bg-white/15 hover:border-white/20"
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
