import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";

/**
 * @param {{
 *   onFile: (file: File) => void,
 *   disabled?: boolean,
 *   error?: string,
 * }} props
 */
export default function ColoringUploadFilePicker({ onFile, disabled, error }) {
  const inputRef = useRef(null);
  const dragDepthRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (fileList) => {
      const file = fileList?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  const clearDragging = useCallback(() => {
    dragDepthRef.current = 0;
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      clearDragging();
      if (!disabled) handleFiles(e.dataTransfer?.files);
    },
    [clearDragging, disabled, handleFiles],
  );

  useEffect(() => {
    if (disabled) {
      clearDragging();
      return undefined;
    }

    const hasFiles = (e) => e.dataTransfer?.types?.includes("Files");

    const onDragEnter = (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepthRef.current += 1;
      if (dragDepthRef.current === 1) setIsDragging(true);
    };

    const onDragLeave = (e) => {
      e.preventDefault();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) setIsDragging(false);
    };

    const onDragOver = (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    };

    const onDrop = (e) => {
      if (dragDepthRef.current === 0) return;
      handleDrop(e);
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);

    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [disabled, clearDragging, handleDrop]);

  const overlay =
    isDragging && typeof document !== "undefined"
      ? createPortal(
          <div
            className="coloring-upload-drag-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={WORKSHEET_UI_HE.coloringUploadDropzoneOverlay}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }}
            onDrop={handleDrop}
          >
            <div className="coloring-upload-drag-target">
              <p className="coloring-upload-drag-target-label">
                {WORKSHEET_UI_HE.coloringUploadDropzoneOverlay}
              </p>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="coloring-upload-picker">
      {overlay}
      <div
        className="coloring-upload-dropzone"
        role="button"
        tabIndex={0}
        aria-label={WORKSHEET_UI_HE.coloringUploadDropzone}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <p>{WORKSHEET_UI_HE.coloringUploadDropzone}</p>
        <button
          type="button"
          className="worksheet-secondary-cta"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
        >
          {WORKSHEET_UI_HE.coloringUploadChooseFile}
        </button>
        <button
          type="button"
          className="worksheet-secondary-cta"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.setAttribute("capture", "environment");
            inputRef.current?.click();
            inputRef.current?.removeAttribute("capture");
          }}
        >
          {WORKSHEET_UI_HE.coloringUploadCamera}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error ? <p className="worksheet-error">{error}</p> : null}
    </div>
  );
}
