import AdminSectionCard from "../AdminSectionCard.jsx";
import AdminVideoScenePreview from "./AdminVideoScenePreview.jsx";
import AdminVideoSceneStylePanel from "./AdminVideoSceneStylePanel.jsx";
import { defaultSceneFields, pickSceneStyleFields, VB_SCENE_TEMPLATES, VB_ASPECT_RATIO_IDS, VB_ASPECT_RATIOS } from "../../../lib/admin-portal/admin-video-builder-catalog.js";
import {
  VB_ADD_SCENE,
  VB_APPLY_STYLE_ALL,
  VB_ASPECT_RATIO,
  VB_DELETE_SCENE_CONFIRM,
  VB_DUPLICATE_SCENE,
  VB_MOVE_DOWN,
  VB_MOVE_UP,
  VB_SCENE_DURATION,
  VB_SCENE_MEDIA,
  VB_SCENE_N,
  VB_SCENE_SUBTITLE,
  VB_SCENE_TITLE,
  VB_SCENES,
  VB_TEMPLATE_APPLY,
  VB_VIDEO_NAME,
} from "../../../lib/admin-portal/admin-video-builder-ui.he.js";

function clientUuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `scene-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * @param {{
 *   project: Record<string, unknown>,
 *   assets: Array<Record<string, unknown>>,
 *   onChange: (patch: Record<string, unknown>) => void,
 *   onSelectMedia: (sceneId: string) => void,
 * }} props
 */
export default function AdminVideoSceneList({ project, assets, onChange, onSelectMedia }) {
  const scenes = Array.isArray(project.scenes) ? project.scenes : [];
  const assetsById = Object.fromEntries(assets.map((a) => [String(a.id), a]));

  function updateScenes(next) {
    onChange({ scenes: next });
  }

  function updateScene(index, patch) {
    const next = scenes.map((s, i) => (i === index ? { ...s, ...patch } : s));
    updateScenes(next);
  }

  function moveScene(index, dir) {
    const target = index + dir;
    if (target < 0 || target >= scenes.length) return;
    const next = [...scenes];
    [next[index], next[target]] = [next[target], next[index]];
    updateScenes(next);
  }

  function deleteScene(index) {
    if (!window.confirm(VB_DELETE_SCENE_CONFIRM)) return;
    updateScenes(scenes.filter((_, i) => i !== index));
  }

  function addScene() {
    updateScenes([
      ...scenes,
      {
        id: clientUuid(),
        ...defaultSceneFields(),
      },
    ]);
  }

  function duplicateScene(index) {
    const src = scenes[index];
    if (!src) return;
    const copy = { ...src, id: clientUuid(), title: `${src.title} (עותק)` };
    const next = [...scenes];
    next.splice(index + 1, 0, copy);
    updateScenes(next);
  }

  function applyStyleToAll(index) {
    const style = pickSceneStyleFields(scenes[index] || {});
    updateScenes(scenes.map((s, i) => (i === index ? s : { ...s, ...style })));
  }

  function applyTemplate(templateId) {
    const tpl = VB_SCENE_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    updateScenes(
      tpl.scenes.map((s) => ({
        id: clientUuid(),
        ...defaultSceneFields(),
        ...s,
      }))
    );
  }

  return (
    <div className="space-y-4">
      <AdminSectionCard title="">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block text-right">
            <span className="text-sm text-white/60">{VB_VIDEO_NAME}</span>
            <input
              type="text"
              value={String(project.name || "")}
              onChange={(e) => onChange({ name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white text-right"
            />
          </label>
          <label className="block text-right">
            <span className="text-sm text-white/60">{VB_ASPECT_RATIO}</span>
            <select
              value={String(project.aspectRatio || "16:9")}
              onChange={(e) => onChange({ aspectRatio: e.target.value })}
              className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white text-right"
            >
              {VB_ASPECT_RATIO_IDS.map((id) => (
                <option key={id} value={id}>
                  {VB_ASPECT_RATIOS[id].label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </AdminSectionCard>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{VB_SCENES}</h2>
        <div className="flex flex-wrap gap-2">
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) applyTemplate(e.target.value);
              e.target.value = "";
            }}
            className="rounded border border-white/20 bg-black/30 px-2 py-1.5 text-xs"
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
            onClick={addScene}
            className="rounded-lg bg-emerald-600/70 border border-emerald-400/30 px-3 py-1.5 text-sm font-semibold"
          >
            {VB_ADD_SCENE}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {scenes.map((scene, index) => {
          const media = scene.mediaAssetId ? assetsById[String(scene.mediaAssetId)] : null;
          return (
            <AdminSectionCard
              key={String(scene.id)}
              title={`${VB_SCENE_N} ${index + 1}`}
              className="relative"
            >
              <div className="absolute left-4 top-4 flex gap-1">
                <button
                  type="button"
                  onClick={() => moveScene(index, -1)}
                  disabled={index === 0}
                  className="rounded border border-white/20 px-2 py-0.5 text-xs disabled:opacity-30"
                  aria-label="הזז למעלה"
                >
                  {VB_MOVE_UP}
                </button>
                <button
                  type="button"
                  onClick={() => moveScene(index, 1)}
                  disabled={index === scenes.length - 1}
                  className="rounded border border-white/20 px-2 py-0.5 text-xs disabled:opacity-30"
                  aria-label="הזז למטה"
                >
                  {VB_MOVE_DOWN}
                </button>
                <button
                  type="button"
                  onClick={() => deleteScene(index)}
                  className="rounded border border-red-400/40 px-2 py-0.5 text-xs text-red-200"
                >
                  ✕
                </button>
                <button
                  type="button"
                  onClick={() => duplicateScene(index)}
                  className="rounded border border-white/20 px-2 py-0.5 text-xs"
                  title={VB_DUPLICATE_SCENE}
                >
                  ⧉
                </button>
                <button
                  type="button"
                  onClick={() => applyStyleToAll(index)}
                  className="rounded border border-amber-400/30 px-2 py-0.5 text-xs text-amber-200"
                  title={VB_APPLY_STYLE_ALL}
                >
                  ⊕
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
                <div className="space-y-3">
                  <label className="block text-right">
                    <span className="text-xs text-white/50">{VB_SCENE_TITLE}</span>
                    <input
                      type="text"
                      value={String(scene.title || "")}
                      onChange={(e) => updateScene(index, { title: e.target.value })}
                      className="mt-1 w-full rounded border border-white/20 bg-black/30 px-3 py-2 text-sm text-right"
                    />
                  </label>
                  <label className="block text-right">
                    <span className="text-xs text-white/50">{VB_SCENE_SUBTITLE}</span>
                    <textarea
                      value={String(scene.subtitle || "")}
                      onChange={(e) => updateScene(index, { subtitle: e.target.value })}
                      rows={2}
                      className="mt-1 w-full rounded border border-white/20 bg-black/30 px-3 py-2 text-sm text-right"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-right col-span-2 sm:col-span-1">
                      <span className="text-xs text-white/50">{VB_SCENE_DURATION}</span>
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={Number(scene.durationSec) || 5}
                        onChange={(e) =>
                          updateScene(index, { durationSec: Number(e.target.value) || 5 })
                        }
                        className="mt-1 w-full rounded border border-white/20 bg-black/30 px-3 py-2 text-sm text-right"
                      />
                    </label>
                  </div>
                  <AdminVideoSceneStylePanel
                    scene={scene}
                    onPatch={(patch) => updateScene(index, patch)}
                  />
                  <div>
                    <span className="text-xs text-white/50">{VB_SCENE_MEDIA}</span>
                    <div className="mt-1 flex items-center gap-2 justify-end">
                      <span className="text-xs text-white/70 truncate max-w-[12rem]">
                        {media?.filename || "-"}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectMedia(String(scene.id))}
                        className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
                      >
                        בחר מדיה
                      </button>
                      {scene.mediaAssetId ? (
                        <button
                          type="button"
                          onClick={() => updateScene(index, { mediaAssetId: null })}
                          className="text-xs text-red-300"
                        >
                          הסר
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
                <AdminVideoScenePreview
                  scene={scene}
                  mediaUrl={media?.url}
                  mediaType={media?.type}
                  aspectRatio={String(project.aspectRatio || "16:9")}
                />
              </div>
            </AdminSectionCard>
          );
        })}
      </div>
    </div>
  );
}
