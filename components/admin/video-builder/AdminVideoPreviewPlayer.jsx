import { useCallback, useEffect, useRef, useState } from "react";
import AdminVideoScenePreview from "./AdminVideoScenePreview.jsx";
import {
  VB_PREVIEW,
  VB_PREVIEW_PLAY,
  VB_PREVIEW_SCENE,
  VB_PREVIEW_STOP,
} from "../../../lib/admin-portal/admin-video-builder-ui.he.js";
import { computePreviewTotalDurationSec } from "../../../lib/admin-portal/admin-video-builder-utils.js";
import AdminSectionCard from "../AdminSectionCard.jsx";

/**
 * @param {{ scenes: Array<Record<string, unknown>>, aspectRatio: string, assetsById: Record<string, Record<string, unknown>> }} props
 */
export default function AdminVideoPreviewPlayer({ scenes, aspectRatio, assetsById }) {
  const [playing, setPlaying] = useState(false);
  const [sceneIndex, setSceneIndex] = useState(0);
  const timerRef = useRef(null);

  const totalSec = computePreviewTotalDurationSec(scenes);
  const currentScene = scenes[sceneIndex] || null;
  const media = currentScene?.mediaAssetId
    ? assetsById[currentScene.mediaAssetId]
    : null;

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setPlaying(false);
    setSceneIndex(0);
  }, []);

  const play = useCallback(() => {
    if (!scenes.length) return;
    stop();
    setPlaying(true);
    setSceneIndex(0);
  }, [scenes.length, stop]);

  useEffect(() => {
    if (!playing || !scenes.length) return undefined;

    const durationMs = (Number(scenes[sceneIndex]?.durationSec) || 3) * 1000;
    timerRef.current = setTimeout(() => {
      if (sceneIndex >= scenes.length - 1) {
        stop();
      } else {
        setSceneIndex((i) => i + 1);
      }
    }, durationMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playing, sceneIndex, scenes, stop]);

  return (
    <AdminSectionCard title={VB_PREVIEW}>
      <div className="space-y-3">
        {currentScene ? (
          <>
            <p className="text-xs text-white/50 text-right">
              {VB_PREVIEW_SCENE} {sceneIndex + 1} / {scenes.length}
              {playing ? ` · ${totalSec} שנ׳ סה״כ` : ""}
            </p>
            <AdminVideoScenePreview
              scene={currentScene}
              mediaUrl={media?.url}
              mediaType={media?.type}
              aspectRatio={aspectRatio}
              active={playing}
            />
          </>
        ) : (
          <p className="text-sm text-white/50 text-right">אין סצנות לתצוגה</p>
        )}
        <div className="flex gap-2 justify-end">
          {!playing ? (
            <button
              type="button"
              onClick={play}
              disabled={!scenes.length}
              className="rounded-lg bg-amber-500/30 border border-amber-400/40 px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {VB_PREVIEW_PLAY}
            </button>
          ) : (
            <button
              type="button"
              onClick={stop}
              className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/5"
            >
              {VB_PREVIEW_STOP}
            </button>
          )}
        </div>
      </div>
    </AdminSectionCard>
  );
}
