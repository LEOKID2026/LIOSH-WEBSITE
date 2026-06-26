import { useCallback, useEffect, useRef, useState } from "react";
import AdminVideoScenePreview from "./AdminVideoScenePreview.jsx";
import AdminVideoTimeline from "./AdminVideoTimeline.jsx";
import {
  VB_PREVIEW,
  VB_PREVIEW_PLAY,
  VB_PREVIEW_SCENE,
  VB_PREVIEW_STOP,
  VB_PREVIEW_WITH_AUDIO,
} from "../../../lib/admin-portal/admin-video-builder-ui.he.js";
import { computePreviewTotalDurationSec } from "../../../lib/admin-portal/admin-video-builder-utils.js";
import AdminSectionCard from "../AdminSectionCard.jsx";

/**
 * @param {{
 *   scenes: Array<Record<string, unknown>>,
 *   aspectRatio: string,
 *   assetsById: Record<string, Record<string, unknown>>,
 *   voiceoverUrl?: string | null,
 *   musicUrl?: string | null,
 *   voiceoverVolume?: number,
 *   musicVolume?: number,
 *   watermarkUrl?: string | null,
 *   watermarkPosition?: string,
 *   embedded?: boolean,
 *   sceneIndex?: number,
 *   onSceneIndexChange?: (index: number) => void,
 * }} props
 */
export default function AdminVideoPreviewPlayer({
  scenes,
  aspectRatio,
  assetsById,
  voiceoverUrl,
  musicUrl,
  voiceoverVolume = 100,
  musicVolume = 35,
  watermarkUrl,
  watermarkPosition,
  embedded = false,
  sceneIndex: controlledIndex,
  onSceneIndexChange,
}) {
  const [playing, setPlaying] = useState(false);
  const [internalIndex, setInternalIndex] = useState(0);
  const [withAudio, setWithAudio] = useState(true);
  const timerRef = useRef(null);
  const voiceRef = useRef(null);
  const musicRef = useRef(null);

  const sceneIndex = controlledIndex ?? internalIndex;
  const setSceneIndex = onSceneIndexChange ?? setInternalIndex;

  const totalSec = computePreviewTotalDurationSec(scenes);
  const currentScene = scenes[sceneIndex] || null;
  const media = currentScene?.mediaAssetId ? assetsById[currentScene.mediaAssetId] : null;

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    voiceRef.current?.pause();
    musicRef.current?.pause();
    if (voiceRef.current) voiceRef.current.currentTime = 0;
    if (musicRef.current) musicRef.current.currentTime = 0;
    setPlaying(false);
    setSceneIndex(0);
  }, [setSceneIndex]);

  const play = useCallback(() => {
    if (!scenes.length) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    voiceRef.current?.pause();
    musicRef.current?.pause();
    if (voiceRef.current) voiceRef.current.currentTime = 0;
    if (musicRef.current) musicRef.current.currentTime = 0;
    setPlaying(true);
    setSceneIndex(0);
    if (withAudio) {
      if (voiceRef.current && voiceoverUrl) {
        voiceRef.current.volume = voiceoverVolume / 100;
        void voiceRef.current.play().catch(() => {});
      }
      if (musicRef.current && musicUrl) {
        musicRef.current.volume = musicVolume / 100;
        void musicRef.current.play().catch(() => {});
      }
    }
  }, [scenes.length, withAudio, voiceoverUrl, musicUrl, voiceoverVolume, musicVolume, setSceneIndex]);

  useEffect(() => {
    if (!playing || !scenes.length) return undefined;

    const durationMs = (Number(scenes[sceneIndex]?.durationSec) || 3) * 1000;
    timerRef.current = setTimeout(() => {
      if (sceneIndex >= scenes.length - 1) {
        setPlaying(false);
        voiceRef.current?.pause();
        musicRef.current?.pause();
        setSceneIndex(0);
      } else {
        setSceneIndex(sceneIndex + 1);
      }
    }, durationMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playing, sceneIndex, scenes, setSceneIndex]);

  useEffect(() => {
    if (sceneIndex >= scenes.length && scenes.length > 0) {
      setSceneIndex(Math.max(0, scenes.length - 1));
    }
  }, [scenes.length, sceneIndex, setSceneIndex]);

  const inner = (
    <div className="space-y-3">
      <AdminVideoTimeline
        scenes={scenes}
        activeIndex={sceneIndex}
        onSelect={(i) => {
          if (playing) {
            setPlaying(false);
            voiceRef.current?.pause();
            musicRef.current?.pause();
          }
          setSceneIndex(i);
        }}
      />
      {currentScene ? (
        <>
          <p className="text-xs text-white/50 text-right">
            {VB_PREVIEW_SCENE} {sceneIndex + 1} / {scenes.length}
            {playing ? ` · ${totalSec} שנ׳ סה״כ` : ""}
          </p>
          <div className={embedded ? "mx-auto max-w-xl" : ""}>
            <AdminVideoScenePreview
              scene={currentScene}
              mediaUrl={media?.url}
              mediaType={media?.type}
              aspectRatio={aspectRatio}
              active={playing}
              watermarkUrl={watermarkUrl}
              watermarkPosition={watermarkPosition}
              showSafeZone
            />
          </div>
        </>
      ) : (
        <p className="text-sm text-white/50 text-right py-12 text-center">אין סצנות לתצוגה</p>
      )}
      {voiceoverUrl ? <audio ref={voiceRef} src={voiceoverUrl} preload="auto" /> : null}
      {musicUrl ? <audio ref={musicRef} src={musicUrl} preload="auto" loop /> : null}
      <div className="flex flex-wrap gap-2 justify-end items-center">
        <label className="flex items-center gap-1.5 text-xs text-white/60">
          <input type="checkbox" checked={withAudio} onChange={(e) => setWithAudio(e.target.checked)} />
          {VB_PREVIEW_WITH_AUDIO}
        </label>
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
  );

  if (embedded) return inner;

  return <AdminSectionCard title={VB_PREVIEW}>{inner}</AdminSectionCard>;
}
