/**
 * Strip internal Copilot fields before sending response to browser.
 */

const CLIENT_SAFE_KEYS = new Set([
  "schemaVersion",
  "audience",
  "resolutionStatus",
  "answerBlocks",
  "clarificationQuestionHe",
  "suggestedFollowUp",
  "quickActions",
  "followUpSuggestionsHe",
  "groundingNoteHe",
  "safetyNoticeHe",
]);

/**
 * @param {Record<string, unknown>|null|undefined} result
 */
export function stripParentCopilotResponseForClient(result) {
  if (!result || typeof result !== "object") return result;

  /** @type {Record<string, unknown>} */
  const out = {};

  for (const key of CLIENT_SAFE_KEYS) {
    if (key in result && result[key] !== undefined) {
      out[key] = result[key];
    }
  }

  if (Array.isArray(result.answerBlocks)) {
    out.answerBlocks = result.answerBlocks.map((block) => {
      if (!block || typeof block !== "object") return block;
      const { type, textHe, source } = block;
      return { type, textHe, source };
    });
  }

  if (Array.isArray(result.quickActions)) {
    out.quickActions = result.quickActions.map((action) => {
      if (!action || typeof action !== "object") return action;
      const { id, labelHe, kind, payload } = action;
      return { id, labelHe, kind, payload };
    });
  }

  return out;
}
