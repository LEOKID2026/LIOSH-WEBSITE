/**

 * Recommendations tab — learning data only, not parent report UI.

 */



import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";
import WorksheetIncludeAnswersOption from "./WorksheetIncludeAnswersOption.jsx";



/**

 * @param {{

 *   students: Array<{ id: string, full_name?: string | null }>,

 *   selectedStudentId: string,

 *   onSelectStudent: (id: string) => void,

 *   recommendations: Array<Record<string, unknown>>,

 *   emptyMessageHe: string | null,

 *   loading: boolean,

 *   error: string,

 *   onCreateFromRecommendation: (rec: Record<string, unknown>) => void,

 *   busyId: string | null,
 *   includeAnswers: boolean,
 *   includeAnswersReady: boolean,
 *   onIncludeAnswersChange: (includeAnswers: boolean) => void,
 *   T: Record<string, string>,

 * }} props

 */

export default function RecommendationsTab({

  students,

  selectedStudentId,

  onSelectStudent,

  recommendations,

  emptyMessageHe,

  loading,

  error,

  onCreateFromRecommendation,

  busyId,
  includeAnswers,
  includeAnswersReady,
  onIncludeAnswersChange,
  T,
}) {

  const showEmpty =

    !loading && !error && recommendations.length === 0 && Boolean(emptyMessageHe);



  return (

    <div className={`worksheet-hub-panel space-y-4 ${T.panel}`}>

      <div>

        <h2 className={`worksheet-hub-panel-title ${T.heading}`}>

          {WORKSHEET_UI_HE.recommendationsTitle}

        </h2>

        <p className={`worksheet-hub-panel-hint ${T.muted}`}>{WORKSHEET_UI_HE.recommendationsHint}</p>

      </div>



      {students.length > 1 ? (

        <label className="block max-w-md">

          <span className={T.label}>{WORKSHEET_UI_HE.selectChild}</span>

          <select

            className={T.inputMt}

            value={selectedStudentId}

            onChange={(e) => onSelectStudent(e.target.value)}

          >

            {students.map((s) => (

              <option key={s.id} value={s.id}>

                {s.full_name || "ילד/ה"}

              </option>

            ))}

          </select>

        </label>

      ) : null}

      {includeAnswersReady ? (
        <WorksheetIncludeAnswersOption
          checked={includeAnswers}
          onChange={onIncludeAnswersChange}
          T={T}
          className="worksheet-rec-include-answers"
        />
      ) : null}

      {loading ? (

        <p className={`worksheet-loading-inline ${T.loading}`}>

          <span className="worksheet-loading-dot" aria-hidden="true" />

          {WORKSHEET_UI_HE.loading}

        </p>

      ) : null}



      {error ? <p className={T.error}>{error}</p> : null}



      {showEmpty ? (

        <div className="worksheet-rec-empty">

          <span className="worksheet-rec-empty-icon" aria-hidden="true">

            ✨

          </span>

          <div>

            <p className={`font-bold ${T.heading}`}>{WORKSHEET_UI_HE.recommendationsEmptyTitle}</p>

            <p className={`mt-1 text-sm leading-relaxed ${T.muted}`}>

              {emptyMessageHe || WORKSHEET_UI_HE.recommendationsEmpty}

            </p>

          </div>

        </div>

      ) : null}



      {!loading && !error && recommendations.length > 0 ? (

        <div className="worksheet-ready-grid">

          {recommendations.map((rec) => (

            <article key={rec.id} className="worksheet-ready-card">

              <div>

                <div className="worksheet-ready-card-top">

                  <span className="worksheet-subject-badge" data-subject={rec.subjectId}>

                    {rec.subjectHe}

                  </span>

                  <span className="worksheet-level-pill" data-level={rec.levelKey}>

                    {rec.levelHe}

                  </span>

                </div>

                <h3 className={`worksheet-ready-card-title ${T.heading}`}>{rec.topicHe}</h3>

                <p className={`worksheet-ready-card-meta ${T.cardMeta}`}>

                  {rec.count} {WORKSHEET_UI_HE.questionCount}

                </p>

                {rec.reasonHe ? (

                  <p className={`worksheet-rec-reason ${T.muted}`}>{rec.reasonHe}</p>

                ) : null}

              </div>

              <button

                type="button"

                disabled={busyId === rec.id}

                onClick={() => onCreateFromRecommendation(rec)}

                className={T.cardActivityBtn}

              >

                {busyId === rec.id

                  ? WORKSHEET_UI_HE.loading

                  : WORKSHEET_UI_HE.createFromRecommendation}

              </button>

            </article>

          ))}

        </div>

      ) : null}

    </div>

  );

}


