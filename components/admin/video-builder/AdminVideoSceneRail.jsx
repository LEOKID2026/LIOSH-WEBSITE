import AdminVideoScenePreview from "./AdminVideoScenePreview.jsx";
import {
  VB_ADD_SCENE,
  VB_MOVE_DOWN,
  VB_MOVE_UP,
  VB_SCENE_N,
  VB_SCENES,
  VB_TEMPLATE_APPLY,
} from "../../../lib/admin-portal/admin-video-builder-ui.he.js";
import { VB_SCENE_TEMPLATES } from "../../../lib/admin-portal/admin-video-builder-catalog.js";

/**
 * @param {{
 *   scenes: Array<Record<string, unknown>>,
 *   activeIndex: number,
 *   onSelect: (index: number) => void,
 *   onAdd: () => void,
 *   onMove: (index: number, dir: number) => void,
 *   onApplyTemplate: (templateId: string) => void,
 *   assetsById: Record<string, Record<string, unknown>>,
 *   aspectRatio: string,
 * }} props
 */
export default function AdminVideoSceneRail({
  scenes,
  activeIndex,
  onSelect,
  onAdd,
  onMove,
  onApplyTemplate,
  assetsById,
  aspectRatio,
}) {
  return (
    <aside className="vb-editor-rail flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10 shrink-0">
        <h2 className="text-sm font-semibold text-white/90">{VB_SCENES}</h2>
        <span className="text-xs text-white/40 tabular-nums">{scenes.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1.5">
        {scenes.map((scene, index) => {
          const media = scene.mediaAssetId ? assetsById[String(scene.mediaAssetId)] : null;
          const active = index === activeIndex;
          const title = String(scene.title || "").trim() || `${VB_SCENE_N} ${index + 1}`;
          return (
            <button
              key={String(scene.id || index)}
              type="button"
              onClick={() => onSelect(index)}
              className={`w-full rounded-lg border text-right transition-colors overflow-hidden ${
                active
                  ? "border-amber-400/60 bg-amber-500/15 ring-1 ring-amber-400/30"
                  : "border-white/10 bg-black/25 hover:bg-white/5 hover:border-white/20"
              }`}
            >
              <div className="pointer-events-none scale-[0.35] origin-top h-[72px] -mb-[52px] overflow-hidden opacity-90">
                <AdminVideoScenePreview
                  scene={scene}
                  mediaUrl={media?.url}
                  mediaType={media?.type}
                  aspectRatio={aspectRatio}
                  active={false}
                />
              </div>
              <div className="px-2.5 py-2 relative z-[1]">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`text-[10px] font-bold tabular-nums rounded px-1.5 py-0.5 ${
                      active ? "bg-amber-500/40 text-amber-100" : "bg-white/10 text-white/60"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="text-[10px] text-white/40 tabular-nums">
                    {Number(scene.durationSec) || 5}ש׳
                  </span>
                </div>
                <p className="text-xs font-medium text-white/90 truncate mt-1">{title}</p>
              </div>
            </button>
          );
        })}
        {scenes.length === 0 ? (
          <p className="text-xs text-white/40 text-center py-4">אין סצנות</p>
        ) : null}
      </div>

      <div className="shrink-0 p-2 border-t border-white/10 space-y-1.5">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onMove(activeIndex, -1)}
            disabled={activeIndex <= 0 || !scenes.length}
            className="flex-1 rounded border border-white/15 px-2 py-1 text-xs disabled:opacity-30 hover:bg-white/5"
            title="הזז למעלה"
          >
            {VB_MOVE_UP}
          </button>
          <button
            type="button"
            onClick={() => onMove(activeIndex, 1)}
            disabled={activeIndex >= scenes.length - 1 || !scenes.length}
            className="flex-1 rounded border border-white/15 px-2 py-1 text-xs disabled:opacity-30 hover:bg-white/5"
            title="הזז למטה"
          >
            {VB_MOVE_DOWN}
          </button>
        </div>
        <select
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) onApplyTemplate(e.target.value);
            e.target.value = "";
          }}
          className="w-full rounded border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-right"
        >
          <option value="">{VB_TEMPLATE_APPLY}</option>
          {VB_SCENE_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onAdd}
          className="w-full rounded-lg bg-emerald-600/70 border border-emerald-400/30 px-3 py-2 text-xs font-semibold hover:bg-emerald-600/90"
        >
          + {VB_ADD_SCENE}
        </button>
      </div>
    </aside>
  );
}
