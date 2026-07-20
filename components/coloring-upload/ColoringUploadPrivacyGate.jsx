import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";

/**
 * @param {{ onAccept: () => void }} props
 */
export default function ColoringUploadPrivacyGate({ onAccept }) {
  return (
    <div className="coloring-upload-privacy" role="dialog" aria-labelledby="coloring-upload-privacy-title">
      <h3 id="coloring-upload-privacy-title" className="coloring-upload-privacy-title">
        {WORKSHEET_UI_HE.coloringUploadPrivacyTitle}
      </h3>
      <p className="coloring-upload-privacy-body">{WORKSHEET_UI_HE.coloringUploadPrivacyBody}</p>
      <p className="coloring-upload-tech-note">{WORKSHEET_UI_HE.coloringUploadTechNote}</p>
      <button type="button" className="worksheet-primary-cta" onClick={onAccept}>
        {WORKSHEET_UI_HE.coloringUploadPrivacyAccept}
      </button>
    </div>
  );
}
