import { useRef, useState } from "react";
import { adminAuthFetch } from "../../../lib/admin-portal/use-admin-session.js";
import AdminSectionCard from "../AdminSectionCard.jsx";
import AdminVideoMediaLibrary from "./AdminVideoMediaLibrary.jsx";
import {
  VB_VOICEOVER,
  VB_VOICEOVER_CLEAR,
  VB_VOICEOVER_NONE,
  VB_VOICEOVER_PLAY,
  VB_VOICEOVER_RECORD,
  VB_VOICEOVER_SAVE,
  VB_VOICEOVER_START,
  VB_VOICEOVER_STOP,
  VB_VOICEOVER_UPLOAD,
} from "../../../lib/admin-portal/admin-video-builder-ui.he.js";

/**
 * @param {{
 *   accessToken: string,
 *   assets: Array<Record<string, unknown>>,
 *   voiceoverAssetId: string | null,
 *   onChange: (assetId: string | null) => void,
 *   onUploaded: (asset: Record<string, unknown>) => void,
 *   embedded?: boolean,
 * }} props
 */
export default function AdminVideoVoiceoverPanel({
  accessToken,
  assets,
  voiceoverAssetId,
  onChange,
  onUploaded,
  embedded = false,
}) {
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);

  const selected = voiceoverAssetId
    ? assets.find((a) => a.id === voiceoverAssetId)
    : null;
  const playbackUrl = selected?.url || recordedUrl;

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordedBlob(blob);
        if (recordedUrl) URL.revokeObjectURL(recordedUrl);
        setRecordedUrl(URL.createObjectURL(blob));
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch {
      setError("לא ניתן לגשת למיקרופון. ניתן להעלות קובץ MP3/WAV.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function saveRecording() {
    if (!recordedBlob) return;
    setSaving(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", recordedBlob, `recording-${Date.now()}.webm`);
      const res = await adminAuthFetch(accessToken, "/api/admin/video-builder/media", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "שמירה נכשלה");
      const asset = json?.data?.asset;
      onUploaded(asset);
      onChange(asset?.id || null);
      setRecordedBlob(null);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  }

  const body = (
    <div className="space-y-4">
      {selected ? (
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <p className="text-sm text-white/80 truncate">{selected.filename}</p>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-red-300 border border-red-400/30 rounded px-2 py-1 hover:bg-red-500/10 shrink-0"
          >
            {VB_VOICEOVER_CLEAR}
          </button>
        </div>
      ) : (
        <p className="text-sm text-white/50">{VB_VOICEOVER_NONE}</p>
      )}

      {playbackUrl ? <audio ref={audioRef} src={playbackUrl} controls className="w-full" /> : null}

      <div className="rounded-lg border border-white/10 p-3 space-y-2">
        <p className="text-xs text-white/50">{VB_VOICEOVER_RECORD}</p>
        <div className="flex flex-wrap gap-2 justify-end">
          {!recording ? (
            <button
              type="button"
              onClick={() => void startRecording()}
              className="rounded border border-white/20 px-3 py-1.5 text-sm hover:bg-white/5"
            >
              {VB_VOICEOVER_START}
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="rounded border border-red-400/40 px-3 py-1.5 text-sm text-red-200 hover:bg-red-500/10"
            >
              {VB_VOICEOVER_STOP}
            </button>
          )}
          {recordedBlob ? (
            <>
              <button
                type="button"
                onClick={() => audioRef.current?.play()}
                className="rounded border border-white/20 px-3 py-1.5 text-sm"
              >
                {VB_VOICEOVER_PLAY}
              </button>
              <button
                type="button"
                onClick={() => void saveRecording()}
                disabled={saving}
                className="rounded bg-emerald-600/70 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                {saving ? "…" : VB_VOICEOVER_SAVE}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {!embedded ? (
        <>
          <p className="text-xs text-white/50">{VB_VOICEOVER_UPLOAD}</p>
          <AdminVideoMediaLibrary
            accessToken={accessToken}
            assets={assets}
            onUploaded={(asset) => {
              onUploaded(asset);
              if (asset.type === "audio") onChange(String(asset.id));
            }}
            selectedId={voiceoverAssetId}
            onSelect={(asset) => onChange(String(asset.id))}
            filterTypes={["audio"]}
          />
        </>
      ) : (
        <>
          <p className="text-xs text-white/50">{VB_VOICEOVER_UPLOAD}</p>
          <select
            value={String(voiceoverAssetId || "")}
            onChange={(e) => onChange(e.target.value || null)}
            className="w-full rounded border border-white/20 bg-black/30 px-2 py-1.5 text-sm text-right"
          >
            <option value="">- בחר קובץ -</option>
            {assets
              .filter((a) => a.type === "audio")
              .map((a) => (
                <option key={String(a.id)} value={String(a.id)}>
                  {a.filename}
                </option>
              ))}
          </select>
          <p className="text-xs text-white/40">העלאת קבצים חדשים - בטאב "מדיה"</p>
        </>
      )}

      {error ? <p className="text-xs text-red-300 text-right">{error}</p> : null}
    </div>
  );

  if (embedded) return body;

  return <AdminSectionCard title={VB_VOICEOVER}>{body}</AdminSectionCard>;
}
