import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";

const PHASE_LABELS = {
  worker_started: WORKSHEET_UI_HE.coloringUploadPhaseWorkerStarted,
  opencv_loading: WORKSHEET_UI_HE.coloringUploadPhaseOpenCvLoading,
  opencv_ready: WORKSHEET_UI_HE.coloringUploadPhaseOpenCvReady,
  segment: WORKSHEET_UI_HE.coloringUploadPhaseSegment,
  "hf-lineart": WORKSHEET_UI_HE.coloringUploadPhaseHfLineart,
  "style-transfer": WORKSHEET_UI_HE.coloringUploadPhaseStyleTransfer,
  "hf-fallback": WORKSHEET_UI_HE.coloringUploadPhaseHfFallback,
};

/**
 * @param {{ percent: number, phase?: string, busy?: boolean }} props
 */
export default function ColoringUploadProgress({ percent, phase, busy }) {
  const phaseLabel = phase ? PHASE_LABELS[phase] || phase : "";

  return (
    <div className="coloring-upload-progress" aria-live="polite" aria-busy={busy || undefined}>
      <p className="coloring-upload-progress-label">{WORKSHEET_UI_HE.coloringUploadProcessing}</p>
      {phaseLabel ? (
        <p className="coloring-upload-progress-phase" role="status">
          {phaseLabel}
        </p>
      ) : null}
      <div
        className="coloring-upload-progress-bar"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="coloring-upload-progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="coloring-upload-progress-percent">{percent}%</p>
    </div>
  );
}
