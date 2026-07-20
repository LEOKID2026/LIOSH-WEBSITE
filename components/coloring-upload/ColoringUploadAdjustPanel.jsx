import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";

/**
 * @param {{
 *   preset: string,
 *   onPresetChange: (p: string) => void,
 *   adjust: Record<string, number>,
 *   onAdjustChange: (patch: Record<string, number>) => void,
 *   onReprocess?: () => void,
 *   reprocessBusy?: boolean,
 * }} props
 */
export default function ColoringUploadAdjustPanel({
  preset,
  onPresetChange,
  adjust,
  onAdjustChange,
  onReprocess,
  reprocessBusy,
}) {
  return (
    <div className="coloring-upload-adjust">
      <fieldset className="coloring-upload-presets">
        <legend>{WORKSHEET_UI_HE.coloringUploadPresetLegend}</legend>
        {[
          ["simple", WORKSHEET_UI_HE.coloringUploadPresetSimple],
          ["balanced", WORKSHEET_UI_HE.coloringUploadPresetBalanced],
          ["detailed", WORKSHEET_UI_HE.coloringUploadPresetDetailed],
        ].map(([id, label]) => (
          <label key={id} className="coloring-upload-preset-option">
            <input
              type="radio"
              name="coloring-preset"
              value={id}
              checked={preset === id}
              onChange={() => onPresetChange(id)}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <div className="coloring-upload-sliders">
        {[
          ["lineThickness", WORKSHEET_UI_HE.coloringUploadAdjustThickness, -2, 2],
          ["detailLevel", WORKSHEET_UI_HE.coloringUploadAdjustDetail, 0, 5],
          ["bgClean", WORKSHEET_UI_HE.coloringUploadAdjustBg, 0, 3],
          ["brightness", WORKSHEET_UI_HE.coloringUploadAdjustBrightness, -5, 5],
          ["contrast", WORKSHEET_UI_HE.coloringUploadAdjustContrast, -5, 5],
        ].map(([key, label, min, max]) => (
          <label key={key} className="coloring-upload-slider-row">
            <span>{label}</span>
            <input
              type="range"
              min={min}
              max={max}
              value={adjust[key] ?? 0}
              onChange={(e) => onAdjustChange({ [key]: Number(e.target.value) })}
            />
          </label>
        ))}
      </div>

      {onReprocess ? (
        <button type="button" className="worksheet-secondary-cta" disabled={reprocessBusy} onClick={onReprocess}>
          {WORKSHEET_UI_HE.coloringUploadReprocess}
        </button>
      ) : null}
    </div>
  );
}
