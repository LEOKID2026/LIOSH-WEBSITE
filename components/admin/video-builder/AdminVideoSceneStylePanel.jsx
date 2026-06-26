import {
  VB_ANIMATION_IDS,
  VB_ANIMATIONS,
  VB_BACKGROUND_IDS,
  VB_BACKGROUNDS,
  VB_MEDIA_OVERLAY_IDS,
  VB_MEDIA_OVERLAYS,
  VB_TEXT_ALIGN_IDS,
  VB_TEXT_COLOR_PRESETS,
  VB_TEXT_SHADOW_IDS,
  VB_TEXT_SHADOWS,
  VB_TEXT_SIZE_IDS,
  VB_TEXT_SIZES,
  VB_TRANSITION_IDS,
  VB_TRANSITIONS,
  VB_TEXT_BG_IDS,
  VB_TEXT_BACKGROUNDS,
  VB_FONT_IDS,
  VB_FONTS,
  VB_MEDIA_POSITION_IDS,
  VB_MEDIA_SCALE_IDS,
  VB_MEDIA_SCALE_FACTOR,
  VB_MEDIA_FIT_IDS,
  VB_MEDIA_FITS,
} from "../../../lib/admin-portal/admin-video-builder-catalog.js";
import {
  VB_SCENE_ANIMATION,
  VB_SCENE_BG,
  VB_SCENE_FONT,
  VB_SCENE_MEDIA_OVERLAY,
  VB_SCENE_MEDIA_POSITION,
  VB_SCENE_MEDIA_SCALE,
  VB_SCENE_MEDIA_FIT,
  VB_SCENE_MEDIA_FIT_HINT,
  VB_SCENE_STYLE,
  VB_SCENE_SUBTITLE_COLOR,
  VB_SCENE_SUBTITLE_SIZE,
  VB_SCENE_TEXT_ALIGN,
  VB_SCENE_TEXT_BG,
  VB_SCENE_TEXT_SHADOW,
  VB_SCENE_TITLE_BOLD,
  VB_SCENE_TITLE_COLOR,
  VB_SCENE_TITLE_SIZE,
  VB_SCENE_TRANSITION,
  VB_STYLE_SECTION_BG,
  VB_STYLE_SECTION_MEDIA,
  VB_STYLE_SECTION_TEXT,
} from "../../../lib/admin-portal/admin-video-builder-ui.he.js";

function ColorPickerRow({ label, value, onChange, presets }) {
  return (
    <div className="block text-right">
      <span className="text-xs text-white/50">{label}</span>
      <div className="mt-1 flex flex-wrap gap-1.5 justify-end items-center">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.label}
            onClick={() => onChange(p.hex)}
            className={`w-6 h-6 rounded-full border-2 ${value === p.hex ? "border-amber-400 scale-110" : "border-white/30"}`}
            style={{ backgroundColor: p.hex }}
          />
        ))}
        <input
          type="color"
          value={value || "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer bg-transparent border border-white/20"
        />
      </div>
    </div>
  );
}

function StyleSection({ title, defaultOpen = true, children }) {
  return (
    <details open={defaultOpen} className="rounded-lg border border-white/10 bg-black/20 group">
      <summary className="px-3 py-2 text-xs font-semibold text-amber-200/90 cursor-pointer select-none list-none flex items-center justify-between">
        {title}
        <span className="text-white/30 group-open:rotate-180 transition-transform">▾</span>
      </summary>
      <div className="px-3 pb-3 pt-1 space-y-3 border-t border-white/5">{children}</div>
    </details>
  );
}

/**
 * @param {{ scene: Record<string, unknown>, onPatch: (patch: Record<string, unknown>) => void, compact?: boolean }} props
 */
export default function AdminVideoSceneStylePanel({ scene, onPatch, compact = false }) {
  const solidBgs = VB_BACKGROUND_IDS.filter((id) => VB_BACKGROUNDS[id]?.ffmpeg?.type === "color");
  const gradientBgs = VB_BACKGROUND_IDS.filter((id) => VB_BACKGROUNDS[id]?.ffmpeg?.type === "gradient");

  const bgFields = (
    <>
      <label className="block text-right">
        <span className="text-xs text-white/50">{VB_SCENE_BG}</span>
        <select
          value={String(scene.bgType || "leo_indigo")}
          onChange={(e) => onPatch({ bgType: e.target.value, titleColor: null, subtitleColor: null })}
          className="mt-1 w-full rounded border border-white/20 bg-black/30 px-2 py-1.5 text-sm text-right"
        >
          <optgroup label="צבעים">
            {solidBgs.map((id) => (
              <option key={id} value={id}>
                {VB_BACKGROUNDS[id].label}
              </option>
            ))}
          </optgroup>
          <optgroup label="גרדיאנטים">
            {gradientBgs.map((id) => (
              <option key={id} value={id}>
                {VB_BACKGROUNDS[id].label}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      <label className="block text-right">
        <span className="text-xs text-white/50">{VB_SCENE_ANIMATION}</span>
        <select
          value={String(scene.animation || "none")}
          onChange={(e) => onPatch({ animation: e.target.value })}
          className="mt-1 w-full rounded border border-white/20 bg-black/30 px-2 py-1.5 text-sm text-right"
        >
          {VB_ANIMATION_IDS.map((id) => (
            <option key={id} value={id}>
              {VB_ANIMATIONS[id].label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-right">
        <span className="text-xs text-white/50">{VB_SCENE_TRANSITION}</span>
        <select
          value={String(scene.transitionOut || "none")}
          onChange={(e) => onPatch({ transitionOut: e.target.value })}
          className="mt-1 w-full rounded border border-white/20 bg-black/30 px-2 py-1.5 text-sm text-right"
        >
          {VB_TRANSITION_IDS.map((id) => (
            <option key={id} value={id}>
              {VB_TRANSITIONS[id].label}
            </option>
          ))}
        </select>
      </label>
    </>
  );

  const textFields = (
    <>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-right">
          <span className="text-xs text-white/50">{VB_SCENE_TITLE_SIZE}</span>
          <select
            value={String(scene.titleSize || "md")}
            onChange={(e) => onPatch({ titleSize: e.target.value })}
            className="mt-1 w-full rounded border border-white/20 bg-black/30 px-2 py-1.5 text-sm text-right"
          >
            {VB_TEXT_SIZE_IDS.map((id) => (
              <option key={id} value={id}>
                {VB_TEXT_SIZES[id].label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-right">
          <span className="text-xs text-white/50">{VB_SCENE_SUBTITLE_SIZE}</span>
          <select
            value={String(scene.subtitleSize || "md")}
            onChange={(e) => onPatch({ subtitleSize: e.target.value })}
            className="mt-1 w-full rounded border border-white/20 bg-black/30 px-2 py-1.5 text-sm text-right"
          >
            {VB_TEXT_SIZE_IDS.map((id) => (
              <option key={id} value={id}>
                {VB_TEXT_SIZES[id].label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ColorPickerRow
        label={VB_SCENE_TITLE_COLOR}
        value={scene.titleColor || VB_BACKGROUNDS[String(scene.bgType)]?.defaultTitleColor}
        onChange={(hex) => onPatch({ titleColor: hex })}
        presets={VB_TEXT_COLOR_PRESETS}
      />
      <ColorPickerRow
        label={VB_SCENE_SUBTITLE_COLOR}
        value={scene.subtitleColor || VB_BACKGROUNDS[String(scene.bgType)]?.defaultSubtitleColor}
        onChange={(hex) => onPatch({ subtitleColor: hex })}
        presets={VB_TEXT_COLOR_PRESETS}
      />
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-right">
          <span className="text-xs text-white/50">{VB_SCENE_TEXT_ALIGN}</span>
          <select
            value={String(scene.textAlign || "center")}
            onChange={(e) => onPatch({ textAlign: e.target.value })}
            className="mt-1 w-full rounded border border-white/20 bg-black/30 px-2 py-1.5 text-sm text-right"
          >
            {VB_TEXT_ALIGN_IDS.map((id) => (
              <option key={id} value={id}>
                {id === "center" ? "מרכז" : id === "right" ? "ימין" : "שמאל"}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-right">
          <span className="text-xs text-white/50">{VB_SCENE_TEXT_SHADOW}</span>
          <select
            value={String(scene.textShadow || "soft")}
            onChange={(e) => onPatch({ textShadow: e.target.value })}
            className="mt-1 w-full rounded border border-white/20 bg-black/30 px-2 py-1.5 text-sm text-right"
          >
            {VB_TEXT_SHADOW_IDS.map((id) => (
              <option key={id} value={id}>
                {VB_TEXT_SHADOWS[id].label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-right">
          <span className="text-xs text-white/50">{VB_SCENE_TEXT_BG}</span>
          <select
            value={String(scene.textBg || "none")}
            onChange={(e) => onPatch({ textBg: e.target.value })}
            className="mt-1 w-full rounded border border-white/20 bg-black/30 px-2 py-1.5 text-sm text-right"
          >
            {VB_TEXT_BG_IDS.map((id) => (
              <option key={id} value={id}>
                {VB_TEXT_BACKGROUNDS[id].label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-right">
          <span className="text-xs text-white/50">{VB_SCENE_FONT}</span>
          <select
            value={String(scene.fontFamily || "segoe")}
            onChange={(e) => onPatch({ fontFamily: e.target.value })}
            className="mt-1 w-full rounded border border-white/20 bg-black/30 px-2 py-1.5 text-sm text-right"
          >
            {VB_FONT_IDS.map((id) => (
              <option key={id} value={id}>
                {VB_FONTS[id].label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex items-center justify-end gap-2 text-sm">
        <input
          type="checkbox"
          checked={scene.titleBold !== false}
          onChange={(e) => onPatch({ titleBold: e.target.checked })}
          className="rounded"
        />
        <span className="text-white/80">{VB_SCENE_TITLE_BOLD}</span>
      </label>
    </>
  );

  const mediaFields = (
    <>
      <label className="block text-right">
        <span className="text-xs text-white/50">{VB_SCENE_MEDIA_FIT}</span>
        <select
          value={String(scene.mediaFit || "contain")}
          onChange={(e) => onPatch({ mediaFit: e.target.value })}
          className="mt-1 w-full rounded border border-white/20 bg-black/30 px-2 py-1.5 text-sm text-right"
        >
          {VB_MEDIA_FIT_IDS.map((id) => (
            <option key={id} value={id}>
              {VB_MEDIA_FITS[id].label}
            </option>
          ))}
        </select>
        {String(scene.mediaFit || "contain") === "cover" ? (
          <p className="mt-1 text-[10px] text-white/40">{VB_SCENE_MEDIA_FIT_HINT}</p>
        ) : null}
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-right">
          <span className="text-xs text-white/50">
            {String(scene.mediaFit || "contain") === "cover" ? "מיקום חיתוך" : VB_SCENE_MEDIA_POSITION}
          </span>
          <select
            value={String(scene.mediaPosition || "center")}
            onChange={(e) => onPatch({ mediaPosition: e.target.value })}
            className="mt-1 w-full rounded border border-white/20 bg-black/30 px-2 py-1.5 text-sm text-right"
          >
            {VB_MEDIA_POSITION_IDS.map((id) => (
              <option key={id} value={id}>
                {id === "center" ? "מרכז" : id === "top" ? "למעלה" : "למטה"}
              </option>
            ))}
          </select>
        </label>
        {String(scene.mediaFit || "contain") !== "cover" ? (
          <label className="block text-right">
            <span className="text-xs text-white/50">{VB_SCENE_MEDIA_SCALE}</span>
            <select
              value={String(scene.mediaScale || "md")}
              onChange={(e) => onPatch({ mediaScale: e.target.value })}
              className="mt-1 w-full rounded border border-white/20 bg-black/30 px-2 py-1.5 text-sm text-right"
            >
              {VB_MEDIA_SCALE_IDS.map((id) => (
                <option key={id} value={id}>
                  {id === "sm" ? "קטן" : id === "md" ? "בינוני" : "גדול"} (
                  {Math.round((VB_MEDIA_SCALE_FACTOR[id] || 0.65) * 100)}%)
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <label className="block text-right">
        <span className="text-xs text-white/50">{VB_SCENE_MEDIA_OVERLAY}</span>
        <select
          value={String(scene.mediaOverlay || "none")}
          onChange={(e) => onPatch({ mediaOverlay: e.target.value })}
          className="mt-1 w-full rounded border border-white/20 bg-black/30 px-2 py-1.5 text-sm text-right"
        >
          {VB_MEDIA_OVERLAY_IDS.map((id) => (
            <option key={id} value={id}>
              {VB_MEDIA_OVERLAYS[id].label}
            </option>
          ))}
        </select>
      </label>
    </>
  );

  if (compact) {
    return (
      <div className="space-y-2">
        <StyleSection title={VB_STYLE_SECTION_BG} defaultOpen>
          {bgFields}
        </StyleSection>
        <StyleSection title={VB_STYLE_SECTION_TEXT}>{textFields}</StyleSection>
        <StyleSection title={VB_STYLE_SECTION_MEDIA}>{mediaFields}</StyleSection>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-3">
      <p className="text-xs font-semibold text-amber-200/90">{VB_SCENE_STYLE}</p>
      {bgFields}
      {textFields}
      {mediaFields}
    </div>
  );
}
