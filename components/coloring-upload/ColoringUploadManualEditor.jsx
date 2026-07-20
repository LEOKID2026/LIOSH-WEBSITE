import { useCallback, useRef, useState } from "react";
import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";

/**
 * Action-based undo on processing-res bitmap (not A4 snapshots).
 * @param {{
 *   canvasRef: React.RefObject<HTMLCanvasElement>,
 *   brush: "white" | "black",
 *   onBrushChange: (b: "white" | "black") => void,
 *   brushSize: number,
 *   onBrushSizeChange: (n: number) => void,
 *   onStrokeComplete: () => void,
 *   canUndo: boolean,
 *   canRedo: boolean,
 *   onUndo: () => void,
 *   onRedo: () => void,
 * }} props
 */
export default function ColoringUploadManualEditor({
  canvasRef,
  brush,
  onBrushChange,
  brushSize,
  onBrushSizeChange,
  onStrokeComplete,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) {
  const drawing = useRef(false);

  const paint = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
      ctx.fillStyle = brush === "white" ? "#ffffff" : "#000000";
      ctx.beginPath();
      ctx.arc(x, y, brushSize, 0, Math.PI * 2);
      ctx.fill();
    },
    [brush, brushSize, canvasRef]
  );

  return (
    <div className="coloring-upload-manual">
      <p className="coloring-upload-section-title">{WORKSHEET_UI_HE.coloringUploadManualTitle}</p>
      <div className="coloring-upload-manual-toolbar">
        <button
          type="button"
          className={`worksheet-secondary-cta ${brush === "white" ? "is-active" : ""}`}
          onClick={() => onBrushChange("white")}
        >
          {WORKSHEET_UI_HE.coloringUploadBrushWhite}
        </button>
        <button
          type="button"
          className={`worksheet-secondary-cta ${brush === "black" ? "is-active" : ""}`}
          onClick={() => onBrushChange("black")}
        >
          {WORKSHEET_UI_HE.coloringUploadBrushBlack}
        </button>
        <label>
          {WORKSHEET_UI_HE.coloringUploadBrushSize}
          <select value={brushSize} onChange={(e) => onBrushSizeChange(Number(e.target.value))}>
            <option value={4}>קטן</option>
            <option value={8}>בינוני</option>
            <option value={16}>גדול</option>
          </select>
        </label>
        <button type="button" className="worksheet-secondary-cta" disabled={!canUndo} onClick={onUndo}>
          {WORKSHEET_UI_HE.coloringUploadUndo}
        </button>
        <button type="button" className="worksheet-secondary-cta" disabled={!canRedo} onClick={onRedo}>
          {WORKSHEET_UI_HE.coloringUploadRedo}
        </button>
      </div>
      <div
        className="coloring-upload-manual-canvas-wrap"
        onPointerDown={(e) => {
          drawing.current = true;
          paint(e);
        }}
        onPointerMove={(e) => {
          if (drawing.current) paint(e);
        }}
        onPointerUp={() => {
          if (drawing.current) onStrokeComplete();
          drawing.current = false;
        }}
        onPointerLeave={() => {
          if (drawing.current) onStrokeComplete();
          drawing.current = false;
        }}
      >
        <canvas ref={canvasRef} className="coloring-upload-manual-canvas" />
      </div>
    </div>
  );
}
