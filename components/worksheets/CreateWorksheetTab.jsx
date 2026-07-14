/**
 * Worksheet generator tab — four core subjects.
 */

import { WORKSHEET_SUBJECT_ALLOWLIST } from "../../lib/worksheets/worksheet-print-allowlist.js";
import { WORKSHEET_LEVEL_OPTIONS } from "../../lib/worksheets/worksheet-level-display.js";
import { worksheetTopicOptionsForGrade } from "../../lib/worksheets/worksheet-topic-options.js";
import { listMathPracticeFormatsForGradeTopic } from "../../lib/worksheets/worksheet-math-practice-format.js";
import { isWorksheetMcqOffered } from "../../lib/worksheets/worksheet-mcq-preference.js";
import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";
import WorksheetIncludeAnswersOption from "./WorksheetIncludeAnswersOption.jsx";

const GRADE_OPTIONS = [
  { key: "g1", label: "כיתה א׳" },
  { key: "g2", label: "כיתה ב׳" },
  { key: "g3", label: "כיתה ג׳" },
  { key: "g4", label: "כיתה ד׳" },
  { key: "g5", label: "כיתה ה׳" },
  { key: "g6", label: "כיתה ו׳" },
];

const COUNT_OPTIONS = [6, 8, 10, 12, 15, 20];

/**
 * @param {{
 *   form: Record<string, unknown>,
 *   onChange: (patch: Record<string, unknown>) => void,
 *   onSubmit: () => void,
 *   busy: boolean,
 *   error: string,
 *   includeAnswers: boolean,
 *   includeAnswersReady: boolean,
 *   onIncludeAnswersChange: (includeAnswers: boolean) => void,
 *   T: Record<string, string>,
 * }} props
 */
export default function CreateWorksheetTab({
  form,
  onChange,
  onSubmit,
  busy,
  error,
  includeAnswers,
  includeAnswersReady,
  onIncludeAnswersChange,
  T,
}) {
  const subjectId = String(form.subjectId || "math");
  const gradeKey = String(form.gradeKey || "g3");
  const topicKey = String(form.topicKey || "");
  const topicOptions = worksheetTopicOptionsForGrade(subjectId, gradeKey);
  const practiceFormatOptions =
    subjectId === "math" ? listMathPracticeFormatsForGradeTopic(gradeKey, topicKey) : [];
  const showPracticeFormat = practiceFormatOptions.length > 1;
  const practiceFormatValue =
    typeof form.mathPracticeFormat === "string" && form.mathPracticeFormat
      ? form.mathPracticeFormat
      : practiceFormatOptions[0]?.key || "";
  const showMcqCheckbox = isWorksheetMcqOffered(subjectId);

  const patchTopic = (nextTopicKey) => {
    const formats = listMathPracticeFormatsForGradeTopic(gradeKey, nextTopicKey);
    onChange({
      topicKey: nextTopicKey,
      mathPracticeFormat: formats[0]?.key || "",
    });
  };

  const patchGrade = (nextGrade) => {
    const topics = worksheetTopicOptionsForGrade(subjectId, nextGrade);
    const nextTopic = topics[0]?.key || "";
    const formats = listMathPracticeFormatsForGradeTopic(nextGrade, nextTopic);
    onChange({
      gradeKey: nextGrade,
      topicKey: nextTopic,
      mathPracticeFormat: formats[0]?.key || "",
    });
  };

  const patchSubject = (nextSubject) => {
    const topics = worksheetTopicOptionsForGrade(nextSubject, gradeKey);
    const nextTopic = topics[0]?.key || "";
    const formats =
      nextSubject === "math"
        ? listMathPracticeFormatsForGradeTopic(gradeKey, nextTopic)
        : [];
    onChange({
      subjectId: nextSubject,
      topicKey: nextTopic,
      mathPracticeFormat: formats[0]?.key || "",
      preferMcq: isWorksheetMcqOffered(nextSubject) ? form.preferMcq === true : false,
    });
  };

  return (
    <div className={`worksheet-hub-panel worksheet-create-panel ${T.panel}`}>
      <h2 className={`worksheet-hub-panel-title ${T.heading}`}>{WORKSHEET_UI_HE.createTitle}</h2>
      <p className={`worksheet-hub-panel-hint ${T.muted}`}>{WORKSHEET_UI_HE.createHint}</p>

      <div className="worksheet-form-grid">
        <div className="worksheet-form-field">
          <label>
            <span className={T.label}>מקצוע</span>
            <select
              className={T.inputMt}
              value={subjectId}
              onChange={(e) => patchSubject(e.target.value)}
            >
              {Object.entries(WORKSHEET_SUBJECT_ALLOWLIST).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.labelHe}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="worksheet-form-field">
          <label>
            <span className={T.label}>{WORKSHEET_UI_HE.gradeField}</span>
            <select className={T.inputMt} value={gradeKey} onChange={(e) => patchGrade(e.target.value)}>
              {GRADE_OPTIONS.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="worksheet-form-field">
          <label>
            <span className={T.label}>{WORKSHEET_UI_HE.topicField}</span>
            <select
              className={T.inputMt}
              value={topicKey}
              onChange={(e) => patchTopic(e.target.value)}
            >
              {topicOptions.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {showPracticeFormat ? (
          <div className="worksheet-form-field">
            <label>
              <span className={T.label}>{WORKSHEET_UI_HE.practiceFormatField}</span>
              <select
                className={T.inputMt}
                value={practiceFormatValue}
                onChange={(e) => onChange({ mathPracticeFormat: e.target.value })}
              >
                {practiceFormatOptions.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <div className="worksheet-form-field worksheet-form-field-empty" aria-hidden="true" />
        )}

        <div className="worksheet-form-field">
          <label>
            <span className={T.label}>{WORKSHEET_UI_HE.levelField}</span>
            <select
              className={T.inputMt}
              value={String(form.levelKey || "regular")}
              onChange={(e) => onChange({ levelKey: e.target.value })}
            >
              {WORKSHEET_LEVEL_OPTIONS.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.labelHe}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="worksheet-form-field">
          <label>
            <span className={T.label}>{WORKSHEET_UI_HE.countField}</span>
            <select
              className={T.inputMt}
              value={Number(form.count) || 8}
              onChange={(e) => onChange({ count: Number(e.target.value) })}
            >
              {COUNT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>

        {includeAnswersReady ? (
          <WorksheetIncludeAnswersOption
            checked={includeAnswers}
            onChange={onIncludeAnswersChange}
            T={T}
            className="worksheet-create-include-answers"
          />
        ) : null}

        <div className="worksheet-form-checkboxes">
          {showMcqCheckbox ? (
            <label className="worksheet-checkbox-card">
              <input
                type="checkbox"
                checked={form.preferMcq === true}
                onChange={(e) => onChange({ preferMcq: e.target.checked })}
              />
              <span className="worksheet-checkbox-card-text">
                <span className={T.label}>{WORKSHEET_UI_HE.preferMcq}</span>
                <span className={`worksheet-checkbox-card-hint ${T.muted}`}>
                  {WORKSHEET_UI_HE.preferMcqHint}
                </span>
              </span>
            </label>
          ) : null}

          <label className="worksheet-checkbox-card">
            <input
              type="checkbox"
              checked={form.inkSave === true}
              onChange={(e) => onChange({ inkSave: e.target.checked })}
            />
            <span className="worksheet-checkbox-card-text">
              <span className={T.label}>{WORKSHEET_UI_HE.inkSave}</span>
              <span className={`worksheet-checkbox-card-hint ${T.muted}`}>
                מתאים להדפסה בשחור-לבן עם פחות דיו
              </span>
            </span>
          </label>
        </div>
      </div>

      {error ? <p className={`mt-4 ${T.error}`}>{error}</p> : null}

      <div className="mt-5">
        <button
          type="button"
          disabled={busy || !form.topicKey}
          onClick={onSubmit}
          className={`worksheet-primary-cta ${T.primaryBtn}`}
        >
          {busy ? WORKSHEET_UI_HE.generating : WORKSHEET_UI_HE.createWorksheet}
        </button>
      </div>
    </div>
  );
}
