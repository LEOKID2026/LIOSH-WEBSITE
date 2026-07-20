/**
 * Coloring worksheet preview — screen layout.
 */
export default function ColoringScreenPreview({ worksheetPayload }) {
  const src = worksheetPayload?.previewUrl || worksheetPayload?.a4Url || "";
  const title = worksheetPayload?.displayNameHe || worksheetPayload?.title || "";

  return (
    <div className="coloring-preview-screen">
      <div className="coloring-preview-frame">
        <img
          src={src}
          alt={title ? `דף צביעה — ${title}` : "דף צביעה"}
          className="coloring-preview-image"
          draggable={false}
        />
      </div>
    </div>
  );
}
