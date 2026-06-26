import { useRef, useState } from "react";
import { adminAuthFetch } from "../../../lib/admin-portal/use-admin-session.js";
import AdminSectionCard from "../AdminSectionCard.jsx";
import {
  VB_MEDIA_DELETE,
  VB_MEDIA_DELETE_CONFIRM,
  VB_MEDIA_DELETING,
  VB_MEDIA_EMPTY,
  VB_MEDIA_LIBRARY,
  VB_MEDIA_SELECT,
  VB_MEDIA_SELECTED,
  VB_MEDIA_TYPES,
  VB_MEDIA_UPLOAD,
  VB_MEDIA_UPLOADING,
} from "../../../lib/admin-portal/admin-video-builder-ui.he.js";

/**
 * @param {{
 *   accessToken: string,
 *   assets: Array<Record<string, unknown>>,
 *   onUploaded: (asset: Record<string, unknown>) => void,
 *   onDeleted?: (assetId: string) => void,
 *   selectedId?: string | null,
 *   onSelect?: (asset: Record<string, unknown>) => void,
 *   filterTypes?: string[] | null,
 *   embedded?: boolean,
 * }} props
 */
export default function AdminVideoMediaLibrary({
  accessToken,
  assets,
  onUploaded,
  onDeleted,
  selectedId,
  onSelect,
  filterTypes = null,
  embedded = false,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  const visible = filterTypes
    ? assets.filter((a) => filterTypes.includes(String(a.type)))
    : assets;

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await adminAuthFetch(accessToken, "/api/admin/video-builder/media", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "העלאה נכשלה");
      onUploaded(json?.data?.asset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "העלאה נכשלה");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(asset) {
    if (!window.confirm(VB_MEDIA_DELETE_CONFIRM)) return;
    const assetId = String(asset.id);
    setDeletingId(assetId);
    setError(null);
    try {
      const res = await adminAuthFetch(accessToken, `/api/admin/video-builder/media/${assetId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "מחיקה נכשלה");
      onDeleted?.(assetId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "מחיקה נכשלה");
    } finally {
      setDeletingId(null);
    }
  }

  const inner = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-white/50">{VB_MEDIA_TYPES}</p>
        <label className="cursor-pointer rounded-lg bg-white/10 border border-white/20 px-3 py-1.5 text-sm hover:bg-white/15">
          {uploading ? VB_MEDIA_UPLOADING : VB_MEDIA_UPLOAD}
          <input
            ref={inputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.mp4,.mp3,.wav,audio/*,video/*,image/*"
            className="hidden"
            disabled={uploading}
            onChange={(ev) => void handleUpload(ev)}
          />
        </label>
      </div>
      {error ? <p className="text-xs text-red-300 text-right">{error}</p> : null}
      {visible.length === 0 ? (
        <p className="text-sm text-white/50 text-right">{VB_MEDIA_EMPTY}</p>
      ) : (
        <div
          className={`grid gap-2 ${embedded ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"}`}
        >
          {visible.map((asset) => {
            const selected = selectedId === asset.id;
            const isDeleting = deletingId === String(asset.id);
            return (
              <div
                key={String(asset.id)}
                className={`rounded-lg border p-2 text-right ${selected ? "border-amber-400/60 bg-amber-500/10" : "border-white/10 bg-black/20"}`}
              >
                <div className="relative aspect-video bg-black/40 rounded mb-2 flex items-center justify-center overflow-hidden group">
                  {asset.type === "image" ? (
                    <img src={asset.url} alt="" className="max-h-full max-w-full object-contain" />
                  ) : asset.type === "video" ? (
                    <video src={asset.url} className="max-h-full max-w-full" muted />
                  ) : (
                    <span className="text-2xl">🎵</span>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleDelete(asset)}
                    disabled={isDeleting}
                    className="absolute top-1 left-1 rounded bg-red-600/90 border border-red-400/50 px-1.5 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-60"
                    title={VB_MEDIA_DELETE}
                  >
                    {isDeleting ? VB_MEDIA_DELETING : VB_MEDIA_DELETE}
                  </button>
                </div>
                <p className="text-xs truncate text-white/80" title={String(asset.filename)}>
                  {asset.filename}
                </p>
                <div className="mt-1 flex gap-1">
                  {onSelect ? (
                    <button
                      type="button"
                      onClick={() => onSelect(asset)}
                      className="flex-1 rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
                    >
                      {selected ? VB_MEDIA_SELECTED : VB_MEDIA_SELECT}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void handleDelete(asset)}
                    disabled={isDeleting}
                    className="rounded border border-red-400/30 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {isDeleting ? "…" : "✕"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (embedded) return inner;

  return <AdminSectionCard title={VB_MEDIA_LIBRARY}>{inner}</AdminSectionCard>;
}
