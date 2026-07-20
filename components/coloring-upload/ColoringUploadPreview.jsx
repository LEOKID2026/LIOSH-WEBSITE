import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";



/**

 * @param {{

 *   previewUrl: string,

 *   quotaRemaining: number | null,

 *   quotaLimit: number,

 *   fallbackNotice?: boolean,

 *   onPrint: () => void,

 *   onDownload: () => void,

 *   onRestart: () => void,

 *   busy?: boolean,

 * }} props

 */

export default function ColoringUploadPreview({

  previewUrl,

  quotaRemaining,

  quotaLimit,

  fallbackNotice,

  onPrint,

  onDownload,

  onRestart,

  busy,

}) {

  return (

    <div className="coloring-upload-preview">

      <div className="coloring-upload-preview-frame">

        <img src={previewUrl} alt={WORKSHEET_UI_HE.coloringUploadPreviewAlt} draggable={false} />

      </div>



      {fallbackNotice ? (

        <p className="coloring-upload-warning" role="status">

          {WORKSHEET_UI_HE.coloringUploadFallbackNotice}

        </p>

      ) : null}



      {quotaRemaining != null ? (

        <p className="coloring-upload-quota" role="status">

          {WORKSHEET_UI_HE.coloringUploadQuotaRemaining(quotaRemaining, quotaLimit)}

        </p>

      ) : null}



      <div className="coloring-upload-preview-actions">
        <button
          type="button"
          className="coloring-upload-btn coloring-upload-btn--print"
          disabled={busy}
          onClick={onPrint}
        >
          {WORKSHEET_UI_HE.coloringUploadPrint}
        </button>

        <button
          type="button"
          className="coloring-upload-btn coloring-upload-btn--download"
          disabled={busy}
          onClick={onDownload}
        >
          {WORKSHEET_UI_HE.coloringUploadDownload}
        </button>

        <button
          type="button"
          className="coloring-upload-btn coloring-upload-btn--restart"
          disabled={busy}
          onClick={onRestart}
        >
          {WORKSHEET_UI_HE.coloringUploadRestart}
        </button>
      </div>

    </div>

  );

}

