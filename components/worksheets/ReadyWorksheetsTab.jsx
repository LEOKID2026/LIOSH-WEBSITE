/**
 * Ready worksheets catalog tab — filters + catalog cards.
 */

import { useMemo, useState } from "react";
import { WORKSHEET_SUBJECT_ALLOWLIST } from "../../lib/worksheets/worksheet-print-allowlist.js";
import { WORKSHEET_LEVEL_OPTIONS } from "../../lib/worksheets/worksheet-level-display.js";
import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";
import { WRITING_CATEGORY_LABELS_HE } from "../../lib/writing/writing-constants.js";
import WorksheetIncludeAnswersOption from "./WorksheetIncludeAnswersOption.jsx";
import WritingLockedModal from "../writing/WritingLockedModal.jsx";

const GRADE_FILTER_OPTIONS = [
  { key: "", label: "כל הכיתות" },
  { key: "g1", label: "כיתה א׳" },
  { key: "g2", label: "כיתה ב׳" },
  { key: "g3", label: "כיתה ג׳" },
  { key: "g4", label: "כיתה ד׳" },
  { key: "g5", label: "כיתה ה׳" },
  { key: "g6", label: "כיתה ו׳" },
];

const WORKSHEET_TYPE_OPTIONS = [
  { key: "", label: WORKSHEET_UI_HE.worksheetTypeAll },
  { key: "questions", label: WORKSHEET_UI_HE.worksheetTypeQuestions },
  { key: "writing", label: WORKSHEET_UI_HE.worksheetTypeWriting },
];

const CATALOG_PAGE_SIZE = 24;

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
 *   filterWorksheetType?: string,
 *   filterWritingCategory?: string,
 *   searchQuery?: string,
 *   onFilterChange: (patch: Record<string, string>) => void,
 *   includeAnswers: boolean,
 *   includeAnswersReady: boolean,
 *   onIncludeAnswersChange: (includeAnswers: boolean) => void,
 *   T: Record<string, string>,
 *   titleOverride?: string,
 *   hintOverride?: string,
 *   hidePanelHeader?: boolean,
 *   enableLockedModal?: boolean,
 *   catalogPageSize?: number,
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
  filterWorksheetType = "",
  filterWritingCategory = "",
  searchQuery = "",
  onFilterChange,
  includeAnswers,
  includeAnswersReady,
  onIncludeAnswersChange,
  T,
  titleOverride,
  hintOverride,
  hidePanelHeader = false,
  enableLockedModal = false,
  catalogPageSize = CATALOG_PAGE_SIZE,
}) {
  const [lockedItem, setLockedItem] = useState(null);
  const [page, setPage] = useState(0);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (filterWorksheetType && item.worksheetType !== filterWorksheetType) return false;
      if (filterWritingCategory && item.writingCategory !== filterWritingCategory) return false;
      if (filterSubject && item.subjectId !== filterSubject) return false;
      if (filterGrade && item.gradeKey !== filterGrade) return false;
      if (filterLevel && item.levelKey !== filterLevel) return false;
      if (q) {
        const haystack = [
          item.titleHe,
          item.topicHe,
          item.catalogNumber,
          item.categoryHe,
          item.slug,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    items,
    filterWorksheetType,
    filterWritingCategory,
    filterSubject,
    filterGrade,
    filterLevel,
    searchQuery,
  ]);

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / catalogPageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = filteredItems.slice(
    safePage * catalogPageSize,
    safePage * catalogPageSize + catalogPageSize
  );

  const handleCardActivate = (item) => {
    if (enableLockedModal && item.locked === true) {
      setLockedItem(item);
      return;
    }
    onViewPrint(String(item.slug));
  };

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
      {hidePanelHeader ? null : (
        <>
          <h2 className={`worksheet-hub-panel-title ${T.heading}`}>
            {titleOverride || WORKSHEET_UI_HE.readyTitle}
          </h2>
          <p className={`worksheet-hub-panel-hint ${T.muted}`}>
            {hintOverride || WORKSHEET_UI_HE.readyHint}
          </p>
        </>
      )}

      <div className="worksheet-filter-bar worksheet-type-filter-bar">
        <label>
          <span className={`worksheet-filter-label ${T.muted}`}>סוג דף</span>
          <select
            className={T.inputMt}
            value={filterWorksheetType}
            onChange={(e) => {
              setPage(0);
              onFilterChange({ filterWorksheetType: e.target.value });
            }}
          >
            {WORKSHEET_TYPE_OPTIONS.map((opt) => (
              <option key={opt.key || "all"} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {filterWorksheetType === "writing" || !filterWorksheetType ? (
          <label>
            <span className={`worksheet-filter-label ${T.muted}`}>
              {WORKSHEET_UI_HE.writingCategoryField}
            </span>
            <select
              className={T.inputMt}
              value={filterWritingCategory}
              onChange={(e) => {
                setPage(0);
                onFilterChange({ filterWritingCategory: e.target.value });
              }}
            >
              <option value="">{WORKSHEET_UI_HE.writingCategoryAll}</option>
              {Object.entries(WRITING_CATEGORY_LABELS_HE).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label>
          <span className={`worksheet-filter-label ${T.muted}`}>מקצוע</span>
          <select
            className={T.inputMt}
            value={filterSubject}
            onChange={(e) => {
              setPage(0);
              onFilterChange({ filterSubject: e.target.value });
            }}
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
            onChange={(e) => {
              setPage(0);
              onFilterChange({ filterGrade: e.target.value });
            }}
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
            onChange={(e) => {
              setPage(0);
              onFilterChange({ filterLevel: e.target.value });
            }}
          >
            <option value="">כל הרמות</option>
            {WORKSHEET_LEVEL_OPTIONS.map((l) => (
              <option key={l.key} value={l.key}>
                {l.labelHe}
              </option>
            ))}
          </select>
        </label>

        <label className="worksheet-filter-search">
          <span className={`worksheet-filter-label ${T.muted}`}>חיפוש</span>
          <input
            type="search"
            className={T.inputMt}
            value={searchQuery}
            placeholder={WORKSHEET_UI_HE.writingSearchPlaceholder}
            onChange={(e) => {
              setPage(0);
              onFilterChange({ searchQuery: e.target.value });
            }}
          />
        </label>
      </div>

      {includeAnswersReady && filterWorksheetType !== "writing" ? (
        <WorksheetIncludeAnswersOption
          checked={includeAnswers}
          onChange={onIncludeAnswersChange}
          T={T}
          className="worksheet-ready-include-answers"
        />
      ) : null}

      {!filteredItems.length ? (
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
        <>
          <div className="worksheet-ready-grid">
            {pageItems.map((item) => {
              const isWriting = item.worksheetType === "writing";
              const isLocked = item.locked === true;
              return (
                <article
                  key={String(item.slug)}
                  className={`worksheet-ready-card${isLocked ? " is-locked" : ""}`}
                >
                  <div>
                    <div className="worksheet-ready-card-top">
                      {isWriting ? (
                        <span className="worksheet-subject-badge" data-subject="writing">
                          {WORKSHEET_UI_HE.worksheetTypeWriting}
                        </span>
                      ) : (
                        <span className="worksheet-subject-badge" data-subject={item.subjectId}>
                          {item.subjectHe}
                        </span>
                      )}
                      {!isWriting && item.levelHe ? (
                        <span className="worksheet-level-pill" data-level={item.levelKey}>
                          {item.levelHe}
                        </span>
                      ) : null}
                      {item.catalogNumber ? (
                        <span className="worksheet-catalog-pill">{String(item.catalogNumber)}</span>
                      ) : null}
                    </div>

                    <h3 className={`worksheet-ready-card-title ${T.heading}`}>
                      {item.titleHe || item.topicHe}
                    </h3>

                    {isWriting ? (
                      <p className={`worksheet-ready-card-meta ${T.cardMeta}`}>
                        {item.categoryHe || item.writingCategory}
                      </p>
                    ) : (
                      <>
                        <p className={`worksheet-ready-card-meta ${T.cardMeta}`}>{item.gradeHe}</p>
                        <p className={`worksheet-ready-card-count ${T.muted}`}>
                          {item.count} {WORKSHEET_UI_HE.questionCount}
                        </p>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={busySlug === item.slug}
                    onClick={() => handleCardActivate(item)}
                    className={T.cardReportBtn}
                    aria-label={
                      isLocked
                        ? `${item.titleHe || item.topicHe} — ${WORKSHEET_UI_HE.writingLockedTitle}`
                        : undefined
                    }
                  >
                    {busySlug === item.slug
                      ? WORKSHEET_UI_HE.loading
                      : isLocked
                        ? WORKSHEET_UI_HE.writingLockedTitle
                        : WORKSHEET_UI_HE.viewAndPrint}
                  </button>
                </article>
              );
            })}
          </div>

          {pageCount > 1 ? (
            <nav className="worksheet-catalog-pagination" aria-label="עימוד קטalog">
              <button
                type="button"
                className={T.secondaryBtn}
                disabled={safePage <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                הקודם
              </button>
              <span className={T.muted}>
                {safePage + 1} / {pageCount}
              </span>
              <button
                type="button"
                className={T.secondaryBtn}
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                הבא
              </button>
            </nav>
          ) : null}
        </>
      )}

      {enableLockedModal ? (
        <WritingLockedModal item={lockedItem} onClose={() => setLockedItem(null)} T={T} />
      ) : null}
    </div>
  );
}
