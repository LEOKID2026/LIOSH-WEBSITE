import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";
import { COLORING_UPLOAD_STYLE_COLORING } from "../../lib/coloring-upload/style-transfer-styles.js";

/** @type {Array<{ id: import("../../lib/coloring-upload/style-transfer-styles.js").ColoringUploadStyleId, emoji: string, titleKey: keyof typeof WORKSHEET_UI_HE }>} */
const STYLE_OPTIONS = [
  { id: COLORING_UPLOAD_STYLE_COLORING, emoji: "🎨", titleKey: "coloringUploadStyleColoringTitle" },
  { id: "comic", emoji: "💥", titleKey: "coloringUploadStyleComicTitle" },
  { id: "pencil", emoji: "✏️", titleKey: "coloringUploadStylePencilTitle" },
  { id: "poster", emoji: "🖼️", titleKey: "coloringUploadStylePosterTitle" },
  { id: "pixar", emoji: "🧸", titleKey: "coloringUploadStylePixarTitle" },
  { id: "watercolor", emoji: "🌊", titleKey: "coloringUploadStyleWatercolorTitle" },
  { id: "anime", emoji: "🎌", titleKey: "coloringUploadStyleAnimeTitle" },
  { id: "storybook", emoji: "📖", titleKey: "coloringUploadStyleStorybookTitle" },
  { id: "pixel", emoji: "🕹️", titleKey: "coloringUploadStylePixelTitle" },
];

/**
 * @param {{
 *   value: import("../../lib/coloring-upload/style-transfer-styles.js").ColoringUploadStyleId,
 *   onChange: (style: import("../../lib/coloring-upload/style-transfer-styles.js").ColoringUploadStyleId) => void,
 *   disabled?: boolean,
 * }} props
 */
export default function ColoringUploadStyleSelector({ value, onChange, disabled }) {
  return (
    <fieldset className="coloring-upload-style-selector" disabled={disabled || undefined}>
      <legend className="coloring-upload-style-selector-legend sr-only">
        {WORKSHEET_UI_HE.coloringUploadStyleLegend}
      </legend>
      <div className="coloring-upload-style-pills" role="radiogroup" aria-label={WORKSHEET_UI_HE.coloringUploadStyleLegend}>
        {STYLE_OPTIONS.map((option) => {
          const selected = value === option.id;
          return (
            <label
              key={option.id}
              className={`coloring-upload-style-pill${selected ? " coloring-upload-style-pill--selected" : ""}`}
            >
              <input
                type="radio"
                name="coloring-upload-style"
                value={option.id}
                checked={selected}
                onChange={() => onChange(option.id)}
                className="coloring-upload-style-input"
              />
              <span className="coloring-upload-style-pill-label">
                <span className="coloring-upload-style-emoji" aria-hidden="true">
                  {option.emoji}
                </span>
                <span className="coloring-upload-style-title">{WORKSHEET_UI_HE[option.titleKey]}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
