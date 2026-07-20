/**
 * Writing worksheet generator tab — 7 user-facing categories.
 */

import {
  ENGLISH_UPPER,
  HEBREW_LETTERS,
  HEBREW_WORD_PACKS,
  ENGLISH_WORD_PACKS,
  PREWRITING_PATHS,
  WRITING_CATEGORY_LABELS_HE,
} from "../../lib/writing/writing-constants.js";
import {
  WRITING_REQUEST_DEFAULTS,
  WRITING_UI_CATEGORIES,
} from "../../lib/writing/writing-worksheet-types.js";
import {
  applyReferenceSheetPreset,
  REFERENCE_SHEET_PRESET_KEYS,
  REFERENCE_SHEET_PRESETS,
} from "../../lib/writing/writing-reference-sheet-presets.js";
import {
  PUBLIC_WRITING_DEMO_PRESETS,
  getPublicWritingDemoPreset,
} from "../../data/writing/public-demo-allowlist.js";
import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";

const TRACING_OPTIONS = [
  { key: "trace", label: "עקיבה (מסלול מקווקו)" },
  { key: "copy", label: "העתקה" },
  { key: "trace_and_copy", label: "עקיבה והעתקה" },
  { key: "independent", label: "כתיבה עצמאית" },
];

const TRACE_RENDER_OPTIONS = [
  { key: "full_trace", label: "מסלול מקווקו (עקיבה)" },
  { key: "faint_model", label: "דוגמה בהירה (העתקה)" },
  { key: "outline", label: "קו מתאר" },
  { key: "stroke_path", label: "קו מרכזי (סדר משיכות)" },
];

const SCRIPT_OPTIONS = [
  { key: "print", label: "דפוס" },
  { key: "script", label: "כתב" },
  { key: "print_and_script", label: "דפוס וכתב" },
];

const NUMBER_MODE_OPTIONS = [
  { key: "digit", label: "ספרות" },
  { key: "number", label: "מספרים" },
  { key: "quantity_match", label: "התאמת כמות" },
  { key: "sequence", label: "רצף" },
  { key: "before_after", label: "לפני/אחרי" },
];

const PERSONAL_KIND_OPTIONS = [
  { key: "first_name", label: "שם פרטי" },
  { key: "full_name", label: "שם מלא" },
  { key: "word", label: "מילה" },
  { key: "short_phrase", label: "משפט קצר" },
];

const LINE_COUNT_OPTIONS = [3, 4, 5, 6, 8, 10, 12];

/**
 * @returns {Record<string, unknown>}
 */
export function defaultWritingCreateForm() {
  return {
    worksheetType: "writing",
    writingCategory: "hebrew_letters",
    characters: ["א"],
    scriptStyle: WRITING_REQUEST_DEFAULTS.scriptStyle,
    tracingMode: WRITING_REQUEST_DEFAULTS.tracingMode,
    traceRenderMode: WRITING_REQUEST_DEFAULTS.traceRenderMode,
    lineCount: WRITING_REQUEST_DEFAULTS.lineCount,
    itemsPerLine: WRITING_REQUEST_DEFAULTS.itemsPerLine,
    letterCase: "upper",
    numberRange: { min: 1, max: 5 },
    numberMode: "digit",
    prewritingPathId: "horizontal",
    wordPackId: "animals",
    customWords: "",
    customText: "",
    customTextKind: "first_name",
    includeNameField: WRITING_REQUEST_DEFAULTS.includeNameField,
    includeDateField: WRITING_REQUEST_DEFAULTS.includeDateField,
    pageOrientation: WRITING_REQUEST_DEFAULTS.pageOrientation,
    inkSave: WRITING_REQUEST_DEFAULTS.inkSave,
    demoPresetId: PUBLIC_WRITING_DEMO_PRESETS[0]?.id || "",
    referenceSheetPreset: "",
  };
}

/**
 * @param {Record<string, unknown>} form
 * @returns {Record<string, unknown>}
 */
export function buildWritingGenerateBody(form) {
  const referenceSheetPreset = String(form.referenceSheetPreset || "");
  if (referenceSheetPreset && REFERENCE_SHEET_PRESET_KEYS.includes(referenceSheetPreset)) {
    const applied = applyReferenceSheetPreset(referenceSheetPreset);
    if (applied) {
      return {
        worksheetType: "writing",
        ...applied,
        inkSave: form.inkSave === true,
        pageOrientation: form.pageOrientation || WRITING_REQUEST_DEFAULTS.pageOrientation,
      };
    }
  }

  const category = String(form.writingCategory || "hebrew_letters");
  /** @type {Record<string, unknown>} */
  const body = {
    worksheetType: "writing",
    writingCategory: category,
    scriptStyle: form.scriptStyle || WRITING_REQUEST_DEFAULTS.scriptStyle,
    tracingMode: form.tracingMode || WRITING_REQUEST_DEFAULTS.tracingMode,
    traceRenderMode: form.traceRenderMode || WRITING_REQUEST_DEFAULTS.traceRenderMode,
    nikudMode: WRITING_REQUEST_DEFAULTS.nikudMode,
    lineTemplate: WRITING_REQUEST_DEFAULTS.lineTemplate,
    lineCount: Number(form.lineCount) || WRITING_REQUEST_DEFAULTS.lineCount,
    itemsPerLine: Number(form.itemsPerLine) || WRITING_REQUEST_DEFAULTS.itemsPerLine,
    repeatsPerLine: WRITING_REQUEST_DEFAULTS.repeatsPerLine,
    fontSize: WRITING_REQUEST_DEFAULTS.fontSize,
    strokeStyle: WRITING_REQUEST_DEFAULTS.strokeStyle,
    includeExample: WRITING_REQUEST_DEFAULTS.includeExample,
    includeCopyRows: WRITING_REQUEST_DEFAULTS.includeCopyRows,
    includeIndependentRows: WRITING_REQUEST_DEFAULTS.includeIndependentRows,
    includeImage: WRITING_REQUEST_DEFAULTS.includeImage,
    includeNameField: form.includeNameField !== false,
    includeDateField: form.includeDateField !== false,
    pageOrientation: form.pageOrientation || WRITING_REQUEST_DEFAULTS.pageOrientation,
    pageDensity: WRITING_REQUEST_DEFAULTS.pageDensity,
    showStartPoint: WRITING_REQUEST_DEFAULTS.showStartPoint,
    showDirectionArrows: WRITING_REQUEST_DEFAULTS.showDirectionArrows,
    showStrokeNumbers: WRITING_REQUEST_DEFAULTS.showStrokeNumbers,
    inkSave: form.inkSave === true,
  };

  if (category === "hebrew_letters") {
    body.characters = Array.isArray(form.characters)
      ? form.characters
      : String(form.characters || "א")
          .split("")
          .filter(Boolean);
  } else if (category === "english_letters") {
    body.characters = Array.isArray(form.characters)
      ? form.characters
      : [String(form.characters || "A")];
    body.letterCase = form.letterCase || "upper";
  } else if (category === "numbers") {
    body.numberRange = form.numberRange || { min: 1, max: 5 };
    body.numberMode = form.numberMode || "digit";
  } else if (category === "prewriting") {
    body.prewritingPathId = form.prewritingPathId || "horizontal";
  } else if (category === "hebrew_words") {
    const custom = String(form.customWords || "").trim();
    if (custom) {
      body.wordPackId = "custom";
      body.words = custom.split(/[\s,]+/).filter(Boolean).slice(0, 10);
    } else {
      body.wordPackId = form.wordPackId || "animals";
    }
  } else if (category === "english_words") {
    const custom = String(form.customWords || "").trim();
    if (custom) {
      body.wordPackId = "custom";
      body.words = custom.split(/[\s,]+/).filter(Boolean).slice(0, 10);
    } else {
      body.wordPackId = form.wordPackId || "animals";
    }
  } else if (category === "personal_text") {
    body.customText = String(form.customText || "").trim();
    body.customTextKind = form.customTextKind || "first_name";
  }

  return body;
}

/**
 * @param {{
 *   form: Record<string, unknown>,
 *   onChange: (patch: Record<string, unknown>) => void,
 *   onSubmit: () => void,
 *   busy: boolean,
 *   error: string,
 *   T: Record<string, string>,
 *   variant?: "parent" | "public-demo",
 *   hidePanelHeader?: boolean,
 * }} props
 */
export default function CreateWritingWorksheetTab({
  form,
  onChange,
  onSubmit,
  busy,
  error,
  T,
  variant = "parent",
  hidePanelHeader = false,
}) {
  const isPublicDemo = variant === "public-demo";
  const category = String(form.writingCategory || "hebrew_letters");
  const referenceSheetPreset = String(form.referenceSheetPreset || "");
  const isReferenceSheet = Boolean(referenceSheetPreset);
  const hebrewChars = Array.isArray(form.characters)
    ? form.characters.map(String)
    : String(form.characters || "א").split("").filter(Boolean);

  const applyDemoPreset = (presetId) => {
    const preset = getPublicWritingDemoPreset(presetId);
    if (!preset) return;
    onChange({
      demoPresetId: presetId,
      writingCategory: preset.writingCategory,
      ...(preset.request || {}),
    });
  };

  return (
    <div className={`worksheet-hub-panel worksheet-create-panel worksheet-writing-panel ${T.panel}`}>
      {hidePanelHeader ? null : (
        <>
          <h2 className={`worksheet-hub-panel-title ${T.heading}`}>
            {isPublicDemo ? WORKSHEET_UI_HE.writingPublicDemoTitle : WORKSHEET_UI_HE.writingCreateTitle}
          </h2>
          <p className={`worksheet-hub-panel-hint ${T.muted}`}>
            {isPublicDemo ? WORKSHEET_UI_HE.writingPublicDemoHint : WORKSHEET_UI_HE.writingCreateHint}
          </p>
        </>
      )}

      {isPublicDemo ? (
        <div className="worksheet-form-field">
          <span className={`worksheet-filter-label ${T.muted}`}>
            {WORKSHEET_UI_HE.writingDemoPresetField}
          </span>
          <select
            className={T.inputMt}
            value={String(form.demoPresetId || PUBLIC_WRITING_DEMO_PRESETS[0]?.id || "")}
            onChange={(e) => applyDemoPreset(e.target.value)}
          >
            {PUBLIC_WRITING_DEMO_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.titleHe}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <>
          <div className="worksheet-form-field">
            <span className={`worksheet-filter-label ${T.muted}`}>דף כל התווים (A4)</span>
            <select
              className={T.inputMt}
              value={referenceSheetPreset}
              onChange={(e) => {
                const key = e.target.value;
                if (!key) {
                  onChange({ referenceSheetPreset: "" });
                  return;
                }
                const applied = applyReferenceSheetPreset(key);
                onChange({ referenceSheetPreset: key, ...applied });
              }}
            >
              <option value="">תרגול רגיל (בחירה ידנית)</option>
              {REFERENCE_SHEET_PRESET_KEYS.map((key) => (
                <option key={key} value={key}>
                  {REFERENCE_SHEET_PRESETS[key].labelHe}
                </option>
              ))}
            </select>
          </div>

          {!isReferenceSheet ? (
        <div className="worksheet-form-field">
          <span className={`worksheet-filter-label ${T.muted}`}>
            {WORKSHEET_UI_HE.writingCategoryField}
          </span>
          <select
            className={T.inputMt}
            value={category}
            onChange={(e) => onChange({ writingCategory: e.target.value })}
          >
            {WRITING_UI_CATEGORIES.map((key) => (
              <option key={key} value={key}>
                {WRITING_CATEGORY_LABELS_HE[key]}
              </option>
            ))}
          </select>
        </div>
          ) : null}
        </>
      )}

      {!isPublicDemo && !isReferenceSheet && category === "hebrew_letters" ? (
        <div className="worksheet-form-field">
          <span className={`worksheet-filter-label ${T.muted}`}>
            {WORKSHEET_UI_HE.writingLettersField}
          </span>
          <div className="worksheet-writing-letter-grid">
            {HEBREW_LETTERS.slice(0, 22).map((letter) => {
              const selected = hebrewChars.includes(letter);
              return (
                <button
                  key={letter}
                  type="button"
                  className={`worksheet-writing-letter-btn${selected ? " is-selected" : ""}`}
                  aria-pressed={selected}
                  onClick={() => {
                    const next = selected
                      ? hebrewChars.filter((c) => c !== letter)
                      : [...hebrewChars, letter];
                    onChange({ characters: next.length ? next : [letter] });
                  }}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {!isPublicDemo && !isReferenceSheet && category === "english_letters" ? (
        <>
          <div className="worksheet-form-field">
            <span className={`worksheet-filter-label ${T.muted}`}>
              {WORKSHEET_UI_HE.writingLetterCaseField}
            </span>
            <select
              className={T.inputMt}
              value={String(form.letterCase || "upper")}
              onChange={(e) => onChange({ letterCase: e.target.value })}
            >
              <option value="upper">אותיות גדולות</option>
              <option value="lower">אותיות קטנות</option>
              <option value="pairs">זוגות גדול/קטן</option>
            </select>
          </div>
          <div className="worksheet-form-field">
            <span className={`worksheet-filter-label ${T.muted}`}>
              {WORKSHEET_UI_HE.writingLettersField}
            </span>
            <select
              className={T.inputMt}
              value={String(form.characters?.[0] || "A")}
              onChange={(e) => onChange({ characters: [e.target.value] })}
            >
              {ENGLISH_UPPER.map((letter) => (
                <option key={letter} value={letter}>
                  {letter}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : null}

      {!isPublicDemo && !isReferenceSheet && category === "numbers" ? (
        <>
          <div className="worksheet-form-grid">
            <label className="worksheet-form-field">
              <span className={`worksheet-filter-label ${T.muted}`}>מינימום</span>
              <input
                type="number"
                className={T.inputMt}
                min={0}
                max={100}
                value={Number(form.numberRange?.min ?? 1)}
                onChange={(e) =>
                  onChange({
                    numberRange: {
                      ...(form.numberRange || {}),
                      min: Number(e.target.value),
                    },
                  })
                }
              />
            </label>
            <label className="worksheet-form-field">
              <span className={`worksheet-filter-label ${T.muted}`}>מקסימום</span>
              <input
                type="number"
                className={T.inputMt}
                min={0}
                max={100}
                value={Number(form.numberRange?.max ?? 5)}
                onChange={(e) =>
                  onChange({
                    numberRange: {
                      ...(form.numberRange || {}),
                      max: Number(e.target.value),
                    },
                  })
                }
              />
            </label>
          </div>
          <div className="worksheet-form-field">
            <span className={`worksheet-filter-label ${T.muted}`}>
              {WORKSHEET_UI_HE.writingNumberModeField}
            </span>
            <select
              className={T.inputMt}
              value={String(form.numberMode || "digit")}
              onChange={(e) => onChange({ numberMode: e.target.value })}
            >
              {NUMBER_MODE_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : null}

      {!isPublicDemo && !isReferenceSheet && category === "prewriting" ? (
        <div className="worksheet-form-field">
          <span className={`worksheet-filter-label ${T.muted}`}>
            {WORKSHEET_UI_HE.writingPrewritingField}
          </span>
          <select
            className={T.inputMt}
            value={String(form.prewritingPathId || "horizontal")}
            onChange={(e) => onChange({ prewritingPathId: e.target.value })}
          >
            {PREWRITING_PATHS.map((pathId) => (
              <option key={pathId} value={pathId}>
                {pathId}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {!isPublicDemo && !isReferenceSheet && category === "hebrew_words" ? (
        <>
          <div className="worksheet-form-field">
            <span className={`worksheet-filter-label ${T.muted}`}>
              {WORKSHEET_UI_HE.writingWordPackField}
            </span>
            <select
              className={T.inputMt}
              value={String(form.wordPackId || "animals")}
              onChange={(e) => onChange({ wordPackId: e.target.value, customWords: "" })}
            >
              {Object.keys(HEBREW_WORD_PACKS).map((packId) => (
                <option key={packId} value={packId}>
                  {packId}
                </option>
              ))}
              <option value="custom">מותאם אישית</option>
            </select>
          </div>
          {form.wordPackId === "custom" ? (
            <div className="worksheet-form-field">
              <span className={`worksheet-filter-label ${T.muted}`}>
                {WORKSHEET_UI_HE.writingCustomWordsField}
              </span>
              <input
                type="text"
                className={T.inputMt}
                value={String(form.customWords || "")}
                onChange={(e) => onChange({ customWords: e.target.value, wordPackId: "custom" })}
                placeholder="חתול, כלב"
              />
            </div>
          ) : null}
        </>
      ) : null}

      {!isPublicDemo && !isReferenceSheet && category === "english_words" ? (
        <>
          <div className="worksheet-form-field">
            <span className={`worksheet-filter-label ${T.muted}`}>
              {WORKSHEET_UI_HE.writingWordPackField}
            </span>
            <select
              className={T.inputMt}
              value={String(form.wordPackId || "animals")}
              onChange={(e) => onChange({ wordPackId: e.target.value, customWords: "" })}
            >
              {Object.keys(ENGLISH_WORD_PACKS).map((packId) => (
                <option key={packId} value={packId}>
                  {packId}
                </option>
              ))}
              <option value="custom">custom</option>
            </select>
          </div>
          {form.wordPackId === "custom" ? (
            <div className="worksheet-form-field">
              <span className={`worksheet-filter-label ${T.muted}`}>
                {WORKSHEET_UI_HE.writingCustomWordsField}
              </span>
              <input
                type="text"
                className={T.inputMt}
                value={String(form.customWords || "")}
                onChange={(e) => onChange({ customWords: e.target.value, wordPackId: "custom" })}
                placeholder="cat, dog"
              />
            </div>
          ) : null}
        </>
      ) : null}

      {!isPublicDemo && !isReferenceSheet && category === "personal_text" ? (
        <>
          <div className="worksheet-form-field">
            <span className={`worksheet-filter-label ${T.muted}`}>
              {WORKSHEET_UI_HE.writingPersonalKindField}
            </span>
            <select
              className={T.inputMt}
              value={String(form.customTextKind || "first_name")}
              onChange={(e) => onChange({ customTextKind: e.target.value })}
            >
              {PERSONAL_KIND_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="worksheet-form-field">
            <span className={`worksheet-filter-label ${T.muted}`}>
              {WORKSHEET_UI_HE.writingPersonalTextField}
            </span>
            <input
              type="text"
              className={T.inputMt}
              value={String(form.customText || "")}
              onChange={(e) => onChange({ customText: e.target.value })}
              maxLength={30}
            />
          </div>
        </>
      ) : null}

      <div className="worksheet-form-grid">
        {!isReferenceSheet ? (
        <label className="worksheet-form-field">
          <span className={`worksheet-filter-label ${T.muted}`}>
            {WORKSHEET_UI_HE.writingTracingField}
          </span>
          <select
            className={T.inputMt}
            value={String(form.tracingMode || "trace_and_copy")}
            onChange={(e) => onChange({ tracingMode: e.target.value })}
            disabled={isPublicDemo}
          >
            {TRACING_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        ) : null}

        {!isPublicDemo && !isReferenceSheet ? (
          <label className="worksheet-form-field">
            <span className={`worksheet-filter-label ${T.muted}`}>סגנון תצוגת עקיבה</span>
            <select
              className={T.inputMt}
              value={String(form.traceRenderMode || "full_trace")}
              onChange={(e) => onChange({ traceRenderMode: e.target.value })}
            >
              {TRACE_RENDER_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {!isPublicDemo ? (
          <label className="worksheet-form-field">
            <span className={`worksheet-filter-label ${T.muted}`}>
              {WORKSHEET_UI_HE.writingScriptField}
            </span>
            <select
              className={T.inputMt}
              value={String(form.scriptStyle || "print")}
              onChange={(e) => onChange({ scriptStyle: e.target.value })}
            >
              {SCRIPT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {!isReferenceSheet ? (
        <label className="worksheet-form-field">
          <span className={`worksheet-filter-label ${T.muted}`}>
            {WORKSHEET_UI_HE.writingLineCountField}
          </span>
          <select
            className={T.inputMt}
            value={Number(form.lineCount || 6)}
            onChange={(e) => onChange({ lineCount: Number(e.target.value) })}
            disabled={isPublicDemo}
          >
            {LINE_COUNT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        ) : null}

        {!isPublicDemo ? (
          <label className="worksheet-form-field">
            <span className={`worksheet-filter-label ${T.muted}`}>
              {WORKSHEET_UI_HE.writingOrientationField}
            </span>
            <select
              className={T.inputMt}
              value={String(form.pageOrientation || "portrait")}
              onChange={(e) => onChange({ pageOrientation: e.target.value })}
            >
              <option value="portrait">לאורך</option>
              <option value="landscape">לרוחב</option>
            </select>
          </label>
        ) : null}
      </div>

      <label className="worksheet-form-checkbox-row">
        <input
          type="checkbox"
          checked={form.inkSave === true}
          onChange={(e) => onChange({ inkSave: e.target.checked })}
        />
        <span>{WORKSHEET_UI_HE.inkSave}</span>
      </label>

      {error ? <p className={T.error}>{error}</p> : null}

      <button
        type="button"
        disabled={busy}
        onClick={onSubmit}
        className={`${T.primaryBtn} worksheet-create-submit`}
      >
        {busy
          ? WORKSHEET_UI_HE.generating
          : isPublicDemo
            ? WORKSHEET_UI_HE.writingPublicDemoCreate
            : WORKSHEET_UI_HE.writingCreateWorksheet}
      </button>
    </div>
  );
}
