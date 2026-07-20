/**
 * Hidden A4 print document — portaled to body, flat single-page DOM.
 */
export default function ColoringUploadPrintDocument({ a4Url, orientation = "portrait" }) {
  if (!a4Url) return null;

  return (
    <div
      id="coloring-upload-print-root"
      className={`coloring-upload-print-document coloring-upload-print-document--${orientation}`}
      aria-hidden="true"
    >
      <img src={a4Url} alt="" className="coloring-upload-print-image" draggable={false} />
    </div>
  );
}
