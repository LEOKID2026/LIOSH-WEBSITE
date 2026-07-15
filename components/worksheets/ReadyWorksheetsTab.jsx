/**

 * Ready worksheets catalog tab — filters + catalog cards.

 */



import { WORKSHEET_SUBJECT_ALLOWLIST } from "../../lib/worksheets/worksheet-print-allowlist.js";
import { WORKSHEET_LEVEL_OPTIONS } from "../../lib/worksheets/worksheet-level-display.js";
import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";
import WorksheetIncludeAnswersOption from "./WorksheetIncludeAnswersOption.jsx";



const GRADE_FILTER_OPTIONS = [

  { key: "", label: "כל הכיתות" },

  { key: "g1", label: "כיתה א׳" },

  { key: "g2", label: "כיתה ב׳" },

  { key: "g3", label: "כיתה ג׳" },

  { key: "g4", label: "כיתה ד׳" },

  { key: "g5", label: "כיתה ה׳" },

  { key: "g6", label: "כיתה ו׳" },

];



/**

 * @param {{

 *   items: Array<Record<string, unknown>>,

 *   loading: boolean,

 *   error: string,

 *   onViewPrint: (slug: string) => void,

 *   busySlug: string | null,

 *   filterSubject: string,

 *   filterGrade: string,

 *   filterLevel: string,

 *   onFilterChange: (patch: Record<string, string>) => void,
 *   includeAnswers: boolean,
 *   includeAnswersReady: boolean,
 *   onIncludeAnswersChange: (includeAnswers: boolean) => void,
 *   T: Record<string, string>,
 *   titleOverride?: string,
 *   hintOverride?: string,

 * }} props

 */

export default function ReadyWorksheetsTab({

  items,

  loading,

  error,

  onViewPrint,

  busySlug,

  filterSubject,

  filterGrade,

  filterLevel,

  onFilterChange,
  includeAnswers,
  includeAnswersReady,
  onIncludeAnswersChange,
  T,
  titleOverride,
  hintOverride,
}) {

  if (loading) {

    return (

      <div className={`worksheet-hub-panel ${T.panel}`}>

        <p className={`worksheet-loading-inline ${T.loading}`}>

          <span className="worksheet-loading-dot" aria-hidden="true" />

          {WORKSHEET_UI_HE.loading}

        </p>

      </div>

    );

  }



  if (error) {

    return (

      <div className={`worksheet-hub-panel ${T.panel}`}>

        <p className={T.error}>{error}</p>

      </div>

    );

  }



  return (

    <div className={`worksheet-hub-panel ${T.panel}`}>

      <h2 className={`worksheet-hub-panel-title ${T.heading}`}>
        {titleOverride || WORKSHEET_UI_HE.readyTitle}
      </h2>

      <p className={`worksheet-hub-panel-hint ${T.muted}`}>
        {hintOverride || WORKSHEET_UI_HE.readyHint}
      </p>



      <div className="worksheet-filter-bar">

        <label>

          <span className={`worksheet-filter-label ${T.muted}`}>מקצוע</span>

          <select

            className={T.inputMt}

            value={filterSubject}

            onChange={(e) => onFilterChange({ filterSubject: e.target.value })}

          >

            <option value="">כל המקצועות</option>

            {Object.entries(WORKSHEET_SUBJECT_ALLOWLIST).map(([key, cfg]) => (

              <option key={key} value={key}>

                {cfg.labelHe}

              </option>

            ))}

          </select>

        </label>

        <label>

          <span className={`worksheet-filter-label ${T.muted}`}>{WORKSHEET_UI_HE.gradeField}</span>

          <select

            className={T.inputMt}

            value={filterGrade}

            onChange={(e) => onFilterChange({ filterGrade: e.target.value })}

          >

            {GRADE_FILTER_OPTIONS.map((g) => (

              <option key={g.key || "all"} value={g.key}>

                {g.label}

              </option>

            ))}

          </select>

        </label>

        <label>

          <span className={`worksheet-filter-label ${T.muted}`}>{WORKSHEET_UI_HE.levelField}</span>

          <select

            className={T.inputMt}

            value={filterLevel}

            onChange={(e) => onFilterChange({ filterLevel: e.target.value })}

          >

            <option value="">כל הרמות</option>

            {WORKSHEET_LEVEL_OPTIONS.map((l) => (

              <option key={l.key} value={l.key}>

                {l.labelHe}

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
          className="worksheet-ready-include-answers"
        />
      ) : null}

      {!items.length ? (

        <div className="worksheet-empty-state">

          <div className="worksheet-empty-state-icon" aria-hidden="true">

            🔍

          </div>

          <p className={`worksheet-empty-state-title ${T.heading}`}>

            {WORKSHEET_UI_HE.readyEmptyTitle}

          </p>

          <p className={`worksheet-empty-state-text ${T.muted}`}>{WORKSHEET_UI_HE.readyEmptyText}</p>

        </div>

      ) : (

        <div className="worksheet-ready-grid">

          {items.map((item) => (

            <article key={item.slug} className="worksheet-ready-card">

              <div>

                <div className="worksheet-ready-card-top">

                  <span className="worksheet-subject-badge" data-subject={item.subjectId}>

                    {item.subjectHe}

                  </span>

                  <span className="worksheet-level-pill" data-level={item.levelKey}>

                    {item.levelHe}

                  </span>

                </div>

                <h3 className={`worksheet-ready-card-title ${T.heading}`}>{item.topicHe}</h3>

                <p className={`worksheet-ready-card-meta ${T.cardMeta}`}>{item.gradeHe}</p>

                <p className={`worksheet-ready-card-count ${T.muted}`}>

                  {item.count} {WORKSHEET_UI_HE.questionCount}

                </p>

              </div>

              <button

                type="button"

                disabled={busySlug === item.slug}

                onClick={() => onViewPrint(item.slug)}

                className={T.cardReportBtn}

              >

                {busySlug === item.slug ? WORKSHEET_UI_HE.loading : WORKSHEET_UI_HE.viewAndPrint}

              </button>

            </article>

          ))}

        </div>

      )}

    </div>

  );

}


