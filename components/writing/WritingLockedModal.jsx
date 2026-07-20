/**
 * Modal for locked writing catalog cards — public hub CTA.
 */

import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";

/**
 * @param {{
 *   item: Record<string, unknown> | null,
 *   onClose: () => void,
 *   T: Record<string, string>,
 * }} props
 */
export default function WritingLockedModal({ item, onClose, T }) {
  if (!item) return null;

  return (
    <div
      className="worksheet-locked-modal-backdrop"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className={`worksheet-locked-modal ${T.panel}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="writing-locked-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="writing-locked-modal-title" className={`worksheet-locked-modal-title ${T.heading}`}>
          {WORKSHEET_UI_HE.writingLockedTitle}
        </h3>
        <p className={`worksheet-locked-modal-text ${T.muted}`}>
          {WORKSHEET_UI_HE.writingLockedText}
        </p>
        {item.titleHe ? (
          <p className={`worksheet-locked-modal-item ${T.subheading}`}>{String(item.titleHe)}</p>
        ) : null}
        {item.catalogNumber ? (
          <p className={`text-sm ${T.muted}`}>{String(item.catalogNumber)}</p>
        ) : null}
        <div className="worksheet-locked-modal-actions">
          <button type="button" className={T.primaryBtn} onClick={onClose}>
            {WORKSHEET_UI_HE.writingLockedClose}
          </button>
        </div>
      </div>
    </div>
  );
}
