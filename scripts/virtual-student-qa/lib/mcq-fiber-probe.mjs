/**
 * Read `currentQuestion` from a learning page's React fiber tree.
 *
 * Why fiber walk:
 *   The Hebrew/English/Science learning pages keep the active question (with
 *   its correctAnswer / correctIndex) in component state. They do not expose
 *   it on `window`, on a data-attribute, or on the rendered MCQ buttons. To
 *   honour the Phase C rule "do not change product UI / no API mocks" while
 *   still letting the runner deterministically pick correct vs wrong answers
 *   per profile, we read the live state via the React fiber stored on the
 *   first MCQ button DOM node.
 *
 * Why this is robust enough for QA:
 *   - We only READ state. We never patch React, never override fields, never
 *     submit forged answers.
 *   - We accept BOTH question shapes used by the live pages:
 *       { correctAnswer, options }                  (Hebrew / English)
 *       { correctIndex, options }                   (Science)
 *   - We resolve `correctIndex` against the visible MCQ button labels so the
 *     final click target is grounded in what the page actually rendered, not
 *     what a memo might cache.
 *   - The fiber walk has a hard depth limit so it cannot loop on circular
 *     refs in extreme edge cases.
 */

/**
 * Find the live `currentQuestion` for the page.
 *
 * For MCQ subjects, pass `mcqTestidPrefix` (e.g. "hebrew-mcq-"); the first
 * matching MCQ button is used as the fiber entry point and the visible
 * labels of all MCQ buttons are returned for cross-checking.
 *
 * For text-input subjects, pass `entryTestid` (e.g. "geometry-text-answer");
 * that DOM node is the fiber entry point and `visibleLabels` will be empty.
 *
 * @returns {Promise<{
 *   ok: boolean,
 *   reason?: string,
 *   correctAnswer?: string|number|null,
 *   correctIndex?: number|null,
 *   optionsCount?: number|null,
 *   topic?: string|null,
 *   paramsKind?: string|null,
 *   visibleLabels?: string[],
 *   resolvedCorrectIndex?: number|null,
 * }>}
 */
export async function probeCurrentQuestion({ page, mcqTestidPrefix, entryTestid }) {
  if (!mcqTestidPrefix && !entryTestid) {
    throw new Error(
      "probeCurrentQuestion: pass either mcqTestidPrefix or entryTestid"
    );
  }
  let trimmedLabels = [];
  if (mcqTestidPrefix) {
    const visibleLabels = await page
      .locator(`[data-testid^="${mcqTestidPrefix}"]`)
      .allTextContents()
      .catch(() => []);
    trimmedLabels = visibleLabels.map((s) =>
      String(s || "")
        .replace(/\s+/g, " ")
        .trim()
    );
  }

  const fiberResult = await page.evaluate(
    ({ prefix, entry }) => {
      let entryNode = null;
      if (prefix) {
        const buttons = Array.from(
          document.querySelectorAll(`[data-testid^="${prefix}"]`)
        );
        if (buttons.length === 0) return { ok: false, reason: "no-mcq-buttons" };
        entryNode = buttons[0];
      } else if (entry) {
        entryNode = document.querySelector(`[data-testid="${entry}"]`);
        if (!entryNode) return { ok: false, reason: "no-entry-node" };
      } else {
        return { ok: false, reason: "no-probe-target" };
      }
      const btn = entryNode;
      const fiberKey = Object.keys(btn).find((k) =>
        k.startsWith("__reactFiber")
      );
      if (!fiberKey) return { ok: false, reason: "no-fiber-key" };
      let fiber = btn[fiberKey];
      while (fiber.return) fiber = fiber.return;
      const root = fiber;

      function looksLikeQuestion(v) {
        if (!v || typeof v !== "object" || Array.isArray(v)) return false;
        const hasCA = "correctAnswer" in v;
        const hasCI = "correctIndex" in v && Array.isArray(v.options);
        const hasAns = "answers" in v && Array.isArray(v.answers);
        return hasCA || hasCI || hasAns;
      }
      function walkHooks(memo) {
        const out = [];
        let h = memo;
        let i = 0;
        while (h && i < 200) {
          out.push(h.memoizedState);
          h = h.next;
          i++;
        }
        return out;
      }
      function search(node, depth) {
        if (!node || depth > 200) return null;
        if (node.memoizedState) {
          const states = walkHooks(node.memoizedState);
          const q = states.find(looksLikeQuestion);
          if (q) return q;
        }
        let r = search(node.child, depth + 1);
        if (r) return r;
        let s = node.sibling;
        while (s) {
          r = search(s, depth + 1);
          if (r) return r;
          s = s.sibling;
        }
        return null;
      }
      const q = search(root, 0);
      if (!q) return { ok: false, reason: "not-found" };

      const correctAnswer =
        q.correctAnswer != null
          ? q.correctAnswer
          : Number.isInteger(q.correctIndex) && Array.isArray(q.options)
            ? q.options[q.correctIndex]
            : null;

      const optionsArray = Array.isArray(q.options)
        ? q.options
        : Array.isArray(q.answers)
          ? q.answers
          : null;

      // Marshal carefully — only primitives back across the bridge.
      function safe(v) {
        if (v == null) return v;
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
          return v;
        }
        try {
          return JSON.stringify(v);
        } catch {
          return String(v);
        }
      }
      return {
        ok: true,
        correctAnswer: safe(correctAnswer),
        correctIndex: Number.isInteger(q.correctIndex) ? q.correctIndex : null,
        optionsCount: Array.isArray(optionsArray) ? optionsArray.length : null,
        optionsTextSample: Array.isArray(optionsArray)
          ? optionsArray.slice(0, 8).map((opt) => safe(opt))
          : null,
        topic: typeof q.topic === "string" ? q.topic : null,
        paramsKind: q.params?.kind ?? null,
        // answerMode is the discriminator hebrew-master uses to swap between
        // MCQ buttons, a typed text input, and audio-recorded-manual mode.
        // Surface it so subject drivers can branch without relying on DOM
        // sniffing alone. Other subjects either don't set it or always set it
        // to a fixed value, in which case the field is harmless.
        answerMode: typeof q.answerMode === "string" ? q.answerMode : null,
        // acceptedAnswers is hebrew-specific. When the question accepts
        // multiple correct spellings (with/without niqqud, etc.), submitting
        // any of them still passes hebrew's compareAnswers check. We expose
        // the list (capped) so the typing-mode driver can pick one.
        acceptedAnswersSample: Array.isArray(q.acceptedAnswers)
          ? q.acceptedAnswers.slice(0, 8).map((a) => safe(a))
          : null,
      };
    },
    { prefix: mcqTestidPrefix || null, entry: entryTestid || null }
  );

  if (!fiberResult || !fiberResult.ok) {
    return {
      ok: false,
      reason: fiberResult?.reason || "probe-failed",
      visibleLabels: trimmedLabels,
    };
  }

  const resolvedCorrectIndex = resolveCorrectIndexFromLabels({
    fiberCorrectAnswer: fiberResult.correctAnswer,
    fiberCorrectIndex: fiberResult.correctIndex,
    fiberOptionsTextSample: fiberResult.optionsTextSample,
    visibleLabels: trimmedLabels,
  });

  return {
    ok: true,
    correctAnswer: fiberResult.correctAnswer,
    correctIndex: fiberResult.correctIndex,
    optionsCount: fiberResult.optionsCount,
    topic: fiberResult.topic,
    paramsKind: fiberResult.paramsKind,
    answerMode: fiberResult.answerMode || null,
    acceptedAnswersSample: fiberResult.acceptedAnswersSample || null,
    visibleLabels: trimmedLabels,
    resolvedCorrectIndex,
  };
}

function normalizeForCompare(value) {
  return String(value == null ? "" : value)
    .replace(/[\s\u00a0]+/g, " ")
    .trim();
}

/**
 * Match the fiber's `correctAnswer` text against the visible MCQ button
 * labels so the runner clicks the actually-correct DOM button. Falls back to
 * `fiberCorrectIndex` if the label match is ambiguous.
 */
function resolveCorrectIndexFromLabels({
  fiberCorrectAnswer,
  fiberCorrectIndex,
  fiberOptionsTextSample,
  visibleLabels,
}) {
  if (!Array.isArray(visibleLabels) || visibleLabels.length === 0) return null;

  // 1) Prefer label equality with the fiber's correctAnswer.
  if (fiberCorrectAnswer != null) {
    const target = normalizeForCompare(fiberCorrectAnswer);
    const exactIdx = visibleLabels.findIndex(
      (label) => normalizeForCompare(label) === target
    );
    if (exactIdx >= 0) return exactIdx;
    const containsIdx = visibleLabels.findIndex(
      (label) => normalizeForCompare(label).includes(target) && target.length > 0
    );
    if (containsIdx >= 0) return containsIdx;
  }

  // 2) If fiber gave us a correctIndex AND the options it captured align with
  //    the visible labels (same length, same first-N labels), trust the index.
  if (
    Number.isInteger(fiberCorrectIndex) &&
    Array.isArray(fiberOptionsTextSample) &&
    fiberOptionsTextSample.length === visibleLabels.length
  ) {
    const sameOrder = visibleLabels.every(
      (label, i) =>
        normalizeForCompare(label) === normalizeForCompare(fiberOptionsTextSample[i])
    );
    if (sameOrder) return fiberCorrectIndex;
  }

  // 3) Last resort: fiber index even without label confirmation, if it is in
  //    range. The caller may still treat this as low-confidence.
  if (
    Number.isInteger(fiberCorrectIndex) &&
    fiberCorrectIndex >= 0 &&
    fiberCorrectIndex < visibleLabels.length
  ) {
    return fiberCorrectIndex;
  }
  return null;
}
