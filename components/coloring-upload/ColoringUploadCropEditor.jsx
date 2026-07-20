import { useCallback, useEffect, useRef, useState } from "react";

import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";

import {

  computeCropTransform,

  renderCropPreview,

  renderCropStage,

} from "../../lib/coloring-upload/crop-math.js";



const A4_RATIO = 210 / 297;



/**

 * @param {{

 *   sourceUrl: string,

 *   aspectMode: "auto" | "a4",

 *   onAspectModeChange: (m: "auto" | "a4") => void,

 *   rotation: number,

 *   onRotationChange: (r: number) => void,

 *   zoom: number,

 *   onZoomChange: (z: number) => void,

 *   onConfirm: (payload: { transform: import("../../lib/coloring-upload/crop-math.js").CropTransform }) => void,
 *   onRestart?: () => void,
 *   confirmLabel?: string,
 * }} props
 */
export default function ColoringUploadCropEditor({
  sourceUrl,
  aspectMode,
  onAspectModeChange,
  rotation,
  onRotationChange,
  zoom,
  onZoomChange,
  onConfirm,
  onRestart,
  confirmLabel,
}) {

  const containerRef = useRef(null);

  const stageCanvasRef = useRef(null);

  const previewCanvasRef = useRef(null);

  const imgRef = useRef(null);

  const [pan, setPan] = useState({ x: 0, y: 0 });

  const [drag, setDrag] = useState(null);

  const [natural, setNatural] = useState({ w: 0, h: 0 });

  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });

  const [imgReady, setImgReady] = useState(false);



  useEffect(() => {

    setPan({ x: 0, y: 0 });

    setImgReady(false);

  }, [sourceUrl, aspectMode]);



  useEffect(() => {

    const box = containerRef.current;

    if (!box) return undefined;

    const ro = new ResizeObserver(() => {

      const rect = box.getBoundingClientRect();

      setStageSize({ w: Math.round(rect.width), h: Math.round(rect.height) });

    });

    ro.observe(box);

    const rect = box.getBoundingClientRect();

    setStageSize({ w: Math.round(rect.width), h: Math.round(rect.height) });

    return () => ro.disconnect();

  }, []);



  const aspect = aspectMode === "a4" ? A4_RATIO : natural.w / Math.max(natural.h, 1);



  const buildTransform = useCallback(() => {

    if (!stageSize.w || !stageSize.h || !natural.w || !natural.h) return null;

    return computeCropTransform({

      stageWidth: stageSize.w,

      stageHeight: stageSize.h,

      sourceWidth: natural.w,

      sourceHeight: natural.h,

      userZoom: zoom,

      panX: pan.x,

      panY: pan.y,

      rotationDeg: rotation,

      fitMode: "contain",

    });

  }, [natural.h, natural.w, pan.x, pan.y, rotation, stageSize.h, stageSize.w, zoom]);



  const redraw = useCallback(() => {

    const canvas = stageCanvasRef.current;

    const img = imgRef.current;

    const transform = buildTransform();

    if (!canvas || !img || !img.complete || !transform) return;



    canvas.width = transform.stageWidth;

    canvas.height = transform.stageHeight;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    renderCropStage(ctx, img, transform);



    const preview = previewCanvasRef.current;

    if (preview) renderCropPreview(preview, img, transform);

  }, [buildTransform]);



  useEffect(() => {

    redraw();

  }, [redraw, imgReady, stageSize]);



  const handleLoad = () => {

    const img = imgRef.current;

    if (!img) return;

    setNatural({ w: img.naturalWidth, h: img.naturalHeight });

    setImgReady(true);

  };



  const confirm = useCallback(() => {

    const transform = buildTransform();

    if (!transform) return;

    onConfirm({ transform });

  }, [buildTransform, onConfirm]);



  return (

    <div className="coloring-upload-crop">

      <h3 className="coloring-upload-section-title">{WORKSHEET_UI_HE.coloringUploadCropTitle}</h3>

      <div className="coloring-upload-crop-toolbar">
        <button
          type="button"
          className="coloring-upload-btn coloring-upload-btn--rotate"
          onClick={() => onRotationChange((rotation + 90) % 360)}
        >
          {WORKSHEET_UI_HE.coloringUploadRotate}
        </button>

        <button
          type="button"
          className={`coloring-upload-btn coloring-upload-btn--toggle ${aspectMode === "auto" ? "is-active" : ""}`}
          onClick={() => onAspectModeChange("auto")}
        >
          {WORKSHEET_UI_HE.coloringUploadAspectAuto}
        </button>

        <button
          type="button"
          className={`coloring-upload-btn coloring-upload-btn--toggle ${aspectMode === "a4" ? "is-active" : ""}`}
          onClick={() => onAspectModeChange("a4")}
        >
          {WORKSHEET_UI_HE.coloringUploadAspectA4}
        </button>

        <label className="coloring-upload-zoom-control">
          <span className="coloring-upload-zoom-label-text">{WORKSHEET_UI_HE.coloringUploadZoom}</span>
          <input
            type="range"
            className="coloring-upload-zoom-range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
          />
        </label>
      </div>

      <div

        ref={containerRef}

        className="coloring-upload-crop-stage"

        style={{ aspectRatio: String(aspect) }}

        onPointerDown={(e) => {

          e.currentTarget.setPointerCapture(e.pointerId);

          setDrag({ x: e.clientX - pan.x, y: e.clientY - pan.y });

        }}

        onPointerMove={(e) => {

          if (!drag) return;

          setPan({ x: e.clientX - drag.x, y: e.clientY - drag.y });

        }}

        onPointerUp={(e) => {

          try {

            e.currentTarget.releasePointerCapture(e.pointerId);

          } catch {

            /* ignore */

          }

          setDrag(null);

        }}

        onPointerCancel={() => setDrag(null)}

      >

        <img ref={imgRef} src={sourceUrl} alt="" className="coloring-upload-crop-source-hidden" onLoad={handleLoad} />

        <canvas ref={stageCanvasRef} className="coloring-upload-crop-canvas" />

        <div className="coloring-upload-crop-frame" aria-hidden="true" />

      </div>

      <div className="coloring-upload-crop-preview-block">

        <p className="coloring-upload-crop-preview-label">{WORKSHEET_UI_HE.coloringUploadCropPreviewLabel}</p>

        <canvas ref={previewCanvasRef} className="coloring-upload-crop-preview-canvas" aria-label={WORKSHEET_UI_HE.coloringUploadCropPreviewLabel} />

      </div>

      <div className="coloring-upload-crop-actions">
        <button
          type="button"
          className="coloring-upload-btn coloring-upload-btn--create"
          onClick={confirm}
          disabled={!imgReady}
        >
          {confirmLabel || WORKSHEET_UI_HE.coloringUploadCropConfirm}
        </button>
        {onRestart ? (
          <button
            type="button"
            className="coloring-upload-btn coloring-upload-btn--restart"
            onClick={onRestart}
          >
            {WORKSHEET_UI_HE.coloringUploadRestart}
          </button>
        ) : null}
      </div>

    </div>

  );

}


