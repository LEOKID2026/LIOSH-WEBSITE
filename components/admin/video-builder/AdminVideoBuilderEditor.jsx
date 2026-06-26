import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminAuthFetch } from "../../../lib/admin-portal/use-admin-session.js";
import AdminSectionCard from "../AdminSectionCard.jsx";
import AdminVideoMediaLibrary from "./AdminVideoMediaLibrary.jsx";
import AdminVideoPreviewPlayer from "./AdminVideoPreviewPlayer.jsx";
import AdminVideoSceneList from "./AdminVideoSceneList.jsx";
import AdminVideoVoiceoverPanel from "./AdminVideoVoiceoverPanel.jsx";
import {
  VB_BACK_TO_LIST,
  VB_DOWNLOAD,
  VB_EXPORT,
  VB_EXPORT_DONE,
  VB_EXPORT_ERROR,
  VB_EXPORTING,
  VB_FFMPEG_CHECK,
  VB_FFMPEG_OK,
  VB_FFMPEG_UNAVAILABLE,
  VB_LOAD_ERROR,
  VB_NOT_FOUND,
  VB_SAVE,
  VB_SAVED,
  VB_SAVE_ERROR,
  VB_SAVING,
  VB_VIEW,
} from "../../../lib/admin-portal/admin-video-builder-ui.he.js";

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
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState(null);
  const [ffmpegAvailable, setFfmpegAvailable] = useState(null);
  const [mediaPickSceneId, setMediaPickSceneId] = useState(null);

  const loadProject = useCallback(async () => {
    const res = await adminAuthFetch(accessToken, `/api/admin/video-builder/${projectId}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error?.message || VB_NOT_FOUND);
    setProject(json?.data?.project || null);
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

  function patchProject(patch) {
    setProject((prev) => (prev ? { ...prev, ...patch } : prev));
    setSaveMsg(null);
  }

  async function handleSave() {
    if (!project) return false;
    setSaving(true);
    setSaveMsg(null);
    setError(null);
    try {
      const body = {
        name: project.name,
        aspectRatio: project.aspectRatio,
        scenes: project.scenes,
        voiceoverAssetId: project.voiceoverAssetId ?? null,
      };
      const res = await adminAuthFetch(accessToken, `/api/admin/video-builder/${projectId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || VB_SAVE_ERROR);
      setProject(json?.data?.project || project);
      setSaveMsg(VB_SAVED);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : VB_SAVE_ERROR);
      return false;
    } finally {
      setSaving(false);
    }
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
      await loadProject();
      if (url) setProject((p) => (p ? { ...p, outputMp4Path: url, status: "exported" } : p));
    } catch (e) {
      setExportMsg(e instanceof Error ? e.message : VB_EXPORT_ERROR);
    } finally {
      setExporting(false);
    }
  }

  function handleMediaSelect(asset) {
    if (!mediaPickSceneId || !project) return;
    const scenes = (project.scenes || []).map((s) =>
      String(s.id) === mediaPickSceneId ? { ...s, mediaAssetId: asset.id } : s
    );
    patchProject({ scenes });
    setMediaPickSceneId(null);
  }

  const assetsById = Object.fromEntries(assets.map((a) => [String(a.id), a]));

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/video-builder" className="text-sm text-white/60 hover:text-white">
          {VB_BACK_TO_LIST}
        </Link>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-lg border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? VB_SAVING : VB_SAVE}
          </button>
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={exporting || ffmpegAvailable === false}
            className="rounded-lg bg-amber-500/30 border border-amber-400/40 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {exporting ? VB_EXPORTING : VB_EXPORT}
          </button>
        </div>
      </div>

      {saveMsg ? <p className="text-sm text-emerald-300 text-right">{saveMsg}</p> : null}
      {error ? <p className="text-sm text-red-300 text-right">{error}</p> : null}
      {exportMsg ? (
        <p
          className={`text-sm text-right ${exportMsg === VB_EXPORT_DONE ? "text-emerald-300" : "text-amber-200"}`}
        >
          {exportMsg}
        </p>
      ) : null}

      {ffmpegAvailable === null ? (
        <p className="text-xs text-white/40 text-right">{VB_FFMPEG_CHECK}</p>
      ) : ffmpegAvailable ? (
        <p className="text-xs text-emerald-300/80 text-right">{VB_FFMPEG_OK}</p>
      ) : (
        <p className="text-xs text-amber-200 text-right">{VB_FFMPEG_UNAVAILABLE}</p>
      )}

      {project.outputMp4Path ? (
        <AdminSectionCard title="סרטון מיוצא">
          <div className="flex flex-wrap gap-3 justify-end">
            <a
              href={project.outputMp4Path}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-emerald-300 underline"
            >
              {VB_VIEW}
            </a>
            <a href={project.outputMp4Path} download className="text-sm text-white/80 underline">
              {VB_DOWNLOAD}
            </a>
          </div>
          <video src={project.outputMp4Path} controls className="mt-3 w-full max-w-2xl rounded-lg" />
        </AdminSectionCard>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <AdminVideoSceneList
            project={project}
            assets={assets}
            onChange={patchProject}
            onSelectMedia={setMediaPickSceneId}
          />
        </div>
        <div className="space-y-6">
          <AdminVideoPreviewPlayer
            scenes={project.scenes || []}
            aspectRatio={String(project.aspectRatio || "16:9")}
            assetsById={assetsById}
          />
          <AdminVideoVoiceoverPanel
            accessToken={accessToken}
            assets={assets}
            voiceoverAssetId={project.voiceoverAssetId ?? null}
            onChange={(id) => patchProject({ voiceoverAssetId: id })}
            onUploaded={(asset) => setAssets((prev) => [asset, ...prev])}
          />
          {mediaPickSceneId ? (
            <AdminSectionCard title="בחירת מדיה לסצנה">
              <p className="text-xs text-white/50 mb-2 text-right">לחצ/י על קובץ לבחירה</p>
              <AdminVideoMediaLibrary
                accessToken={accessToken}
                assets={assets}
                onUploaded={(asset) => {
                  setAssets((prev) => [asset, ...prev]);
                  handleMediaSelect(asset);
                }}
                onSelect={handleMediaSelect}
                filterTypes={["image", "video"]}
              />
              <button
                type="button"
                onClick={() => setMediaPickSceneId(null)}
                className="mt-2 text-xs text-white/60 hover:text-white"
              >
                ביטול
              </button>
            </AdminSectionCard>
          ) : (
            <AdminVideoMediaLibrary
              accessToken={accessToken}
              assets={assets}
              onUploaded={(asset) => setAssets((prev) => [asset, ...prev])}
            />
          )}
        </div>
      </div>
    </div>
  );
}
