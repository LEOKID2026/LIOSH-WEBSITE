import { useRef } from "react";
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

  const handleFiles = (fileList) => {
    const file = fileList?.[0];
    if (file) onFile(file);
  };

  return (
    <div className="coloring-upload-picker">
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
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (!disabled) handleFiles(e.dataTransfer.files);
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
