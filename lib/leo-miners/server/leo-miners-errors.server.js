import {
  LEO_MINERS_DB_NOT_READY_MESSAGE_HE,
  LEO_MINERS_ERROR_CODES,
} from "../leo-miners-constants.js";

/**
 * @param {string} [migrationHint]
 */
export function minersDbNotReadyResult(migrationHint = "095_leo_miners_foundation.sql") {
  return {
    ok: false,
    code: LEO_MINERS_ERROR_CODES.miners_db_not_ready,
    dbReady: false,
    message: `${LEO_MINERS_DB_NOT_READY_MESSAGE_HE}`.replace(
      "095_leo_miners_foundation.sql",
      migrationHint
    ),
  };
}

/**
 * @param {string} code
 * @param {string} message
 * @param {Record<string, unknown>} [extra]
 */
export function minersErrorResult(code, message, extra = {}) {
  return { ok: false, code, message, ...extra };
}

/**
 * @param {string} code
 * @param {string} message
 * @param {number} [status]
 */
export function minersHttpError(code, message, status = 400) {
  return { ok: false, code, message, status };
}

export { LEO_MINERS_ERROR_CODES, LEO_MINERS_DB_NOT_READY_MESSAGE_HE };
