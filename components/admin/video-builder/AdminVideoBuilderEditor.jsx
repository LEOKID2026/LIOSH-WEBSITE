import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { adminAuthFetch } from "../../../lib/admin-portal/use-admin-session.js";
import AdminVideoInspector from "./AdminVideoInspector.jsx";
import AdminVideoPreviewPlayer from "./AdminVideoPreviewPlayer.jsx";
import AdminVideoSceneRail from "./AdminVideoSceneRail.jsx";
import {
  defaultSceneFields,
  pickSceneStyleFields,
  VB_SCENE_TEMPLATES,
} from "../../../lib/admin-portal/admin-video-builder-catalog.js";
import {
  VB_AUTO_SAVED,
  VB_AUTO_SAVING,
  VB_BACK_TO_LIST,
  VB_DELETE_SCENE_CONFIRM,
  VB_DOWNLOAD,
  VB_EXPORT,
  VB_EXPORT_DONE,
  VB_EXPORT_ERROR,
  VB_EXPORTING,
  VB_FFMPEG_OK,
  VB_FFMPEG_UNAVAILABLE,
  VB_LOAD_ERROR,
  VB_NOT_FOUND,
  VB_PREVIEW,
  VB_SAVE,
  VB_SAVED,
  VB_SAVE_ERROR,
  VB_SAVING,
  VB_VIEW,
} from "../../../lib/admin-portal/admin-video-builder-ui.he.js";

const AUTO_SAVE_MS = 2500;

function clientUuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `scene-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildSaveBody(project) {
  return {
    name: project.name,
    aspectRatio: project.aspectRatio,
    scenes: project.scenes,
    voiceoverAssetId: project.voiceoverAssetId ?? null,
    backgroundMusicAssetId: project.backgroundMusicAssetId ?? null,
    backgroundMusicVolume: project.backgroundMusicVolume ?? 35,
    voiceoverVolume: project.voiceoverVolume ?? 100,
    watermarkAssetId: project.watermarkAssetId ?? null,
    watermarkPosition: project.watermarkPosition ?? "top_right",
    exportQuality: project.exportQuality ?? "1080p",
    defaultTransition: project.defaultTransition ?? "crossfade",
  };
}

/**
 * @param {{ accessToken: string, projectId: string }} props
 */
export default function AdminVideoBuilderEditor({ accessToken, projectId }) {
  const [project, setProject] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [autoSaveState, setAutoSaveState] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState(null);
  const [ffmpegAvailable, setFfmpegAvailable] = useState(null);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [inspectorTab, setInspectorTab] = useState("content");
  const [showExportVideo, setShowExportVideo] = useState(false);
  const loadedRef = useRef(false);
  const skipAutoSaveRef = useRef(true);
  const autoSaveTimerRef = useRef(null);
  const saveInFlightRef = useRef(false);

  const loadProject = useCallback(async () => {
    const res = await adminAuthFetch(accessToken, `/api/admin/video-builder/${projectId}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error?.message || VB_NOT_FOUND);
    setProject(json?.data?.project || null);
    loadedRef.current = true;
  }, [accessToken, projectId]);

  const loadAssets = useCallback(async () => {
    const res = await adminAuthFetch(accessToken, "/api/admin/video-builder/media");
    const json = await res.json();
    if (res.ok) setAssets(json?.data?.assets || []);
  }, [accessToken]);

  const loadFfmpeg = useCallback(async () => {
    const res = await adminAuthFetch(accessToken, "/api/admin/video-builder/ffmpeg-status");
    const json = await res.json();
    if (res.ok) setFfmpegAvailable(Boolean(json?.data?.available));
  }, [accessToken]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      loadedRef.current = false;
      skipAutoSaveRef.current = true;
      try {
        await Promise.all([loadProject(), loadAssets(), loadFfmpeg()]);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : VB_LOAD_ERROR);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadProject, loadAssets, loadFfmpeg]);

  const persistProject = useCallback(
    async (current, { silent = false } = {}) => {
      if (!current || saveInFlightRef.current) return false;
      saveInFlightRef.current = true;
      if (silent) setAutoSaveState(VB_AUTO_SAVING);
      else {
        setSaving(true);
        setSaveMsg(null);
      }
      setError(null);
      try {
        const res = await adminAuthFetch(accessToken, `/api/admin/video-builder/${projectId}`, {
          method: "PUT",
          body: JSON.stringify(buildSaveBody(current)),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || VB_SAVE_ERROR);
        setProject(json?.data?.project || current);
        if (silent) setAutoSaveState(VB_AUTO_SAVED);
        else setSaveMsg(VB_SAVED);
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : VB_SAVE_ERROR;
        if (!silent) setError(msg);
        return false;
      } finally {
        saveInFlightRef.current = false;
        if (silent) {
          setTimeout(() => setAutoSaveState(null), 2000);
        } else {
          setSaving(false);
        }
      }
    },
    [accessToken, projectId]
  );

  useEffect(() => {
    if (!project || !loadedRef.current) return undefined;
    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return undefined;
    }
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      void persistProject(project, { silent: true });
    }, AUTO_SAVE_MS);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [project, persistProject]);

  function patchProject(patch) {
    setProject((prev) => (prev ? { ...prev, ...patch } : prev));
    setSaveMsg(null);
    skipAutoSaveRef.current = false;
  }

  function patchScene(index, patch) {
    if (!project) return;
    const scenes = (project.scenes || []).map((s, i) => (i === index ? { ...s, ...patch } : s));
    patchProject({ scenes });
  }

  function updateScenes(next) {
    patchProject({ scenes: next });
    if (activeSceneIndex >= next.length) {
      setActiveSceneIndex(Math.max(0, next.length - 1));
    }
  }

  function addScene() {
    const scenes = project?.scenes || [];
    updateScenes([...scenes, { id: clientUuid(), ...defaultSceneFields() }]);
    setActiveSceneIndex(scenes.length);
  }

  function moveScene(index, dir) {
    const scenes = [...(project?.scenes || [])];
    const target = index + dir;
    if (target < 0 || target >= scenes.length) return;
    [scenes[index], scenes[target]] = [scenes[target], scenes[index]];
    updateScenes(scenes);
    setActiveSceneIndex(target);
  }

  function deleteScene(index) {
    if (!window.confirm(VB_DELETE_SCENE_CONFIRM)) return;
    const scenes = (project?.scenes || []).filter((_, i) => i !== index);
    updateScenes(scenes);
  }

  function duplicateScene(index) {
    const src = project?.scenes?.[index];
    if (!src) return;
    const copy = { ...src, id: clientUuid(), title: `${src.title} (עותק)` };
    const scenes = [...(project?.scenes || [])];
    scenes.splice(index + 1, 0, copy);
    updateScenes(scenes);
    setActiveSceneIndex(index + 1);
  }

  function applyStyleToAll(index) {
    const style = pickSceneStyleFields(project?.scenes?.[index] || {});
    const scenes = (project?.scenes || []).map((s, i) => (i === index ? s : { ...s, ...style }));
    patchProject({ scenes });
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
    setActiveSceneIndex(0);
  }

  async function handleSave() {
    if (!project) return false;
    return persistProject(project, { silent: false });
  }

  async function handleExport() {
    if (!project) return;
    setExporting(true);
    setExportMsg(null);
    setError(null);
    try {
      const saved = await handleSave();
      if (!saved) return;
      const res = await adminAuthFetch(
        accessToken,
        `/api/admin/video-builder/${projectId}/export`,
        { method: "POST" }
      );
      const json = await res.json();
      if (!res.ok) {
        const msg = json?.error?.message || VB_EXPORT_ERROR;
        if (json?.error?.code === "ffmpeg_unavailable") {
          setExportMsg(VB_FFMPEG_UNAVAILABLE);
        } else {
          setExportMsg(msg);
        }
        return;
      }
      const url = json?.data?.outputUrl;
      setExportMsg(VB_EXPORT_DONE);
      setShowExportVideo(true);
      await loadProject();
      if (url) setProject((p) => (p ? { ...p, outputMp4Path: url, status: "exported" } : p));
    } catch (e) {
      setExportMsg(e instanceof Error ? e.message : VB_EXPORT_ERROR);
    } finally {
      setExporting(false);
    }
  }

  function handleAssetDeleted(assetId) {
    const id = String(assetId);
    setAssets((prev) => prev.filter((a) => String(a.id) !== id));
    if (!project) return;
    /** @type {Record<string, unknown>} */
    const patch = {};
    if (String(project.voiceoverAssetId || "") === id) patch.voiceoverAssetId = null;
    if (String(project.backgroundMusicAssetId || "") === id) patch.backgroundMusicAssetId = null;
    if (String(project.watermarkAssetId || "") === id) patch.watermarkAssetId = null;
    const scenes = (project.scenes || []).map((s) =>
      String(s.mediaAssetId || "") === id ? { ...s, mediaAssetId: null } : s
    );
    if (scenes.some((s, i) => s.mediaAssetId !== project.scenes?.[i]?.mediaAssetId)) {
      patch.scenes = scenes;
    }
    if (Object.keys(patch).length) patchProject(patch);
  }

  const assetsById = Object.fromEntries(assets.map((a) => [String(a.id), a]));
  const scenes = project?.scenes || [];
  const activeScene = scenes[activeSceneIndex] || null;
  const activeMedia = activeScene?.mediaAssetId
    ? assetsById[String(activeScene.mediaAssetId)]
    : null;

  const voiceoverAsset = project?.voiceoverAssetId
    ? assetsById[String(project.voiceoverAssetId)]
    : null;
  const musicAsset = project?.backgroundMusicAssetId
    ? assetsById[String(project.backgroundMusicAssetId)]
    : null;
  const watermarkAsset = project?.watermarkAssetId
    ? assetsById[String(project.watermarkAssetId)]
    : null;

  if (loading) {
    return <p className="text-sm text-white/60 text-right">טוען…</p>;
  }

  if (error && !project) {
    return <p className="text-sm text-red-300 text-right">{error}</p>;
  }

  if (!project) {
    return <p className="text-sm text-white/60 text-right">{VB_NOT_FOUND}</p>;
  }

  return (
    <div className="vb-editor-root space-y-3 -mx-2 md:-mx-4">
      {/* Toolbar */}
      <div className="sticky top-0 z-30 rounded-xl border border-white/10 bg-[#0d0d12]/95 backdrop-blur-md px-3 py-2.5 md:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/admin/video-builder"
              className="text-xs text-white/50 hover:text-white shrink-0"
            >
              {VB_BACK_TO_LIST}
            </Link>
            <span className="text-sm font-semibold text-white truncate max-w-[12rem] md:max-w-xs">
              {project.name || "ללא שם"}
            </span>
            {ffmpegAvailable === false ? (
              <span className="text-[10px] text-amber-300/80 hidden sm:inline">ffmpeg ✕</span>
            ) : ffmpegAvailable ? (
              <span className="text-[10px] text-emerald-300/70 hidden sm:inline">ffmpeg ✓</span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {autoSaveState ? (
              <span className="text-[10px] text-white/40">{autoSaveState}</span>
            ) : null}
            {saveMsg ? <span className="text-[10px] text-emerald-300">{saveMsg}</span> : null}
            {project.outputMp4Path ? (
              <button
                type="button"
                onClick={() => setShowExportVideo((v) => !v)}
                className="text-xs text-emerald-300 underline"
              >
                {showExportVideo ? "הסתר סרטון" : VB_VIEW}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold disabled:opacity-50 hover:bg-white/10"
            >
              {saving ? VB_SAVING : VB_SAVE}
            </button>
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={exporting || ffmpegAvailable === false}
              className="rounded-lg bg-amber-500/30 border border-amber-400/40 px-3 py-1.5 text-xs font-semibold disabled:opacity-50 hover:bg-amber-500/40"
            >
              {exporting ? VB_EXPORTING : VB_EXPORT}
            </button>
          </div>
        </div>
        {(error || exportMsg) && (
          <p
            className={`text-xs text-right mt-1.5 ${exportMsg === VB_EXPORT_DONE ? "text-emerald-300" : error ? "text-red-300" : "text-amber-200"}`}
          >
            {error || exportMsg}
          </p>
        )}
      </div>

      {showExportVideo && project.outputMp4Path ? (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3 mx-2 md:mx-4">
          <div className="flex flex-wrap gap-3 justify-end mb-2">
            <a
              href={project.outputMp4Path}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-300 underline"
            >
              {VB_VIEW}
            </a>
            <a href={project.outputMp4Path} download className="text-xs text-white/80 underline">
              {VB_DOWNLOAD}
            </a>
          </div>
          <video src={project.outputMp4Path} controls className="w-full max-w-lg mx-auto rounded-lg" />
        </div>
      ) : null}

      {/* Workspace: inspector (ימין) | preview | scenes (שמאל) */}
      <div className="vb-editor-workspace mx-2 md:mx-4">
        <AdminVideoInspector
          activeTab={inspectorTab}
          onTabChange={setInspectorTab}
          scene={activeScene}
          sceneIndex={activeSceneIndex}
          sceneCount={scenes.length}
          project={project}
          assets={assets}
          accessToken={accessToken}
          media={activeMedia}
          onScenePatch={(patch) => patchScene(activeSceneIndex, patch)}
          onProjectChange={patchProject}
          onDuplicateScene={() => duplicateScene(activeSceneIndex)}
          onDeleteScene={() => deleteScene(activeSceneIndex)}
          onApplyStyleAll={() => applyStyleToAll(activeSceneIndex)}
          onPickMedia={() => setInspectorTab("media")}
          onAssetUploaded={(asset) => setAssets((prev) => [asset, ...prev])}
          onAssetDeleted={handleAssetDeleted}
        />

        <main className="vb-editor-stage">
          <div className="p-3 md:p-4 h-full flex flex-col min-h-0">
            <p className="text-xs text-white/40 mb-2 shrink-0">{VB_PREVIEW}</p>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <AdminVideoPreviewPlayer
                embedded
                scenes={scenes}
                aspectRatio={String(project.aspectRatio || "16:9")}
                assetsById={assetsById}
                voiceoverUrl={voiceoverAsset?.url}
                musicUrl={musicAsset?.url}
                voiceoverVolume={Number(project.voiceoverVolume ?? 100)}
                musicVolume={Number(project.backgroundMusicVolume ?? 35)}
                watermarkUrl={watermarkAsset?.url}
                watermarkPosition={String(project.watermarkPosition || "top_right")}
                sceneIndex={activeSceneIndex}
                onSceneIndexChange={setActiveSceneIndex}
              />
            </div>
          </div>
        </main>

        <AdminVideoSceneRail
          scenes={scenes}
          activeIndex={activeSceneIndex}
          onSelect={setActiveSceneIndex}
          onAdd={addScene}
          onMove={moveScene}
          onApplyTemplate={applyTemplate}
          assetsById={assetsById}
          aspectRatio={String(project.aspectRatio || "16:9")}
        />
      </div>
    </div>
  );
}
