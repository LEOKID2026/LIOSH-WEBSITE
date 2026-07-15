import { useState } from "react";
import AdminVideoMediaLibrary from "./AdminVideoMediaLibrary.jsx";
import AdminVideoProjectSettings from "./AdminVideoProjectSettings.jsx";
import AdminVideoSceneStylePanel from "./AdminVideoSceneStylePanel.jsx";
import AdminVideoVoiceoverPanel from "./AdminVideoVoiceoverPanel.jsx";
import {
  VB_APPLY_STYLE_ALL,
  VB_DELETE_SCENE_CONFIRM,
  VB_DUPLICATE_SCENE,
  VB_INSPECTOR_TAB_AUDIO,
  VB_INSPECTOR_TAB_CONTENT,
  VB_INSPECTOR_TAB_MEDIA,
  VB_INSPECTOR_TAB_PROJECT,
  VB_INSPECTOR_TAB_STYLE,
  VB_SCENE_DURATION,
  VB_SCENE_MEDIA,
  VB_SCENE_N,
  VB_SCENE_SUBTITLE,
  VB_SCENE_TITLE,
} from "../../../lib/admin-portal/admin-video-builder-ui.he.js";

const TABS = [
  { id: "content", label: VB_INSPECTOR_TAB_CONTENT },
  { id: "style", label: VB_INSPECTOR_TAB_STYLE },
  { id: "audio", label: VB_INSPECTOR_TAB_AUDIO },
  { id: "project", label: VB_INSPECTOR_TAB_PROJECT },
  { id: "media", label: VB_INSPECTOR_TAB_MEDIA },
];

/**
 * @param {{
 *   activeTab?: string,
 *   onTabChange?: (tab: string) => void,
 *   scene: Record<string, unknown> | null,
 *   sceneIndex: number,
 *   sceneCount: number,
 *   project: Record<string, unknown>,
 *   assets: Array<Record<string, unknown>>,
 *   accessToken: string,
 *   media: Record<string, unknown> | null | undefined,
 *   onScenePatch: (patch: Record<string, unknown>) => void,
 *   onProjectChange: (patch: Record<string, unknown>) => void,
 *   onDuplicateScene: () => void,
 *   onDeleteScene: () => void,
 *   onApplyStyleAll: () => void,
 *   onPickMedia: () => void,
 *   onAssetUploaded: (asset: Record<string, unknown>) => void,
 *   onAssetDeleted?: (assetId: string) => void,
 * }} props
 */
export default function AdminVideoInspector({
  activeTab: controlledTab,
  onTabChange,
  scene,
  sceneIndex,
  sceneCount,
  project,
  assets,
  accessToken,
  media,
  onScenePatch,
  onProjectChange,
  onDuplicateScene,
  onDeleteScene,
  onApplyStyleAll,
  onPickMedia,
  onAssetUploaded,
  onAssetDeleted,
}) {
  const [internalTab, setInternalTab] = useState("content");
  const tab = controlledTab ?? internalTab;

  function setTab(next) {
    if (onTabChange) onTabChange(next);
    else setInternalTab(next);
  }

  return (
    <aside className="vb-editor-inspector flex flex-col h-full min-h-0">
      <div className="flex shrink-0 border-b border-white/10 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 ${
              tab === t.id
                ? "border-amber-400 text-amber-200 bg-amber-500/10"
                : "border-transparent text-white/50 hover:text-white/80 hover:bg-white/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-3">
        {tab === "content" && scene ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
              <span className="text-xs text-white/50">
                {VB_SCENE_N} {sceneIndex + 1} / {sceneCount}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={onDuplicateScene}
                  className="rounded border border-white/15 px-2 py-0.5 text-[10px] hover:bg-white/5"
                  title={VB_DUPLICATE_SCENE}
                >
                  ⧉
                </button>
                <button
                  type="button"
                  onClick={onApplyStyleAll}
                  className="rounded border border-amber-400/30 px-2 py-0.5 text-[10px] text-amber-200 hover:bg-amber-500/10"
                  title={VB_APPLY_STYLE_ALL}
                >
                  ⊕
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(VB_DELETE_SCENE_CONFIRM)) onDeleteScene();
                  }}
                  className="rounded border border-red-400/30 px-2 py-0.5 text-[10px] text-red-300 hover:bg-red-500/10"
                >
                  ✕
                </button>
              </div>
            </div>

            <label className="block text-right">
              <span className="text-xs text-white/50">{VB_SCENE_TITLE}</span>
              <input
                type="text"
                value={String(scene.title || "")}
                onChange={(e) => onScenePatch({ title: e.target.value })}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-right"
              />
            </label>
            <label className="block text-right">
              <span className="text-xs text-white/50">{VB_SCENE_SUBTITLE}</span>
              <textarea
                value={String(scene.subtitle || "")}
                onChange={(e) => onScenePatch({ subtitle: e.target.value })}
                rows={3}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-right resize-y"
              />
            </label>
            <label className="block text-right">
              <span className="text-xs text-white/50">{VB_SCENE_DURATION}</span>
              <input
                type="number"
                min={1}
                max={120}
                value={Number(scene.durationSec) || 5}
                onChange={(e) => onScenePatch({ durationSec: Number(e.target.value) || 5 })}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-right"
              />
            </label>

            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <span className="text-xs text-white/50">{VB_SCENE_MEDIA}</span>
              <div className="mt-2 flex items-center gap-2 justify-between">
                <span className="text-xs text-white/70 truncate flex-1">{media?.filename || "-"}</span>
                <button
                  type="button"
                  onClick={() => {
                    setTab("media");
                    onPickMedia();
                  }}
                  className="shrink-0 rounded border border-white/20 px-2.5 py-1 text-xs hover:bg-white/10"
                >
                  בחר
                </button>
                {scene.mediaAssetId ? (
                  <button
                    type="button"
                    onClick={() => onScenePatch({ mediaAssetId: null })}
                    className="shrink-0 text-xs text-red-300 hover:underline"
                  >
                    הסר
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {tab === "content" && !scene ? (
          <p className="text-sm text-white/40 text-center py-8">הוסיפ/י סצנה כדי להתחיל</p>
        ) : null}

        {tab === "style" && scene ? (
          <AdminVideoSceneStylePanel scene={scene} onPatch={onScenePatch} compact />
        ) : null}

        {tab === "style" && !scene ? (
          <p className="text-sm text-white/40 text-center py-8">אין סצנה נבחרת</p>
        ) : null}

        {tab === "audio" ? (
          <div className="space-y-4">
            <AdminVideoVoiceoverPanel
              embedded
              accessToken={accessToken}
              assets={assets}
              voiceoverAssetId={project.voiceoverAssetId ?? null}
              onChange={(id) => onProjectChange({ voiceoverAssetId: id })}
              onUploaded={onAssetUploaded}
            />
          </div>
        ) : null}

        {tab === "project" ? (
          <AdminVideoProjectSettings
            embedded
            project={project}
            assets={assets}
            accessToken={accessToken}
            onChange={onProjectChange}
            onUploaded={onAssetUploaded}
            showNameFields
          />
        ) : null}

        {tab === "media" ? (
          <AdminVideoMediaLibrary
            embedded
            accessToken={accessToken}
            assets={assets}
            onUploaded={onAssetUploaded}
            onDeleted={onAssetDeleted}
            selectedId={scene?.mediaAssetId ? String(scene.mediaAssetId) : null}
            onSelect={
              scene
                ? (asset) => {
                    if (asset.type === "image" || asset.type === "video") {
                      onScenePatch({ mediaAssetId: asset.id });
                    }
                  }
                : undefined
            }
          />
        ) : null}
      </div>
    </aside>
  );
}
