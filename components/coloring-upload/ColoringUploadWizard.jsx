import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";

import { detectColoringUploadCapabilities } from "../../lib/coloring-upload/capabilities.client.js";

import {

  cleanupColoringUploadMemory,

  trackImageBitmap,

  trackObjectUrl,

} from "../../lib/coloring-upload/memory-manager.client.js";

import {

  isHeicFile,

  validateColoringUploadDimensions,

  validateColoringUploadFile,

} from "../../lib/coloring-upload/input-validation.js";

import { decodeHeicFile } from "../../lib/coloring-upload/heic-decode.client.js";

import { loadOrientedImageBitmap } from "../../lib/coloring-upload/exif-orientation.client.js";

import { extractCropImageData, fitInsideMaxEdge } from "../../lib/coloring-upload/crop-math.js";

import {

  COLORING_UPLOAD_CROP_MAX_EDGE,

  COLORING_UPLOAD_PROCESS_MAX_EDGE,

  COLORING_UPLOAD_WEAK_DEVICE_MAX_EDGE,

} from "../../lib/coloring-upload/constants.js";

import {

  runUploadCreationPipeline,

  terminatePipelineWorker,

  getPipelineErrorMessageHe,

} from "../../lib/coloring-upload/pipeline-client.client.js";
import { COLORING_UPLOAD_STYLE_COLORING } from "../../lib/coloring-upload/style-transfer-styles.js";

import {
  buildUploadFinalA4,
  composeUploadPreviewFromBlob,
} from "../../lib/coloring-upload/a4-compose.client.js";

import { downloadUploadFinalA4, printUploadColoringPage } from "../../lib/coloring-upload/export.client.js";

import { getColoringUploadAuthHeader } from "../../lib/coloring-upload/coloring-upload-auth.client.js";

import ColoringUploadPrivacyGate from "./ColoringUploadPrivacyGate.jsx";

import ColoringUploadFilePicker from "./ColoringUploadFilePicker.jsx";

import ColoringUploadCropEditor from "./ColoringUploadCropEditor.jsx";

import ColoringUploadProgress from "./ColoringUploadProgress.jsx";

import ColoringUploadPreview from "./ColoringUploadPreview.jsx";

import ColoringUploadStyleSelector from "./ColoringUploadStyleSelector.jsx";

import ColoringUploadPrintDocument from "./ColoringUploadPrintDocument.jsx";



const PRIVACY_KEY = "leo_coloring_upload_privacy_v2";



export default function ColoringUploadWizard() {

  const caps = detectColoringUploadCapabilities();

  const [privacyOk, setPrivacyOk] = useState(false);

  const [step, setStep] = useState("upload");

  const [error, setError] = useState("");

  const [busy, setBusy] = useState(false);

  const [progress, setProgress] = useState(0);

  const [progressPhase, setProgressPhase] = useState("");



  const [sourceUrl, setSourceUrl] = useState("");

  const [previewUrl, setPreviewUrl] = useState("");

  const [printA4Url, setPrintA4Url] = useState("");

  const [printOrientation, setPrintOrientation] = useState(/** @type {"portrait" | "landscape"} */ ("portrait"));



  const [aspectMode, setAspectMode] = useState("auto");

  const [rotation, setRotation] = useState(0);

  const [zoom, setZoom] = useState(1);



  const [quotaRemaining, setQuotaRemaining] = useState(/** @type {number | null} */ (null));

  const [quotaLimit, setQuotaLimit] = useState(10);

  const [fallbackNotice, setFallbackNotice] = useState(false);

  const [artStyle, setArtStyle] = useState(
    /** @type {import("../../lib/coloring-upload/style-transfer-styles.js").ColoringUploadStyleId} */ (
      COLORING_UPLOAD_STYLE_COLORING
    )
  );



  const lineArtRef = useRef(/** @type {ImageData | null} */ (null));

  const finalA4BlobRef = useRef(/** @type {Blob | null} */ (null));

  const cropSourceRef = useRef(/** @type {ImageBitmap | null} */ (null));



  useEffect(() => {

    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(PRIVACY_KEY) === "1") {

      setPrivacyOk(true);

    }

    return () => cleanupColoringUploadMemory();

  }, []);



  const acceptPrivacy = () => {

    sessionStorage.setItem(PRIVACY_KEY, "1");

    setPrivacyOk(true);

  };



  const resetAll = useCallback(() => {

    cleanupColoringUploadMemory();

    terminatePipelineWorker();

    lineArtRef.current = null;

    finalA4BlobRef.current = null;

    cropSourceRef.current = null;

    setSourceUrl("");

    setPreviewUrl("");

    setPrintA4Url((prev) => {

      if (prev) URL.revokeObjectURL(prev);

      return "";

    });

    setError("");

    setQuotaRemaining(null);

    setFallbackNotice(false);

    setArtStyle(COLORING_UPLOAD_STYLE_COLORING);

    setPrintOrientation("portrait");

    setStep("upload");

  }, []);



  const renderPreviewFromFinalBlob = useCallback(async (finalBlob) => {

    const canvas = await composeUploadPreviewFromBlob(finalBlob);

    const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));

    if (!blob) return;

    const url = URL.createObjectURL(blob);

    trackObjectUrl(url);

    setPreviewUrl((prev) => {

      if (prev) URL.revokeObjectURL(prev);

      return url;

    });

    canvas.width = 0;

    canvas.height = 0;

  }, []);



  const buildFinalOutput = useCallback(async (lineArt, stylized = false) => {

    const { blob, orientation } = await buildUploadFinalA4(lineArt, {
      centerMode: stylized ? "geometric" : "line-art",
      layout: stylized ? "native-aspect" : "margined",
    });

    finalA4BlobRef.current = blob;

    setPrintOrientation(orientation);

    const printUrl = URL.createObjectURL(blob);

    trackObjectUrl(printUrl);

    setPrintA4Url((prev) => {

      if (prev) URL.revokeObjectURL(prev);

      return printUrl;

    });

    await renderPreviewFromFinalBlob(blob);

  }, [renderPreviewFromFinalBlob]);



  const processLineArt = useCallback(

    async (imageData, style) => {

      setBusy(true);

      setError("");

      setProgress(0);

      setFallbackNotice(false);

      setStep("processing");

      try {

        const authHeader = await getColoringUploadAuthHeader();

        const result = await runUploadCreationPipeline(imageData, style, {

          weakDevice: caps.weakDevice,

          authHeader,

          onProgress: (pct, phase) => {

            setProgress(pct);

            setProgressPhase(phase);

          },

        });



        lineArtRef.current = result.lineArt;

        setFallbackNotice(Boolean(result.hfFallback && result.source === "opencv"));

        if (result.quota && typeof result.quota.remaining === "number") {

          setQuotaRemaining(result.quota.remaining);

          if (typeof result.quota.limit === "number") setQuotaLimit(result.quota.limit);

        }

        await buildFinalOutput(result.lineArt, Boolean(result.isStylized));

        setStep("preview");

      } catch (err) {

        if (err instanceof DOMException && err.name === "AbortError") {

          setStep("crop");

          return;

        }

        setError(getPipelineErrorMessageHe(err));

        setStep("crop");

      } finally {

        setBusy(false);

      }

    },

    [caps.weakDevice, buildFinalOutput]

  );



  const createConfirmLabel =
    artStyle === COLORING_UPLOAD_STYLE_COLORING
      ? WORKSHEET_UI_HE.coloringUploadCreateColoring
      : WORKSHEET_UI_HE.coloringUploadCreateArt;



  const handleFile = async (file) => {

    cleanupColoringUploadMemory();

    setError("");

    const valid = validateColoringUploadFile(file);

    if (!valid.ok) {

      setError(valid.messageHe);

      return;

    }

    setBusy(true);

    try {

      let blob = file;

      if (isHeicFile(file)) {

        blob = await decodeHeicFile(file);

      }

      const buffer = await blob.arrayBuffer();

      const bitmap = await loadOrientedImageBitmap(blob, buffer);

      trackImageBitmap(bitmap);

      const dimCheck = validateColoringUploadDimensions(bitmap.width, bitmap.height);

      if (!dimCheck.ok) {

        bitmap.close();

        setError(dimCheck.messageHe);

        return;

      }

      cropSourceRef.current = bitmap;

      const url = URL.createObjectURL(blob);

      trackObjectUrl(url);

      setSourceUrl(url);

      setStep("crop");

    } catch (e) {

      if (e instanceof Error && e.message === "HEIC_DECODE_FAILED") {

        setError(WORKSHEET_UI_HE.coloringUploadHeicFailed);

      } else {

        setError(WORKSHEET_UI_HE.coloringUploadLoadFailed);

      }

    } finally {

      setBusy(false);

    }

  };



  const handleCropConfirm = async (crop) => {

    const bitmap = cropSourceRef.current;

    if (!bitmap) return;

    setBusy(true);

    try {

      const maxEdge = caps.weakDevice ? COLORING_UPLOAD_WEAK_DEVICE_MAX_EDGE : COLORING_UPLOAD_PROCESS_MAX_EDGE;

      const imageData = extractCropImageData(bitmap, crop.transform, maxEdge);

      await processLineArt(imageData, artStyle);

    } catch {

      setError(WORKSHEET_UI_HE.coloringUploadProcessFailed);

      setStep("crop");

    } finally {

      setBusy(false);

    }

  };



  const handlePrint = async () => {
    if (!printA4Url) return;
    setBusy(true);
    try {
      await printUploadColoringPage(printA4Url, printOrientation);
    } finally {
      setBusy(false);
    }
  };



  const handleDownload = async () => {

    if (!finalA4BlobRef.current) return;

    setBusy(true);

    try {

      downloadUploadFinalA4(finalA4BlobRef.current);

    } finally {

      setBusy(false);

    }

  };



  if (!caps.supported) {

    return (

      <div className="coloring-upload-unsupported">

        <p>{caps.unsupportedReasonHe || WORKSHEET_UI_HE.coloringUploadUnsupported}</p>

      </div>

    );

  }



  if (!privacyOk) {

    return <ColoringUploadPrivacyGate onAccept={acceptPrivacy} />;

  }



  return (

    <div className="coloring-upload-wizard">

      <div className="coloring-upload-header">

        <h2 className="coloring-upload-title">{WORKSHEET_UI_HE.coloringUploadTitle}</h2>

        <span className="coloring-upload-badge">{WORKSHEET_UI_HE.coloringUploadBadge}</span>

      </div>

      <p className="coloring-upload-hint">{WORKSHEET_UI_HE.coloringUploadHint}</p>

      <p className="coloring-upload-tech-note">{WORKSHEET_UI_HE.coloringUploadTechNote}</p>



      {caps.weakDevice ? (

        <p className="coloring-upload-warning" role="status">

          {WORKSHEET_UI_HE.coloringUploadWeakDevice}

        </p>

      ) : null}



      {step === "upload" ? (

        <>

          <ColoringUploadStyleSelector value={artStyle} onChange={setArtStyle} disabled={busy} />

          <ColoringUploadFilePicker onFile={handleFile} disabled={busy} error={error} />

        </>

      ) : null}



      {step === "crop" && sourceUrl ? (

        <>

          <ColoringUploadStyleSelector value={artStyle} onChange={setArtStyle} disabled={busy} />

          <ColoringUploadCropEditor

            sourceUrl={sourceUrl}

            aspectMode={aspectMode}

            onAspectModeChange={setAspectMode}

            rotation={rotation}

            onRotationChange={setRotation}

            zoom={zoom}

            onZoomChange={setZoom}

            onConfirm={handleCropConfirm}
            onRestart={resetAll}
            confirmLabel={createConfirmLabel}
          />

          {error ? <p className="worksheet-error">{error}</p> : null}

        </>

      ) : null}



      {step === "processing" ? (

        <>

          <ColoringUploadProgress percent={progress} phase={progressPhase} busy />

          <p className="coloring-upload-stay">{WORKSHEET_UI_HE.coloringUploadStayOnPage}</p>

          <button

            type="button"

            className="worksheet-secondary-cta"

            onClick={() => {

              terminatePipelineWorker();

              cleanupColoringUploadMemory();

              setProgress(0);

              setProgressPhase("");

              setError("");

              setStep("crop");

              setBusy(false);

            }}

          >

            {WORKSHEET_UI_HE.coloringUploadCancel}

          </button>

        </>

      ) : null}



      {step === "preview" && previewUrl ? (

        <ColoringUploadPreview

          previewUrl={previewUrl}

          quotaRemaining={quotaRemaining}

          quotaLimit={quotaLimit}

          fallbackNotice={fallbackNotice}

          busy={busy}

          onPrint={handlePrint}

          onDownload={handleDownload}

          onRestart={resetAll}

        />

      ) : null}



      {typeof document !== "undefined" && printA4Url
        ? createPortal(
            <ColoringUploadPrintDocument a4Url={printA4Url} orientation={printOrientation} />,
            document.body
          )
        : null}
    </div>
  );
}

