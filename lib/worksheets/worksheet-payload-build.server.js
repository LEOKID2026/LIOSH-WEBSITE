/**
 * Build WorksheetPayload and AnswerKeyPayload — strictly separated.
 * @module lib/worksheets/worksheet-payload-build.server
 */

import {
  ANSWER_KEY_PAYLOAD_KIND,
  WORKSHEET_PAYLOAD_KIND,
} from "./worksheet-question-types.js";
import {
  toAnswerKeyEntry,
  toPrintableWorksheetQuestion,
  scanPrintableQuestionForForbiddenKeys,
  scanWorksheetTextForAnswerLeaks,
  scanWorksheetTextForMetadataLeaks,
  scanWorksheetStemForMetadataLeaks,
} from "./worksheet-question-sanitize.server.js";
import { isPrintableQuestion } from "./worksheet-print-allowlist.js";
import {
  parseLongDivisionBracketFromVertical,
  renderLongDivisionBracketHtml,
  stripMathLtrMarkers,
} from "./worksheet-math-display.server.js";
import { renderGeometryDiagramSvgHtml } from "./worksheet-geometry-diagram-svg.js";
import { renderStemWithLtrSpansHtml } from "./worksheet-english-display.server.js";
import { isMostlyLatinText } from "./worksheet-english-allowlist.js";
import {
  isWorksheetMathLtrExpression,
  isWorksheetNumericOption,
  renderWorksheetMathLtrHtml,
  renderWorksheetStemSplitHtml,
  splitWorksheetStemProseAndMath,
  formatAnswerKeyStemDisplay,
  renderAnswerKeyStemSplitHtml,
} from "./worksheet-math-ltr-display.js";
import { renderMathFractionExpressionHtml } from "./worksheet-fraction-html.js";
import { hasStackedFractionToken } from "../../utils/math-fraction-expression-parse.js";
import {
  classifyWorksheetQuestionLayout,
  geometryQuestionPrintModifierClasses,
  getWorksheetBodyGridClass,
  getAnswerKeyGridClass,
  shouldRenderMathPrintPages,
  chunkWorksheetQuestionsForMathPrint,
  buildMathPrintPageRows,
} from "./worksheet-print-layout.js";

/**
 * @typedef {import("./worksheet-question-types.js").WorksheetPayloadMeta} WorksheetPayloadMeta
 * @typedef {import("./worksheet-question-types.js").WorksheetPayload} WorksheetPayload
 * @typedef {import("./worksheet-question-types.js").AnswerKeyPayload} AnswerKeyPayload
 * @typedef {import("./worksheet-question-types.js").WorksheetSubjectId} WorksheetSubjectId
 */

/**
 * @param {Record<string, unknown>[]} rawQuestions
 * @param {WorksheetPayloadMeta} meta
 * @param {{ subjectId: WorksheetSubjectId, mathPracticeFormat?: string | null, preferMcq?: boolean }} opts
 * @returns {WorksheetPayload}
 */
export function buildWorksheetPayload(rawQuestions, meta, opts) {
  const questions = rawQuestions
    .map((raw, i) =>
      toPrintableWorksheetQuestion(raw, {
        displayIndex: i + 1,
        subject: opts.subjectId,
        mathPracticeFormat: opts.mathPracticeFormat ?? meta.mathPracticeFormat,
        gradeKey: meta.gradeKey,
        topicKey: meta.topicKey,
        ...(opts.preferMcq !== undefined ? { preferMcq: opts.preferMcq } : {}),
      })
    )
    .filter((q) => isPrintableQuestion(q.printability));

  return {
    payloadKind: WORKSHEET_PAYLOAD_KIND,
    meta: { ...meta },
    questions,
  };
}

/**
 * Only call when parent explicitly requests answers — separate route/payload.
 * @param {Record<string, unknown>[]} rawQuestions
 * @param {WorksheetPayloadMeta} meta
 * @returns {AnswerKeyPayload}
 */
export function buildAnswerKeyPayload(rawQuestions, meta, opts = {}) {
  const subject = opts.subjectId || meta.subjectId;
  const preferMcq = opts.preferMcq;
  /** @type {import("./worksheet-question-types.js").AnswerKeyEntry[]} */
  const answers = [];

  for (let i = 0; i < rawQuestions.length; i += 1) {
    const raw = rawQuestions[i];
    const printable = toPrintableWorksheetQuestion(raw, {
      displayIndex: i + 1,
      subject,
      mathPracticeFormat: opts.mathPracticeFormat ?? meta.mathPracticeFormat,
      gradeKey: meta.gradeKey,
      topicKey: meta.topicKey,
      ...(preferMcq !== undefined ? { preferMcq } : {}),
    });
    if (!isPrintableQuestion(printable.printability)) continue;

    const entry = toAnswerKeyEntry(raw, {
      displayIndex: printable.displayIndex,
      subject,
      mathPracticeFormat: opts.mathPracticeFormat ?? meta.mathPracticeFormat,
      gradeKey: meta.gradeKey,
      topicKey: meta.topicKey,
      ...(preferMcq !== undefined ? { preferMcq } : {}),
    });
    answers.push(entry);
  }

  return {
    payloadKind: ANSWER_KEY_PAYLOAD_KIND,
    meta: { ...meta },
    answers,
  };
}

/**
 * Serialize WorksheetPayload to JSON for client transport / leak scans.
 * @param {WorksheetPayload} payload
 * @returns {string}
 */
export function serializeWorksheetPayload(payload) {
  return JSON.stringify(payload);
}

/**
 * Serialize AnswerKeyPayload to JSON.
 * @param {AnswerKeyPayload} payload
 * @returns {string}
 */
export function serializeAnswerKeyPayload(payload) {
  return JSON.stringify(payload);
}

/**
 * Escape HTML for safe text insertion in preview HTML (tests + future SSR).
 * @param {string} text
 * @returns {string}
 */
export function escapeWorksheetHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Render WorksheetPayload to static HTML — uses only worksheet-safe fields.
 * AnswerKeyPayload must never be passed here.
 * @param {WorksheetPayload} payload
 * @returns {string}
 */
export function worksheetPayloadToPreviewHtml(payload) {
  const { meta, questions } = payload;
  const inkClass = meta.inkSave ? " ink-save" : "";
  const bodyGridClass = getWorksheetBodyGridClass(questions, meta.subjectId);
  const useMathPrintPages = shouldRenderMathPrintPages(questions, meta.subjectId);
  const header = `
    <header class="worksheet-header worksheet-header-centered">
      <div class="worksheet-header-top">
        <div class="worksheet-brand-center">
          <img src="/images/coin.png" alt="LEO KIDS" width="56" height="56" class="worksheet-brand-logo" />
          <span class="worksheet-brand-name">LEO KIDS</span>
        </div>
        <h1 class="worksheet-title">דף עבודה</h1>
      </div>
      <p class="worksheet-meta">${escapeWorksheetHtml(meta.subjectHe)} · ${escapeWorksheetHtml(meta.gradeHe)} · ${escapeWorksheetHtml(meta.topicHe)} · ${escapeWorksheetHtml(meta.levelHe)}</p>
      <div class="worksheet-fields worksheet-fields-centered">
        <span>שם: ________________</span>
        <span>תאריך: ________________</span>
      </div>
    </header>`;

  const renderQuestionArticle = (q, index = 0) => {
      const layoutClass = classifyWorksheetQuestionLayout(q);
      const breakMods = useMathPrintPages
        ? ""
        : geometryQuestionPrintModifierClasses(q, index, meta.subjectId);
      const cardClass = useMathPrintPages
        ? "worksheet-print-math-card worksheet-question layout-compact-2"
        : `worksheet-question ${layoutClass}${breakMods}`;
      const options =
        q.optionsHe?.length
          ? `<ol class="worksheet-options worksheet-options-grid">${q.optionsHe
              .map((o, i) => {
                const optText = String(o ?? "");
                const useFraction = hasStackedFractionToken(optText);
                const useLtr =
                  !useFraction &&
                  (q.optionsLatin?.[i] ??
                    (isMostlyLatinText(optText) || isWorksheetNumericOption(optText)));
                const inner = useFraction
                  ? renderMathFractionExpressionHtml(optText, escapeWorksheetHtml)
                  : escapeWorksheetHtml(optText);
                const caseClass =
                  q.phonicsOptionCase === "upper"
                    ? " worksheet-phonics-option is-upper"
                    : q.phonicsOptionCase === "lower"
                      ? " worksheet-phonics-option is-lower"
                      : "";
                const cls =
                  !useFraction && useLtr
                    ? ' class="worksheet-math-ltr english-ltr" dir="ltr"'
                    : "";
                return `<li class="worksheet-option-cell"><span class="worksheet-option-label">${["א", "ב", "ג", "ד"][i] || i + 1}.</span><span class="worksheet-option-text${caseClass}">${useFraction ? inner : `<span${cls}>${inner}</span>`}</span></li>`;
              })
              .join("")}</ol>`
          : "";
      const passageClass = q.longPassage
        ? "worksheet-passage worksheet-passage-long"
        : "worksheet-passage";
      const nikudClass = q.hasNikud ? " worksheet-hebrew-nikud" : "";
      const passage = q.passageHe
        ? `<div class="${passageClass}${nikudClass}">${escapeWorksheetHtml(q.passageHe)}</div>`
        : "";
      const writing =
        q.writingSpaceLines && q.writingSpaceLines > 0
          ? `<div class="worksheet-writing-lines" data-lines="${q.writingSpaceLines}"></div>`
          : "";
      const stemClass = q.hasNikud
        ? "worksheet-stem worksheet-hebrew-nikud"
        : q.englishPhonicsMode
          ? "worksheet-stem worksheet-phonics-instruction"
          : "worksheet-stem";
      const isMathQuestion = q.subject === "math";
      const phonicsStimulusHtml =
        q.englishPhonicsMode && q.phonicsStimulus
          ? `<div class="worksheet-phonics-stimulus is-${
              q.phonicsStimulusCase || "word"
            }" dir="ltr"><span class="english-ltr" dir="ltr">${escapeWorksheetHtml(
              String(q.phonicsStimulus)
            )}</span></div>`
          : "";
      const useFractionStem = isMathQuestion && q.questionType === "fraction";
      const remainderPrompt =
        isMathQuestion &&
        Boolean(q.mathExpressionLtr) &&
        Boolean(q.stemHe) &&
        q.mathExpressionLtr !== q.stemHe &&
        /שארית/.test(String(q.stemHe)) &&
        !/שארית/.test(String(q.mathExpressionLtr));
      const stemSplit = isMathQuestion
        ? splitWorksheetStemProseAndMath(q.stemHe)
        : { mode: "none" };
      const splitStemHtml =
        isMathQuestion &&
        !remainderPrompt &&
        (stemSplit.mode === "split" ||
          stemSplit.mode === "mixed-inline" ||
          stemSplit.mode === "math-only")
          ? renderWorksheetStemSplitHtml(q.stemHe, escapeWorksheetHtml, {
              useFractionExpression: useFractionStem,
            })
          : "";
      const balancedStemHtml =
        isMathQuestion &&
        !splitStemHtml &&
        q.stemHe &&
        isWorksheetMathLtrExpression(q.stemHe) &&
        !q.mathExpressionLtr
          ? `<div class="worksheet-math-balanced-slot"><p class="${stemClass} worksheet-stem-math">${renderWorksheetMathLtrHtml(q.stemHe, escapeWorksheetHtml)}</p></div>`
          : "";
      const proseStemHtml =
        !splitStemHtml &&
        q.stemHe &&
        !(isMathQuestion && isWorksheetMathLtrExpression(q.stemHe)) &&
        !q.mathExpressionLtr
          ? `<p class="${stemClass}">${
              q.subject === "english"
                ? renderStemWithLtrSpansHtml(q.stemHe, q.ltrSpans, escapeWorksheetHtml)
                : escapeWorksheetHtml(q.stemHe)
            }</p>`
          : "";
      const mathExpr =
        isMathQuestion && !splitStemHtml && q.mathExpressionLtr
          ? `<div class="worksheet-math-balanced-slot"><div class="worksheet-math-block worksheet-math-block-compact"><div class="worksheet-math-expression" dir="ltr">${useFractionStem ? renderMathFractionExpressionHtml(q.mathExpressionLtr, escapeWorksheetHtml) : `<span class="worksheet-math-ltr worksheet-math-ltr-block" dir="ltr">${escapeWorksheetHtml(q.mathExpressionLtr)}</span>`}</div></div></div>`
          : "";
      const remainderPromptHe = remainderPrompt
        ? `<p class="worksheet-remainder-prompt" dir="rtl">${escapeWorksheetHtml(q.stemHe)}</p>`
        : "";
      const vertical = isMathQuestion && q.verticalLayoutLtr
        ? (() => {
            const verticalText = stripMathLtrMarkers(q.verticalLayoutLtr);
            const longDivision = parseLongDivisionBracketFromVertical(verticalText);
            const inner = longDivision
              ? renderLongDivisionBracketHtml(longDivision, escapeWorksheetHtml)
              : `<pre class="worksheet-math-vertical" dir="ltr">${escapeWorksheetHtml(verticalText)}</pre>`;
            return `<div class="worksheet-math-vertical-slot"><div class="worksheet-math-block worksheet-math-block-compact worksheet-math-block-vertical">${inner}</div></div>`;
          })()
        : layoutClass === "layout-compact-2" && q.subject === "math"
          ? `<div class="worksheet-math-vertical-slot worksheet-math-vertical-slot-empty" aria-hidden="true"></div>`
          : "";
      const wordBody =
        isMathQuestion && q.wordProblemBodyHe
          ? `<div class="worksheet-word-problem">${escapeWorksheetHtml(q.wordProblemBodyHe)}</div>`
          : "";
      const diagramSvg = q.diagramSpec
        ? renderGeometryDiagramSvgHtml(q.diagramSpec, { inkSave: meta.inkSave })
        : "";
      const diagram = diagramSvg
        ? `<div class="worksheet-diagram-wrap">${diagramSvg}</div>`
        : "";
      const answerLine =
        !q.optionsHe?.length &&
        (useMathPrintPages ||
          q.geometryAnswerLine ||
          (q.subject === "geometry" && q.questionType === "open"))
          ? `<div class="worksheet-math-answer-line" aria-hidden="true"><span class="worksheet-math-answer-line-label">תשובה:</span><span class="worksheet-math-answer-line-blank"></span></div>`
          : "";
      return `
      <article class="${cardClass}" data-index="${q.displayIndex}">
        <h2 class="worksheet-question-title"><span class="worksheet-question-number">${q.displayIndex}</span> שאלה</h2>
        <div class="worksheet-question-content">
        ${passage}
        ${wordBody}
        ${splitStemHtml}
        ${balancedStemHtml}
        ${proseStemHtml}
        ${phonicsStimulusHtml}
        ${mathExpr}
        ${remainderPromptHe}
        ${vertical}
        ${diagram}
        ${options}
        ${answerLine}
        ${writing}
        </div>
      </article>`;
  };

  const body = useMathPrintPages
    ? chunkWorksheetQuestionsForMathPrint(questions)
        .map((pageQuestions, pageIndex) => {
          const rows = buildMathPrintPageRows(pageQuestions);
          const rowsHtml = rows
            .map((rowQuestions) => {
              const cell1 = rowQuestions[0] ? renderQuestionArticle(rowQuestions[0]) : "";
              const cell2 = rowQuestions[1] ? renderQuestionArticle(rowQuestions[1]) : "";
              return `<tr><td>${cell1}</td><td>${cell2}</td></tr>`;
            })
            .join("");
          return `<section class="worksheet-print-page worksheet-print-page--math-cards" data-print-page="${pageIndex + 1}"><table class="worksheet-print-math-table"><tbody>${rowsHtml}</tbody></table></section>`;
        })
        .join("")
    : questions.map(renderQuestionArticle).join("");

  const bodyMainAttrs = useMathPrintPages
    ? 'class="worksheet-body worksheet-print-math-pages" data-print-layout="math-card-pages"'
    : `class="worksheet-body${bodyGridClass ? ` ${bodyGridClass}` : ""}"`;

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"><title>${escapeWorksheetHtml(meta.titleHe)}</title></head>
<body class="worksheet-root${inkClass}">
${header}
<main ${bodyMainAttrs}>${body}</main>
</body>
</html>`;
}

/**
 * Render AnswerKeyPayload to HTML — separate document only.
 * @param {AnswerKeyPayload} payload
 * @returns {string}
 */
export function answerKeyPayloadToPreviewHtml(payload) {
  const { meta, answers } = payload;
  const listClass = getAnswerKeyGridClass(answers);
  const rows = answers
    .map((a) => {
      const split = formatAnswerKeyStemDisplay(
        a.stemHe,
        a.correctAnswerHe,
        a.mathExpressionLtr
      );
      let displaySplit = split;
      if (displaySplit.mode === "prose-only" && a.correctAnswerHe && a.stemHe) {
        displaySplit = {
          mode: "split",
          proseHe: displaySplit.proseHe || a.stemHe,
          mathLtr: a.correctAnswerHe,
        };
      }
      if (displaySplit.mode === "empty" && a.correctAnswerHe) {
        displaySplit = { mode: "math-only", proseHe: null, mathLtr: a.correctAnswerHe };
      }
      const structured =
        a.questionType === "fraction" ||
        a.questionType === "vertical_math" ||
        a.questionType === "mcq" ||
        a.questionType === "open";
      const bodyHtml =
        structured && displaySplit.mode !== "empty" && displaySplit.mode !== "prose-only"
          ? `<div class="answer-key-item-body answer-key-item-body-structured">${renderAnswerKeyStemSplitHtml(displaySplit, escapeWorksheetHtml)}</div>`
          : a.questionType === "fraction" && a.correctAnswerHe
            ? `<div class="answer-key-item-body answer-key-item-body-structured"><div class="worksheet-math-balanced-slot"><div class="worksheet-math-expression" dir="ltr">${renderMathFractionExpressionHtml(a.correctAnswerHe, escapeWorksheetHtml)}</div></div></div>`
            : `<p class="answer-key-item-answer">${escapeWorksheetHtml(a.correctAnswerHe)}</p>`;
      return `<li class="answer-key-item"><div class="answer-key-item-head"><span class="worksheet-question-number">${a.displayIndex}</span> תשובה</div>${bodyHtml}${
        a.explanationHe
          ? `<p class="answer-key-item-explanation">${escapeWorksheetHtml(a.explanationHe)}</p>`
          : ""
      }</li>`;
    })
    .join("");
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"><title>דף תשובות - ${escapeWorksheetHtml(meta.titleHe)}</title></head>
<body class="worksheet-root answer-key-root">
<header class="worksheet-header worksheet-header-centered">
  <div class="worksheet-header-top">
    <div class="worksheet-brand-center">
      <img src="/images/coin.png" alt="LEO KIDS" width="56" height="56" class="worksheet-brand-logo" />
      <span class="worksheet-brand-name">LEO KIDS</span>
    </div>
    <h1 class="worksheet-title">דף תשובות</h1>
  </div>
  <p class="worksheet-meta">${escapeWorksheetHtml(meta.subjectHe)} · ${escapeWorksheetHtml(meta.gradeHe)} · ${escapeWorksheetHtml(meta.topicHe)} · ${escapeWorksheetHtml(meta.levelHe)}</p>
</header>
<ol class="${listClass}">${rows}</ol>
</body>
</html>`;
}

/**
 * QA: scan full worksheet payload + HTML for metadata leaks.
 * @param {WorksheetPayload} payload
 * @returns {{ pass: boolean, hits: string[] }}
 */
export function auditWorksheetPayloadForMetadataLeaks(payload) {
  const json = serializeWorksheetPayload(payload);
  const html = worksheetPayloadToPreviewHtml(payload);
  const jsonScan = scanWorksheetTextForMetadataLeaks(json);
  const htmlScan = scanWorksheetTextForMetadataLeaks(html);
  const stemHits = payload.questions.flatMap((q) => {
    const stemScan = scanWorksheetStemForMetadataLeaks(q.stemHe);
    const passageScan = q.passageHe
      ? scanWorksheetStemForMetadataLeaks(q.passageHe)
      : { hits: [] };
    return [...stemScan.hits, ...passageScan.hits];
  });
  const keyScan = payload.questions.map((q) =>
    scanPrintableQuestionForForbiddenKeys(q)
  );
  const keyHits = keyScan.flatMap((s) => s.hits);
  const hits = [...new Set([...jsonScan.hits, ...htmlScan.hits, ...stemHits, ...keyHits])];
  return { pass: hits.length === 0, hits };
}

/**
 * QA: ensure worksheet payload/HTML contains no answer material.
 * @param {WorksheetPayload} payload
 * @returns {{ pass: boolean, hits: string[] }}
 */
export function auditWorksheetPayloadForAnswerLeaks(payload) {
  const json = serializeWorksheetPayload(payload);
  const html = worksheetPayloadToPreviewHtml(payload);
  const jsonScan = scanWorksheetTextForAnswerLeaks(json);
  const htmlScan = scanWorksheetTextForAnswerLeaks(html);
  const hits = [...new Set([...jsonScan.hits, ...htmlScan.hits])];
  return { pass: hits.length === 0, hits };
}
