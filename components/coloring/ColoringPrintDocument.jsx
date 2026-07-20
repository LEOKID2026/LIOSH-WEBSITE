/**
 * Coloring worksheet print document — single A4 page, no UI chrome.
 */
export default function ColoringPrintDocument({ worksheetPayload }) {
  const src = worksheetPayload?.a4Url || worksheetPayload?.previewUrl || "";
  const title = worksheetPayload?.displayNameHe || worksheetPayload?.title || "דף צביעה";

  if (!src) return null;

  return (
    <div className="coloring-print-document">
      <section className="coloring-print-page" aria-label={title}>
        <img src={src} alt={title} className="coloring-print-image" draggable={false} />
      </section>
    </div>
  );
}
