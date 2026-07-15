/**
 * Expandable mixed-topic checkboxes for printable worksheet create form.
 */

import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";

/**
 * @param {{
 *   options: { key: string, label: string }[],
 *   selectedKeys: string[],
 *   onChange: (nextKeys: string[]) => void,
 *   T: Record<string, string>,
 * }} props
 */
export default function MixedTopicsPicker({ options, selectedKeys, onChange, T }) {
  const selectedSet = new Set(selectedKeys);
  const allSelected = options.length > 0 && options.every((o) => selectedSet.has(o.key));

  const toggleOne = (key) => {
    if (selectedSet.has(key)) {
      onChange(selectedKeys.filter((k) => k !== key));
    } else {
      onChange([...selectedKeys, key]);
    }
  };

  const selectAll = () => {
    onChange(options.map((o) => o.key));
  };

  return (
    <details className="worksheet-mixed-topics" open>
      <summary className={`worksheet-mixed-topics-summary ${T.label}`}>
        {WORKSHEET_UI_HE.mixedTopicsTitle}
      </summary>
      <p className={`worksheet-mixed-topics-hint ${T.muted}`}>{WORKSHEET_UI_HE.mixedTopicsHint}</p>
      <div className="worksheet-mixed-topics-actions">
        <button
          type="button"
          className={`worksheet-mixed-topics-select-all ${T.secondaryBtn || ""}`}
          onClick={selectAll}
          disabled={allSelected}
        >
          {WORKSHEET_UI_HE.mixedTopicsSelectAll}
        </button>
      </div>
      <ul className="worksheet-mixed-topics-list">
        {options.map((opt) => (
          <li key={opt.key}>
            <label className="worksheet-mixed-topics-item">
              <input
                type="checkbox"
                checked={selectedSet.has(opt.key)}
                onChange={() => toggleOne(opt.key)}
              />
              <span>{opt.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </details>
  );
}
