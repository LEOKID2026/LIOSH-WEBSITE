import AdminSectionCard from "../AdminSectionCard.jsx";
import AdminVideoMediaLibrary from "./AdminVideoMediaLibrary.jsx";
import {
  VB_EXPORT_QUALITIES,
  VB_TRANSITIONS,
  VB_TRANSITION_IDS,
  VB_WATERMARK_POSITIONS,
  VB_WATERMARK_POSITION_IDS,
  VB_EXPORT_QUALITY_IDS,
  VB_ASPECT_RATIO_IDS,
  VB_ASPECT_RATIOS,
} from "../../../lib/admin-portal/admin-video-builder-catalog.js";
import {
  VB_ASPECT_RATIO,
  VB_PROJECT_AUDIO,
  VB_PROJECT_DEFAULT_TRANSITION,
  VB_PROJECT_EXPORT_QUALITY,
  VB_PROJECT_MUSIC,
  VB_PROJECT_MUSIC_VOL,
  VB_PROJECT_SETTINGS,
  VB_PROJECT_VOICE_VOL,
  VB_PROJECT_WATERMARK,
  VB_PROJECT_WATERMARK_POS,
  VB_VIDEO_NAME,
} from "../../../lib/admin-portal/admin-video-builder-ui.he.js";

/**
 * @param {{
 *   project: Record<string, unknown>,
 *   assets: Array<Record<string, unknown>>,
 *   accessToken: string,
 *   onChange: (patch: Record<string, unknown>) => void,
 *   onUploaded: (asset: Record<string, unknown>) => void,
 *   embedded?: boolean,
 *   showNameFields?: boolean,
 * }} props
 */
export default function AdminVideoProjectSettings({
  project,
  assets,
  accessToken,
  onChange,
  onUploaded,
  embedded = false,
  showNameFields = false,
}) {
  const musicAssets = assets.filter((a) => a.type === "audio");
  const imageAssets = assets.filter((a) => a.type === "image");

  const body = (
    <div className="space-y-4 text-right">
      {showNameFields ? (
        <>
          <label className="block">
            <span className="text-xs text-white/50">{VB_VIDEO_NAME}</span>
            <input
              type="text"
              value={String(project.name || "")}
              onChange={(e) => onChange({ name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-right"
            />
          </label>
          <label className="block">
            <span className="text-xs text-white/50">{VB_ASPECT_RATIO}</span>
            <select
              value={String(project.aspectRatio || "16:9")}
              onChange={(e) => onChange({ aspectRatio: e.target.value })}
              className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-right"
            >
              {VB_ASPECT_RATIO_IDS.map((id) => (
                <option key={id} value={id}>
                  {VB_ASPECT_RATIOS[id].label}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}

      <label className="block">
        <span className="text-xs text-white/50">{VB_PROJECT_EXPORT_QUALITY}</span>
        <select
          value={String(project.exportQuality || "1080p")}
          onChange={(e) => onChange({ exportQuality: e.target.value })}
          className="mt-1 w-full rounded border border-white/20 bg-black/30 px-2 py-1.5 text-sm"
        >
          {VB_EXPORT_QUALITY_IDS.map((id) => (
            <option key={id} value={id}>
              {VB_EXPORT_QUALITIES[id].label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs text-white/50">{VB_PROJECT_DEFAULT_TRANSITION}</span>
        <select
          value={String(project.defaultTransition || "crossfade")}
          onChange={(e) => onChange({ defaultTransition: e.target.value })}
          className="mt-1 w-full rounded border border-white/20 bg-black/30 px-2 py-1.5 text-sm"
        >
          {VB_TRANSITION_IDS.map((id) => (
            <option key={id} value={id}>
              {VB_TRANSITIONS[id].label}
            </option>
          ))}
        </select>
      </label>

      <div>
        <span className="text-xs text-white/50">{VB_PROJECT_VOICE_VOL}</span>
        <input
          type="range"
          min={0}
          max={100}
          value={Number(project.voiceoverVolume ?? 100)}
          onChange={(e) => onChange({ voiceoverVolume: Number(e.target.value) })}
          className="mt-1 w-full"
        />
        <span className="text-xs text-white/40">{project.voiceoverVolume ?? 100}%</span>
      </div>

      <div>
        <p className="text-xs text-white/50 mb-1">{VB_PROJECT_MUSIC}</p>
        <select
          value={String(project.backgroundMusicAssetId || "")}
          onChange={(e) => onChange({ backgroundMusicAssetId: e.target.value || null })}
          className="w-full rounded border border-white/20 bg-black/30 px-2 py-1.5 text-sm mb-2"
        >
          <option value="">ללא מוזיקה</option>
          {musicAssets.map((a) => (
            <option key={String(a.id)} value={String(a.id)}>
              {a.filename}
            </option>
          ))}
        </select>
        <span className="text-xs text-white/50">{VB_PROJECT_MUSIC_VOL}</span>
        <input
          type="range"
          min={0}
          max={100}
          value={Number(project.backgroundMusicVolume ?? 35)}
          onChange={(e) => onChange({ backgroundMusicVolume: Number(e.target.value) })}
          className="mt-1 w-full"
        />
        <span className="text-xs text-white/40">{project.backgroundMusicVolume ?? 35}%</span>
      </div>

      <div>
        <p className="text-xs text-white/50 mb-1">{VB_PROJECT_WATERMARK}</p>
        <select
          value={String(project.watermarkAssetId || "")}
          onChange={(e) => onChange({ watermarkAssetId: e.target.value || null })}
          className="w-full rounded border border-white/20 bg-black/30 px-2 py-1.5 text-sm mb-2"
        >
          <option value="">ללא לוגו</option>
          {imageAssets.map((a) => (
            <option key={String(a.id)} value={String(a.id)}>
              {a.filename}
            </option>
          ))}
        </select>
        <label className="block">
          <span className="text-xs text-white/50">{VB_PROJECT_WATERMARK_POS}</span>
          <select
            value={String(project.watermarkPosition || "top_right")}
            onChange={(e) => onChange({ watermarkPosition: e.target.value })}
            className="mt-1 w-full rounded border border-white/20 bg-black/30 px-2 py-1.5 text-sm"
          >
            {VB_WATERMARK_POSITION_IDS.map((id) => (
              <option key={id} value={id}>
                {VB_WATERMARK_POSITIONS[id].label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!embedded ? (
        <>
          <p className="text-xs text-white/40">{VB_PROJECT_AUDIO}</p>
          <AdminVideoMediaLibrary
            accessToken={accessToken}
            assets={assets}
            onUploaded={onUploaded}
            filterTypes={["audio"]}
          />
        </>
      ) : (
        <p className="text-xs text-white/40">{VB_PROJECT_AUDIO} - בטאב "מדיה"</p>
      )}
    </div>
  );

  if (embedded) return body;

  return <AdminSectionCard title={VB_PROJECT_SETTINGS}>{body}</AdminSectionCard>;
}
